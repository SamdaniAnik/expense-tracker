"use client";

import {
  ResponsiveContainer,
  Line,
  Area,
  ComposedChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";
import { formatBDT, formatBDTCompact } from "@/lib/money";

/* Theme-aware tokens — resolve against the themed DOM root, so charts
   adapt to light/dark automatically instead of a hardcoded dark tooltip. */
const AXIS = "var(--faint)";
const GRID = "color-mix(in srgb, var(--muted) 18%, transparent)";
const HOVER = "color-mix(in srgb, var(--muted) 10%, transparent)";

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "0.7rem",
  boxShadow: "var(--shadow-md)",
  color: "var(--text)",
  fontSize: "0.8rem",
  fontWeight: 600,
};
const tooltipLabelStyle = { color: "var(--muted)", fontWeight: 700, marginBottom: "0.15rem" };
const tooltipItemStyle = { color: "var(--text)" };
const legendStyle = { fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)" };

const money = (value: unknown) => formatBDT(Number(value));

export function BalanceLine({ data }: { data: { month: string; balance: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatBDTCompact} width={52} />
        <Tooltip
          formatter={money}
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          cursor={{ stroke: "var(--primary)", strokeWidth: 1, strokeDasharray: "4 4" }}
        />
        <Area type="monotone" dataKey="balance" stroke="none" fill="url(#balanceFill)" />
        <Line
          type="monotone"
          dataKey="balance"
          stroke="var(--primary)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function IncomeExpenseBars({
  data,
}: {
  data: { month: string; income: number; expense: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatBDTCompact} width={52} />
        <Tooltip
          formatter={money}
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          cursor={{ fill: HOVER }}
        />
        {/* Legend = secondary encoding so identity is never color-alone */}
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={9} />
        <Bar dataKey="income" name="Income" fill="var(--income)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expense" name="Expense" fill="var(--expense)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryBars({ data }: { data: { name: string; value: number }[] }) {
  // Ranked magnitude → sequential single hue (darkest = largest), not a rainbow.
  const n = Math.max(data.length - 1, 1);
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
        <XAxis type="number" hide tickFormatter={formatBDTCompact} />
        <YAxis type="category" dataKey="name" tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={false} width={96} />
        <Tooltip
          formatter={money}
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          cursor={{ fill: HOVER }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={26}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill="var(--primary)"
              fillOpacity={1 - (i / n) * 0.62}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
