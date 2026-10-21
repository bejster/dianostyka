import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const route = fs.readFileSync(new URL('../app/api/diag-event/route.ts', import.meta.url), 'utf8');

test('diag-event never breaks the quiz: always responds ok:true on the happy/no-config path', () => {
  assert.match(route, /NextResponse\.json\(\{ ok: true, forwarded: false \}\)/);
  assert.match(route, /NextResponse\.json\(\{ ok: true, forwarded \}\)/);
});

test('diag-event does not silently swallow downstream failure — forwarded reflects real outcome', () => {
  // Old bug: bare `.catch(() => {})` on the fetch, then unconditional `{ok:true}` with no signal.
  assert.doesNotMatch(route, /\.catch\(\(\) => \{\}\);\s*\n\s*return NextResponse\.json\(\{ ok: true \}\);/);
  assert.match(route, /forwarded = res\.ok;/);
  assert.match(route, /catch \(e\) \{/);
});

test('diag-event logs downstream failure for observability instead of losing it silently', () => {
  assert.match(route, /console\.error\(`\[diag-event\]/);
});

test('diag-event top-level catch still responds 200 so a malformed body cannot break the quiz', () => {
  assert.match(route, /return NextResponse\.json\(\{ ok: false \}, \{ status: 200 \}\);/);
});

test('P1 2026-09-08: dead webhook URL is no longer used as an executable fallback — dormant diagnostyka-events workflow stays off', () => {
  assert.doesNotMatch(route, /process\.env\.DIAG_EVENT_WEBHOOK \|\| '[^']*hstgr/);
  assert.doesNotMatch(route, /process\.env\.DIAG_EVENT_WEBHOOK \|\| 'https?:/);
});

test('P1: without an explicit DIAG_EVENT_WEBHOOK env var, the route no-ops before attempting any fetch (no false 404 noise)', () => {
  const m = route.match(/const url = \(process\.env\.DIAG_EVENT_WEBHOOK \|\| ''\)\.trim\(\);\s*\n\s*if \(!url\) return NextResponse\.json\(\{ ok: true, forwarded: false \}\);/);
  assert.ok(m, 'expected an early no-op return keyed only off DIAG_EVENT_WEBHOOK, with no other default URL');
});
