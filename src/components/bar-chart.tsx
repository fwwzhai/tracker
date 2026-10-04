"use client";

import { useState } from "react";

/**
 * Single-series bar chart, hand rolled SVG. One accent hue, 4px rounded tops, 2px gaps,
 * optional dashed reference line (daily budget or steps goal). Tap or hover a bar for its value.
 */
export function BarChart({
  values,
  labels,
  format,
  reference,
  highlight,
  height = 96,
  ariaLabel,
}: {
  values: number[];
  labels: string[];
  format: (v: number) => string;
  reference?: number;
  highlight?: number;
  height?: number;
  ariaLabel: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, reference ?? 0, ...values) * 1.08;
  const n = values.length;
  const W = 100;
  const gap = n > 14 ? 0.6 : 2;
  const bw = (W - gap * (n - 1)) / n;
  const y = (v: number) => height - (v / max) * height;
  const shown = active ?? highlight ?? null;

  return (
    <figure aria-label={ariaLabel}>
      <div className="mb-2 h-5 text-sm">
        {shown != null && (
          <span>
            <span className="text-muted">{labels[shown]}</span> <span className="num text-base">{format(values[shown])}</span>
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height }} role="img" aria-label={ariaLabel}>
        <line x1={0} x2={W} y1={height - 0.5} y2={height - 0.5} stroke="var(--line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {values.map((v, i) => {
          const x = i * (bw + gap);
          const h = Math.max(v > 0 ? 2 : 0, height - y(v));
          const on = i === shown;
          return (
            <g key={i} onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} onClick={() => setActive(i)}>
              <rect x={x - gap / 2} y={0} width={bw + gap} height={height} fill="transparent" />
              <rect
                x={x}
                y={height - h}
                width={bw}
                height={h}
                rx={Math.min(bw / 2, 1.2)}
                fill={on ? "var(--ink)" : "var(--accent)"}
                opacity={highlight != null && i > highlight ? 0.35 : 1}
                style={{ transition: "y 180ms ease-out, height 180ms ease-out" }}
              />
            </g>
          );
        })}
        {reference != null && reference > 0 && (
          <line x1={0} x2={W} y1={y(reference)} y2={y(reference)} stroke="var(--muted)" strokeDasharray="3 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{labels[0]}</span>
        <span>{labels[n - 1]}</span>
      </div>
      <table className="sr-only">
        <tbody>
          {values.map((v, i) => (
            <tr key={i}><td>{labels[i]}</td><td>{format(v)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
