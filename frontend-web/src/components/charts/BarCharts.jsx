import React, { useId, useState } from 'react';

/*
 * Small dependency-free bar charts (HTML, not canvas) for the admin dashboard.
 * Rules followed: one axis, thin bars with a rounded data end, a 2px surface gap between
 * stacked segments, values in text colours (never the series colour), a legend for 2+ series,
 * a hover/focus tooltip, and a table view so no value is only visible on hover.
 * Colours come from --chart-* tokens (validated for colour-blind separation in light + dark).
 */

const fmt = (n) => Number(n || 0).toLocaleString('en-LK');

/** Tooltip shown next to the hovered/focused bar. */
const Tip = ({ tip }) => (tip ? (
  <div className="chart-tip" role="status" style={{ left: tip.x, top: tip.y }}>
    {tip.rows.map((r) => (
      <div key={r.label} className="chart-tip-row">
        {r.color && <span className="chart-key-line" style={{ background: r.color }} aria-hidden="true" />}
        <strong>{fmt(r.value)}</strong> <span className="muted">{r.label}</span>
      </div>
    ))}
    {tip.title && <div className="text-xs muted" style={{ marginTop: 2 }}>{tip.title}</div>}
  </div>
) : null);

// Position the tooltip above the hovered element, relative to the chart box.
const tipAt = (e, box) => {
  const r = e.currentTarget.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  return { x: Math.min(Math.max(r.left - b.left + r.width / 2, 70), b.width - 70), y: r.top - b.top - 8 };
};

/** Collapsible accessible table with the same numbers as the chart. */
const TableView = ({ caption, columns, rows }) => (
  <details className="chart-table">
    <summary>Show as table</summary>
    <div className="table-wrap" style={{ marginTop: 8 }}>
      <table className="table">
        <caption className="sr-only">{caption}</caption>
        <thead><tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell, i) => (i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>))}</tr>)}</tbody>
      </table>
    </div>
  </details>
);

/**
 * Single-series horizontal bars (magnitude comparison). No legend: the title names the series.
 * data: [{ label, value, onClick? }]
 */
export const HBarChart = ({ title, data, unit = '' }) => {
  const [tip, setTip] = useState(null);
  const id = useId();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className="chart" aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="sr-only">{title}</figcaption>
      <div className="chart-box" onMouseLeave={() => setTip(null)}>
        {data.map((d) => {
          const show = (e) => setTip({ ...tipAt(e, e.currentTarget.closest('.chart-box')), rows: [{ label: unit || d.label, value: d.value }], title: unit ? d.label : '' });
          return (
            <div key={d.label} className="hbar-row">
              <span className="hbar-label">{d.label}</span>
              <div className="hbar-track">
                <button
                  type="button"
                  className="hbar"
                  style={{ width: `${(d.value / max) * 100}%`, background: 'var(--chart-accent)' }}
                  aria-label={`${d.label}: ${fmt(d.value)} ${unit}`.trim()}
                  onMouseEnter={show}
                  onFocus={show}
                  onBlur={() => setTip(null)}
                  onClick={d.onClick}
                  disabled={!d.onClick}
                />
                <span className="hbar-value">{fmt(d.value)}</span>
              </div>
            </div>
          );
        })}
        <Tip tip={tip} />
      </div>
      <TableView caption={title} columns={['', unit || 'Value']} rows={data.map((d) => [d.label, fmt(d.value)])} />
    </figure>
  );
};

/**
 * 100% stacked horizontal bars (part-to-whole per row) with a legend and direct labels.
 * series: [{ key, label, color }]  rows: [{ label, values: { [key]: number }, onClick?(key) }]
 */
export const StackedBarChart = ({ title, series, rows }) => {
  const [tip, setTip] = useState(null);
  const id = useId();
  return (
    <figure className="chart" aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="sr-only">{title}</figcaption>
      <ul className="chart-legend" aria-label="Legend">
        {series.map((s) => (
          <li key={s.key}><span className="chart-key" style={{ background: s.color }} aria-hidden="true" />{s.label}</li>
        ))}
      </ul>
      <div className="chart-box" onMouseLeave={() => setTip(null)}>
        {rows.map((row) => {
          const total = series.reduce((sum, s) => sum + (row.values[s.key] || 0), 0);
          const show = (e) => setTip({
            ...tipAt(e, e.currentTarget.closest('.chart-box')),
            title: `${row.label} · ${fmt(total)} total`,
            rows: series.map((s) => ({ label: s.label, value: row.values[s.key] || 0, color: s.color }))
          });
          return (
            <div key={row.label} className="hbar-row">
              <span className="hbar-label">{row.label}</span>
              <div className="stack-track">
                {total === 0 ? (
                  <span className="text-xs muted">No accounts yet</span>
                ) : series.map((s) => {
                  const v = row.values[s.key] || 0;
                  if (!v) return null;
                  const pct = (v / total) * 100;
                  return (
                    <button
                      type="button"
                      key={s.key}
                      className="stack-seg"
                      style={{ flexBasis: `${pct}%`, background: s.color }}
                      aria-label={`${row.label}, ${s.label}: ${fmt(v)} of ${fmt(total)}`}
                      onMouseEnter={show}
                      onFocus={show}
                      onBlur={() => setTip(null)}
                      onClick={() => row.onClick?.(s.key)}
                    />
                  );
                })}
              </div>
              {/* Direct labels in text colour; the coloured key carries identity */}
              <span className="stack-summary">
                {series.map((s) => (
                  <span key={s.key}><span className="chart-key" style={{ background: s.color }} aria-hidden="true" /><strong>{fmt(row.values[s.key] || 0)}</strong> {s.label.toLowerCase()}</span>
                ))}
              </span>
            </div>
          );
        })}
        <Tip tip={tip} />
      </div>
      <TableView
        caption={title}
        columns={['', ...series.map((s) => s.label), 'Total']}
        rows={rows.map((r) => [r.label, ...series.map((s) => fmt(r.values[s.key] || 0)), fmt(series.reduce((sum, s) => sum + (r.values[s.key] || 0), 0))])}
      />
    </figure>
  );
};
