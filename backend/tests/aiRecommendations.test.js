const path = require('path');
const { useTempDatabase, createUser } = require('./helpers.js');
const titleService = require('../services/titleService.js');
const { getAIRecommendations, clearCache, MODEL } = require('../services/aiRecommendationService.js');

// The real SDK error classes, so classification is tested against what the SDK throws.
const frontendModules = path.resolve(__dirname, '../../frontend/node_modules');
const Anthropic = require(require.resolve('@anthropic-ai/sdk', { paths: [frontendModules] }));

let env, user, ids;
const savedKey = process.env.ANTHROPIC_API_KEY;

beforeAll(async () => {
  env = useTempDatabase();
  user = await createUser();
  const add = (data) => titleService.addTitle(user.id, { type: 'movie', ...data });
  add({ title: 'Heat',       genres: '["Crime","Drama"]', status: 'completed', rating: 9 });
  add({ title: 'Collateral', genres: '["Crime"]',         status: 'completed', rating: 8 });
  add({ title: 'Arrival',    genres: '["Sci-Fi"]',        status: 'completed', rating: 7 });
  ids = {
    thief:  add({ title: 'Thief',       genres: '["Crime"]',  status: 'pending' }).id,
    dune:   add({ title: 'Dune',        genres: '["Sci-Fi"]', status: 'pending' }).id,
    comedy: add({ title: 'Some Comedy', genres: '["Comedy"]', status: 'pending' }).id,
  };
});
afterAll(() => env.cleanup());
beforeEach(() => { process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-not-real'; clearCache(); });
afterEach(() => { process.env.ANTHROPIC_API_KEY = savedKey ?? ''; });

/** A fake SDK whose beta.messages.create returns `response` (or throws `error`). */
function fakeSdk({ response, error }) {
  const create = vi.fn(async () => { if (error) throw error; return response; });
  return { sdk: { Anthropic, client: { beta: { messages: { create } } } }, create };
}

function textResponse(json, stop_reason = 'end_turn') {
  return { stop_reason, content: [{ type: 'text', text: typeof json === 'string' ? json : JSON.stringify(json) }] };
}

describe('AI recommendations', () => {
  it('sends a strict JSON schema request to the current model', async () => {
    const { sdk, create } = fakeSdk({ response: textResponse({ recommendations: [] }) });
    await getAIRecommendations(user.id, { sdk });
    const req = create.mock.calls[0][0];
    expect(req.model).toBe(MODEL);
    expect(req.output_config.format.type).toBe('json_schema');
    expect(req.output_config.format.schema.properties.recommendations.items.required).toEqual(['title_id', 'reason']);
    expect(req.messages[0].content).toContain(`id ${ids.thief}:`);
    expect(req.messages[0].content).toContain('rated 9/10');
    expect(req).not.toHaveProperty('thinking'); // thinking is always on for this model; effort controls depth
  });

  it('returns valid picks with their reason, dropping unknown, duplicate and empty entries', async () => {
    const { sdk } = fakeSdk({ response: textResponse({ recommendations: [
      { title_id: ids.thief, reason: 'Another Michael Mann crime story like Heat, which you rated 9.' },
      { title_id: 999999, reason: 'Not in the list' },
      { title_id: ids.thief, reason: 'Duplicate' },
      { title_id: ids.dune, reason: '   ' },
      { title_id: ids.dune, reason: 'Big-idea science fiction in the spirit of Arrival.' },
    ] }) });
    const result = await getAIRecommendations(user.id, { sdk });
    expect(result.source).toBe('ai');
    expect(result.recommendations.map((t) => t.title)).toEqual(['Thief', 'Dune']);
    expect(result.recommendations[0].explanation).toMatch(/Heat/);
  });

  it('caches the result until the catalogue changes or a refresh is asked for', async () => {
    const first = fakeSdk({ response: textResponse({ recommendations: [{ title_id: ids.dune, reason: 'Because Arrival.' }] }) });
    await getAIRecommendations(user.id, { sdk: first.sdk });
    const second = fakeSdk({ response: textResponse({ recommendations: [{ title_id: ids.thief, reason: 'Because Heat.' }] }) });

    const cached = await getAIRecommendations(user.id, { sdk: second.sdk });
    expect(second.create).not.toHaveBeenCalled();
    expect(cached.recommendations[0].title).toBe('Dune');

    const refreshed = await getAIRecommendations(user.id, { sdk: second.sdk, refresh: true });
    expect(second.create).toHaveBeenCalledTimes(1);
    expect(refreshed.recommendations[0].title).toBe('Thief');
  });

  it.each([
    ['offline', new Anthropic.APIConnectionError({ message: 'Connection error.' })],
    ['offline', new Anthropic.APIConnectionTimeoutError({ message: 'Request timed out.' })],
    ['invalid-api-key', new Anthropic.AuthenticationError(401, {}, 'invalid x-api-key', new Headers())],
    ['rate-limited', new Anthropic.RateLimitError(429, {}, 'rate limited', new Headers())],
    ['api-error', new Anthropic.InternalServerError(500, {}, 'overloaded', new Headers())],
  ])('falls back to rule-based picks on %s', async (reason, error) => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { sdk } = fakeSdk({ error });
    const result = await getAIRecommendations(user.id, { sdk });
    spy.mockRestore();
    expect(result).toMatchObject({ source: 'rule-based', fallbackReason: reason, reason: 'ok' });
    expect(result.recommendations[0].title).toBe('Thief'); // crime is the top-rated genre
  });

  it.each([
    ['refused', { stop_reason: 'refusal', content: [] }],
    ['invalid-response', textResponse('not json at all')],
    ['invalid-response', textResponse('{"recommendations": [', 'max_tokens')],
    ['empty-ai-response', textResponse({ recommendations: [{ title_id: 424242, reason: 'Made up' }] })],
  ])('falls back when the response is unusable (%s)', async (reason, response) => {
    const { sdk } = fakeSdk({ response });
    expect(await getAIRecommendations(user.id, { sdk })).toMatchObject({ source: 'rule-based', fallbackReason: reason });
  });

  it('never calls the API without a key', async () => {
    process.env.ANTHROPIC_API_KEY = '';
    const { sdk, create } = fakeSdk({ response: textResponse({ recommendations: [] }) });
    expect(await getAIRecommendations(user.id, { sdk })).toMatchObject({ fallbackReason: 'no-api-key' });
    expect(create).not.toHaveBeenCalled();
  });
});

describe('rule-based explanations', () => {
  it('explain which favourite genres a pick matches', async () => {
    process.env.ANTHROPIC_API_KEY = '';
    const result = await getAIRecommendations(user.id);
    expect(result.recommendations[0]).toMatchObject({
      title: 'Thief',
      explanation: 'It matches Crime, a genre you rated 8 or higher.',
    });
  });
});
