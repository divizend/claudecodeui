/**
 * Pure model-default resolution, split out from useChatProviderState.ts so
 * it's importable from a plain Node test (no React, no Vite `import.meta.env`
 * / `localStorage`) — this is exactly the logic a stale-default regression
 * lives in, and it needs real coverage independent of the rest of the hook's
 * React/localStorage wiring.
 */

/**
 * Stored values that were only ever a *fallback* this app wrote into
 * localStorage on its own, never a deliberate pick by the user — so they must
 * not be honored as one. The reconcile effect in useChatProviderState used to
 * persist the resolved default unconditionally, which is how these got there.
 *
 * - 'default': upstream's fallback literal (every browser that loaded the app
 *   before 2026-09-05 has it cached).
 * - 'claude-fable-5-1': this box's fallback for part of 2026-09-05, before it
 *   was reverted for token cost. Nobody had explicitly picked Fable before
 *   that day (the per-session model-change cache had never been written), so
 *   a stored copy of it can only be the persisted fallback.
 */
const NON_PREFERENCE_STORED_MODELS: ReadonlySet<string> = new Set(['default', 'claude-fable-5-1']);

/**
 * Normalizes a localStorage-cached model to an explicit preference, or null
 * when there isn't one (absent, empty, or one of the persisted-fallback
 * sentinels above).
 */
export function normalizeStoredProviderModel(stored: string | null | undefined): string | null {
  if (!stored || NON_PREFERENCE_STORED_MODELS.has(stored)) {
    return null;
  }
  return stored;
}

/**
 * Resolves the initial model value for a provider from a (possibly absent)
 * localStorage-cached value: an explicit prior pick wins, anything else falls
 * through to `fallback` — so a browser holding only a stale persisted
 * fallback picks up a new one without any manual action.
 */
export function resolveInitialProviderModel(
  stored: string | null | undefined,
  fallback: string,
): string {
  return normalizeStoredProviderModel(stored) ?? fallback;
}
