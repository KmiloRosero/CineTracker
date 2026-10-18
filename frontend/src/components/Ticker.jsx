import React from 'react';
import { useCountUp } from '../hooks/useCountUp';

// The broadcast ticker: a black strip led by a green tag slab. Used for the
// key numbers (Home stage, Statistics) and the trending crawl (guest Home).

/** Signed change rounded to `decimals`, or null when it is zero or unknown. */
export function trendOf(pair, decimals = 0) {
  if (!pair || pair.current == null || pair.previous == null) return null;
  const diff = Number((pair.current - pair.previous).toFixed(decimals));
  return diff === 0 ? null : diff;
}

function TickerStat({ label, value, decimals = 0, suffix = '', trend }) {
  const shown = useCountUp(value ?? 0, { decimals });
  return (
    <div className="ticker__stat">
      <span className="ticker__value">{value == null ? '–' : `${shown}${suffix}`}</span>
      <span className="ticker__label">{label}</span>
      {trend != null && (
        <span
          className={`ticker__trend ${trend > 0 ? 'is-up' : 'is-down'}`}
          title={`${Math.abs(trend)} ${trend > 0 ? 'more' : 'less'} than last month`}
        >
          {trend > 0 ? `+${trend}` : trend}
          <span className="sr-only"> vs last month</span>
        </span>
      )}
    </div>
  );
}

/**
 * Key numbers as a ticker. `items`: [{ label, value, decimals?, suffix?, trend? }].
 * `sub` is the small line under the tag (what the deltas compare against).
 */
export function StatTicker({ tag, sub, items, label, standalone = false }) {
  return (
    <div className={`ticker${standalone ? ' ticker--standalone' : ''}`} aria-label={label ?? tag}>
      <span className="ticker__tag">{tag}{sub && <small>{sub}</small>}</span>
      <div className="ticker__stats">
        {items.map((item) => <TickerStat key={item.label} {...item} />)}
      </div>
    </div>
  );
}

/** Names crawling across the strip, paused on hover and still under reduced motion. */
export function CrawlTicker({ tag, names }) {
  return (
    <div className="ticker" aria-label={tag}>
      <span className="ticker__tag">{tag}</span>
      <div className="ticker__crawl" aria-hidden="true">
        {/* two copies make the crawl loop seamlessly */}
        <div className="ticker__crawl-track">
          {[...names, ...names].map((name, i) => <span key={i}>{name}</span>)}
        </div>
      </div>
      <p className="sr-only">{names.join(', ')}</p>
    </div>
  );
}
