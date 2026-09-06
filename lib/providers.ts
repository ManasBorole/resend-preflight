/**
 * Derive two cheap signals from a domain + its MX hosts:
 *  - provider:    who actually runs the mailbox (Google, Microsoft, ...), read
 *                 from the MX exchange hostnames.
 *  - domain_type: "free" (gmail/yahoo/...) vs "business" (custom domain).
 * Both are informational - they enrich the report, they don't change risk.
 */

/** Free consumer email domains. Membership => domain_type "free". */
export const FREE_EMAIL_DOMAINS = new Set<string>([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.in",
  "ymail.com", "hotmail.com", "hotmail.co.uk", "outlook.com", "live.com",
  "msn.com", "icloud.com", "me.com", "mac.com", "aol.com", "protonmail.com",
  "proton.me", "gmx.com", "gmx.net", "mail.com", "zoho.com", "yandex.com",
  "yandex.ru", "tutanota.com", "fastmail.com",
]);

/** MX-host substring -> human provider name. First match wins. */
const MX_PATTERNS: Array<[string, string]> = [
  ["google.com", "Google"],
  ["googlemail.com", "Google"],
  ["outlook.com", "Microsoft"],
  ["protection.outlook.com", "Microsoft"],
  ["protonmail.ch", "Proton"],
  ["proton.me", "Proton"],
  ["zoho.com", "Zoho"],
  ["zoho.eu", "Zoho"],
  ["yahoodns.net", "Yahoo"],
  ["icloud.com", "Apple"],
  ["mail.me.com", "Apple"],
  ["messagingengine.com", "Fastmail"],
  ["amazonaws.com", "Amazon SES"],
  ["mimecast.com", "Mimecast"],
  ["pphosted.com", "Proofpoint"],
  ["secureserver.net", "GoDaddy"],
  ["mailgun.org", "Mailgun"],
  ["sendgrid.net", "SendGrid"],
];

export function classifyDomainType(domain: string): "free" | "business" {
  return FREE_EMAIL_DOMAINS.has(domain) ? "free" : "business";
}

export function identifyProvider(mxHosts: string[]): string | null {
  const hosts = mxHosts.map((h) => h.toLowerCase());
  for (const [needle, name] of MX_PATTERNS) {
    if (hosts.some((h) => h.includes(needle))) return name;
  }
  return null;
}
