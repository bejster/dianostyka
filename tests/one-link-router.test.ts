import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const page = fs.readFileSync(new URL('../app/diagnoza/page.tsx', import.meta.url), 'utf8');
const home = fs.readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const cfg = fs.readFileSync(new URL('../app/lib/assessment-config.ts', import.meta.url), 'utf8');
const layout = fs.readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
const nextConfig = fs.readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');

test('root is the one canonical public entry and renders Diagnostyka', () => {
  assert.match(home, /export \{ default \} from '.\/diagnoza\/page'/);
  assert.match(layout, /alternates:\s*\{ canonical: 'https:\/\/diagnostyka\.talerzihantle\.com\/' \}/);
  assert.doesNotMatch(nextConfig, /source:\s*['"]\/['"].*destination:\s*['"]\/diagnoza['"]/s);
});

test('entry offers diagnostic and fast-fit routes inside one product', () => {
  assert.match(page, /diag_one_link_router_v1/);
  assert.match(page, /entry_route_selected/);
  assert.match(page, /route: 'diagnostic'/);
  assert.match(page, /route: 'fast_fit'/);
  assert.match(page, /Wiem, że chcę działać\. Sprawdźmy fit i zakres/);
});

test('release telemetry is versioned separately', () => {
  assert.match(cfg, /ASSESSMENT_VERSION = '2\.6\.3'/);
});
