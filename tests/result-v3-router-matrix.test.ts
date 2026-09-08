import test from 'node:test';
import assert from 'node:assert/strict';
import { routeDecision, type Intent, type StartWhen } from '../app/lib/result-router-v3.ts';

const INTENTS: Intent[] = ['in_prowadz', 'in_zobacz', 'in_sam', 'in_niewiem'];
const STARTS: StartWhen[] = ['sw_7dni', 'sw_30dni', 'sw_kwartal', 'sw_sprawdzam'];

// V4 routing: użytkownik nigdy nie musi pisać pierwszy. Michał ma lead po completion.
const EXPECTED: Record<string, 'nabor' | 'experiment'> = {
  'in_prowadz|sw_7dni': 'nabor',
  'in_prowadz|sw_30dni': 'nabor',
  'in_prowadz|sw_kwartal': 'nabor',
  'in_prowadz|sw_sprawdzam': 'nabor',
  'in_zobacz|sw_7dni': 'nabor',
  'in_zobacz|sw_30dni': 'nabor',
  'in_zobacz|sw_kwartal': 'nabor',
  'in_zobacz|sw_sprawdzam': 'nabor',
  'in_sam|sw_7dni': 'experiment',
  'in_sam|sw_30dni': 'experiment',
  'in_sam|sw_kwartal': 'experiment',
  'in_sam|sw_sprawdzam': 'experiment',
  'in_niewiem|sw_7dni': 'nabor',
  'in_niewiem|sw_30dni': 'nabor',
  'in_niewiem|sw_kwartal': 'experiment',
  'in_niewiem|sw_sprawdzam': 'experiment',
};
test('all 16 combinations resolve to the V4 action destination', () => {
  let count = 0;
  for (const intent of INTENTS) for (const sw of STARTS) {
    const key = `${intent}|${sw}`;
    assert.equal(routeDecision(intent, sw).primary, EXPECTED[key], key);
    count++;
  }
  assert.equal(count, 16);
});

test('no result route ever asks the lead to write a DM first', () => {
  for (const intent of INTENTS) for (const sw of STARTS) {
    assert.notEqual((routeDecision(intent, sw) as { primary: string }).primary, 'dm');
  }
});

test('ready/exploring help routes to NABOR', () => {
  for (const sw of STARTS) {
    assert.equal(routeDecision('in_prowadz', sw).primary, 'nabor');
    assert.equal(routeDecision('in_zobacz', sw).primary, 'nabor');
  }
});

test('self-directed routes to a concrete 72h commitment', () => {
  for (const sw of STARTS) assert.equal(routeDecision('in_sam', sw).primary, 'experiment');
});
test('unsure near-term gets NABOR; later uncertainty gets 72h test', () => {
  assert.equal(routeDecision('in_niewiem', 'sw_7dni').primary, 'nabor');
  assert.equal(routeDecision('in_niewiem', 'sw_30dni').primary, 'nabor');
  assert.equal(routeDecision('in_niewiem', 'sw_kwartal').primary, 'experiment');
  assert.equal(routeDecision('in_niewiem', 'sw_sprawdzam').primary, 'experiment');
  assert.equal(routeDecision('in_niewiem', 'sw_sprawdzam').secondaryNabor?.prominence, 'soft');
});

test('routeDecision still depends only on intent and timing', () => {
  assert.equal(routeDecision.length, 2);
});

test('unknown intent falls back to a concrete 72h action', () => {
  assert.equal(routeDecision('', '').primary, 'experiment');
});
