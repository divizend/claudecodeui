import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { closeConnection, initializeDatabase, sessionsDb } from '@/modules/database/index.js';
import { ClaudeSessionsProvider } from '@/modules/providers/list/claude/claude-sessions.provider.js';

/**
 * getSessionMessages() (private to claude-sessions.provider.ts) caches parsed
 * JSONL lines per file and reads only newly-appended bytes on repeat calls —
 * this exercises that behavior end-to-end through the public fetchHistory()
 * API, across a growing transcript and its subagent file, since the cache
 * itself isn't exported for direct unit testing.
 */
async function withIsolatedDatabase(runTest: () => Promise<void>): Promise<void> {
  const previousDatabasePath = process.env.DATABASE_PATH;
  const tempDirectory = await mkdtemp(path.join(tmpdir(), 'claude-history-cache-'));
  const databasePath = path.join(tempDirectory, 'auth.db');

  closeConnection();
  process.env.DATABASE_PATH = databasePath;
  await initializeDatabase();

  try {
    await runTest();
  } finally {
    closeConnection();
    if (previousDatabasePath === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = previousDatabasePath;
    }
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

function jsonl(entries: unknown[]): string {
  return entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
}

test('fetchHistory reuses cached lines and picks up only appended bytes as the transcript grows', async () => {
  await withIsolatedDatabase(async () => {
    const projectDir = await mkdtemp(path.join(tmpdir(), 'claude-project-'));
    const jsonlPath = path.join(projectDir, 'sess-1.jsonl');
    const agentPath = path.join(projectDir, 'agent-agent-1.jsonl');

    await writeFile(jsonlPath, jsonl([
      {
        sessionId: 'sess-1',
        uuid: 'u1',
        timestamp: '2026-01-01T00:00:00.000Z',
        message: { role: 'user', content: [{ type: 'text', text: 'message 1' }] },
      },
      {
        sessionId: 'sess-1',
        uuid: 'u2',
        timestamp: '2026-01-01T00:00:01.000Z',
        message: { role: 'assistant', content: [{ type: 'text', text: 'reply 1' }] },
      },
      {
        sessionId: 'sess-1',
        uuid: 'u3',
        timestamp: '2026-01-01T00:00:02.000Z',
        toolUseResult: { agentId: 'agent-1' },
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'toolid1', content: 'ok' }],
        },
      },
    ]));

    await writeFile(agentPath, jsonl([
      {
        timestamp: '2026-01-01T00:00:00.500Z',
        message: {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'sub-tool-1', name: 'Bash', input: { command: 'ls' } }],
        },
      },
    ]));

    sessionsDb.createSession('sess-1', 'claude', projectDir, undefined, undefined, undefined, jsonlPath);

    const provider = new ClaudeSessionsProvider();

    const first = await provider.fetchHistory('sess-1', {});
    assert.equal(first.total, 2, 'text/reply messages count; the tool_result entry does not');
    const firstToolResult = first.messages.find((m) => m.kind === 'tool_result');
    assert.ok(firstToolResult, 'tool_result message should be present');
    assert.deepEqual(
      (firstToolResult!.subagentTools as Array<{ toolName: string }>).map((t) => t.toolName),
      ['Bash'],
    );

    // Simulate the agent continuing to work: append a new top-level message
    // and a new subagent tool call, rather than rewriting the files.
    await writeFile(
      jsonlPath,
      jsonl([{
        sessionId: 'sess-1',
        uuid: 'u4',
        timestamp: '2026-01-01T00:00:03.000Z',
        message: { role: 'user', content: [{ type: 'text', text: 'message 2' }] },
      }]),
      { flag: 'a' },
    );
    await writeFile(
      agentPath,
      jsonl([{
        timestamp: '2026-01-01T00:00:01.500Z',
        message: {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'sub-tool-2', name: 'Read', input: { path: 'a.txt' } }],
        },
      }]),
      { flag: 'a' },
    );

    const second = await provider.fetchHistory('sess-1', {});
    assert.equal(second.total, 3, 'exactly one new top-level message appeared — no duplicates from re-reading old bytes');
    const secondToolResult = second.messages.find((m) => m.kind === 'tool_result');
    assert.deepEqual(
      (secondToolResult!.subagentTools as Array<{ toolName: string }>).map((t) => t.toolName).sort(),
      ['Bash', 'Read'],
      'the subagent file cache picked up the appended tool call alongside the original one',
    );

    // No changes since the last call: repeat calls must be idempotent.
    const third = await provider.fetchHistory('sess-1', {});
    assert.equal(third.total, 3);

    // The file shrinking/being rewritten (not expected for Claude's
    // append-only transcripts, but defended against) must not leave stale
    // cached lines mixed in with the new content.
    await writeFile(jsonlPath, jsonl([{
      sessionId: 'sess-1',
      uuid: 'u5',
      timestamp: '2026-01-01T00:00:04.000Z',
      message: { role: 'user', content: [{ type: 'text', text: 'reset' }] },
    }]));

    const fourth = await provider.fetchHistory('sess-1', {});
    assert.equal(fourth.total, 1, 'a shrunk/rewritten file falls back to a full re-read instead of reusing stale cached lines');
    assert.equal(fourth.messages[0]?.content, 'reset');

    await rm(projectDir, { recursive: true, force: true });
  });
});
