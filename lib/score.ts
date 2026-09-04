/**
 * Turn raw checks into a single verdict + human reasons.
 *
 * Judgment calls (documented on purpose — these are the interesting decisions):
 * - No MX or bad syntax => INVALID. The mail literally cannot be delivered.
 * - Disposable or role address => RISKY, not invalid. It CAN receive mail, but
 *   sending to it hurts engagement/reputation. We flag, we don't reject — the
 *   user decides. Role addresses especially are a signal, not a verdict.
 */
import type { EmailChecks } from "./checks";

export type Risk = "safe" | "risky" | "invalid";

export type Result = EmailChecks & {
  risk: Risk;
  reasons: string[];
};

export function score(checks: EmailChecks): Result {
  const reasons: string[] = [];

  if (!checks.valid_syntax) {
    return { ...checks, risk: "invalid", reasons: ["Invalid email syntax"] };
  }
  if (!checks.has_mx) {
    const base = "Domain has no MX record — it cannot receive email";
    return {
      ...checks,
      risk: "invalid",
      reasons: [checks.suggestion ? `${base}. Did you mean ${checks.suggestion}?` : base],
    };
  }

  if (checks.disposable) reasons.push("Disposable / temporary email domain");
  if (checks.role) reasons.push("Role address (shared inbox, lower engagement)");

  return {
    ...checks,
    risk: reasons.length > 0 ? "risky" : "safe",
    reasons: reasons.length > 0 ? reasons : ["Passed all checks"],
  };
}

export type Summary = { total: number; safe: number; risky: number; invalid: number };

export function summarize(results: Result[]): Summary {
  return results.reduce<Summary>(
    (acc, r) => {
      acc.total++;
      acc[r.risk]++;
      return acc;
    },
    { total: 0, safe: 0, risky: 0, invalid: 0 },
  );
}
