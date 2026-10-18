const fs   = require('fs');
const path = require('path');

// Poster and backdrop images are served to the renderer through the custom
// `ctimg://<size>/<file>` protocol. The first request downloads the image
// from TMDB; every later request (also offline) is served from disk.
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const SIZES   = ['w92', 'w185', 'w342', 'w500', 'w780', 'w1280', 'original'];
const FILE_RE = /^[A-Za-z0-9_-]{1,80}\.(jpg|jpeg|png|webp)$/;
const TYPES   = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const TIMEOUT_MS = 10000;

/** Parses `ctimg://w342/abc.jpg` into { size, file }, or null when it is not a valid image reference. */
function parseImageUrl(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== 'ctimg:') return null;
  const size = parsed.hostname;
  const file = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!SIZES.includes(size) || !FILE_RE.test(file)) return null;
  return { size, file };
}

function contentTypeOf(file) {
  return TYPES[file.split('.').pop().toLowerCase()];
}

/**
 * Returns { buffer, contentType } for an image, from the cache directory when
 * present, otherwise downloaded from TMDB and written to the cache.
 */
async function getImage({ size, file }, { cacheDir, fetchImpl = fetch }) {
  const target = path.join(cacheDir, size, file);
  // parseImageUrl already restricts both parts; this guards against any future caller.
  if (!target.startsWith(path.join(cacheDir, size) + path.sep)) throw new Error('Ruta de imagen no válida.');

  if (fs.existsSync(target)) {
    return { buffer: await fs.promises.readFile(target), contentType: contentTypeOf(file) };
  }

  const res = await fetchImpl(`${TMDB_IMAGE_BASE}/${size}/${file}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Imagen no disponible (${res.status}).`);
  const buffer = Buffer.from(await res.arrayBuffer());

  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  // write to a temp file first so a crash never leaves a half-written image in the cache
  const temp = `${target}.${process.pid}.tmp`;
  await fs.promises.writeFile(temp, buffer);
  await fs.promises.rename(temp, target);
  return { buffer, contentType: contentTypeOf(file) };
}

module.exports = { parseImageUrl, getImage, SIZES };
