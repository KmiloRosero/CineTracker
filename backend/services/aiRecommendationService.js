const path = require('path');
const fs   = require('fs');

// Resolve @anthropic-ai/sdk from frontend/node_modules (same pattern as bcryptjs)
const frontendModules = path.resolve(__dirname, '../../frontend/node_modules');
if (!module.paths.includes(frontendModules)) {
  module.paths.unshift(frontendModules);
}

const titleRepository        = require('../repositories/titleRepository.js');
const { getRecommendations } = require('./recommendationService.js');

const MODEL      = 'claude-sonnet-4-6';
const TOP_N      = 5;
const MIN_RATED  = 3; // minimum watched+rated titles before using AI

function loadApiKey() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return null;
  const raw = fs.readFileSync(envPath, 'utf-8');
  const match = raw.match(/^ANTHROPIC_API_KEY\s*=\s*(.+)$/m);
  const key = match?.[1]?.trim();
  return key && key.length > 10 ? key : null;
}

function parseGenres(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch { return []; }
}

function buildPrompt(watched, pending) {
  const watchedList = watched
    .map((t) => {
      const genres = parseGenres(t.genres).join(', ') || 'unknown';
      return `- "${t.title}" (${t.type}, ${t.release_year ?? '?'}) | genres: ${genres} | rating: ${t.rating}/10`;
    })
    .join('\n');

  const pendingList = pending
    .map((t) => {
      const genres = parseGenres(t.genres).join(', ') || 'unknown';
      const synopsis = t.overview ? t.overview.slice(0, 120) + (t.overview.length > 120 ? '…' : '') : 'no synopsis';
      return `- id:${t.id} | "${t.title}" (${t.type}, ${t.release_year ?? '?'}) | genres: ${genres} | synopsis: ${synopsis}`;
    })
    .join('\n');

  return `The user has watched and rated these titles:\n${watchedList}\n\nFrom the following unwatched titles, pick the ${TOP_N} best matches for this user's taste:\n${pendingList}\n\nReturn ONLY a JSON array with exactly this shape, no markdown, no explanation:\n[{"title_id": <number>, "reason": "<one sentence>"}]`;
}

async function getAIRecommendations() {
  const apiKey = loadApiKey();

  // Fallback: no key configured
  if (!apiKey) {
    return { ...getRecommendations(), source: 'rule-based', fallbackReason: 'no-api-key' };
  }

  const allTitles = titleRepository.findAll();
  const watched   = allTitles.filter((t) => t.status === 'completed' && t.rating != null);
  const pending   = allTitles.filter((t) => t.status === 'pending');

  // Fallback: not enough data
  if (watched.length < MIN_RATED || pending.length === 0) {
    return { ...getRecommendations(), source: 'rule-based', fallbackReason: 'insufficient-data' };
  }

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client    = new Anthropic.default({ apiKey });

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: 'You are a movie and series recommendation engine. You respond ONLY with valid JSON arrays. No markdown, no code fences, no preamble, no explanation. Just the raw JSON array.',
      messages: [
        { role: 'user', content: buildPrompt(watched, pending) },
      ],
    });

    const raw = message.content?.[0]?.text?.trim() ?? '';

    // Strip any accidental markdown fences just in case
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed  = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) throw new Error('Claude did not return an array');

    // Build pending lookup map
    const pendingMap = Object.fromEntries(pending.map((t) => [t.id, t]));

    const recommendations = parsed
      .filter((item) => item.title_id && pendingMap[item.title_id])
      .slice(0, TOP_N)
      .map((item) => ({
        ...pendingMap[item.title_id],
        ai_reason: item.reason ?? null,
      }));

    if (recommendations.length === 0) {
      return { ...getRecommendations(), source: 'rule-based', fallbackReason: 'empty-ai-response' };
    }

    return { recommendations, reason: 'ok', source: 'ai' };
  } catch (err) {
    console.error('[aiRecommendationService] Claude call failed, falling back:', err.message);
    return { ...getRecommendations(), source: 'rule-based', fallbackReason: err.message };
  }
}

module.exports = { getAIRecommendations };
