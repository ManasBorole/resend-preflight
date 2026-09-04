/**
 * Disposable / temporary email domains.
 *
 * Sourced from the public blocklist:
 *   github.com/disposable-email-domains/disposable-email-domains
 * bundled as disposable-domains.json (~8.7k domains) so lookups are a local
 * Set with no network call. Refresh: re-download the .conf, re-run the convert
 * step (see TECHNICAL.md). Auto-refresh on a schedule is backlog, not built.
 */
import list from "./disposable-domains.json";

export const DISPOSABLE_DOMAINS = new Set<string>(list as string[]);
