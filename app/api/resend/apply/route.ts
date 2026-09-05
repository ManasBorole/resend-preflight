import { NextResponse } from "next/server";
import { updateContact, ResendError } from "@/lib/resend";
import { mapLimit } from "@/lib/concurrency";
import type { Risk } from "@/lib/score";

export const runtime = "nodejs";

const CONCURRENCY = 8; // gentler on the write API than reads
const MAX_UPDATES = 100;

type Update = { contactId: string; risk: Risk };

function parseUpdates(value: unknown): Update[] {
  if (!Array.isArray(value)) return [];
  const out: Update[] = [];
  for (const u of value) {
    if (u && typeof u.contactId === "string" && ["safe", "risky", "invalid"].includes(u.risk)) {
      out.push({ contactId: u.contactId, risk: u.risk });
    }
  }
  return out;
}

export async function POST(req: Request) {
  let body: { apiKey?: unknown; audienceId?: unknown; updates?: unknown; unsubscribeInvalid?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { apiKey, audienceId, unsubscribeInvalid } = body;
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return NextResponse.json({ error: "Missing Resend API key" }, { status: 400 });
  }
  if (typeof audienceId !== "string" || audienceId.trim().length === 0) {
    return NextResponse.json({ error: "Missing audience id" }, { status: 400 });
  }
  const updates = parseUpdates(body.updates);
  if (updates.length === 0) {
    return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
  }
  if (updates.length > MAX_UPDATES) {
    return NextResponse.json({ error: `Too many updates (max ${MAX_UPDATES})` }, { status: 413 });
  }
  const alsoUnsubscribe = unsubscribeInvalid === true;

  const outcomes = await mapLimit(updates, CONCURRENCY, async (u) => {
    try {
      await updateContact(apiKey.trim(), audienceId.trim(), u.contactId, {
        properties: { preflight_status: u.risk },
        // Only ever set unsubscribed when explicitly asked, and only for invalids.
        ...(alsoUnsubscribe && u.risk === "invalid" ? { unsubscribed: true } : {}),
      });
      return { contactId: u.contactId, ok: true as const };
    } catch (e) {
      const msg = e instanceof ResendError ? e.message : "update failed";
      return { contactId: u.contactId, ok: false as const, error: msg };
    }
  });

  const applied = outcomes.filter((o) => o.ok).length;
  const failures = outcomes.filter((o) => !o.ok);
  return NextResponse.json({
    applied,
    failed: failures.length,
    errors: failures.slice(0, 10),
    unsubscribed_invalids: alsoUnsubscribe,
  });
}
