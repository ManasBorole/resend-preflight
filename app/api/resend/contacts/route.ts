import { NextResponse } from "next/server";
import { listContacts, ResendError } from "@/lib/resend";
import { checkEmail } from "@/lib/checks";
import { score, summarize, type Result } from "@/lib/score";
import { mapLimit } from "@/lib/concurrency";

export const runtime = "nodejs";

const MAX_CONTACTS = 100; // same per-request ceiling as the manual checker
const CONCURRENCY = 15;

/** A checked contact = the risk Result plus which Resend contact it maps to. */
export type ContactResult = Result & { contactId: string };

export async function POST(req: Request) {
  let apiKey: unknown, audienceId: unknown;
  try {
    ({ apiKey, audienceId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return NextResponse.json({ error: "Missing Resend API key" }, { status: 400 });
  }
  if (typeof audienceId !== "string" || audienceId.trim().length === 0) {
    return NextResponse.json({ error: "Missing audience id" }, { status: 400 });
  }

  let contacts;
  try {
    contacts = await listContacts(apiKey.trim(), audienceId.trim());
  } catch (e) {
    if (e instanceof ResendError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed to reach Resend" }, { status: 502 });
  }

  const withEmail = contacts.filter((c) => typeof c.email === "string" && c.email.length > 0);
  const truncated = withEmail.length > MAX_CONTACTS;
  const slice = withEmail.slice(0, MAX_CONTACTS);

  const results: ContactResult[] = await mapLimit(slice, CONCURRENCY, async (c) => ({
    ...score(await checkEmail(c.email)),
    contactId: c.id,
  }));

  return NextResponse.json({
    results,
    summary: summarize(results),
    total_contacts: withEmail.length,
    truncated,
  });
}
