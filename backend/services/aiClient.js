const path = require('path');

// Resolve @anthropic-ai/sdk from frontend/node_modules (same pattern as bcryptjs)
const frontendModules = path.resolve(__dirname, '../../frontend/node_modules');
if (!module.paths.includes(frontendModules)) {
  module.paths.unshift(frontendModules);
}

const { getEnv } = require('../utils/env.js');

// Every AI feature goes through here: one JSON-schema request to Gemini (when
// its key is set) or Claude (when only an Anthropic key is set). Callers own
// their prompt, schema, validation and rule-based fallback.
const GEMINI_MODEL = 'gemini-3.8-flash'; // override with GEMINI_MODEL in backend/.env
// Free-tier quotas are per model (20 requests a day each at the time of writing), and a model can be
// overloaded while others answer: when one is out of quota, overloaded or slow, the next is tried.
// GEMINI_FALLBACK_MODELS (comma separated) overrides the list.
const GEMINI_FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
const MAX_MODEL_TRIES = 3;
const FALLBACK_TIMEOUT_MS = 15000;
const GEMINI_URL   = 'https://generativelanguage.googleapis.com/v1beta/models';
const CLAUDE_MODEL = 'claude-opus-5-5'; // override with CLAUDE_MODEL in backend/.env
const TIMEOUT_MS   = 30000;

const PROVIDER_NAME = { gemini: 'Gemini', claude: 'Claude' };

/** A failed model call, carrying the fallback reason shown to the user. */
class AIUnavailable extends Error {
  constructor(reason, detail) {
    super(detail ?? reason);
    this.reason = reason;
  }
}

// ── Gemini (Google AI Studio REST API) ───────────────────────────────────────

const GEMINI_BLOCKED = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION', 'IMAGE_SAFETY']);

function classifyGeminiStatus(status, body) {
  if (status === 401 || /API_KEY_INVALID|API key not valid/i.test(body)) return 'invalid-api-key';
  if (status === 403 || status === 404) return 'api-permission'; // key without access, or retired model
  if (status === 429) return 'rate-limited';
  return 'api-error';
}

