const settings = require('../repositories/settingsRepository.js');
const { seal, unseal, canSeal } = require('../utils/secrets.js');

// API keys can be typed in Profile > Claves de API. They are stored sealed
// (see utils/secrets.js) and take precedence over backend/.env, so a build
// can ship without keys and each person adds their own.
const KEYS = {
  tmdb:   { env: 'TMDB_API_KEY',   label: 'TMDB' },
  gemini: { env: 'GEMINI_API_KEY', label: 'Gemini' },
};

const settingKey = (name) => `apikey:${name}`;
const KEY_FORMAT = /^[\x21-\x7E]{16,200}$/; // printable ASCII, no spaces

function requireName(name) {
  if (!Object.prototype.hasOwnProperty.call(KEYS, name)) throw new Error('Clave de API desconocida.');
}

/** The key saved in the app for an env variable name, or null. */
function getStoredKey(envName) {
  const name = Object.keys(KEYS).find((k) => KEYS[k].env === envName);
  if (!name) return null;
  return unseal(settings.get(settingKey(name)));
}

function hasStoredKey(name) {
  return settings.get(settingKey(name)) !== null;
}

function setKey(name, value) {
  requireName(name);
  const clean = typeof value === 'string' ? value.trim() : '';
  if (!KEY_FORMAT.test(clean)) {
    throw new Error(`La clave de ${KEYS[name].label} no parece válida: debe tener entre 16 y 200 caracteres, sin espacios.`);
  }
  if (!canSeal()) throw new Error('Este equipo no permite guardar claves cifradas.');
  settings.set(settingKey(name), seal(clean));
  return { ok: true };
}

function clearKey(name) {
  requireName(name);
  settings.remove(settingKey(name));
  return { ok: true };
}

module.exports = { KEYS, getStoredKey, hasStoredKey, setKey, clearKey };
