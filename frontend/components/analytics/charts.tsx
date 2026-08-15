"use client";

import { useMemo } from "react";

const COLORS = [
  "var(--color-gold)",
  "#4f8ef7",
  "#38c172",
  "#f6993f",
  "#e74c3c",
  "#9f7aea",
  "#4dc0b5",
  "#e67e22",
  "#3490dc",
  "#6574cd",
];

function formatValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function DonutChart({
  value,
  max = 100,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  color = "var(--color-gold)",
  trackColor = "var(--color-surface-tertiary)",
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
  trackColor?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const offset = circumference * (1 - ratio);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-bold text-text-primary" style={{ fontSize: size / 5 }}>
          {label ?? `${Math.round(ratio * 100)}%`}
        </span>
        {sublabel && <span className="text-[10px] text-text-secondary">{sublabel}</span>}
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  color = "var(--color-gold)",
  className = "",
}: {
  value: number;
  max?: number;
  color?: string;
  className?: string;
}) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  return (
    <div className={`h-2 bg-surface-tertiary rounded-full overflow-hidden ${className}`}>
      <div className="h-full rounded-full transition-all" style={{ width: `${ratio * 100}%`, backgroundColor: color }} />
    </div>
  );
}

export function BarChart({
  data,
  color = "var(--color-gold)",
  height = 160,
  valueSuffix = "",
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  valueSuffix?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="w-full">
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
            <span className="text-[9px] text-text-secondary mb-0.5 truncate max-w-full">{formatValue(d.value)}</span>
            <div
              className="w-full rounded-t transition-all"
              style={{ height: `${Math.max((d.value / max) * 100, 1.5)}%`, backgroundColor: color, opacity: 0.85 }}
              title={`${d.label}: ${d.value}${valueSuffix}`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-text-secondary truncate" title={d.label}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({
  data,
  height = 160,
  color = "var(--color-gold)",
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const width = 100;
  const { points, min, max } = useMemo(() => {
    const values = data.map((d) => d.value);
    const lo = Math.min(...values, 0);
    const hi = Math.max(...values, 1);
    const range = hi - lo || 1;
    const pts = data.map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * width;
      const y = height - ((d.value - lo) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return { points: pts.join(" "), min: lo, max: hi };
  }, [data, height]);

  if (data.length === 0) return null;

  const area = `${width},${height} ${points} 0,${height}`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        <defs>
          <linearGradient id="linechart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#linechart-fill)" />
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {data.map((d, i) => {
          const x = (i / Math.max(data.length - 1, 1)) * width;
          const y = height - ((d.value - min) / (max - min || 1)) * height;
          return <circle key={i} cx={x} cy={y} r="1" fill={color} vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="flex justify-between mt-1">
        {data.length <= 12 ? (
          data.map((d, i) => (
            <span key={i} className="text-[9px] text-text-secondary truncate" title={`${d.label}: ${d.value}`}>
              {d.label}
            </span>
          ))
        ) : (
          <>
            <span className="text-[9px] text-text-secondary">{data[0]?.label}</span>
            <span className="text-[9px] text-text-secondary">{data[data.length - 1]?.label}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function DonutSeries({
  data,
  size = 160,
  strokeWidth = 18,
  centerLabel,
  centerSub,
}: {
  data: { label: string; value: number }[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const total = Math.max(data.reduce((acc, d) => acc + d.value, 0), 1);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    return data.map((d, i) => {
      const prevValue = data.slice(0, i).reduce((sum, x) => sum + x.value, 0);
      const length = (d.value / total) * circumference;
      const offset = circumference - (prevValue / total) * circumference;
      return { key: i, label: d.label, value: d.value, length, offset, color: COLORS[i % COLORS.length] };
    });
  }, [data, total, circumference]);

  return (
    <div className="flex items-center gap-4">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-surface-tertiary)" strokeWidth={strokeWidth} />
          {segments.map((seg) => {
            return (
              <circle
                key={seg.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.length} ${circumference - seg.length}`}
                strokeDashoffset={seg.offset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold text-text-primary">{centerLabel}</span>
          {centerSub && <span className="text-[10px] text-text-secondary">{centerSub}</span>}
        </div>
      </div>
      <div className="space-y-1.5 flex-1 min-w-0">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-text-secondary truncate">{d.label}</span>
            <span className="ml-auto font-medium text-text-primary">{((d.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HorizontalBars({
  data,
  currency = "",
  height = 24,
}: {
  data: { label: string; value: number; color?: string }[];
  currency?: string;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-32 text-xs text-text-secondary truncate shrink-0" title={d.label}>{d.label}</span>
          <div className="flex-1 bg-surface-tertiary rounded-full overflow-hidden" style={{ height }}>
            <div
              className={`h-full rounded-full ${d.value >= 0 ? "bg-gold" : "bg-danger"}`}
              style={{ width: `${Math.min(Math.abs(d.value) / max, 1) * 100}%`, backgroundColor: d.color }}
            />
          </div>
          <span className="w-24 text-xs font-medium text-text-primary text-right shrink-0">
            {d.value.toLocaleString()} {currency}
          </span>
        </div>
      ))}
    </div>
  );
}

export { formatValue };
