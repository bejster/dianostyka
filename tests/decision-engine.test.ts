import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDecision, plainAction, plainText, testNote, sentenceCase, bridgeLine, predictionGap, confidenceState, routeCategory, leverFromExperiment, hypothesisFrom, MEDICAL_BOUNDARY } from '../app/lib/decision-engine.ts';
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
  // Weekend nie stoi w lancuchu wieczoru w zadna strone: to jest prawdziwy przeciwdowod.
  const d = buildDecision({ answers: { ...base, prediction: 'pr_niewiem', good_day: 'gd_weekend' }, experiment: EXPERIMENT_BANK.E1, confidence: 'HIGH', routePrimary: 'experiment' });
  assert.equal(d.contrast_evidence.effect, 'counter');
  assert.equal(d.confidence.state, 'trop');
  assert.match(d.counterevidence || '', /czymś innym: tym, że wypadł po spokojnym weekendzie/);
  assert.equal(d.prediction_gap.type, 'none');
  const low = buildDecision({ answers: { ...base, prediction: 'pr_niewiem', good_day: 'gd_weekend' }, experiment: EXPERIMENT_BANK.E1, confidence: 'MEDIUM', routePrimary: 'experiment' });
  assert.equal(low.confidence.state, 'za_malo');
  assert.equal(low.confidence.label, 'Dwa tropy naraz');
});

test('kontrast spojny z lancuchem 168 w obie strony nie obniza pewnosci', () => {
  // Trening stoi ZA wieczorem: dzien lepszy przez ruch nie przeczy tropowi wieczoru.
  const d = buildDecision({ answers: { ...base, prediction: 'pr_niewiem', good_day: 'gd_ruch' }, experiment: EXPERIMENT_BANK.E1, confidence: 'HIGH', routePrimary: 'experiment' });
  assert.equal(d.contrast_evidence.effect, 'neutral');
  assert.equal(d.confidence.state, 'wzorzec');
  assert.equal(d.counterevidence, null);
  const s = buildDecision({ answers: { ...base, prediction: 'pr_sen', good_day: 'gd_wieczor' }, experiment: EXPERIMENT_BANK.E1, confidence: 'HIGH', routePrimary: 'experiment' });
  assert.match(s.counterevidence || '', /różnił się właśnie spokojnym wieczorem/);
});

test('obstawienie glebsze niz wskazane miejsce = deeper, nie pudlo', () => {
  assert.equal(predictionGap('glowa', 'trening'), 'deeper');
  assert.equal(predictionGap('weekend', 'sen'), 'deeper');
  assert.equal(predictionGap('sen', 'wieczor'), 'upstream');
  const d = buildDecision({ answers: { ...base, prediction: 'pr_niewiem' }, experiment: EXPERIMENT_BANK.E1, confidence: 'HIGH', routePrimary: 'experiment' });
  assert.equal(d.prediction.label, '„nie mam pojęcia”');
  assert.doesNotMatch(d.prediction_gap.line, /Trafiłeś/);
});

test('R2/R4 bez godziny spadku: miejsce nierozstrzygniete, bez domyslnego snu jako wniosku', () => {
  const d = buildDecision({ answers: { ...base, break_window: 'bw_varies', prediction: 'pr_sen', good_day: 'gd_sen' }, experiment: EXPERIMENT_BANK.R4, confidence: 'MEDIUM', routePrimary: 'experiment' });
  assert.equal(d.upstream_candidate.resolved, false);
  assert.equal(d.upstream_candidate.label, 'jeszcze nie wiadomo');
  assert.equal(d.prediction_gap.type, 'none');
  assert.match(d.prediction_gap.line, /nie wskazują jeszcze jednego miejsca/);
  assert.equal(d.contrast_evidence.effect, 'none');
  assert.equal(d.upstream_candidate.lever, 'sen', 'petla powrotu dalej ma dzwignie');
  const ok = buildDecision({ answers: { ...base, break_window: 'bw_morning' }, experiment: EXPERIMENT_BANK.R4, confidence: 'MEDIUM', routePrimary: 'experiment' });
  assert.equal(ok.upstream_candidate.resolved, true);
});

