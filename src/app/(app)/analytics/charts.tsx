"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type StationDatum = { code: string; name: string; total: number };
type DowDatum = { day: string; total: number };

const tooltipStyle = {
  backgroundColor: "#13171c",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  fontSize: 12,
};

export function StationChart({ data }: { data: StationDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ left: -20, right: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
        <XAxis dataKey="code" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toFixed(2)}`, "Total"]} />
        <Bar dataKey="total" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DowChart({ data }: { data: DowDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ left: -20, right: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
        <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toFixed(2)}`, "Total"]} />
        <Bar dataKey="total" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
