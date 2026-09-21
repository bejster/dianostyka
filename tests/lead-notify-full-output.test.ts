import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync('app/api/lead-notify/route.ts', 'utf8');

test('full Diagnostyka output goes to Make before n8n fallback', () => {
  const makeAt = route.indexOf('MAKE_DIAGNOSTYKA_WEBHOOK');
  const n8nAt = route.indexOf('N8N_DIAGNOSTYKA_WEBHOOK');
  assert.ok(makeAt > 0, 'Make webhook env missing');
  assert.ok(n8nAt > makeAt, 'n8n must remain fallback after Make');
  assert.match(route, /raw_answers/);
  assert.match(route, /diagnostyka_brief/);
  assert.match(route, /derived_signals/);
  assert.match(route, /raw_1_json/);
  assert.match(route, /raw_4_json/);
  assert.match(route, /brief_3_json/);
  assert.match(route, /derived_2_json/);
});

test('successful Make write suppresses duplicate n8n writer', () => {
  assert.match(route, /const allowN8nFallback = makeOk !== true && makeStatus !== 409/);
  assert.match(route, /if \(allowN8nFallback && n8nUrl\)/);
});

test('synthetic QA records are isolated from sales KPI and contact', () => {
  assert.match(route, /record_type_json: jsonLiteral\(qaSynthetic \? 'TEST' : 'REAL'\)/);
  assert.match(route, /exclude_kpi_json: qaSynthetic \? 'true' : 'false'/);
  assert.match(route, /do_not_contact_json: qaSynthetic \? 'true' : 'false'/);
});

test('CRM payload is not logged and product analytics contract stays separate', () => {
  assert.doesNotMatch(route, /console\.(?:log|info|warn|error)\([^\n]*(?:raw_answers|diagnostyka_brief|derived_signals)/);
  assert.doesNotMatch(route, /posthog/i);
});