test('cel naped i libido zawsze niesie granice medyczna', () => {
  const d = buildDecision({ answers: { ...base, primary_goal: 'goal_naped', prediction: 'pr_sen' }, experiment: EXPERIMENT_BANK.E1, confidence: 'HIGH', routePrimary: 'experiment' });
  assert.equal(d.medical_boundary, MEDICAL_BOUNDARY);
  assert.match(bridgeLine('Napęd i libido', 'sen'), /także zdrowotnych/);
  assert.doesNotMatch(bridgeLine('Napęd i libido', 'sen'), /lekarz/i);
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

test('wynik: odczyt decyzji w pierwszym kadrze, petla powrotu zapisuje tylko kategorie', () => {
  const r = readFileSync('app/components/ResultExperience.tsx', 'utf8');
  for (const dt of ['Chciałeś poprawić', 'Obstawiłeś', 'Najwięcej zapasu', 'Gdzie zaczynasz', 'Pierwszy ruch 72h', 'Pewność']) assert.ok(r.includes('<dt>' + dt + '</dt>'), dt);
  assert.match(r, /href="#test-72h"/);
  assert.match(r, /data-beat="5" id="test-72h"/);
  assert.ok(!r.includes('<dt>Obserwuj</dt>'), 'obserwuj siedzi w wierszu testu, bez osmego wiersza');
  assert.match(r, /rx-ro-obs/);
  assert.ok(r.indexOf('rx-readout') < r.indexOf('data-beat="mirror"'), 'odczyt stoi w hero, przed lustrem');
  const rec = r.slice(r.indexOf('const rec: ReturnRecord'), r.indexOf('localStorage.setItem(RETURN_KEY'));
  assert.doesNotMatch(rec, /imie|instagram|user_pain|raw/);
  assert.match(r, /trackDiag\('experiment_accepted'/);
});

test('intro: drzwi zmieniaja tylko kicker, petla powrotu ma trzy odpowiedzi i trzy stany', () => {
  const pg = readFileSync('app/diagnoza/page.tsx', 'utf8');
  assert.match(pg, /pick\('door', \['hit', 'th2'\]\)/);
  assert.match(pg, /ctx\.entry_variant = /);
  assert.match(pg, /\['pomoglo', 'Pomogło'\], \['czesciowo', 'Częściowo'\], \['nic', 'Nic'\]/);
  for (const ev of ['return_7d', 'hypothesis_strengthened', 'hypothesis_weakened', 'hypothesis_unresolved']) assert.ok(pg.includes(ev), ev);
  assert.match(pg, /daysSince\(rec\.at, Date\.now\(\)\) >= 3/);
});

test('failed_solution i constraint zmieniaja odczyt, nie wybor ani pewnosc', () => {
  const a = buildDecision({ answers: { ...base, prediction: 'pr_sen', good_day: 'gd_wieczor' }, experiment: EXPERIMENT_BANK.E1, confidence: 'HIGH', routePrimary: 'experiment' });
  const b = buildDecision({ answers: { ...base, tried_before: 'tb_0', work_load: 'wl_clock', prediction: 'pr_sen', good_day: 'gd_wieczor' }, experiment: EXPERIMENT_BANK.E1, confidence: 'HIGH', routePrimary: 'experiment' });
  assert.match(a.failed_solution.line || '', /nie dożyły czterech tygodni/);
  assert.match(a.test_scope || '', /jeden ruch/);
  assert.match(a.test_note || '', /nie dożyły czterech tygodni, a w firmie wszystko wraca do Ciebie\. Dlatego tylko ten jeden ruch/);
  assert.equal(b.failed_solution.line, null);
  assert.equal(b.test_scope, null);
  assert.equal(b.test_note, null);
  assert.match(testNote('tb_3', 'wl_clock') || '', /^Pięć albo więcej planów .* jeden ruch, 72 godziny\.$/);
  assert.match(testNote('tb_0', 'wl_people') || '', /^Ludzie czekają/);
  assert.equal(a.confidence.state, b.confidence.state);
  assert.equal(a.experiment.id, b.experiment.id);
});

test('najlepszy dzien = to, co obstawil: nota nie mowi "czyms innym"', () => {
  const d = buildDecision({ answers: { ...base, prediction: 'pr_trening', good_day: 'gd_ruch' }, experiment: EXPERIMENT_BANK.E1, confidence: 'HIGH', routePrimary: 'experiment' });
  assert.equal(d.contrast_evidence.effect, 'neutral');
  assert.match(d.counterevidence || '', /treningiem albo większą dawką ruchu, czyli tym, co sam obstawiłeś/);
  assert.doesNotMatch(d.counterevidence || '', /czymś innym/);
  const c = buildDecision({ answers: { ...base, prediction: 'pr_weekend', good_day: 'gd_weekend' }, experiment: EXPERIMENT_BANK.E1, confidence: 'HIGH', routePrimary: 'experiment' });
  assert.equal(c.contrast_evidence.effect, 'counter');
  assert.match(c.counterevidence || '', /co sam obstawiłeś\. Odpowiedzi wskazują inne miejsce/);
});

test('odczyt: bez zargonu Punktu Pekniecia i bez caps locka', () => {
  for (const e of Object.values(EXPERIMENT_BANK)) {
    assert.doesNotMatch(plainAction(e.action), /Punkt\w* Pęknięcia/, e.id);
    for (const t of [e.name, e.action, e.observe]) assert.doesNotMatch(plainText(t), /pęknię|PĘKNIĘ|robisz Minimum/, e.id + ': ' + t);
  }
  assert.equal(sentenceCase('JEDNA RZECZ WCZEŚNIEJ'), 'Jedna rzecz wcześniej');
});

test('bridgeLine: start == objaw nie mowi "objaw" o innej osi, brak zapasu nie udaje, ze cos lezy', () => {
  const same = bridgeLine('Weekend i rytm', 'weekend');
  assert.ok(!same.includes('wygląda tu na objaw'));
  assert.ok(same.includes('w tym samym miejscu'));
  assert.ok(bridgeLine('Forma', 'sen').includes('Forma wygląda tu na objaw'));
  assert.match(bridgeLine('Forma', 'sen', false), /nic tu nie leży/);
  assert.equal(bridgeLine(undefined, 'sen'), '');
  const src = readFileSync('app/lib/decision-engine.ts', 'utf-8');
  assert.ok(!src.includes('zaczynamy wcześniej'));
});
