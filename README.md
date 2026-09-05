# Email List Pre-flight

**Live demo → [resend-preflight.vercel.app](https://resend-preflight.vercel.app)**

Check an email list **before you send it**. Paste or upload a list and get a per-address
verdict — `safe` / `risky` / `invalid` — with the reasons, in seconds. No email is sent, no
signup, no paid API.

Sending to bad addresses (typos, dead domains, disposable inboxes) drives bounces, which
quietly wreck sender reputation and can get an account flagged. Most transactional email
providers don't include a pre-send hygiene check — this is that missing step.

## What it checks

| Check | What it catches |
|---|---|
| **Syntax** | Malformed addresses (`not-an-email`, double `@`, missing TLD) |
| **MX record** | Domains that can't receive mail at all — the strongest "invalid" signal |
| **Typo suggestion** | `gmial.com → gmail.com`, `yaho.com → yahoo.com` (only on undeliverable domains, so no false "corrections" of real addresses) |
| **Disposable** | ~8.7k known temporary/throwaway domains (Mailinator, 10MinuteMail, …) |
| **Role address** | Shared inboxes (`support@`, `admin@`, `info@`) — lower engagement, higher complaint rate |
| **Provider** | Who runs the mailbox (Google, Microsoft, Proton, …), read from MX hosts |
| **Free vs business** | Consumer domain (gmail/yahoo) vs custom domain |

Plus: duplicate detection, CSV/list upload, and export of the cleaned list.

## Connect your Resend contacts

Optionally check every contact in your **Resend** account, then write the result back onto each
contact as a `preflight_status` property (`safe` / `risky` / `invalid`) plus a
`preflight_checked_at` timestamp — non-destructive tags you can segment on before a broadcast. An
explicit, opt-in toggle can also set `unsubscribed: true` on the invalid contacts to suppress them
from future sends.

- Resend's contacts API is account-level (flat), so this uses `GET /contacts` (paged),
  `PATCH /contacts/{id}`, and `POST /contact-properties`. Custom properties must be **defined**
  before they can be set on a contact, so the app creates the two properties first, then tags.
- **Your API key is never stored, logged, or committed.** It's supplied at request time, sent only
  to this app's own server route for that request, and used to call Resend. No server-side key is
  configured or required. Use a **Full-access** key you can rotate.
- Writes are gated behind a confirmation dialog and default to a read-only check until you click
  *Apply*. Resend 429s are retried with backoff.
- The read pages through all contacts for an accurate total; the check itself processes up to the
  first 100 per run to stay within serverless limits.

## Honest ceiling

This tool does **not** open an SMTP connection to probe whether a specific mailbox exists.
That's rude, unreliable, and damages sender reputation — the exact problem it's meant to
prevent. It goes as far as public data allows (syntax, MX, known lists) and no further.
Catch-all detection is deliberately not attempted for the same reason.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run selfcheck  # offline assertions for the checks/scoring logic
npm run build      # production build + typecheck
```

## How it works

- **`lib/checks.ts`** — runs the checks per address; the only network call is an MX lookup
  (`node:dns`, pinned to public resolvers for reliability).
- **`lib/score.ts`** — folds raw checks into a single verdict + human-readable reasons.
- **`lib/typo.ts`**, **`lib/providers.ts`**, **`lib/disposable-domains.*`** — the individual signals.
- **`app/api/check/route.ts`** — Node-runtime API route; concurrency-capped, max 100 emails/request.
- **`app/page.tsx`** — the UI.

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Node.js runtime for DNS.

## Limitations

- Disposable list is a bundled snapshot (~8.7k domains), not exhaustive or auto-updated.
- MX presence proves a domain *can* receive mail, not that a specific mailbox is active.
- Role-address and provider lists are curated and may miss less common cases.

## License

MIT
