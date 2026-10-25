// Same build as electron-builder.json but without backend/.env, so the
// installer carries no API keys: whoever installs it adds their own in
// Perfil > Claves de API. Used by `npm run dist:win:nokeys`.
const base = require('./electron-builder.json');

module.exports = {
  ...base,
  files: base.files.map((entry) => (typeof entry === 'object' && entry.to === 'backend'
    ? { ...entry, filter: [...entry.filter, '!.env'] }
    : entry)),
  nsis:     { ...base.nsis, artifactName: 'CineTracker-Setup-${version}-sin-claves.${ext}' },
  portable: { ...base.portable, artifactName: 'CineTracker-Portable-${version}-sin-claves.${ext}' },
  dmg:      { artifactName: 'CineTracker-${version}-mac-${arch}-sin-claves.${ext}' },
  appImage: { artifactName: 'CineTracker-${version}-linux-${arch}-sin-claves.${ext}' },
};
