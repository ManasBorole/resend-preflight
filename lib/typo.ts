/**
 * "Did you mean?" suggestions for mistyped email domains (gmial.com -> gmail.com).
 *
 * Design: compare the domain to a list of popular providers by edit distance.
 * Suggest only when it's CLOSE (distance 1-2) and the input isn't itself a known
 * real domain. In practice the caller only surfaces a suggestion for domains
 * that fail the MX check, so real deliverable domains never get "corrected",
 * which keeps false positives near zero.
 */

const POPULAR_DOMAINS = [
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "hotmail.com",
  "hotmail.co.uk", "outlook.com", "live.com", "msn.com", "icloud.com",
  "me.com", "aol.com", "protonmail.com", "proton.me", "zoho.com",
  "yandex.com", "gmx.com",
];

// Real domains that sit near a popular one by edit distance - never "correct" these.
const KNOWN_GOOD = new Set<string>([...POPULAR_DOMAINS, "mail.com", "email.com", "ymail.com"]);

/** Classic Levenshtein edit distance. */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array<number>(n + 1);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/** Nearest popular domain within edit distance 2, or null. */
export function suggestDomain(domain: string): string | null {
  if (KNOWN_GOOD.has(domain)) return null;
  let best: string | null = null;
  let bestDist = 3; // only care about distances 1..2
  for (const candidate of POPULAR_DOMAINS) {
    const d = editDistance(domain, candidate);
    if (d >= 1 && d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  return best;
}
