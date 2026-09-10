import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const result = fs.readFileSync('app/components/ResultExperience.tsx','utf8');
const page = fs.readFileSync('app/diagnoza/page.tsx','utf8');

test('result scroll cue is large lower and safe-area aware', () => {
  assert.match(result, /<span>ZOBACZ CAŁĄ MAPĘ<\/span>/);
  assert.match(result, /font-size:clamp\(18px,4\.6vw,22px\)/);
  assert.match(result, /bottom:max\(34px,calc\(env\(safe-area-inset-bottom\) \+ 22px\)\)/);
  assert.match(result, /min-height:100svh/);
  assert.match(result, /rx-cue-arrow\{animation:none\}/);
  assert.doesNotMatch(result, /rx-cue\{[^}]*font-size:10px/);
});

test('fast fit return resets analytics context before diagnostic event', () => {
  const i = page.indexOf("registerContext({ mode: 'diagnostic' }); trackDiag('fast_fit_to_diagnostic')");
  assert.ok(i >= 0);
});
