import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const rx = fs.readFileSync(new URL('../app/components/ResultExperience.tsx', import.meta.url), 'utf8');
const content = fs.readFileSync(new URL('../app/lib/result-content.ts', import.meta.url), 'utf8');

test('Beat 2 leads with MIRROR (pack.ppHeadline) before the real REFRAME break phrase', () => {
  const beat2 = rx.slice(rx.indexOf('data-beat="2"'), rx.indexOf('data-beat="3"'));
  const mirrorIdx = beat2.indexOf('{pack.ppHeadline}');
  const reframeIdx = beat2.indexOf('{breakPhrase}');
  assert.ok(mirrorIdx > -1, 'Beat 2 must render pack.ppHeadline (the late-symptom mirror)');
  assert.ok(reframeIdx > -1, 'Beat 2 must still render the real breakPhrase (truth-gated, from user answers)');
  assert.ok(mirrorIdx < reframeIdx, 'mirror must come before the reframe, matching MIRROR -> REFRAME order');
});

test('Beat 4 does not duplicate ppHeadline; points at the highest-diagnostic-value checkpoint (ppHook)', () => {
  const beat4 = rx.slice(rx.indexOf('data-beat="4"'), rx.indexOf('data-beat="5"'));
  assert.doesNotMatch(beat4, /<h2[^>]*>\{pack\.ppHeadline\}<\/h2>/);
  assert.match(beat4, /Sprawdziłbym najpierw: \{pack\.ppHook\}\./);
});

test('every archetype ppHeadline+ppHook reads as a natural sentence continuation (no dangling punctuation)', () => {
  for (const m of content.matchAll(/ppHeadline: '([^']+)'/g)) assert.match(m[1], /[.!?]$/);
  for (const m of content.matchAll(/ppHook: '([^']+)'/g)) assert.doesNotMatch(m[1], /[.!?]$/);
});
