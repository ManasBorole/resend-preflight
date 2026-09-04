/**
 * Runnable self-check for the pure (offline) logic. No framework.
 *   npm run selfcheck
 * MX is a network call, so it is NOT asserted here — score() is fed synthetic
 * check objects instead, keeping this deterministic and offline.
 */
import assert from "node:assert/strict";
import { validSyntax, isDisposable, isRole, normalize, splitDomain, splitLocal, type EmailChecks } from "./checks";
import { score, summarize } from "./score";
import { suggestDomain, editDistance } from "./typo";
import { identifyProvider, classifyDomainType } from "./providers";

// --- syntax ---
assert.ok(validSyntax("jane@gmail.com"), "plain address valid");
assert.ok(validSyntax("jane.doe+tag@sub.example.co.uk"), "tags/subdomains valid");
assert.ok(!validSyntax("jane@@gmail.com"), "double @ invalid");
assert.ok(!validSyntax("jane gmail.com"), "no @ invalid");
assert.ok(!validSyntax("jane@localhost"), "bare host (no TLD) invalid");
assert.ok(!validSyntax("jane@domain.c"), "1-char TLD invalid");

// --- helpers ---
assert.equal(normalize("  Jane@GMAIL.com "), "jane@gmail.com", "normalize trims + lowercases");
assert.equal(splitDomain("jane@gmail.com"), "gmail.com");
assert.equal(splitLocal("jane@gmail.com"), "jane");

// --- disposable + role ---
assert.ok(isDisposable("mailinator.com"), "known disposable flagged");
assert.ok(!isDisposable("gmail.com"), "real provider not disposable");
assert.ok(isRole("support"), "role localpart flagged");
assert.ok(!isRole("jane"), "personal localpart not role");

// --- typo suggestions ---
assert.equal(editDistance("gmial.com", "gmail.com"), 2, "transposition = 2 subs in Levenshtein");
assert.equal(suggestDomain("gmial.com"), "gmail.com", "close typo suggested");
assert.equal(suggestDomain("yaho.com"), "yahoo.com", "missing char suggested");
assert.equal(suggestDomain("gmail.com"), null, "exact popular domain not corrected");
assert.equal(suggestDomain("email.com"), null, "known-good near-collision not corrected");
assert.equal(suggestDomain("some-random-company.io"), null, "far domain not corrected");

// --- provider + domain type ---
assert.equal(identifyProvider(["aspmx.l.google.com"]), "Google", "google MX -> Google");
assert.equal(identifyProvider(["company-com.mail.protection.outlook.com"]), "Microsoft", "outlook MX -> Microsoft");
assert.equal(identifyProvider(["mx1.some-unknown-host.net"]), null, "unknown MX -> null");
assert.equal(classifyDomainType("gmail.com"), "free", "gmail -> free");
assert.equal(classifyDomainType("stripe.com"), "business", "custom domain -> business");

// --- scoring ---
const base: EmailChecks = { email: "x@y.com", valid_syntax: true, has_mx: true, disposable: false, role: false, suggestion: null, provider: null, domain_type: null };

// suggestion surfaces only on the no-MX branch
const typo = score({ ...base, has_mx: false, suggestion: "gmail.com" });
assert.equal(typo.risk, "invalid");
assert.match(typo.reasons[0], /Did you mean gmail\.com\?/, "no-MX reason includes suggestion");
// a deliverable domain never shows a suggestion even if one was computed
assert.ok(!score({ ...base, suggestion: "gmail.com" }).reasons.join(" ").includes("Did you mean"), "has-MX suppresses suggestion");

assert.equal(score({ ...base, valid_syntax: false }).risk, "invalid", "bad syntax => invalid");
assert.equal(score({ ...base, has_mx: false }).risk, "invalid", "no MX => invalid");
assert.equal(score({ ...base, disposable: true }).risk, "risky", "disposable => risky");
assert.equal(score({ ...base, role: true }).risk, "risky", "role => risky");
assert.equal(score(base).risk, "safe", "clean => safe");

// invalid short-circuits before risky flags are considered
const inv = score({ ...base, valid_syntax: false, disposable: true });
assert.equal(inv.risk, "invalid");
assert.equal(inv.reasons.length, 1, "invalid reports one reason, not stacked");

// --- summary ---
const s = summarize([
  score(base),
  score({ ...base, disposable: true }),
  score({ ...base, valid_syntax: false }),
]);
assert.deepEqual(s, { total: 3, safe: 1, risky: 1, invalid: 1 }, "summary counts by risk");

console.log("selfcheck: all assertions passed");
