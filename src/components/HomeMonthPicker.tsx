"use client";

import { useRouter } from "next/navigation";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function HomeMonthPicker({
  month,
  years,
}: {
  month: string; // YYYY-MM
  years: number[];
}) {
  const router = useRouter();
  const [yStr, mStr] = month.split("-");
  const year = Number(yStr);
  const mon = Number(mStr);

  function go(nextYear: number, nextMonth: number) {
    const ym = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
    router.push(`/?m=${ym}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="home-month">
        Month
      </label>
      <select
        id="home-month"
        className="input !w-auto min-w-[9.5rem] py-2 text-sm font-semibold"
        value={mon}
        onChange={(e) => go(year, Number(e.target.value))}
      >
        {MONTHS.map((label, i) => (
          <option key={label} value={i + 1}>
            {label}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="home-year">
        Year
      </label>
      <select
        id="home-year"
        className="input !w-auto min-w-[5.5rem] py-2 text-sm font-semibold"
        value={year}
        onChange={(e) => go(Number(e.target.value), mon)}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
