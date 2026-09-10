import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { computeEvidenceReceipts, computeWhyRepeats, computeCostFacts, computeLoop } from '../app/lib/fracture-engine.ts';

const root = process.cwd();
const result = fs.readFileSync(path.join(root, 'app/components/ResultExperience.tsx'), 'utf8');
const page = fs.readFileSync(path.join(root, 'app/diagnoza/page.tsx'), 'utf8');

test('no free-manual-result-analysis promise remains anywhere in the result flow', () => {
  const live = result + page;
  const banned = [
    /Chcesz, żebym spojrzał/i,
    /rzuć okiem na mój wynik/i,
    /spojrzę na (cały |Twój )?(pełny )?wynik/i,
    /powiem Ci, co sprawdziłbym u Ciebie jako pierwsze/i,
  ];
  for (const re of banned) assert.doesNotMatch(live, re, `banned free-analysis pattern found: ${re}`);
});

test('required expectation-reset copy is present verbatim in Beat 6', () => {
  assert.match(result, /Jeśli rozważasz prowadzenie, niżej masz kolejny krok\./);
  assert.match(result, /Ta diagnostyka jest już punktem wyjścia\./);
});

test('analytics events use only the safe frozen event names', () => {
  const allowed = new Set([
    'result_viewed', 'fracture_viewed', 'loop_viewed', 'experiment_viewed', 'experiment_committed',
    'method_demo_viewed', 'result_saved', 'cta_nabor_clicked', 'calibration_answer', 'content_signal',
  ]);
  // literal trackDiag('x', ...) calls + the beat->event lookup map (dynamic trackDiag(EVT[b], ...))
  const direct = [...result.matchAll(/trackDiag\('([a-z_]+)'/g)].map((m) => m[1]);
  const mapped = [...result.matchAll(/'\d': '([a-z_]+)'/g)].map((m) => m[1]);
  const calls = [...direct, ...mapped];
  assert.ok(calls.length >= 8, `expected the full V3 event set to be wired, found ${calls.length}: ${calls.join(',')}`);
  for (const ev of calls) assert.ok(allowed.has(ev), `unexpected/unsafe analytics event name: ${ev}`);
  for (const required of allowed) assert.ok(calls.includes(required), `required V3 event never fired: ${required}`);
});

test('analytics calls in the result component never reference raw sensitive fields', () => {
  const trackBlocks = [...result.matchAll(/trackDiag\([^)]*\)/g)].map((m) => m[0]);
  const forbidden = /user_pain|instagram|raw_answers|symptoms_chips|free_text|odpowiedzi/i;
  for (const block of trackBlocks) assert.doesNotMatch(block, forbidden, `analytics call leaks a sensitive field: ${block}`);
});

test('share payload (result_saved) is built only from safe arch/exp/ref params, never raw answers', () => {
  const m = result.match(/const shareSafe = \(\) => \{([\s\S]*?)\n  \};/);
  assert.ok(m, 'shareSafe function not found');
  const body = m![1];
  assert.match(body, /arch: archKey/);
  assert.match(body, /exp: experiment\.id/);
  assert.doesNotMatch(body, /instagram|user_pain|odpowiedzi|answers/i);
});

test('result page contains no direct-DM handoff or ig.me CTA', () => {
  assert.doesNotMatch(result + page, /dmHref|ig\.me\/m|cta_dm_clicked/);
});

test('fracture-engine functions never throw and degrade gracefully when user_trigger and other optional answers are missing', () => {
  assert.doesNotThrow(() => computeEvidenceReceipts({}));
  assert.doesNotThrow(() => computeWhyRepeats({}));
  assert.doesNotThrow(() => computeCostFacts({}));
  assert.doesNotThrow(() => computeLoop('test break phrase', [], {}, 'LOW'));
  const loop = computeLoop('Po pracy.', [], { give_up_point: 'gup_weekend', monday_recovery: 'mon_2' }, 'LOW');
  assert.match(loop.nodes.map(n => n.text).join(' '), /Po pracy\./);
  assert.match(loop.nodes.map(n => n.text).join(' '), /weekend/);
  assert.match(loop.nodes.map(n => n.text).join(' '), /wtorek/);
  const receipts = computeEvidenceReceipts({});
  assert.equal(receipts.length, 0, 'no evidence should be fabricated when nothing was answered');
  const costs = computeCostFacts({});
  assert.equal(costs.length, 0, 'no cost facts should be fabricated when nothing was answered');
});

test('cost facts never exceed 3 and never invent annualized/percentage figures', () => {
  const rich = computeCostFacts({ half_power_hours: 3, missed_trainings: 2, planned_trainings: 4, monday_recovery: 'mon_3', takeout_cost: 400 });
  assert.ok(rich.length <= 3, 'Beat 4 must show at most 3 explicit facts');
  const joined = rich.join(' ');
  assert.doesNotMatch(joined, /rocznie|% Twojej formy|w skali roku/i);
});

test('evidence receipts (Beat 1) never exceed 2', () => {
  const rich = computeEvidenceReceipts({
    stress_level: 'st_max', half_power_hours: 3, evening_eating: 'ee_chaos',
    weekend_pattern: 'wp_reset', missed_trainings: 3, planned_trainings: 4, tried_before: 'tb_3',
  });
  assert.ok(rich.length <= 2, 'Beat 1 must show at most 2 evidence receipts');
});

test('last result section always ends with a concrete action', () => {
  assert.match(result, /className="rx-final-action"/);
  assert.match(result, /Zanim zamkniesz wynik/);
  assert.match(result, /Biorę test 72h/);
});
