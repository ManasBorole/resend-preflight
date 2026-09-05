/**
 * Minimal Resend API client — server-side only. The API key is passed in per
 * call (it's the *user's* key, supplied at request time) and is never stored,
 * logged, or persisted. Only these routes ever see it.
 *
 * Docs: https://resend.com/docs/api-reference
 */

const BASE = "https://api.resend.com";

export type Audience = { id: string; name: string };
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

export async function listContacts(apiKey: string, audienceId: string): Promise<Contact[]> {
  const res = await fetch(`${BASE}/audiences/${audienceId}/contacts`, {
    headers: authHeaders(apiKey),
  });
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
  audienceId: string,
  contactId: string,
  update: { properties?: Record<string, string>; unsubscribed?: boolean },
): Promise<void> {
  const res = await fetch(`${BASE}/audiences/${audienceId}/contacts/${contactId}`, {
    method: "PATCH",
    headers: authHeaders(apiKey),
    body: JSON.stringify(update),
  });
  if (!res.ok) await parseError(res);
}
