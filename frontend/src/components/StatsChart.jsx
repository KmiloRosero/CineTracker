import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line,
} from 'recharts';

const TOOLTIP_STYLE = {
  background:   'var(--bg-surface)',
  border:       '1px solid var(--border-strong)',
  borderRadius: 6,
  color:        'var(--text-primary)',
  fontSize:     12,
  boxShadow:    '0 4px 14px rgba(0,0,0,.5)',
};

export function BarChartCard({ title, data, color = 'var(--accent)', dataKey = 'value', nameKey = 'name' }) {
  if (!data || data.length === 0) {
    return (
      <div className="stats-chart stats-chart--empty">
        {title && <p className="stats-chart__title">{title}</p>}
        <p>No data available</p>
      </div>
    );
  }

  return (
    <figure className="stats-chart">
      {title && <figcaption className="stats-chart__title">{title}</figcaption>}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey={nameKey}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--bg-input)' }} />
          <Bar
            dataKey={dataKey}
            fill={color}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
            isAnimationActive
            animationDuration={600}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}

export function LineChartCard({ title, data, color = 'var(--accent-secondary)', dataKey = 'value', nameKey = 'name' }) {
  if (!data || data.length === 0) {
    return (
      <div className="stats-chart stats-chart--empty">
        {title && <p className="stats-chart__title">{title}</p>}
        <p>No data available</p>
      </div>
    );
  }

  return (
    <figure className="stats-chart">
      {title && <figcaption className="stats-chart__title">{title}</figcaption>}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey={nameKey}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4, fill: color }}
            activeDot={{ r: 6 }}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}

export default function StatsChart({ data = [], title, color = 'var(--accent)', unit = '' }) {
  if (!data.length) {
    return <div className="stats-chart stats-chart--empty"><p>No data available</p></div>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <figure className="stats-chart" aria-label={title}>
      {title && <figcaption className="stats-chart__title">{title}</figcaption>}
      <div className="stats-chart__bars" role="list">
        {data.map((item) => (
          <div key={item.label} className="stats-chart__bar-row" role="listitem">
            <span className="stats-chart__label">{item.label}</span>
            <div className="stats-chart__track">
              <div
                className="stats-chart__fill"
                style={{ width: `${(item.value / max) * 100}%`, backgroundColor: color }}
                role="progressbar"
                aria-valuenow={item.value}
                aria-valuemin={0}
                aria-valuemax={max}
              />
            </div>
            <span className="stats-chart__value">{item.value} {unit}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
