import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeStoredProviderModel, resolveInitialProviderModel } from '../providerModelDefaults';

test('resolveInitialProviderModel falls through to the fallback when nothing is stored', () => {
  assert.equal(resolveInitialProviderModel(null, 'claude-sonnet-5'), 'claude-sonnet-5');
  assert.equal(resolveInitialProviderModel(undefined, 'claude-sonnet-5'), 'claude-sonnet-5');
  assert.equal(resolveInitialProviderModel('', 'claude-sonnet-5'), 'claude-sonnet-5');
});

test('a cached literal "default" is a persisted fallback, not a pick, and gets the new fallback', () => {
  // Reproduces the 2026-09-05 morning bug: browsers that loaded the app while
  // the fallback was 'default' had that literal persisted, and a plain
  // `stored || fallback` never picked up a later fallback change for them.
  assert.equal(resolveInitialProviderModel('default', 'claude-sonnet-5'), 'claude-sonnet-5');
});

test('a cached "claude-fable-5-1" is likewise a persisted fallback and gets the new fallback', () => {
  // Reproduces the mirror-image trap from the same afternoon: the reconcile
  // effect persisted the Fable fallback into every browser, so reverting the
  // constant alone would have left them all stuck on Fable.
  assert.equal(resolveInitialProviderModel('claude-fable-5-1', 'claude-sonnet-5'), 'claude-sonnet-5');
  assert.equal(normalizeStoredProviderModel('claude-fable-5-1'), null);
});

test('an explicit prior model choice is preserved', () => {
  assert.equal(resolveInitialProviderModel('opus', 'claude-sonnet-5'), 'opus');
  assert.equal(resolveInitialProviderModel('haiku', 'claude-sonnet-5'), 'haiku');
  assert.equal(normalizeStoredProviderModel('opus'), 'opus');
});
