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

/** Returns the variable from process.env or backend/.env, or null if unset. */
function getEnv(name) {
  const value = process.env[name] ?? parseEnvFile(ENV_PATH)[name];
  return value && value.trim() ? value.trim() : null;
}

module.exports = { getEnv };
