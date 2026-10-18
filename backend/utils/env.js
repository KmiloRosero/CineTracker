const path = require('path');
const fs   = require('fs');

// backend/.env is gitignored and holds API keys for the main process only.
// Values are read on demand so a key added while the app runs is picked up.
const ENV_PATH = path.join(__dirname, '../.env');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const vars = {};
  fs.readFileSync(filePath, 'utf-8').split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) return;
    vars[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2').trim();
  });
  return vars;
}

const clean = (value) => (value && value.trim() ? value.trim() : null);

// Keys typed in the app (sealed in the database). Loaded lazily: the
// database may not be open yet, and the service requires this module's users.
function appKey(name) {
  try {
    return require('../services/apiKeyService.js').getStoredKey(name);
  } catch {
    return null;
  }
}

/**
 * Where a variable comes from: 'process' (environment, used by tests),
 * 'app' (typed in the app), 'file' (backend/.env) or null when unset.
 */
function getEnvSource(name) {
  if (process.env[name] !== undefined) return clean(process.env[name]) ? 'process' : null;
  if (appKey(name)) return 'app';
  return clean(parseEnvFile(ENV_PATH)[name]) ? 'file' : null;
}

/** Returns the variable from process.env, the app's saved keys or backend/.env, or null if unset. */
function getEnv(name) {
  if (process.env[name] !== undefined) return clean(process.env[name]);
  return appKey(name) ?? clean(parseEnvFile(ENV_PATH)[name]);
}

module.exports = { getEnv, getEnvSource };
