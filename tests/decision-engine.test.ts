import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDecision, predictionGap, confidenceState, routeCategory, leverFromExperiment, hypothesisFrom, MEDICAL_BOUNDARY } from '../app/lib/decision-engine.ts';
import { EXPERIMENT_BANK } from '../app/lib/experiment-bank.ts';

const base = { primary_goal: 'goal_sen', break_window: 'bw_evening', give_up_point: 'gup_wieczor', evening_eating: 'ee_binge', tried_before: 'tb_2', work_load: 'wl_owner' };

test('sen obstawiony, wieczor wskazany = wczesniejsze ogniwo 168', () => {
  const d = buildDecision({ answers: { ...base, prediction: 'pr_sen', good_day: 'gd_wieczor' }, experiment: EXPERIMENT_BANK.E1, confidence: 'HIGH', routePrimary: 'experiment' });
  assert.equal(d.upstream_candidate.lever, 'wieczor');
  assert.equal(d.prediction_gap.type, 'upstream');
  assert.equal(d.contrast_evidence.effect, 'support');
  assert.equal(d.confidence.state, 'wzorzec');
  assert.equal(d.route, 'self_serve');
  assert.equal(d.medical_boundary, null);
  assert.equal(d.observation_variable, EXPERIMENT_BANK.E1.observe);
  assert.equal(d.failed_solution.count, 2);
});

test('hormony = granica informacji, zero szacunku', () => {
  const d = buildDecision({ answers: { ...base, prediction: 'pr_hormony' }, experiment: EXPERIMENT_BANK.E1, confidence: 'HIGH', routePrimary: 'experiment' });
  assert.equal(d.prediction_gap.type, 'boundary');
  assert.equal(d.medical_boundary, MEDICAL_BOUNDARY);
  const src = readFileSync('app/lib/decision-engine.ts', 'utf8');
  assert.doesNotMatch(src, /ng\/dl|nmol|poziom testosteronu wynosi|niski testosteron/i);
});

test('kontrast przeciw tropowi obniza pewnosc i daje counterevidence', () => {
  const d = buildDecision({ answers: { ...base, prediction: 'pr_niewiem', good_day: 'gd_ruch' }, experiment: EXPERIMENT_BANK.E1, confidence: 'HIGH', routePrimary: 'experiment' });
  assert.equal(d.contrast_evidence.effect, 'counter');
  assert.equal(d.confidence.state, 'trop');
  assert.ok(d.counterevidence);
  assert.equal(d.prediction_gap.type, 'none');
});

test('brak odpowiedzi na nowe pytania nie wywraca wyniku (stare sesje 2.9)', () => {
  const d = buildDecision({ answers: base, experiment: EXPERIMENT_BANK.R4, confidence: 'LOW', routePrimary: 'experiment' });
  assert.equal(d.prediction_gap.type, 'none');
  assert.equal(d.contrast_evidence.effect, 'none');
  assert.equal(d.confidence.state, 'za_malo');
  assert.equal(d.route, 'data_needed');
});

test('pewnosc ma trzy stany bez procentow', () => {
  assert.equal(confidenceState('LOW', 'none'), 'za_malo');
  assert.equal(confidenceState('LOW', 'support'), 'trop');
  assert.equal(confidenceState('MEDIUM', 'none'), 'trop');
  assert.equal(confidenceState('MEDIUM', 'support'), 'wzorzec');
  assert.equal(confidenceState('HIGH', 'counter'), 'trop');
});

test('routing: nabor=help, za malo danych=data_needed, reszta self_serve', () => {
  assert.equal(routeCategory('nabor', 'za_malo'), 'help');
  assert.equal(routeCategory('experiment', 'za_malo'), 'data_needed');
  assert.equal(routeCategory('experiment', 'trop'), 'self_serve');
});

test('dzwignia z eksperymentu i fallback z okna pekniecia', () => {
  assert.equal(leverFromExperiment('W4', 'bw_morning'), 'weekend');
  assert.equal(leverFromExperiment('R4', 'bw_morning'), 'sen');
  assert.equal(leverFromExperiment('R2', 'bw_afterwork'), 'wieczor');
  assert.equal(predictionGap('weekend', 'glowa'), 'miss');
  assert.equal(predictionGap('glowa', 'glowa'), 'match');
});

test('petla powrotu mapuje wynik na stan hipotezy', () => {
  assert.equal(hypothesisFrom('pomoglo'), 'wzmocniona');
  assert.equal(hypothesisFrom('czesciowo'), 'nierozstrzygnieta');
  assert.equal(hypothesisFrom('nic'), 'oslabiona');
});

test('kazde zdanie silnika przechodzi twarde reguly glosu', () => {
  const src = readFileSync('app/lib/decision-engine.ts', 'utf8');
  const strings = src.match(/'[^'\n]{12,}'|`[^`\n]{12,}`/g) || [];
  for (const s of strings) {
    assert.doesNotMatch(s, /[—–]/, s);
    assert.doesNotMatch(s, /, i /, s);
    assert.doesNotMatch(s, /realn/i, s);
    assert.doesNotMatch(s, /chaos/i, s);
    assert.doesNotMatch(s, /\bto nie\b/i, s);
  }
});

test('nowe pytania stoja we wlasciwym miejscu i nie wchodza do score', () => {
  const cfg = readFileSync('app/lib/assessment-config.ts', 'utf8');
  const at = (id: string) => cfg.indexOf(`id: '${id}'`);
  assert.ok(at('prediction') > at('self_energy') && at('prediction') < at('work_load'));
  assert.ok(at('good_day') > at('break_window') && at('good_day') < at('sleep_quality'));
  assert.doesNotMatch(cfg.slice(at('prediction'), at('work_load')), /value: [1-9]/);
  assert.doesNotMatch(cfg.slice(at('good_day'), at('sleep_quality')), /value: [1-9]/);
});
