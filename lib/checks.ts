/**
 * Core email pre-flight checks. All free, all honest — no SMTP handshake.
 *
 * Honest ceiling: we do NOT open an SMTP connection and `RCPT TO` to prove a
 * mailbox exists. That is rude, unreliable, and wrecks sender reputation — the
 * exact problem this tool exists to prevent. We stop at what public data can
 * tell us: syntax, whether the domain can receive mail (MX), and whether the
 * address is disposable or a role account. Catch-all detection is deliberately
 * NOT attempted because doing it honestly requires SMTP probing.
 */
import { resolveMx, setServers } from "node:dns/promises";
import { DISPOSABLE_DOMAINS } from "./disposable-domains";
import { suggestDomain } from "./typo";
import { identifyProvider, classifyDomainType } from "./providers";

// Query public resolvers directly instead of the ambient system resolver.
// Some environments (sandboxes, locked-down hosts) refuse raw port-53 queries
// to 127.0.0.1; pinning known resolvers makes MX lookups reliable everywhere.
setServers(["8.8.8.8", "1.1.1.1"]);

/** Role / shared-inbox local-parts: lower engagement, higher complaint risk. */
const ROLE_LOCALPARTS = new Set<string>([
  "admin", "administrator", "info", "support", "sales", "contact", "help",
  "helpdesk", "noreply", "no-reply", "donotreply", "postmaster", "hostmaster",
  "webmaster", "abuse", "billing", "hello", "team", "marketing", "office",
  "enquiries", "inquiries", "service", "notifications", "mail",
]);

/**
 * Pragmatic email syntax check. Not full RFC 5322 (that regex is a monster and
 * accepts addresses no real provider allows). This covers the shapes a signup
 * form actually produces: one @, a dotted domain, no spaces, sane characters.
 */
const SYNTAX_RE =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export type EmailChecks = {
  email: string;
  valid_syntax: boolean;
  has_mx: boolean;
  disposable: boolean;
  role: boolean;
  suggestion: string | null;
  provider: string | null;
  domain_type: "free" | "business" | null;
};

export function normalize(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validSyntax(email: string): boolean {
  return SYNTAX_RE.test(email);
}

export function splitDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  return email.slice(at + 1);
}

export function splitLocal(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  return email.slice(0, at);
}

export function isDisposable(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain);
}

export function isRole(localPart: string): boolean {
  return ROLE_LOCALPARTS.has(localPart);
}

/** MX exchange hostnames for a domain, or [] if none / lookup fails. */
export async function resolveMxHosts(domain: string): Promise<string[]> {
  try {
    const records = await resolveMx(domain);
    return records.map((r) => r.exchange).filter(Boolean);
  } catch {
    // ENOTFOUND / ENODATA — no MX, treat as cannot-receive.
    return [];
  }
}

/** Run every check on one raw address. MX is the only network call. */
export async function checkEmail(raw: string): Promise<EmailChecks> {
  const email = normalize(raw);
  const syntax = validSyntax(email);
  const domain = splitDomain(email);
  const local = splitLocal(email);

  // Only spend a DNS lookup when syntax is valid and we have a domain.
  const mxHosts = syntax && domain ? await resolveMxHosts(domain) : [];
  const deliverable = mxHosts.length > 0;

  return {
    email,
    valid_syntax: syntax,
    has_mx: deliverable,
    disposable: domain ? isDisposable(domain) : false,
    role: local ? isRole(local) : false,
    suggestion: domain ? suggestDomain(domain) : null,
    provider: deliverable ? identifyProvider(mxHosts) : null,
    domain_type: domain && deliverable ? classifyDomainType(domain) : null,
  };
}
