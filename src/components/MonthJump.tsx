"use client";

import { useRouter } from "next/navigation";

export default function MonthJump({ month }: { month: string }) {
  const router = useRouter();
  return (
    <input
      type="month"
      value={month}
      onChange={(e) => {
        if (e.target.value) router.push(`/months?m=${e.target.value}`);
      }}
      className="input max-w-[11rem]"
      aria-label="Jump to month"
    />
  );
}
