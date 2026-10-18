const { useTempDatabase, createUser } = require('./helpers.js');
const titleService = require('../services/titleService.js');
const { getRecommendations }   = require('../services/recommendationService.js');
const { getAIRecommendations } = require('../services/aiRecommendationService.js');

let env;
beforeAll(() => { env = useTempDatabase(); });
afterAll(() => env.cleanup());

const add = (userId, data) => titleService.addTitle(userId, { type: 'movie', ...data });

describe('rule-based recommendations', () => {
  it('asks for ratings first when nothing is rated 8 or higher', async () => {
    const user = await createUser();
    add(user.id, { title: 'Meh', genres: '["Drama"]', status: 'completed', rating: 5 });
    expect(getRecommendations(user.id)).toEqual({ recommendations: [], reason: 'no-ratings' });
  });

  it('needs pending titles to recommend from', async () => {
    const user = await createUser();
    add(user.id, { title: 'Loved', genres: '["Drama"]', status: 'completed', rating: 9 });
    expect(getRecommendations(user.id).reason).toBe('no-pending');
  });

  it('ranks pending titles by the genres of highly rated ones', async () => {
    const user = await createUser();
    add(user.id, { title: 'Loved 1', genres: '["Sci-Fi","Drama"]', status: 'completed', rating: 9 });
    add(user.id, { title: 'Loved 2', genres: '["Sci-Fi"]',         status: 'completed', rating: 8 });
    add(user.id, { title: 'Space',   genres: '["Sci-Fi"]',  status: 'pending' });
    add(user.id, { title: 'Tears',   genres: '["Drama"]',   status: 'pending' });
    add(user.id, { title: 'Laughs',  genres: '["Comedy"]',  status: 'pending' });

    const result = getRecommendations(user.id);
    expect(result.reason).toBe('ok');
    expect(result.recommendations.map((t) => t.title)).toEqual(['Space', 'Tears']);
  });

  it("never recommends another user's titles", async () => {
    const a = await createUser();
    const b = await createUser();
    add(a.id, { title: 'A loved', genres: '["Drama"]', status: 'completed', rating: 10 });
    add(b.id, { title: 'B pending', genres: '["Drama"]', status: 'pending' });
    expect(getRecommendations(a.id).reason).toBe('no-pending');
  });
});

describe('AI recommendations fallback', () => {
  afterEach(() => { process.env.GEMINI_API_KEY = ''; process.env.ANTHROPIC_API_KEY = ''; });

  it('falls back to rule-based results when no API key is configured', async () => {
    const user = await createUser();
    add(user.id, { title: 'Loved', genres: '["Drama"]', status: 'completed', rating: 9 });
    add(user.id, { title: 'Next',  genres: '["Drama"]', status: 'pending' });

    const result = await getAIRecommendations(user.id);
    expect(result).toMatchObject({ source: 'rule-based', fallbackReason: 'no-api-key', reason: 'ok' });
    expect(result.recommendations.map((t) => t.title)).toEqual(['Next']);
  });

  it('falls back without calling the API when fewer than 3 titles are rated', async () => {
    process.env.GEMINI_API_KEY = 'gemini-test-key-not-real';
    const user = await createUser();
    add(user.id, { title: 'Loved', genres: '["Drama"]', status: 'completed', rating: 9 });
    add(user.id, { title: 'Next',  genres: '["Drama"]', status: 'pending' });

    const result = await getAIRecommendations(user.id);
    expect(result).toMatchObject({ source: 'rule-based', fallbackReason: 'insufficient-data' });
  });
});
