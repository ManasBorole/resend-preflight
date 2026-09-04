# Email List Pre-flight

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
