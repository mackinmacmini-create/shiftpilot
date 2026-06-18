"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WeeklyEarning {
  week: string;
  gross: number;
  tips: number;
  total: number;
}

interface EarningsChartProps {
  data: WeeklyEarning[];
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function EarningsChart({ data }: EarningsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-sm text-slate-500">
        No earnings data yet — add your first entry to see trends.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    weekLabel: formatWeekLabel(d.week),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
        <XAxis
          dataKey="weekLabel"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#13171c",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            color: "#e2e8f0",
            fontSize: 12,
          }}
          formatter={(value: number, name: string) => [
            `$${value.toFixed(2)}`,
            name === "total" ? "Total" : name === "gross" ? "Base pay" : "Tips",
          ]}
          labelFormatter={(label) => `Week of ${label}`}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#2dd4bf"
          strokeWidth={2}
          fill="url(#totalGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "#2dd4bf", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
