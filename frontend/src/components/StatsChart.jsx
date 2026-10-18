import React from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList,
} from 'recharts';

// Chart chrome follows the dataviz rules: one series = one colour (the accent),
// hairline solid grid, bars ≤ 24px with a 4px rounded data end, values in
// text tokens, a tooltip that adds detail but never gates it, and a table view.

const AXIS_TICK = { fill: 'var(--text-secondary)', fontSize: 13, fontFamily: 'var(--font-num)', fontWeight: 600 };

function ChartTooltip({ active, payload, label, unit, labelFormatter }) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip__value">{value}{unit ? ` ${unit}` : ''}</span>
      <span className="chart-tooltip__label">{labelFormatter ? labelFormatter(label) : label}</span>
    </div>
  );
}

/** Table twin of a chart, collapsed by default. */
export function ChartTable({ caption, columns, rows }) {
  return (
    <details className="chart-table">
      <summary>Show as table</summary>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead><tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => <tr key={i}>{r.map((cell, j) => (j === 0 ? <th key={j} scope="row">{cell}</th> : <td key={j}>{cell}</td>))}</tr>)}
        </tbody>
      </table>
    </details>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function monthLabel(key, withYear = false) {
  const [y, m] = key.split('-').map(Number);
  return withYear ? `${MONTHS[m - 1]} ${y}` : MONTHS[m - 1];
}

/** Completed watches per month (columns), labelling only the peak and the current month. */
export function MonthlyColumns({ data }) {
  const reduceMotion = useReducedMotion();
  const peak = data.reduce((best, d, i) => (d.n > data[best].n ? i : best), 0);
  const last = data.length - 1;
  const showLabel = (i) => data[i].n > 0 && (i === peak || i === last);

  return (
    <div className="chart" role="img" aria-label={`Completed watches per month for the last ${data.length} months. Peak: ${data[peak]?.n ?? 0} in ${monthLabel(data[peak]?.month ?? '2000-01', true)}.`}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: -12 }} barCategoryGap="30%">
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="month" tickFormatter={(m) => monthLabel(m)} tick={AXIS_TICK} axisLine={{ stroke: 'var(--border-strong)' }} tickLine={false} interval={0} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            cursor={{ fill: 'var(--bg-hover)' }}
            content={<ChartTooltip unit="watched" labelFormatter={(m) => monthLabel(m, true)} />}
          />
          <Bar dataKey="n" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={!reduceMotion} animationDuration={700} animationEasing="ease-out">
            <LabelList
              dataKey="n"
              position="top"
              content={({ x, y, width, value, index }) => (showLabel(index)
                ? <text x={x + width / 2} y={y - 8} textAnchor="middle" className="chart-label">{value}</text>
                : null)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Titles per genre (horizontal bars), value at each bar's tip. */
export function GenreBars({ data }) {
  const reduceMotion = useReducedMotion();
  const height = Math.max(160, data.length * 34 + 16);
  return (
    <div className="chart" role="img" aria-label={`Titles per genre. Most common: ${data[0]?.genre} with ${data[0]?.n}.`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }} barCategoryGap="28%">
          {/* every bar is labelled at its tip, so the value axis and its grid are omitted */}
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="genre" tick={AXIS_TICK} axisLine={{ stroke: 'var(--border-strong)' }} tickLine={false} width={124} />
          <Tooltip cursor={{ fill: 'var(--bg-hover)' }} content={<ChartTooltip unit="titles" />} />
          <Bar dataKey="n" fill="var(--accent)" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={!reduceMotion} animationDuration={700} animationEasing="ease-out">
            <LabelList dataKey="n" position="right" className="chart-label" offset={8} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Status order keeps green and amber apart (validated for colour-vision deficiency).
export const STATUS_ORDER = [
  { key: 'watching',  label: 'Watching' },
  { key: 'completed', label: 'Completed' },
  { key: 'pending',   label: 'Pending' },
  { key: 'dropped',   label: 'Dropped' },
];

/** Part-to-whole bar of titles by status, with a labelled legend (never colour alone). */
export function StatusBar({ totals }) {
  const reduceMotion = useReducedMotion();
  const total = STATUS_ORDER.reduce((sum, s) => sum + (totals[s.key] ?? 0), 0);
  if (total === 0) return null;
  return (
    <div className="status-bar">
      <div className="status-bar__track" role="img" aria-label={STATUS_ORDER.map((s) => `${s.label}: ${totals[s.key] ?? 0}`).join(', ')}>
        {STATUS_ORDER.filter((s) => totals[s.key] > 0).map((s, i) => (
          <span
            key={s.key}
            className={`status-bar__segment status-bar__segment--${s.key}`}
            style={{
              flexGrow: totals[s.key],
              animationDelay: reduceMotion ? '0ms' : `${i * 80}ms`,
            }}
            title={`${s.label}: ${totals[s.key]} (${Math.round((totals[s.key] / total) * 100)}%)`}
          />
        ))}
      </div>
      <ul className="status-bar__legend">
        {STATUS_ORDER.map((s) => (
          <li key={s.key}>
            <span className={`status-bar__swatch status-bar__segment--${s.key}`} aria-hidden="true" />
            <span className="status-bar__name">{s.label}</span>
            <span className="status-bar__count">{totals[s.key] ?? 0}</span>
            <span className="status-bar__share">{Math.round(((totals[s.key] ?? 0) / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
