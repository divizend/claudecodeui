import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveInitialProviderModel } from '../providerModelDefaults';

test('resolveInitialProviderModel falls through to the fallback when nothing is stored', () => {
  assert.equal(resolveInitialProviderModel(null, 'claude-fable-5-1'), 'claude-fable-5-1');
  assert.equal(resolveInitialProviderModel(undefined, 'claude-fable-5-1'), 'claude-fable-5-1');
  assert.equal(resolveInitialProviderModel('', 'claude-fable-5-1'), 'claude-fable-5-1');
});

test('resolveInitialProviderModel upgrades an already-cached literal "default" to the new fallback', () => {
  // Reproduces the production bug: a browser that loaded this app before the
  // fallback pointed at a real model cached the string 'default' itself, and
  // a plain `stored || fallback` never picks up a later fallback change for
  // that browser again.
  assert.equal(resolveInitialProviderModel('default', 'claude-fable-5-1'), 'claude-fable-5-1');
});

test('resolveInitialProviderModel preserves an explicit prior model choice', () => {
  assert.equal(resolveInitialProviderModel('sonnet', 'claude-fable-5-1'), 'sonnet');
  assert.equal(resolveInitialProviderModel('opus', 'claude-fable-5-1'), 'opus');
});
