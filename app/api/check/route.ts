import { NextResponse } from "next/server";
import { checkEmail } from "@/lib/checks";
import { score, summarize, type Result } from "@/lib/score";
import { mapLimit } from "@/lib/concurrency";

// DNS/MX lookups require the Node.js runtime — Edge has no node:dns.
export const runtime = "nodejs";

const MAX_EMAILS = 100; // keep under the serverless timeout; documented limit
const CONCURRENCY = 15; // don't hammer resolvers / exhaust sockets

function parseEmails(body: unknown): { emails: string[]; duplicates: number } {
  // Accept { emails: string[] } or { text: "one per line / comma separated" }.
  let raw: string[] = [];
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (Array.isArray(b.emails)) raw = b.emails.filter((e): e is string => typeof e === "string");
    else if (typeof b.text === "string") raw = b.text.split(/[\n,;]+/);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  let duplicates = 0;
  for (const line of raw) {
    const e = line.trim().toLowerCase();
    if (!e) continue;
    if (seen.has(e)) {
      duplicates++;
      continue;
    }
    seen.add(e);
    out.push(e);
  }
  return { emails: out, duplicates };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { emails, duplicates } = parseEmails(body);
  if (emails.length === 0) {
    return NextResponse.json({ error: "No emails provided" }, { status: 400 });
  }
  if (emails.length > MAX_EMAILS) {
    return NextResponse.json(
      { error: `Too many emails. Max ${MAX_EMAILS} per request (got ${emails.length}).` },
      { status: 413 },
    );
  }

  const results: Result[] = await mapLimit(emails, CONCURRENCY, async (email) =>
    score(await checkEmail(email)),
  );

  return NextResponse.json({ results, summary: summarize(results), duplicates });
}
