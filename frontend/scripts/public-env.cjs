// Writes the env file shipped in the public installer (npm run dist:win:public):
// only the TMDB key, so the app works as soon as it is installed, while the
// Gemini key (it spends the owner's quota) stays out of a downloadable build.
// Whoever wants AI picks adds their own Gemini key in Perfil > Claves de API.
const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '../../backend/.env');
const outDir = path.resolve(__dirname, '../build/public-env');

const match = fs.existsSync(source) && fs.readFileSync(source, 'utf8').match(/^\s*TMDB_API_KEY\s*=\s*(.+?)\s*$/m);
if (!match || !match[1].replace(/^(['"])(.*)\1$/, '$2').trim()) {
  console.error('backend/.env has no TMDB_API_KEY; the public build needs it.');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, '.env'),
  `# Bundled in the public installer: TMDB only. Gemini is added by each user in the app.\nTMDB_API_KEY=${match[1].trim()}\n`,
);
console.log('public env written with: TMDB_API_KEY');
