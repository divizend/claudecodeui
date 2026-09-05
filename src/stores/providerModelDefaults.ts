/**
 * Pure model-default resolution, split out from useChatProviderState.ts so
 * it's importable from a plain Node test (no React, no Vite `import.meta.env`
 * / `localStorage`) — this is exactly the logic a stale-default regression
 * lives in, and it needs real coverage independent of the rest of the hook's
 * React/localStorage wiring.
 */

/**
 * Resolves the initial model value for a provider from a (possibly absent)
 * localStorage-cached value.
 *
 * A stored value of literally 'default' is treated the same as "no real
 * preference" rather than an explicit choice: it's what every browser that
 * loaded this app before `fallback` pointed at a real model would have
 * cached, purely as an artifact of the old fallback's own value, never a
 * deliberate pick. Falling through to `fallback` here means a browser with
 * that stale cache picks up a new fallback (e.g. this box's Fable pin)
 * without any manual action, while any other stored value — an explicit
 * pick of 'sonnet', 'opus', a real model id, etc. — is left untouched.
 */
export function resolveInitialProviderModel(
  stored: string | null | undefined,
  fallback: string,
): string {
  if (stored && stored !== 'default') {
    return stored;
  }
  return fallback;
}
