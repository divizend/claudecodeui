import assert from 'node:assert/strict';
import test from 'node:test';

import {
  nextExplicitClaudeModel,
  normalizeStoredProviderModel,
  resolveDisplayedClaudeModel,
} from '../providerModelDefaults';

test('normalizeStoredProviderModel: absent/empty and persisted-fallback sentinels are "no preference"', () => {
  assert.equal(normalizeStoredProviderModel(null), null);
  assert.equal(normalizeStoredProviderModel(''), null);
  // 'default' (upstream fallback literal) and 'claude-fable-5-1' (this box's fallback for
  // part of 2026-09-05) were written into localStorage by the app itself, never picked.
  assert.equal(normalizeStoredProviderModel('default'), null);
  assert.equal(normalizeStoredProviderModel('claude-fable-5-1'), null);
  assert.equal(normalizeStoredProviderModel('opus'), 'opus');
});

test('resolveDisplayedClaudeModel: explicit pick wins, else catalog default, else empty', () => {
  assert.equal(resolveDisplayedClaudeModel('opus', 'claude-sonnet-5'), 'opus');
  assert.equal(resolveDisplayedClaudeModel(null, 'claude-sonnet-5'), 'claude-sonnet-5');
  assert.equal(resolveDisplayedClaudeModel(null, undefined), '');
});

test('nextExplicitClaudeModel: picking the catalog default clears the explicit pick', () => {
  // A browser that picks "the default" should follow future switches, not freeze on
  // whatever the default happened to be today.
  assert.equal(nextExplicitClaudeModel('claude-sonnet-5', 'claude-sonnet-5'), null);
  assert.equal(nextExplicitClaudeModel('opus', 'claude-sonnet-5'), 'opus');
  assert.equal(nextExplicitClaudeModel('opus', undefined), 'opus');
});
