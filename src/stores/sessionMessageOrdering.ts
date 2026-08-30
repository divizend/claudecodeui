import type { NormalizedMessage } from './useSessionStore';

/**
 * Pure message-ordering/merge helpers, split out from useSessionStore.ts so
 * they're importable from a plain Node test (no React, no Vite `import.meta.env`)
 * — this is exactly the logic a client-side ordering bug lives in, and it needs
 * real coverage independent of the rest of the store's React wiring.
 */

export function readMessageTime(m: NormalizedMessage): number | null {
  const time = Date.parse(m.timestamp);
  return Number.isFinite(time) ? time : null;
}

export function compareMessagesChronologically(a: NormalizedMessage, b: NormalizedMessage): number {
  const timeA = readMessageTime(a) ?? 0;
  const timeB = readMessageTime(b) ?? 0;
  if (timeA !== timeB) {
    return timeA - timeB;
  }
  return 0;
}

/**
 * Merge a bounded tail-window response into `existing` by id, letting the
 * tail's copy win where both have a message (it can carry updates existing
 * doesn't have yet, e.g. a tool_result's subagentTools gaining entries as a
 * subagent keeps working), then re-sort chronologically.
 *
 * The sort is required, not cosmetic: `existing` is a suffix (the initially
 * loaded page, or an earlier tail merge) and `tail` (the newest
 * TAIL_REFRESH_LIMIT messages) commonly reaches further back than that
 * suffix once the transcript is small enough that the whole thing fits in
 * one tail window — naively appending tail's not-yet-seen messages after
 * `existing` would place older messages after newer ones.
 */
export function mergeTailMessages(
  existing: NormalizedMessage[],
  tail: NormalizedMessage[],
): NormalizedMessage[] {
  const byId = new Map<string, NormalizedMessage>();
  for (const message of existing) {
    byId.set(message.id, message);
  }
  for (const message of tail) {
    byId.set(message.id, message);
  }
  return Array.from(byId.values()).sort(compareMessagesChronologically);
}
