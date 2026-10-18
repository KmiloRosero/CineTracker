const path = require('path');
const { useTempDatabase, createUser } = require('./helpers.js');
const titleService = require('../services/titleService.js');
const { getAIRecommendations, clearCache, GEMINI_MODEL, CLAUDE_MODEL } = require('../services/aiRecommendationService.js');

// The real SDK error classes, so classification is tested against what the SDK throws.
const frontendModules = path.resolve(__dirname, '../../frontend/node_modules');
const Anthropic = require(require.resolve('@anthropic-ai/sdk', { paths: [frontendModules] }));

let env, user, ids;

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
beforeEach(() => clearCache());
afterEach(() => {
  process.env.GEMINI_API_KEY = '';
  process.env.ANTHROPIC_API_KEY = '';
  process.env.GEMINI_MODEL = '';
});

function quiet() {
  return vi.spyOn(console, 'error').mockImplementation(() => {});
}

// ── Gemini ───────────────────────────────────────────────────────────────────

/** A fake fetch answering with a Gemini generateContent body (or failing). */
function fakeFetch({ status = 200, body, error }) {
  return vi.fn(async () => {
    if (error) throw error;
    const text = typeof body === 'string' ? body : JSON.stringify(body);
    return new Response(text, { status, headers: { 'content-type': 'application/json' } });
  });
}

function geminiBody(json, finishReason = 'STOP') {
  const text = typeof json === 'string' ? json : JSON.stringify(json);
  return { candidates: [{ finishReason, content: { role: 'model', parts: [{ text }] } }] };
}

