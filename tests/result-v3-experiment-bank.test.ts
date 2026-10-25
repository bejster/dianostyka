import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EXPERIMENT_BANK, computeConfidence, selectExperiment, type SelectorInput } from '../app/lib/experiment-bank.ts';

const EXPECTED_IDS = [
  'E1', 'E2', 'E3', 'E4', 'G1', 'G2', 'G3', 'G4', 'T1', 'T2', 'T3', 'T4',
  'W1', 'W2', 'W3', 'W4', 'R1', 'R2', 'R3', 'R4',
];

test('bank has exactly the 20 frozen-spec experiment ids, each internally consistent', () => {
  assert.equal(Object.keys(EXPERIMENT_BANK).length, 20);
  for (const id of EXPECTED_IDS) {
    const exp = EXPERIMENT_BANK[id as keyof typeof EXPERIMENT_BANK];
    assert.ok(exp, `missing experiment ${id}`);
    assert.equal(exp.id, id);
    for (const field of ['name', 'action', 'moment', 'observe', 'doNotChange', 'purpose', 'why'] as const) {
      assert.ok(typeof exp[field] === 'string' && exp[field].length > 0, `${id}.${field} must be non-empty`);
    }
  }
});

function blankInput(): SelectorInput {
  return {
    breakId: '', giveUpPoint: '', eveningEating: '', takeoutCost: undefined, stressLevel: '',
    halfPowerHours: undefined, plannedTrainings: undefined, missedTrainings: undefined,
    weekendPattern: '', mondayRecovery: '', triedBefore: '',
  };
}

test('every user receives exactly one experiment — selector never returns null/undefined/multiple', () => {
  const cases: SelectorInput[] = [
    blankInput(),
    { ...blankInput(), breakId: 'bw_evening', giveUpPoint: 'gup_wieczor', eveningEating: 'ee_binge' },
    { ...blankInput(), breakId: 'bw_afterwork', giveUpPoint: 'gup_stres', stressLevel: 'st_max', halfPowerHours: 3 },
    { ...blankInput(), mondayRecovery: 'mon_3', weekendPattern: 'wp_reset' },
    { ...blankInput(), plannedTrainings: 4, missedTrainings: 3, giveUpPoint: 'gup_czas' },
    { ...blankInput(), triedBefore: 'tb_3', giveUpPoint: 'gup_efekt' },
    { ...blankInput(), breakId: 'bw_weekend' },
    { ...blankInput(), breakId: 'bw_varies' },
  ];
  for (const c of cases) {
    const { experiment, confidence } = selectExperiment(c);
    assert.ok(experiment && typeof experiment.id === 'string', 'selector must always return exactly one experiment');
    assert.ok(['HIGH', 'MEDIUM', 'LOW'].includes(confidence));
  }
});

test('confidence LOW always prefers an observation experiment (E2 / W3 / R2 / R4)', () => {
  const observationIds = new Set(['E2', 'W3', 'R2', 'R4']);
  const lowCases: SelectorInput[] = [
    blankInput(),
    { ...blankInput(), breakId: 'bw_weekend' },
    { ...blankInput(), breakId: 'bw_evening' },
    { ...blankInput(), breakId: 'bw_afternoon' },
  ];
  for (const c of lowCases) {
    const { experiment, confidence } = selectExperiment(c);
    assert.equal(confidence, 'LOW', `expected LOW confidence for sparse input ${JSON.stringify(c)}`);
    assert.ok(observationIds.has(experiment.id), `LOW confidence must select an observation experiment, got ${experiment.id}`);
  }
});

test('confidence HIGH requires break_window + give_up_point + aligned domain signal all agreeing', () => {
  const high: SelectorInput = { ...blankInput(), breakId: 'bw_evening', giveUpPoint: 'gup_wieczor', eveningEating: 'ee_binge' };
  assert.equal(computeConfidence(high), 'HIGH');
});

test('confidence MEDIUM when two signals align but not the full HIGH trio', () => {
  const medium: SelectorInput = { ...blankInput(), stressLevel: 'st_high', halfPowerHours: 2, mondayRecovery: 'mon_2' };
  assert.equal(computeConfidence(medium), 'MEDIUM');
});

test('safety gate: selector never reads morning_wood / libido / substance fields (not part of SelectorInput at all)', () => {
  const keys = Object.keys(blankInput());
  for (const forbidden of ['morningWood', 'libido', 'substance', 'alcohol']) {
    assert.ok(!keys.includes(forbidden), `SelectorInput must not carry ${forbidden}`);
  }
});

// 2026-10-14 audyt Michala: testy 72h byly sucha procedura (co, kiedy, obserwuj), bez mechanizmu i analogii.
// Kazdy eksperyment dostaje pole why: mechanizm + analogia, krotko (mobile), w glosie Michala.
test('every experiment explains why it works: mechanism plus analogy, short and in voice', () => {
  for (const def of Object.values(EXPERIMENT_BANK)) {
    const why = (def as { why?: string }).why ?? '';
    assert.ok(why.length >= 80, `${def.id} has a why line`);
    assert.ok(why.length <= 240, `${def.id} why fits mobile (${why.length})`);
    assert.doesNotMatch(why, /pęknię|PĘKNIĘ/, `${def.id} why avoids internal jargon`);
    assert.doesNotMatch(why, /[\u2013\u2014]|naprawdę/, `${def.id} why passes voice bans`);
    assert.doesNotMatch(why, /, i /, `${def.id} why has no comma before "i"`);
  }
});

test('result renders the why row under the 72h action', () => {
  const rxSrc = readFileSync(new URL('../app/components/ResultExperience.tsx', import.meta.url), 'utf8');
  assert.match(rxSrc, /rx-exp-why[\s\S]{0,200}\{experiment\.why\}/);
});

test('plan 1:1 explains the method instead of generic process language', () => {
  const rxSrc = readFileSync(new URL('../app/components/ResultExperience.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(rxSrc, /Ustawiamy wersję minimum właśnie tutaj/);
  assert.doesNotMatch(rxSrc, /Zostawiam to bez zmian, żeby był punkt odniesienia\./);
  // 2026-10-14: "{label}: najpierw przyczyna, potem objaw" bylo haslem doklejonym do etykiety; krok 02 ma wyjasniac mechanizm.
  assert.doesNotMatch(rxSrc, /najpierw przyczyna, potem objaw/);
  assert.match(rxSrc, /Najniższy wynik: \{weakestStatus\?\.label\}\. Nie udaję, że znam jego przyczynę/);
  assert.match(rxSrc, /Jeśli po jednym ruchu nic się nie zmieni, nie dorabiam do tego teorii/);
  assert.match(rxSrc, /W dobrym tygodniu działa każdy plan\./);
});