async function askGemini(apiKey, { system, prompt, schema, maxTokens }, fetchImpl = fetch, modelOverride = null, timeoutMs = TIMEOUT_MS) {
  const model = modelOverride ?? getEnv('GEMINI_MODEL') ?? GEMINI_MODEL;
  let res;
  try {
    res = await fetchImpl(`${GEMINI_URL}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: schema,
          maxOutputTokens: maxTokens,
          thinkingConfig: { thinkingLevel: 'low' },
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const failure = new AIUnavailable('offline', err?.message); // network failure or timeout
    failure.timedOut = err?.name === 'TimeoutError';
    throw failure;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const failure = new AIUnavailable(classifyGeminiStatus(res.status, body), `HTTP ${res.status}: ${body.slice(0, 200)}`);
    failure.status = res.status;
    failure.retrySeconds = Number(body.match(/"retryDelay":\s*"(\d+)s"/)?.[1]) || null;
    throw failure;
  }

  let data;
  try { data = await res.json(); } catch { throw new AIUnavailable('invalid-response'); }

  if (data?.promptFeedback?.blockReason) throw new AIUnavailable('refused', data.promptFeedback.blockReason);
  const candidate = data?.candidates?.[0];
  if (GEMINI_BLOCKED.has(candidate?.finishReason)) throw new AIUnavailable('refused', candidate.finishReason);
  if (candidate?.finishReason === 'MAX_TOKENS') throw new AIUnavailable('invalid-response', 'MAX_TOKENS');

  // Thought summaries (if any) are not part of the answer.
  return (candidate?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('');
}

// ── Claude (Anthropic SDK) ───────────────────────────────────────────────────

/** Maps an SDK error to a short fallback reason, most specific class first. */
function classifyClaudeError(Anthropic, err) {
  if (err instanceof Anthropic.AuthenticationError)   return 'invalid-api-key';
  if (err instanceof Anthropic.PermissionDeniedError) return 'api-permission';
  if (err instanceof Anthropic.RateLimitError)        return 'rate-limited';
  if (err instanceof Anthropic.APIConnectionError)    return 'offline'; // includes timeouts
  if (err instanceof Anthropic.APIError)              return 'api-error';
  return 'invalid-response';
}

function defaultClaudeClient(apiKey) {
  const Anthropic = require('@anthropic-ai/sdk');
  return { Anthropic, client: new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 }) };
}

async function askClaude(apiKey, { system, prompt, schema, maxTokens }, sdk) {
  const { Anthropic, client } = sdk ?? defaultClaudeClient(apiKey);
  let response;
  try {
    response = await client.beta.messages.create({
      model: getEnv('CLAUDE_MODEL') ?? CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      // On a safety decline the API retries on a suitable model within the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
  } catch (err) {
    throw new AIUnavailable(classifyClaudeError(Anthropic, err), err?.message);
  }

  if (response.stop_reason === 'refusal') throw new AIUnavailable('refused');
  if (response.stop_reason === 'max_tokens') throw new AIUnavailable('invalid-response', 'max_tokens');
  return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
}

// ── Gemini model chain ───────────────────────────────────────────────────────

const benched = new Map(); // model -> time (ms) until which it is skipped

function geminiChain() {
  const main = getEnv('GEMINI_MODEL') ?? GEMINI_MODEL;
  const configured = getEnv('GEMINI_FALLBACK_MODELS');
  const fallbacks = configured ? configured.split(',').map((m) => m.trim()).filter(Boolean) : GEMINI_FALLBACK_MODELS;
  return [...new Set([main, ...fallbacks])];
}

/** How long to skip a model after a failure that is about that model, or null to stop trying. */
function benchFor(err) {
  if (!(err instanceof AIUnavailable)) return null;
  if (err.status === 429) return (err.retrySeconds ?? 60) * 1000;   // out of quota until it resets
  if (err.status === 503) return 60 * 1000;                         // overloaded
  if (err.status === 404) return 24 * 60 * 60 * 1000;               // model not offered to this key
  if (err.timedOut) return 2 * 60 * 1000;                            // too slow right now
  return null;                                                       // bad key, refusal, offline: same for every model
}

/** Asks the first Gemini model that is not benched; moves down the chain when one is out of quota, overloaded or slow. */
async function askGeminiChain(apiKey, spec, fetchImpl) {
  const now = Date.now();
  const ready = geminiChain().filter((m) => (benched.get(m) ?? 0) <= now);
  const models = (ready.length ? ready : geminiChain().slice(0, 1)).slice(0, MAX_MODEL_TRIES);
  let lastError;
  for (const [i, model] of models.entries()) {
    try {
      return await askGemini(apiKey, spec, fetchImpl, model, i === 0 ? TIMEOUT_MS : FALLBACK_TIMEOUT_MS);
    } catch (err) {
      const bench = benchFor(err);
      if (bench === null) throw err;
      benched.set(model, Date.now() + bench);
      lastError = err;
    }
  }
  throw lastError;
}

function resetModelChain() {
  benched.clear();
}

// ── Shared flow ──────────────────────────────────────────────────────────────

/** Gemini when its key is set, otherwise Claude, otherwise none. */
function pickProvider() {
  const geminiKey = getEnv('GEMINI_API_KEY');
  if (geminiKey) return { provider: 'gemini', apiKey: geminiKey };
  const claudeKey = getEnv('ANTHROPIC_API_KEY');
  if (claudeKey) return { provider: 'claude', apiKey: claudeKey };
  return null;
}

/**
 * Sends one structured request and returns the parsed JSON object.
 * Throws AIUnavailable (with a fallback reason) on any failure, including
 * 'no-api-key'. Tests inject `options.fetch` (Gemini) or `options.sdk`
 * = { Anthropic, client } (Claude).
 */
async function askJSON(request, options = {}) {
  const picked = pickProvider();
  if (!picked) throw new AIUnavailable('no-api-key');
  const spec = { maxTokens: 4000, ...request };
  const text = picked.provider === 'gemini'
    ? await askGeminiChain(picked.apiKey, spec, options.fetch)
    : await askClaude(picked.apiKey, spec, options.sdk);
  try {
    return JSON.parse(text);
  } catch {
    throw new AIUnavailable('invalid-response', 'not JSON');
  }
}

/**
 * askJSON without throwing: { ok: true, provider, data } or
 * { ok: false, provider, reason }. Failures are logged under `label`.
 */
async function tryAskJSON(label, request, options = {}) {
  const provider = pickProvider()?.provider ?? null;
  try {
    return { ok: true, provider, data: await askJSON(request, options) };
  } catch (err) {
    const reason = err instanceof AIUnavailable ? err.reason : 'invalid-response';
    if (reason !== 'no-api-key') {
      console.error(`[${label}] ${provider} unavailable, falling back (${reason}):`, err?.message ?? err);
    }
    return { ok: false, provider, reason };
  }
}

const PING_MESSAGE = {
  'invalid-api-key': 'Gemini rechazó la clave. Revisa que la copiaste completa.',
  'api-permission':  'La clave de Gemini no tiene permiso para usar la API.',
  'rate-limited':    'Gemini está ocupado ahora; prueba de nuevo en un minuto.',
};

/** Checks that the Gemini key works without spending a generation (Perfil > Claves de API). */
async function pingGemini(fetchImpl = fetch) {
  const apiKey = getEnv('GEMINI_API_KEY');
  if (!apiKey) throw new Error('No hay una clave de Gemini configurada.');
  let res;
  try {
    res = await fetchImpl(`${GEMINI_URL}?pageSize=1`, {
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error('No se pudo conectar con Gemini. Revisa tu conexión a internet.');
  }
  if (res.ok) return { ok: true };
  const body = await res.text().catch(() => '');
  const reason = classifyGeminiStatus(res.status, body);
  throw new Error(PING_MESSAGE[reason] ?? `Gemini no respondió bien (error ${res.status}).`);
}

/** Trims model text to a single clean string of at most `max` characters, or null. */
function cleanText(value, max = 300) {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : null;
}

module.exports = {
  AIUnavailable, askJSON, tryAskJSON, pickProvider, pingGemini, cleanText,
  GEMINI_MODEL, GEMINI_FALLBACK_MODELS, CLAUDE_MODEL, PROVIDER_NAME, resetModelChain,
};
