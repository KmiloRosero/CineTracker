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

async function askGemini(apiKey, { system, prompt, schema, maxTokens }, fetchImpl = fetch) {
  const model = getEnv('GEMINI_MODEL') ?? GEMINI_MODEL;
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
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new AIUnavailable('offline', err?.message); // network failure or timeout
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new AIUnavailable(classifyGeminiStatus(res.status, body), `HTTP ${res.status}: ${body.slice(0, 200)}`);
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
    ? await askGemini(picked.apiKey, spec, options.fetch)
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
  GEMINI_MODEL, CLAUDE_MODEL, PROVIDER_NAME,
};
