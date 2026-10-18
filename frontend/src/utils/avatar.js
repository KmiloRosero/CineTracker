const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Turns a picked image file into a square, centre-cropped WebP data URL
 * (`size` px), small enough for the backend's avatar limit.
 */
export async function avatarFromFile(file, size = 256) {
  if (!ACCEPTED.includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP image.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('That image is larger than 10 MB.');

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('That file could not be read as an image.'));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL('image/webp', 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}
