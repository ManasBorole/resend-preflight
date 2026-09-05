import { NextResponse } from "next/server";
import { listAudiences, ResendError } from "@/lib/resend";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let apiKey: unknown;
  try {
    ({ apiKey } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return NextResponse.json({ error: "Missing Resend API key" }, { status: 400 });
  }

  try {
    const audiences = await listAudiences(apiKey.trim());
    return NextResponse.json({ audiences });
  } catch (e) {
    if (e instanceof ResendError) {
      console.error(`[resend audiences] ${e.status}: ${e.message}`);
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[resend audiences] non-Resend error:", e);
    return NextResponse.json({ error: "Failed to reach Resend" }, { status: 502 });
  }
}
