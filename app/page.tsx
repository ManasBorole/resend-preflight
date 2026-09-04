"use client";

import { useState, type ReactNode } from "react";
import type { Result, Summary } from "@/lib/score";

const SAMPLE = `jane.doe@gmail.com
support@stripe.com
user@mailinator.com
typo@gmial.com
someone@thisdomaindoesnotexist12345.com
admin@company.com
hello@resend.com
not-an-email
throwaway@10minutemail.com
john@outlook.com`;

const RISK_STYLE: Record<Result["risk"], string> = {
  safe: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  risky: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  invalid: "bg-rose-500/10 text-rose-400 border-rose-500/30",
};

export default function Home() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [duplicates, setDuplicates] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResults(null);
    setSummary(null);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setResults(data.results);
      setSummary(data.summary);
      setDuplicates(data.duplicates ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Email List Pre-flight</h1>
        <p className="mt-2 text-neutral-400">
          Check a list <span className="text-neutral-200">before you send</span>. Catches invalid
          syntax, dead domains (no MX), disposable addresses, and role inboxes — all free, no email
          sent.
        </p>
      </header>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste emails — one per line, or comma-separated"
          rows={7}
          className="w-full resize-y rounded-lg border border-neutral-800 bg-neutral-950 p-3 font-mono text-sm outline-none focus:border-neutral-600"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={run}
            disabled={loading || text.trim().length === 0}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Checking…" : "Check list"}
          </button>
          <button
            onClick={() => setText(SAMPLE)}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-500"
          >
            Load sample list
          </button>
          <span className="text-xs text-neutral-500">Max 100 per check</span>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </p>
      )}

      {summary && (
        <div className="mt-6 grid grid-cols-4 gap-3">
          <Stat label="Total" value={summary.total} tone="text-neutral-200" />
          <Stat label="Safe" value={summary.safe} tone="text-emerald-400" />
          <Stat label="Risky" value={summary.risky} tone="text-amber-400" />
          <Stat label="Invalid" value={summary.invalid} tone="text-rose-400" />
        </div>
      )}

      {duplicates > 0 && (
        <p className="mt-3 text-xs text-neutral-500">
          {duplicates} duplicate{duplicates > 1 ? "s" : ""} removed before checking.
        </p>
      )}

      {results && (
        <ul className="mt-4 space-y-2">
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
      )}

      <footer className="mt-12 border-t border-neutral-800 pt-4 text-xs text-neutral-600">
        Honest ceiling: no SMTP probing, so we can’t prove a mailbox exists — only that the domain{" "}
        <em>can</em> receive mail. Disposable list is common providers, not exhaustive.
      </footer>
    </main>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded border border-neutral-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
      {children}
    </span>
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
