"use client";

import { useState } from "react";
import type { Result, Summary } from "@/lib/score";
import type { Audience } from "@/lib/resend";
import { SummaryTiles, ResultList } from "@/app/components/Results";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";

type ContactResult = Result & { contactId: string };

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export function ResendPanel() {
  const [apiKey, setApiKey] = useState("");
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [audienceId, setAudienceId] = useState("");
  const [results, setResults] = useState<ContactResult[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [meta, setMeta] = useState<{ total: number; truncated: boolean } | null>(null);
  const [unsubscribeInvalid, setUnsubscribeInvalid] = useState(false);
  const [busy, setBusy] = useState<"" | "audiences" | "check" | "apply">("");
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function loadAudiences() {
    setBusy("audiences");
    setError(null);
    setApplied(null);
    try {
      const data = await postJson("/api/resend/audiences", { apiKey });
      setAudiences(data.audiences);
      setAudienceId(data.audiences[0]?.id ?? "");
      if (data.audiences.length === 0) setError("No audiences found for this API key.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audiences");
    } finally {
      setBusy("");
    }
  }

  async function checkAudience() {
    setBusy("check");
    setError(null);
    setApplied(null);
    setResults(null);
    setSummary(null);
    try {
      const data = await postJson("/api/resend/contacts", { apiKey, audienceId });
      setResults(data.results);
      setSummary(data.summary);
      setMeta({ total: data.total_contacts, truncated: data.truncated });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to check audience");
    } finally {
      setBusy("");
    }
  }

  function confirmMessage(): string {
    if (!results) return "";
    const flagged = results.filter((r) => r.risk !== "safe").length;
    return (
      `Write a "preflight_status" property to ${results.length} contacts ` +
      `(${flagged} flagged risky/invalid)` +
      (unsubscribeInvalid ? ", and unsubscribe the invalid ones" : "") +
      `. This modifies your Resend audience.`
    );
  }

  async function doApply() {
    setConfirmOpen(false);
    if (!results) return;
    setBusy("apply");
    setError(null);
    try {
      const data = await postJson("/api/resend/apply", {
        apiKey,
        audienceId,
        unsubscribeInvalid,
        updates: results.map((r) => ({ contactId: r.contactId, risk: r.risk })),
      });
      setApplied(
        `Tagged ${data.applied} contacts` +
          (data.failed ? `, ${data.failed} failed` : "") +
          (data.unsubscribed_invalids ? " · invalid contacts unsubscribed" : "") +
          ".",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="mt-12 rounded-xl border border-neutral-800 bg-neutral-900/30 p-4">
      <h2 className="text-lg font-semibold">Connect a Resend audience</h2>
      <p className="mt-1 text-sm text-neutral-400">
        Pull the contacts from one of your Resend audiences, check them, and write the result back
        as a <code className="text-neutral-300">preflight_status</code> property on each contact.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Resend API key (re_…)"
          className="min-w-[240px] flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm outline-none focus:border-neutral-600"
        />
        <button
          onClick={loadAudiences}
          disabled={busy !== "" || apiKey.trim().length === 0}
          className={
            audiences.length === 0
              ? "rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
              : "rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:border-neutral-500 disabled:opacity-40"
          }
        >
          {busy === "audiences" ? "Loading…" : audiences.length > 0 ? "Reload audiences" : "Load audiences"}
        </button>
      </div>
      <p className="mt-2 text-xs text-neutral-600">
        Your key is sent only to this app’s server for the request and is never stored, logged, or
        committed. Use a key you can rotate.
      </p>

      {audiences.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={audienceId}
            onChange={(e) => setAudienceId(e.target.value)}
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-600"
          >
            {audiences.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            onClick={checkAudience}
            disabled={busy !== "" || audienceId === ""}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-40"
          >
            {busy === "check" ? "Checking…" : "Check audience"}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </p>
      )}

      {summary && (
        <div className="mt-6">
          {meta && meta.total === 0 ? (
            <p className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3 text-sm text-neutral-400">
              This audience has no contacts. Add some in Resend (Audiences → add contacts), then
              check again.
            </p>
          ) : (
            <>
              <SummaryTiles summary={summary} />
              {meta && (
                <p className="mt-2 text-xs text-neutral-500">
                  Checked {results?.length ?? 0} of {meta.total} contacts
                  {meta.truncated ? " (truncated to first 100)" : ""}.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {results && results.length > 0 && (
        <>
          <div className="mt-4">
            <ResultList results={results} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={unsubscribeInvalid}
                onChange={(e) => setUnsubscribeInvalid(e.target.checked)}
              />
              Also unsubscribe invalid contacts
            </label>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={busy !== ""}
              className="rounded-lg border border-amber-500/40 px-4 py-2 text-sm text-amber-400 transition hover:border-amber-500 disabled:opacity-40"
            >
              {busy === "apply" ? "Applying…" : "Apply results to Resend"}
            </button>
          </div>
        </>
      )}

      {applied && (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {applied}
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Apply results to Resend?"
        message={confirmMessage()}
        confirmLabel="Apply"
        tone="warn"
        onConfirm={doApply}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}
