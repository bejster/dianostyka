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
