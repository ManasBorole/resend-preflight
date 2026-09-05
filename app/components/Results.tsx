import type { ReactNode } from "react";
import type { Result, Summary } from "@/lib/score";

const RISK_STYLE: Record<Result["risk"], string> = {
  safe: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  risky: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  invalid: "bg-rose-500/10 text-rose-400 border-rose-500/30",
};

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded border border-neutral-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
      {children}
    </span>
  );
}

export function SummaryTiles({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <Stat label="Total" value={summary.total} tone="text-neutral-200" />
      <Stat label="Safe" value={summary.safe} tone="text-emerald-400" />
      <Stat label="Risky" value={summary.risky} tone="text-amber-400" />
      <Stat label="Invalid" value={summary.invalid} tone="text-rose-400" />
    </div>
  );
}

export function ResultList({ results }: { results: Result[] }) {
  return (
    <ul className="space-y-2">
      {results.map((r) => (
        <li
          key={r.email}
          className="flex items-center justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-mono text-sm">{r.email}</p>
              {r.provider && <Tag>{r.provider}</Tag>}
              {r.domain_type && <Tag>{r.domain_type === "free" ? "free email" : "business"}</Tag>}
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">{r.reasons.join(" · ")}</p>
          </div>
          <span
            className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${RISK_STYLE[r.risk]}`}
          >
            {r.risk}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 text-center">
      <div className={`text-2xl font-semibold ${tone}`}>{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}