describe('AI recommendations with Gemini', () => {
  beforeEach(() => { process.env.GEMINI_API_KEY = 'gemini-test-key-not-real'; });

  it('sends a strict JSON schema request to the configured model, key in a header', async () => {
    const fetch = fakeFetch({ body: geminiBody({ recommendations: [] }) });
    await getAIRecommendations(user.id, { fetch });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`);
    expect(url).not.toContain('key=');
    expect(init.headers['x-goog-api-key']).toBe('gemini-test-key-not-real');
    const req = JSON.parse(init.body);
    expect(req.generationConfig.responseMimeType).toBe('application/json');
    expect(req.generationConfig.responseJsonSchema.properties.recommendations.items.required).toEqual(['title_id', 'reason']);
    expect(req.contents[0].parts[0].text).toContain(`id ${ids.thief}:`);
    expect(req.contents[0].parts[0].text).toContain('rated 9/10');
  });

  it('uses GEMINI_MODEL when set', async () => {
    process.env.GEMINI_MODEL = 'gemini-other-model';
    const fetch = fakeFetch({ body: geminiBody({ recommendations: [{ title_id: ids.dune, reason: 'Because Arrival.' }] }) });
    await getAIRecommendations(user.id, { fetch });
    expect(fetch.mock.calls[0][0]).toContain('/models/gemini-other-model:generateContent');
  });

  it('returns valid picks with their reason, dropping unknown, duplicate and empty entries', async () => {
    const fetch = fakeFetch({ body: geminiBody({ recommendations: [
      { title_id: ids.thief, reason: 'Another Michael Mann crime story like Heat, which you rated 9.' },
      { title_id: 999999, reason: 'Not in the list' },
      { title_id: ids.thief, reason: 'Duplicate' },
      { title_id: ids.dune, reason: '   ' },
      { title_id: ids.dune, reason: 'Big-idea science fiction in the spirit of Arrival.' },
    ] }) });
    const result = await getAIRecommendations(user.id, { fetch });
    expect(result).toMatchObject({ source: 'ai', provider: 'gemini' });
    expect(result.recommendations.map((t) => t.title)).toEqual(['Thief', 'Dune']);
    expect(result.recommendations[0].explanation).toMatch(/Heat/);
  });

  it('ignores thought parts in the answer', async () => {
    const body = { candidates: [{ finishReason: 'STOP', content: { parts: [
      { text: 'thinking about it…', thought: true },
      { text: JSON.stringify({ recommendations: [{ title_id: ids.dune, reason: 'Because Arrival.' }] }) },
    ] } }] };
    const result = await getAIRecommendations(user.id, { fetch: fakeFetch({ body }) });
    expect(result.recommendations[0].title).toBe('Dune');
  });

  it('caches the result until the catalogue changes or a refresh is asked for', async () => {
    const first = fakeFetch({ body: geminiBody({ recommendations: [{ title_id: ids.dune, reason: 'Because Arrival.' }] }) });
    await getAIRecommendations(user.id, { fetch: first });
    const second = fakeFetch({ body: geminiBody({ recommendations: [{ title_id: ids.thief, reason: 'Because Heat.' }] }) });

    const cached = await getAIRecommendations(user.id, { fetch: second });
    expect(second).not.toHaveBeenCalled();
    expect(cached.recommendations[0].title).toBe('Dune');

    const refreshed = await getAIRecommendations(user.id, { fetch: second, refresh: true });
    expect(second).toHaveBeenCalledTimes(1);
    expect(refreshed.recommendations[0].title).toBe('Thief');
  });

  it.each([
    ['offline',         { error: new TypeError('fetch failed') }],
    ['offline',         { error: new DOMException('The operation was aborted due to timeout', 'TimeoutError') }],
    ['invalid-api-key', { status: 400, body: { error: { code: 400, message: 'API key not valid. Please pass a valid API key.', details: [{ reason: 'API_KEY_INVALID' }] } } }],
    ['invalid-api-key', { status: 401, body: { error: { code: 401, status: 'UNAUTHENTICATED' } } }],
    ['api-permission',  { status: 403, body: { error: { code: 403, status: 'PERMISSION_DENIED' } } }],
    ['api-permission',  { status: 404, body: { error: { code: 404, message: 'This model is no longer available' } } }],
    ['rate-limited',    { status: 429, body: { error: { code: 429, status: 'RESOURCE_EXHAUSTED' } } }],
    ['api-error',       { status: 503, body: { error: { code: 503, status: 'UNAVAILABLE' } } }],
  ])('falls back to rule-based picks on %s', async (reason, reply) => {
    const spy = quiet();
    const result = await getAIRecommendations(user.id, { fetch: fakeFetch(reply) });
    spy.mockRestore();
    expect(result).toMatchObject({ source: 'rule-based', provider: 'gemini', fallbackReason: reason, reason: 'ok' });
    expect(result.recommendations[0].title).toBe('Thief'); // crime is the top-rated genre
  });

  it.each([
    ['refused',           { promptFeedback: { blockReason: 'SAFETY' } }],
    ['refused',           geminiBody('', 'SAFETY')],
    ['invalid-response',  geminiBody('not json at all')],
    ['invalid-response',  geminiBody('{"recommendations": [', 'MAX_TOKENS')],
    ['invalid-response',  'this is not JSON'],
    ['empty-ai-response', geminiBody({ recommendations: [{ title_id: 424242, reason: 'Made up' }] })],
  ])('falls back when the response is unusable (%s)', async (reason, body) => {
    const spy = quiet();
    const result = await getAIRecommendations(user.id, { fetch: fakeFetch({ body }) });
    spy.mockRestore();
    expect(result).toMatchObject({ source: 'rule-based', fallbackReason: reason });
  });

  it('is preferred over Claude when both keys are set', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-not-real';
    const fetch = fakeFetch({ body: geminiBody({ recommendations: [{ title_id: ids.dune, reason: 'Because Arrival.' }] }) });
    const { sdk, create } = fakeSdk({ response: textResponse({ recommendations: [] }) });
    const result = await getAIRecommendations(user.id, { fetch, sdk });
    expect(result.provider).toBe('gemini');
    expect(create).not.toHaveBeenCalled();
  });
});

// ── Claude ───────────────────────────────────────────────────────────────────

/** A fake SDK whose beta.messages.create returns `response` (or throws `error`). */
function fakeSdk({ response, error }) {
  const create = vi.fn(async () => { if (error) throw error; return response; });
  return { sdk: { Anthropic, client: { beta: { messages: { create } } } }, create };
}

function textResponse(json, stop_reason = 'end_turn') {
  return { stop_reason, content: [{ type: 'text', text: typeof json === 'string' ? json : JSON.stringify(json) }] };
}

describe('AI recommendations with Claude (only an Anthropic key)', () => {
  beforeEach(() => { process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-not-real'; });

  it('sends a strict JSON schema request to the current model', async () => {
    const { sdk, create } = fakeSdk({ response: textResponse({ recommendations: [] }) });
    await getAIRecommendations(user.id, { sdk });
    const req = create.mock.calls[0][0];
    expect(req.model).toBe(CLAUDE_MODEL);
    expect(req.output_config.format.type).toBe('json_schema');
    expect(req.output_config.format.schema.properties.recommendations.items.required).toEqual(['title_id', 'reason']);
    expect(req.messages[0].content).toContain(`id ${ids.thief}:`);
    expect(req).not.toHaveProperty('thinking'); // thinking is always on for this model; effort controls depth
  });

  it('returns valid picks tagged with the provider', async () => {
    const { sdk } = fakeSdk({ response: textResponse({ recommendations: [
      { title_id: ids.thief, reason: 'Another crime story like Heat.' },
    ] }) });
    const result = await getAIRecommendations(user.id, { sdk });
    expect(result).toMatchObject({ source: 'ai', provider: 'claude' });
    expect(result.recommendations[0].title).toBe('Thief');
  });

  it.each([
    ['offline', new Anthropic.APIConnectionError({ message: 'Connection error.' })],
    ['offline', new Anthropic.APIConnectionTimeoutError({ message: 'Request timed out.' })],
    ['invalid-api-key', new Anthropic.AuthenticationError(401, {}, 'invalid x-api-key', new Headers())],
    ['rate-limited', new Anthropic.RateLimitError(429, {}, 'rate limited', new Headers())],
    ['api-error', new Anthropic.InternalServerError(500, {}, 'overloaded', new Headers())],
  ])('falls back to rule-based picks on %s', async (reason, error) => {
    const spy = quiet();
    const { sdk } = fakeSdk({ error });
    const result = await getAIRecommendations(user.id, { sdk });
    spy.mockRestore();
    expect(result).toMatchObject({ source: 'rule-based', provider: 'claude', fallbackReason: reason, reason: 'ok' });
    expect(result.recommendations[0].title).toBe('Thief');
  });

  it.each([
    ['refused', { stop_reason: 'refusal', content: [] }],
    ['invalid-response', textResponse('not json at all')],
    ['invalid-response', textResponse('{"recommendations": [', 'max_tokens')],
    ['empty-ai-response', textResponse({ recommendations: [{ title_id: 424242, reason: 'Made up' }] })],
  ])('falls back when the response is unusable (%s)', async (reason, response) => {
    const spy = quiet();
    const { sdk } = fakeSdk({ response });
    const result = await getAIRecommendations(user.id, { sdk });
    spy.mockRestore();
    expect(result).toMatchObject({ source: 'rule-based', fallbackReason: reason });
  });
});

describe('without any AI key', () => {
  it('never calls an API', async () => {
    const fetch = fakeFetch({ body: geminiBody({ recommendations: [] }) });
    const { sdk, create } = fakeSdk({ response: textResponse({ recommendations: [] }) });
    expect(await getAIRecommendations(user.id, { fetch, sdk })).toMatchObject({ fallbackReason: 'no-api-key', provider: null });
    expect(fetch).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('explains which favourite genres a rule-based pick matches', async () => {
    const result = await getAIRecommendations(user.id);
    expect(result.recommendations[0]).toMatchObject({
      title: 'Thief',
      explanation: 'It matches Crime, a genre you rated 8 or higher.',
    });
  });
});
