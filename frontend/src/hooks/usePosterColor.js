import { useEffect, useState } from 'react';

const FALLBACK = '#018751';

function toHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

/**
 * Samples a poster and returns its most saturated dominant hue as an HSL
 * colour, pushed to a vivid mid tone so the field reads as colour around the poster.
 * Falls back to the brand green when the image cannot be read.
 */
export function usePosterColor(src) {
  const [color, setColor] = useState(FALLBACK);

  useEffect(() => {
    if (!src) { setColor(FALLBACK); return undefined; }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 24; canvas.height = 36;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Weight each pixel by its saturation so a vivid accent beats a large grey area.
        const buckets = new Array(12).fill(null).map(() => ({ w: 0, s: 0, h: 0 }));
        for (let i = 0; i < data.length; i += 4) {
          const [h, s, l] = toHsl(data[i], data[i + 1], data[i + 2]);
          if (l < 0.08 || l > 0.92) continue;
          const weight = s * (1 - Math.abs(l - 0.5));
          const b = buckets[Math.floor(h / 30) % 12];
          b.w += weight; b.s += s * weight; b.h += h * weight;
        }
        const best = buckets.reduce((a, b) => (b.w > a.w ? b : a));
        if (!cancelled) {
          if (best.w < 1) { setColor(FALLBACK); return; }
          const hue = Math.round(best.h / best.w);
          const sat = Math.round(Math.min(0.85, Math.max(0.55, best.s / best.w)) * 100);
          setColor(`hsl(${hue} ${sat}% 44%)`);
        }
      } catch {
        if (!cancelled) setColor(FALLBACK); // tainted canvas or decode error
      }
    };
    img.onerror = () => { if (!cancelled) setColor(FALLBACK); };
    img.src = src;
    return () => { cancelled = true; };
  }, [src]);

  return color;
}
