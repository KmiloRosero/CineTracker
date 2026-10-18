import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Animates a number from 0 to `target` with an exponential ease-out.
 * Returns the target immediately when the user prefers reduced motion.
 */
export function useCountUp(target, { duration = 900, decimals = 0 } = {}) {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    if (target == null || Number.isNaN(Number(target))) { setValue(target); return undefined; }
    if (reduceMotion) { setValue(target); return undefined; }

    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(Number(target) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduceMotion]);

  if (value == null) return null;
  return Number(value).toFixed(decimals);
}
