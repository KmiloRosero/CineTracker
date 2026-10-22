// Shared wording for AI-backed features: who wrote a result and, when the
// rules stood in for the model, why.

export const AI_NAME = { gemini: 'Gemini', claude: 'Claude' };

/** Display name of the provider behind a result ("Gemini", "Claude" or "la IA"). */
export const aiName = (result) => AI_NAME[result?.provider] ?? 'la IA';

const WHY = {
  'no-api-key':        () => 'Agrega una clave de Gemini en Perfil > Claves de API para que la IA escriba esto.',
  'insufficient-data': () => 'Aún hay pocos títulos calificados para pedírselo a la IA.',
  'offline':           (ai) => `No se pudo conectar con ${ai} (revisa tu conexión).`,
  'rate-limited':      (ai) => `${ai} está ocupado ahora mismo; prueba de nuevo en un minuto.`,
  'invalid-api-key':   (ai) => `La clave de ${ai} fue rechazada.`,
  'api-permission':    (ai) => `La clave de ${ai} no puede usar este modelo.`,
  'api-error':         (ai) => `${ai} devolvió un error.`,
  'refused':           (ai) => `${ai} rechazó la solicitud.`,
  'invalid-response':  (ai) => `No se pudo usar la respuesta de ${ai}.`,
  'empty-ai-response': (ai) => `${ai} no dio una respuesta útil.`,
};

/**
 * Why a result was written by rules instead of the AI, followed by `rest`
 * (what the rules did instead). Null when the AI wrote it.
 */
export function fallbackNote(result, rest = '') {
  if (!result || result.source !== 'rule-based') return null;
  const why = WHY[result.fallbackReason]?.(aiName(result)) ?? '';
  return `${why} ${rest}`.trim() || null;
}

/** "Escrito por Gemini" / "Calculado con reglas", for source lines and lower-thirds. */
export function sourceLabel(result, { ai = 'Elegida por', rules = 'Según tus géneros' } = {}) {
  return result?.source === 'ai' ? `${ai} ${aiName(result)}` : rules;
}

export function unwrap(result) {
  if (result?.error) throw new Error(result.error);
  return result;
}
