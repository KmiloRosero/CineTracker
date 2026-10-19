// The installer published on GitHub: the same app with only the TMDB key
// (written by scripts/public-env.cjs), so search, trending, trailers and
// sagas work right after installing. Used by `npm run dist:win:public`.
const base = require('./electron-builder.json');

module.exports = {
  ...base,
  files: [
    ...base.files.map((entry) => (typeof entry === 'object' && entry.to === 'backend'
      ? { ...entry, filter: [...entry.filter, '!.env'] }
      : entry)),
    { from: 'build/public-env', to: 'backend', filter: ['.env'] },
  ],
  nsis:     { ...base.nsis, artifactName: 'CineTracker-Setup-${version}.${ext}' },
  portable: { ...base.portable, artifactName: 'CineTracker-Portable-${version}.${ext}' },
};
