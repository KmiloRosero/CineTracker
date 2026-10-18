const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { parseImageUrl, getImage } = require('../services/imageCacheService.js');

let cacheDir;
beforeEach(() => { cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetracker-img-')); });
afterEach(() => fs.rmSync(cacheDir, { recursive: true, force: true }));

describe('image cache', () => {
  it('parses valid ctimg references', () => {
    expect(parseImageUrl('ctimg://w342/abc123.jpg')).toEqual({ size: 'w342', file: 'abc123.jpg' });
    expect(parseImageUrl('ctimg://w1280/back-drop_1.png')).toEqual({ size: 'w1280', file: 'back-drop_1.png' });
  });

  it('normalizes dot segments so a reference cannot leave its size folder', () => {
    expect(parseImageUrl('ctimg://w342/../../secret.jpg')).toEqual({ size: 'w342', file: 'secret.jpg' });
  });

  it.each([
    'ctimg://w342/%2e%2e%2fsecret.jpg',
    'ctimg://w342/dir/abc.jpg',
    'ctimg://huge/abc.jpg',
    'ctimg://w342/abc.exe',
    'https://image.tmdb.org/t/p/w342/abc.jpg',
    'not a url',
  ])('rejects unsafe or unknown reference %s', (url) => {
    expect(parseImageUrl(url)).toBeNull();
  });

  it('downloads once, then serves from disk (works offline)', async () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, arrayBuffer: async () => bytes });

    const first = await getImage({ size: 'w342', file: 'poster.jpg' }, { cacheDir, fetchImpl });
    expect(first.contentType).toBe('image/jpeg');
    expect(fetchImpl).toHaveBeenCalledWith('https://image.tmdb.org/t/p/w342/poster.jpg', expect.any(Object));
    expect(fs.existsSync(path.join(cacheDir, 'w342', 'poster.jpg'))).toBe(true);

    const offline = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const second = await getImage({ size: 'w342', file: 'poster.jpg' }, { cacheDir, fetchImpl: offline });
    expect(Buffer.compare(second.buffer, bytes)).toBe(0);
    expect(offline).not.toHaveBeenCalled();
  });

  it('does not cache failed downloads', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(getImage({ size: 'w92', file: 'missing.jpg' }, { cacheDir, fetchImpl })).rejects.toThrow('no disponible');
    expect(fs.existsSync(path.join(cacheDir, 'w92', 'missing.jpg'))).toBe(false);
  });
});
