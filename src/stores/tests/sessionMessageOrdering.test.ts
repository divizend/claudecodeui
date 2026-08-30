import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeTailMessages } from '../sessionMessageOrdering';
import type { NormalizedMessage } from '../useSessionStore';

function msg(id: string, minute: number, extra: Partial<NormalizedMessage> = {}): NormalizedMessage {
  return {
    id,
    sessionId: 'sess-1',
    timestamp: `2026-01-01T00:${String(minute).padStart(2, '0')}:00.000Z`,
    provider: 'claude',
    kind: 'text',
    role: 'user',
    content: id,
    ...extra,
  };
}

test('mergeTailMessages inserts tail messages that predate the already-loaded page in chronological order', () => {
  // Reproduces the production bug: fetchFromServer's initial page only holds
  // the newest couple of messages (a small session, or MESSAGES_PER_PAGE cutting
  // it short), while refreshFromServer's tail window (TAIL_REFRESH_LIMIT) reaches
  // further back and includes messages `existing` hasn't seen yet — those are
  // OLDER than what's already loaded, not newer, and must not land at the end.
  const existing = [msg('m4', 4), msg('m5', 5)];
  const tail = [msg('m1', 1), msg('m2', 2), msg('m3', 3), msg('m4', 4), msg('m5', 5)];

  const merged = mergeTailMessages(existing, tail);

  assert.deepEqual(merged.map((m) => m.id), ['m1', 'm2', 'm3', 'm4', 'm5']);
});

test('mergeTailMessages lets the tail copy overwrite stale content for an id both sides share', () => {
  const existing = [msg('m1', 1, { subagentTools: [{ toolName: 'Bash' }] })];
  const tail = [msg('m1', 1, { subagentTools: [{ toolName: 'Bash' }, { toolName: 'Read' }] })];

  const merged = mergeTailMessages(existing, tail);

  assert.equal(merged.length, 1);
  assert.deepEqual(
    (merged[0].subagentTools as Array<{ toolName: string }>).map((t) => t.toolName),
    ['Bash', 'Read'],
  );
});

test('mergeTailMessages is idempotent when nothing new appeared', () => {
  const existing = [msg('m1', 1), msg('m2', 2)];
  const tail = [msg('m1', 1), msg('m2', 2)];

  const merged = mergeTailMessages(existing, tail);

  assert.deepEqual(merged.map((m) => m.id), ['m1', 'm2']);
});

test('mergeTailMessages appends genuinely new, newer-than-everything-loaded messages at the end', () => {
  const existing = [msg('m1', 1), msg('m2', 2)];
  const tail = [msg('m1', 1), msg('m2', 2), msg('m3', 3)];

  const merged = mergeTailMessages(existing, tail);

  assert.deepEqual(merged.map((m) => m.id), ['m1', 'm2', 'm3']);
});
