import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BAKED_IN_DEFAULT_CLAUDE_MODEL,
  DEFAULT_CLAUDE_MODEL_ENV,
  resolveDefaultClaudeModel,
} from '../list/claude/default-claude-model.js';
import type { ProviderModelOption } from '@/shared/types.js';

const BASE: ProviderModelOption[] = [
  { value: 'default', label: 'Default (recommended)' },
  { value: 'claude-sonnet-5', label: 'Sonnet', effort: { default: 'high', values: [{ value: 'high' }] } },
  { value: 'claude-fable-5-1', label: 'Fable', effort: { default: 'high', values: [{ value: 'xhigh' }] } },
];

test('unset env → baked-in default, options untouched, no warning', () => {
  const r = resolveDefaultClaudeModel(undefined, BASE);
  assert.equal(r.defaultModel, BAKED_IN_DEFAULT_CLAUDE_MODEL);
  assert.equal(r.defaultModel, 'claude-sonnet-5');
  assert.deepEqual(r.options, BASE);
  assert.equal(r.warning, undefined);
  assert.equal(resolveDefaultClaudeModel('   ', BASE).defaultModel, 'claude-sonnet-5');
});

test('a known id becomes DEFAULT without adding an option', () => {
  const r = resolveDefaultClaudeModel(' claude-fable-5-1 ', BASE);
  assert.equal(r.defaultModel, 'claude-fable-5-1');
  assert.equal(r.options.length, BASE.length);
  assert.equal(r.warning, undefined);
});

test('a valid but unknown id becomes DEFAULT and gets a synthesized picker entry with effort levels', () => {
  const r = resolveDefaultClaudeModel('claude-haiku-4-5-20251001', BASE);
  assert.equal(r.defaultModel, 'claude-haiku-4-5-20251001');
  const added = r.options.find((o) => o.value === 'claude-haiku-4-5-20251001');
  assert.ok(added);
  assert.equal(added.label, 'claude-haiku-4-5-20251001');
  assert.match(added.description ?? '', new RegExp(DEFAULT_CLAUDE_MODEL_ENV));
  assert.deepEqual(added.effort?.values.map((v) => v.value), ['low', 'medium', 'high', 'max']);
  assert.equal(r.warning, undefined);
});

test('an invalid id falls back to the baked-in default with a warning naming the env var', () => {
  const r = resolveDefaultClaudeModel('Fable 5.1!', BASE);
  assert.equal(r.defaultModel, 'claude-sonnet-5');
  assert.deepEqual(r.options, BASE);
  assert.match(r.warning ?? '', new RegExp(DEFAULT_CLAUDE_MODEL_ENV));
  assert.match(r.warning ?? '', /Fable 5\.1!/);
});

test('the [1m] suffix is accepted', () => {
  assert.equal(resolveDefaultClaudeModel('claude-sonnet-5[1m]', BASE).defaultModel, 'claude-sonnet-5[1m]');
});
