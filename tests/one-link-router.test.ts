import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const page = fs.readFileSync(new URL('../app/components/DecisionDiagnostic.tsx', import.meta.url), 'utf8');
const home = fs.readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const cfg = fs.readFileSync(new URL('../app/lib/assessment-config.ts', import.meta.url), 'utf8');
const layout = fs.readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
const nextConfig = fs.readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');

test('root is the one canonical public entry and renders Diagnostyka', () => {
  assert.match(home, /export \{ default \} from '.\/diagnoza\/page'/);
  assert.match(layout, /alternates:\s*\{ canonical: 'https:\/\/diagnostyka\.talerzihantle\.com\/' \}/);
  // [\s\S]* zamiast .* z flaga /s: identyczne dopasowanie, ale bez flagi dotAll, ktorej
  // tsconfig z targetem ES2017 nie przepuszcza. Asercja zostaje dokladnie tak samo mocna.
  assert.doesNotMatch(nextConfig, /source:\s*['"]\/['"][\s\S]*destination:\s*['"]\/diagnoza['"]/);
});

test('explicit fast-fit mode goes to nabor and allows returning to diagnostic', () => {
  assert.match(page, /search.get\('mode'\) === 'fast_fit'/);
  assert.match(page, /fast_fit_to_nabor/);
  assert.match(page, /fast_fit_to_diagnostic/);
  assert.match(page, /Co ustawia Twój tydzień, zanim zaczniesz myśleć o diecie i treningu/);
});

test('release telemetry is versioned separately', () => {
  assert.match(cfg, /ASSESSMENT_VERSION = '2\.9\.0'/);
});
