"use client";

import { useState, type ChangeEvent } from "react";
import type { Result, Summary } from "@/lib/score";
import { SummaryTiles, ResultList } from "@/app/components/Results";
import { ResendPanel } from "@/app/components/ResendPanel";

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

export default function Home() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [duplicates, setDuplicates] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pull every email-looking token out of an uploaded file (CSV, TSV, or plain
  // list) — avoids brittle column-mapping; we just want the addresses.
  function extractEmails(raw: string): string {
    const matches = raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];
    return matches.join("\n");
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await file.text();
    setText(extractEmails(raw));
    e.target.value = ""; // allow re-uploading the same file
  }

  function downloadCsv(rows: Result[], filename: string) {
    const header = "email,risk,provider,domain_type,reasons";
    const body = rows
      .map((r) =>
        [r.email, r.risk, r.provider ?? "", r.domain_type ?? "", `"${r.reasons.join("; ")}"`].join(","),
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

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
          <label className="cursor-pointer rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-500">
            Upload CSV / list
            <input type="file" accept=".csv,.txt,.tsv,text/plain" onChange={onFile} className="hidden" />
          </label>
          <span className="text-xs text-neutral-500">Max 100 per check</span>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </p>
      )}

      {summary && <div className="mt-6"><SummaryTiles summary={summary} /></div>}

      {duplicates > 0 && (
        <p className="mt-3 text-xs text-neutral-500">
          {duplicates} duplicate{duplicates > 1 ? "s" : ""} removed before checking.
        </p>
      )}

      {results && results.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => downloadCsv(results.filter((r) => r.risk === "safe"), "safe-emails.csv")}
            className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-400 transition hover:border-emerald-500"
          >
            Download safe only
          </button>
          <button
            onClick={() => downloadCsv(results.filter((r) => r.risk !== "invalid"), "cleaned-list.csv")}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-neutral-500"
          >
            Download cleaned (drop invalid)
          </button>
          <button
            onClick={() => downloadCsv(results, "full-report.csv")}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-neutral-500"
          >
            Download full report
          </button>
        </div>
      )}

      {results && <div className="mt-4"><ResultList results={results} /></div>}

      <ResendPanel />

      <footer className="mt-12 border-t border-neutral-800 pt-4 text-xs text-neutral-600">
        Honest ceiling: no SMTP probing, so we can’t prove a mailbox exists — only that the domain{" "}
        <em>can</em> receive mail. Disposable list is common providers, not exhaustive.
      </footer>
    </main>
  );
}
