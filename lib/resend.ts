/**
 * Minimal Resend API client — server-side only. The API key is passed in per
 * call (it's the *user's* key, supplied at request time) and is never stored,
 * logged, or persisted. Only these routes ever see it.
 *
 * Docs: https://resend.com/docs/api-reference
 */

const BASE = "https://api.resend.com";

export type Audience = { id: string; name: string };
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

export async function listAudiences(apiKey: string): Promise<Audience[]> {
  const res = await fetch(`${BASE}/audiences`, { headers: authHeaders(apiKey) });
  if (!res.ok) await parseError(res);
  const body = await res.json();
  return (body?.data ?? []).map((a: Audience) => ({ id: a.id, name: a.name }));
}

export async function listContacts(apiKey: string, limit = 100): Promise<Contact[]> {
  const res = await fetch(`${BASE}/contacts?limit=${limit}`, { headers: authHeaders(apiKey) });
  if (!res.ok) await parseError(res);
  const body = await res.json();
  return body?.data ?? [];
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
  const res = await fetch(`${BASE}/contacts/${contactId}`, {
    method: "PATCH",
    headers: authHeaders(apiKey),
    body: JSON.stringify(update),
  });
  if (!res.ok) await parseError(res);
}

/** Custom properties must be defined on the account before they can be set on a contact. */
export async function listContactProperties(apiKey: string): Promise<ContactProperty[]> {
  const res = await fetch(`${BASE}/contact-properties`, { headers: authHeaders(apiKey) });
  if (!res.ok) await parseError(res);
  const body = await res.json();
  return body?.data ?? [];
}

export async function createContactProperty(
  apiKey: string,
  key: string,
  type: "string" | "number" = "string",
): Promise<void> {
  const res = await fetch(`${BASE}/contact-properties`, {
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
