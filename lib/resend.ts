/**
 * Minimal Resend API client - server-side only. The API key is passed in per
 * call (it's the *user's* key, supplied at request time) and is never stored,
 * logged, or persisted. Only these routes ever see it.
 *
 * Docs: https://resend.com/docs/api-reference
 */

const BASE = "https://api.resend.com";

export type ContactProperty = { id: string; key: string; type: string };
export type Contact = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  unsubscribed?: boolean;
};

export class ResendError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ResendError";
  }
}

function authHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

/** fetch wrapper that retries on 429, honoring Retry-After, with capped backoff. */
async function resendFetch(url: string, init?: RequestInit, attempts = 3): Promise<Response> {
  for (let i = 0; ; i++) {
    const res = await fetch(url, init);
    if (res.status !== 429 || i >= attempts) return res;
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(2000, 200 * 2 ** i);
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

async function parseError(res: Response): Promise<never> {
  let detail = res.statusText;
  try {
    const body = await res.json();
    detail = body?.message ?? body?.error?.message ?? detail;
  } catch {
    // non-JSON error body; keep statusText
  }
  throw new ResendError(res.status, detail);
}

const PAGE_SIZE = 100; // Resend's per-request max
const MAX_PAGES = 20; // safety bound => up to 2000 contacts fetched

/** Page through every contact in the account (bounded by MAX_PAGES). */
export async function listContacts(apiKey: string): Promise<Contact[]> {
  const all: Contact[] = [];
  let after: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `${BASE}/contacts?limit=${PAGE_SIZE}${after ? `&after=${after}` : ""}`;
    const res = await resendFetch(url, { headers: authHeaders(apiKey) });
    if (!res.ok) await parseError(res);
    const body = await res.json();
    const data: Contact[] = body?.data ?? [];
    all.push(...data);
    // Stop when there's no next page or the cursor can't advance.
    if (!body?.has_more || data.length === 0) break;
    const nextAfter = data[data.length - 1]?.id;
    if (!nextAfter || nextAfter === after) break;
    after = nextAfter;
  }
  return all;
}

/**
 * Update one contact. Writes a custom `properties` map (non-destructive tag),
 * and optionally flips `unsubscribed` (used to suppress invalid addresses).
 */
export async function updateContact(
  apiKey: string,
  contactId: string,
  update: { properties?: Record<string, string>; unsubscribed?: boolean },
): Promise<void> {
  const res = await resendFetch(`${BASE}/contacts/${contactId}`, {
    method: "PATCH",
    headers: authHeaders(apiKey),
    body: JSON.stringify(update),
  });
  if (!res.ok) await parseError(res);
}

/** Custom properties must be defined on the account before they can be set on a contact. */
export async function listContactProperties(apiKey: string): Promise<ContactProperty[]> {
  const res = await resendFetch(`${BASE}/contact-properties`, { headers: authHeaders(apiKey) });
  if (!res.ok) await parseError(res);
  const body = await res.json();
  return body?.data ?? [];
}

export async function createContactProperty(
  apiKey: string,
  key: string,
  type: "string" | "number" = "string",
): Promise<void> {
  const res = await resendFetch(`${BASE}/contact-properties`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ key, type }),
  });
  if (!res.ok) await parseError(res);
}

/** Create the property only if it doesn't already exist (idempotent). */
export async function ensureContactProperty(apiKey: string, key: string): Promise<void> {
  const existing = await listContactProperties(apiKey);
  if (existing.some((p) => p.key === key)) return;
  await createContactProperty(apiKey, key);
}
