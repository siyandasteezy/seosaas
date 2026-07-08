"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const axisStyle = { fontSize: 11, fill: "#64748b" };

/** Keyword position over time — lower is better, so the Y axis is reversed. */
export function RankTrendChart({
  data,
}: {
  data: { date: string; [keyword: string]: number | string | null }[];
}) {
  const keywordNames = data.length
    ? Object.keys(data[0]).filter((k) => k !== "date")
    : [];
  const palette = ["#4f46e5", "#0891b2", "#d97706", "#dc2626", "#059669", "#7c3aed"];
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={axisStyle} />
        <YAxis reversed domain={[1, "dataMax"]} allowDecimals={false} tick={axisStyle} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {keywordNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={palette[i % palette.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** GSC clicks & impressions or GA4 sessions over time. */
export function TrafficChart({
  data,
  series,
}: {
  data: Record<string, string | number>[];
  series: { key: string; label: string; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={axisStyle} />
        <YAxis tick={axisStyle} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            fill={s.color}
            fillOpacity={0.12}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Distribution of current keyword positions into buckets (1-3, 4-10, ...). */
export function PositionDistributionChart({
  data,
}: {
  data: { bucket: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -22 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="bucket" tick={axisStyle} />
        <YAxis allowDecimals={false} tick={axisStyle} />
        <Tooltip />
        <Bar dataKey="count" name="Keywords" fill="#4f46e5" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Small SVG donut for health scores. */
export function ScoreRing({ score, size = 96 }: { score: number | null; size?: number }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const pct = score ?? 0;
  const color = pct >= 80 ? "#059669" : pct >= 50 ? "#d97706" : "#dc2626";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={score == null ? "#cbd5e1" : color}
        strokeWidth={8}
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={size / 4.5}
        fontWeight={700}
        fill={score == null ? "#94a3b8" : color}
      >
        {score ?? "—"}
      </text>
    </svg>
  );
}
