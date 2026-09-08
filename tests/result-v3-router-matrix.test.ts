import test from 'node:test';
import assert from 'node:assert/strict';
import { routeDecision, type Intent, type StartWhen } from '../app/lib/result-router-v3.ts';

const INTENTS: Intent[] = ['in_prowadz', 'in_zobacz', 'in_sam', 'in_niewiem'];
const STARTS: StartWhen[] = ['sw_7dni', 'sw_30dni', 'sw_kwartal', 'sw_sprawdzam'];

// ── AUTHORITATIVE 16-COMBO MATRIX (frozen spec 2026-09-08) ──
const EXPECTED: Record<string, { primary: string; dmAllowed: boolean }> = {
  'in_prowadz|sw_7dni': { primary: 'dm', dmAllowed: true },
  'in_prowadz|sw_30dni': { primary: 'dm', dmAllowed: true },
  'in_prowadz|sw_kwartal': { primary: 'nabor', dmAllowed: false },
  'in_prowadz|sw_sprawdzam': { primary: 'nabor', dmAllowed: false },
  'in_zobacz|sw_7dni': { primary: 'nabor', dmAllowed: false },
  'in_zobacz|sw_30dni': { primary: 'nabor', dmAllowed: false },
  'in_zobacz|sw_kwartal': { primary: 'experiment', dmAllowed: false },
  'in_zobacz|sw_sprawdzam': { primary: 'experiment', dmAllowed: false },
  'in_sam|sw_7dni': { primary: 'experiment', dmAllowed: false },
  'in_sam|sw_30dni': { primary: 'experiment', dmAllowed: false },
  'in_sam|sw_kwartal': { primary: 'experiment', dmAllowed: false },
  'in_sam|sw_sprawdzam': { primary: 'experiment', dmAllowed: false },
  'in_niewiem|sw_7dni': { primary: 'experiment', dmAllowed: false },
  'in_niewiem|sw_30dni': { primary: 'experiment', dmAllowed: false },
  'in_niewiem|sw_kwartal': { primary: 'experiment', dmAllowed: false },
  'in_niewiem|sw_sprawdzam': { primary: 'experiment', dmAllowed: false },
};

test('all 16 intent x start_when combinations resolve to the exact frozen-spec destination', () => {
  let count = 0;
  for (const intent of INTENTS) {
    for (const sw of STARTS) {
      const key = `${intent}|${sw}`;
      const expected = EXPECTED[key];
      assert.ok(expected, `missing expectation for ${key}`);
      const decision = routeDecision(intent, sw);
      assert.equal(decision.primary, expected.primary, `${key} -> expected primary=${expected.primary}, got ${decision.primary}`);
      if (!expected.dmAllowed) assert.notEqual(decision.primary, 'dm', `${key} must never route directly to DM`);
      count++;
    }
  }
  assert.equal(count, 16);
});

test('in_sam never routes to DM regardless of start_when (never direct DM invariant)', () => {
  for (const sw of STARTS) assert.notEqual(routeDecision('in_sam', sw).primary, 'dm');
});

test('in_niewiem never routes to DM regardless of start_when (never direct DM invariant)', () => {
  for (const sw of STARTS) assert.notEqual(routeDecision('in_niewiem', sw).primary, 'dm');
});

test('only in_prowadz + sw_7dni/sw_30dni ever gets hotEarlyCta', () => {
  for (const intent of INTENTS) {
    for (const sw of STARTS) {
      const decision = routeDecision(intent, sw);
      const shouldBeHot = intent === 'in_prowadz' && (sw === 'sw_7dni' || sw === 'sw_30dni');
      assert.equal(decision.hotEarlyCta, shouldBeHot, `${intent}|${sw} hotEarlyCta mismatch`);
    }
  }
});

test('routeDecision signature takes only intent + start_when — severity/score/tier physically cannot alter it', () => {
  assert.equal(routeDecision.length, 2);
});

test('in_niewiem secondary NABOR is prominent for near-term timing, soft for later/unsure timing', () => {
  assert.equal(routeDecision('in_niewiem', 'sw_7dni').secondaryNabor?.prominence, 'prominent');
  assert.equal(routeDecision('in_niewiem', 'sw_30dni').secondaryNabor?.prominence, 'prominent');
  assert.equal(routeDecision('in_niewiem', 'sw_kwartal').secondaryNabor?.prominence, 'soft');
  assert.equal(routeDecision('in_niewiem', 'sw_sprawdzam').secondaryNabor?.prominence, 'soft');
});

test('unknown/empty intent falls back safely to experiment primary, never DM', () => {
  const decision = routeDecision('', '');
  assert.equal(decision.primary, 'experiment');
});
