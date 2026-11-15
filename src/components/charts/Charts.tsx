"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { formatBDT, formatBDTCompact } from "@/lib/money";

const AXIS = "#94a0b4";
const GRID = "rgba(148,160,180,0.18)";
const PALETTE = [
  "#4f46e5", "#059669", "#e11d48", "#f59e0b", "#0ea5e9",
  "#8b5cf6", "#14b8a6", "#ec4899", "#64748b",
];

const money = (value: unknown) => formatBDT(Number(value));

export function BalanceLine({ data }: { data: { month: string; balance: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatBDTCompact} width={52} />
        <Tooltip formatter={money} contentStyle={tooltipStyle} labelStyle={{ color: "#94a0b4" }} />
        <Line type="monotone" dataKey="balance" stroke="#4f46e5" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function IncomeExpenseBars({
  data,
}: {
  data: { month: string; income: number; expense: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatBDTCompact} width={52} />
        <Tooltip formatter={money} contentStyle={tooltipStyle} labelStyle={{ color: "#94a0b4" }} cursor={{ fill: "rgba(148,160,180,0.1)" }} />
        <Bar dataKey="income" fill="#059669" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" fill="#e11d48" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryBars({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
        <XAxis type="number" hide tickFormatter={formatBDTCompact} />
        <YAxis type="category" dataKey="name" tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={false} width={96} />
        <Tooltip formatter={money} contentStyle={tooltipStyle} cursor={{ fill: "rgba(148,160,180,0.1)" }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const tooltipStyle = {
  background: "#141a24",
  border: "1px solid #273040",
  borderRadius: "0.6rem",
  color: "#e7eaf0",
  fontSize: "0.8rem",
};
