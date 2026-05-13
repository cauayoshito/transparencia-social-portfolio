import type { ReactNode } from "react";

type Props = {
  title: string;
  value: string | number;
  icon: ReactNode;
  tag?: string;
  tone?: "blue" | "orange" | "red" | "green";
};

const toneMap = {
  blue: "bg-blue-50 text-blue-700",
  orange: "bg-orange-50 text-orange-700",
  red: "bg-red-50 text-red-700",
  green: "bg-green-50 text-green-700",
};

export default function StatCard({
  title,
  value,
  icon,
  tag,
  tone = "blue",
}: Props) {
  return (
    <div className="min-w-0 rounded-xl border bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className={["rounded-lg px-3 py-2", toneMap[tone]].join(" ")}>
          {icon}
        </div>
        {tag ? (
          <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
            {tag}
          </span>
        ) : (
          <span />
        )}
      </div>

      <div className="text-sm text-slate-600">{title}</div>
      <div className="mt-1 break-words text-lg font-bold text-slate-900 sm:text-2xl">
        {value}
      </div>
    </div>
  );
}
