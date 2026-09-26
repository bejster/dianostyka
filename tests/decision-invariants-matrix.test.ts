// Macierz inwariantow silnika decyzji (nocny audyt 2026-09-26).
// Przechodzi PRAWDZIWY tor z page.tsx: selectExperiment -> routeDecision -> buildDecision,
// pelny iloczyn odpowiedzi selektora + obstawienie x najlepszy dzien x cel x trasa, plus smieci na wejsciu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDecision, predictionGap, confidenceState, routeCategory, hypothesisFrom, daysSince, PREDICTION_LEVER, GOOD_DAY_LEVER, MEDICAL_BOUNDARY, type DecisionResult, type Lever } from '../app/lib/decision-engine.ts';
import { selectExperiment, EXPERIMENT_BANK, type SelectorInput } from '../app/lib/experiment-bank.ts';
import { routeDecision } from '../app/lib/result-router-v3.ts';

const BW = ['', 'bw_morning', 'bw_midday', 'bw_afternoon', 'bw_afterwork', 'bw_evening', 'bw_weekend', 'bw_varies'];
const GUP = ['', 'gup_czas', 'gup_efekt', 'gup_stres', 'gup_weekend', 'gup_wieczor'];
const EE = ['', 'ee_binge', 'ee_chaos', 'ee_clean', 'ee_snack', 'ee_uncontrolled'];
const ST = ['', 'st_low', 'st_mid', 'st_high', 'st_max'];
const WP = ['', 'wp_same', 'wp_slight', 'wp_shifted', 'wp_reset'];
const MON = ['', 'mon_0', 'mon_1', 'mon_2', 'mon_3'];
const TB = ['', 'tb_0', 'tb_1', 'tb_2', 'tb_3'];
const NUM: Array<[number | undefined, number | undefined, number | undefined]> = [[undefined, undefined, undefined], [0, 0, 0], [3, 3, 2], [1, 2, 1]];
const PRED = ['', ...Object.keys(PREDICTION_LEVER), 'pr_<script>', 'x'.repeat(5000)];
const GD = ['', ...Object.keys(GOOD_DAY_LEVER), 'gd_nieznany'];
const GOAL = ['', 'goal_forma', 'goal_energia', 'goal_sen', 'goal_glowa', 'goal_naped', 'goal_inne', 'goal_hack'];
const WL = ['', 'wl_clock', 'wl_deadline', 'wl_firefight', 'wl_owner', 'wl_people'];
const INTENT = ['', 'in_prowadz', 'in_zobacz', 'in_sam', 'in_niewiem', 'in_bogus'];
const SW = ['', 'sw_7dni', 'sw_30dni', 'sw_kwartal', 'sw_sprawdzam', 'sw_bogus'];

const ROUTES = new Set(['self_serve', 'data_needed', 'help']);
const GAPS = new Set(['match', 'upstream', 'deeper', 'miss', 'none', 'boundary']);
const STATES = new Set(['wzorzec', 'trop', 'za_malo']);
// Medyczna pewnosc, szacunek hormonow, zawstydzanie, zakazane frazy glosu.
const BANNED = [
  /\d+\s*(ng\/dl|nmol|pg\/ml)/i, /niski testosteron|poziom testosteronu wynosi|masz niedob[oó]r|masz (depresj|zaburzeni|chorob)/i,
  /na pewno (masz|to)|gwarantuj|zdiagnoz/i, /leniw|wym[oó]wk|s[lł]ab[aą] wol|wstyd|pora[zż]k|beznadziej|wina jest twoja|twoja wina/i,
  /realn/i, /prawda jest taka/i, /robi si[eę] ciekawie/i, /[—–]/, /trafi[lł]e[sś]/i,
  /\bnie [^.]{1,40}, tylko\b/i,
];

function strings(d: DecisionResult): string[] {
  return [d.desired_outcome.label, d.prediction.label, d.failed_solution.line, d.test_scope, d.test_note, d.early_signal,
    d.upstream_candidate.label, d.counterevidence, d.confidence.label, d.prediction_gap.line, d.experiment.name,
    d.experiment.action, d.observation_variable, d.medical_boundary].filter((x): x is string => typeof x === 'string');
}

// Unikalne wejscia silnika decyzji z pelnego iloczynu selektora (to, co page.tsx moze mu realnie podac).
function selectorSpace() {
  const out = new Map<string, { sel: SelectorInput; answers: Record<string, unknown>; experimentId: string; confidence: string }>();
  let n = 0;
  for (const bw of BW) for (const gup of GUP) for (const ee of EE) for (const st of ST) for (const wp of WP) for (const mon of MON) for (const tb of TB) {
    const [hp, pt, mt] = NUM[n++ % NUM.length];
    const sel: SelectorInput = { breakId: bw, giveUpPoint: gup, eveningEating: ee, takeoutCost: undefined, stressLevel: st, halfPowerHours: hp, plannedTrainings: pt, missedTrainings: mt, weekendPattern: wp, mondayRecovery: mon, triedBefore: tb };
    const { experiment, confidence } = selectExperiment(sel);
    // buildDecision czyta z selektora tylko break_window i tried_before; reszta trafia wylacznie do signals.
    const key = [experiment.id, confidence, bw, tb, gup === '' ? 0 : 1].join('|');
    if (!out.has(key)) out.set(key, { sel, experimentId: experiment.id, confidence, answers: { break_window: bw, give_up_point: gup, evening_eating: ee, stress_level: st, weekend_pattern: wp, monday_recovery: mon, tried_before: tb } });
  }
  return [...out.values()];
}

test('macierz: 20 inwariantow na pelnym torze selektor -> router -> decyzja', () => {
  const space = selectorSpace();
  const checked = new Set<string>();
  let cases = 0, i = 0;
  const seenGap = new Set<string>(), seenState = new Set<string>(), seenRoute = new Set<string>();
  for (const s of space) {
    const exp = EXPERIMENT_BANK[s.experimentId as keyof typeof EXPERIMENT_BANK];
    for (const pred of PRED) for (const gd of GD) {
      i++;
      const goal = GOAL[i % GOAL.length], wl = WL[i % WL.length];
      const intent = INTENT[(i >> 1) % INTENT.length], sw = SW[(i >> 2) % SW.length];
      const route = routeDecision(intent, sw);
      const answers = { ...s.answers, prediction: pred, good_day: gd, primary_goal: goal, work_load: wl, intent, start_when: sw };
      const d = buildDecision({ answers, experiment: exp, confidence: s.confidence as 'HIGH' | 'MEDIUM' | 'LOW', routePrimary: route.primary });
      cases++;
      const tag = `${s.experimentId}/${s.confidence}/${s.answers.break_window}/${pred.slice(0, 20)}/${gd}/${goal}/${route.primary}`;
      // I1 trasa w dozwolonym zbiorze
      assert.ok(ROUTES.has(d.route), tag);
      seenRoute.add(d.route);
      // I2 nabor zawsze = help, niezaleznie od pewnosci
      if (route.primary === 'nabor') assert.equal(d.route, 'help', tag);
      // I3 za malo danych poza naborem = data_needed, nigdy self_serve
      if (route.primary !== 'nabor') assert.equal(d.route, d.confidence.state === 'za_malo' ? 'data_needed' : 'self_serve', tag);
      // I4 stan pewnosci z trzech, bez procentow
      assert.ok(STATES.has(d.confidence.state), tag);
      assert.doesNotMatch(d.confidence.label, /\d|%/, tag);
      seenState.add(d.confidence.state);
      // I5 brak pewnego wyniku bez dowodow: LOW nigdy nie daje wzorca, kontrast przeciw nigdy nie daje wzorca z MEDIUM
      if (s.confidence === 'LOW') assert.notEqual(d.confidence.state, 'wzorzec', tag);
      if (d.contrast_evidence.effect === 'counter') assert.notEqual(d.confidence.state, 'wzorzec', tag);
      // I6 nierozstrzygniete miejsce nie udaje wzorca i nie udaje miejsca
      if (!d.upstream_candidate.resolved) {
        assert.notEqual(d.confidence.state, 'wzorzec', tag);
        assert.equal(d.upstream_candidate.label, 'jeszcze nie wiadomo', tag);
        assert.equal(d.contrast_evidence.effect, 'none', tag);
        if (d.prediction.lever !== 'hormony') assert.equal(d.prediction_gap.type, 'none', tag);
      }
      // I7 typ luki w zbiorze; dokladne obstawienie = match, nigdy miss
      assert.ok(GAPS.has(d.prediction_gap.type), tag);
      seenGap.add(d.prediction_gap.type);
      if (d.upstream_candidate.resolved && d.prediction.lever === d.upstream_candidate.lever) assert.equal(d.prediction_gap.type, 'match', tag);
      // I8 hormony = boundary + granica medyczna; cel naped = granica medyczna
      if (d.prediction.lever === 'hormony') { assert.equal(d.prediction_gap.type, 'boundary', tag); assert.equal(d.medical_boundary, MEDICAL_BOUNDARY, tag); }
      if (goal === 'goal_naped') assert.equal(d.medical_boundary, MEDICAL_BOUNDARY, tag);
      if (d.prediction.lever !== 'hormony' && goal !== 'goal_naped') assert.equal(d.medical_boundary, null, tag);
      // I9 dokladnie jeden eksperyment i jedna zmienna obserwacji, niepuste
      assert.equal(typeof d.experiment.id, 'string'); assert.ok(d.experiment.id.length > 0 && d.experiment.action.length > 10 && d.observation_variable.length > 5, tag);
      assert.equal(d.experiment.id, s.experimentId, tag);
      // I10 za malo danych to pelny wynik: eksperyment, obserwacja, linia luki, etykieta
      if (d.confidence.state === 'za_malo') assert.ok(d.prediction_gap.line && d.confidence.label && d.experiment.action && d.early_signal, tag);
      // I11 bezpieczne fallbacki dla smieci: nieznane id nie przecieka do tekstu
      if (!(pred in PREDICTION_LEVER)) { assert.equal(d.prediction.lever, null, tag); assert.equal(d.prediction.label, '„nie mam pojęcia”', tag); }
      if (!(gd in GOOD_DAY_LEVER)) { assert.equal(d.contrast_evidence.lever, null, tag); assert.equal(d.counterevidence, null, tag); }
      // I12 counterevidence tylko przy realnym kontrascie
      if (d.contrast_evidence.effect === 'none') assert.equal(d.counterevidence, null, tag);
      // I13 sygnaly to wylacznie id kategorii (zero PII, zero wolnego tekstu)
      for (const sig of d.signals) assert.match(sig, /^[a-z]+_[a-z0-9_]+$/, tag);
      // I14 kazdy tekst: zero pewnosci medycznej, zero szacunku T, zero zawstydzania, zakazy glosu
      for (const t of strings(d)) {
        if (checked.has(t)) continue;
        checked.add(t);
        for (const re of BANNED) assert.doesNotMatch(t, re, `${tag} :: ${t}`);
        assert.ok(!t.includes('<script>') && !t.includes('xxxxx'), `${tag} :: wejscie przecieklo do tekstu`);
        assert.ok(!/undefined|null|NaN|\[object/.test(t), `${tag} :: ${t}`);
      }
    }
  }
  // I15 macierz pokrywa kazdy stan, typ luki i trase (inaczej test jest slepy)
  assert.deepEqual([...seenRoute].sort(), ['data_needed', 'help', 'self_serve']);
  assert.deepEqual([...seenState].sort(), ['trop', 'wzorzec', 'za_malo']);
  assert.deepEqual([...seenGap].sort(), ['boundary', 'deeper', 'match', 'miss', 'none', 'upstream']);
  assert.ok(cases > 20000, `za malo przypadkow: ${cases}`);
  console.log('matrix cases', cases, 'unique selector states', space.length, 'unique strings', checked.size);
});

test('I16 luka: kazda para dzwigni, deeper i upstream nigdy nie sa pudlem, rozlaczne', () => {
  const L: Lever[] = ['sen', 'wieczor', 'glowa', 'trening', 'weekend', 'powrot'];
  for (const p of L) for (const u of L) {
    const g = predictionGap(p, u);
    if (p === u) assert.equal(g, 'match');
    else assert.notEqual(g, 'match');
    assert.notEqual(g, 'boundary'); assert.notEqual(g, 'none');
  }
  assert.equal(predictionGap('hormony', 'sen'), 'boundary');
  assert.equal(predictionGap(null, 'sen'), 'none');
});

test('I17 pewnosc: monotoniczna wzgledem bazy i kontrastu (boundary)', () => {
  const rank = { za_malo: 0, trop: 1, wzorzec: 2 } as const;
  const B = ['LOW', 'MEDIUM', 'HIGH'] as const;
  for (const e of ['support', 'neutral', 'none', 'counter'] as const) for (let k = 1; k < B.length; k++)
    assert.ok(rank[confidenceState(B[k], e)] >= rank[confidenceState(B[k - 1], e)], `${e} ${B[k]}`);
  for (const b of B) {
    assert.ok(rank[confidenceState(b, 'support')] >= rank[confidenceState(b, 'none')]);
    assert.ok(rank[confidenceState(b, 'counter')] <= rank[confidenceState(b, 'none')]);
    assert.equal(confidenceState(b, 'neutral'), confidenceState(b, 'none'));
  }
  assert.equal(confidenceState('LOW', 'support'), 'trop');
  assert.equal(confidenceState('HIGH', 'counter'), 'trop');
});

test('I18 router: kazda kombinacja (takze smieci) daje nabor albo experiment, nigdy dm', () => {
  for (const a of INTENT) for (const b of SW) {
    const r = routeDecision(a, b);
    assert.ok(r.primary === 'nabor' || r.primary === 'experiment', `${a}|${b}`);
    for (const c of ['wzorzec', 'trop', 'za_malo'] as const) assert.ok(ROUTES.has(routeCategory(r.primary, c)));
  }
});

test('I19 determinizm: to samo wejscie daje identyczny wynik', () => {
  const sel: SelectorInput = { breakId: 'bw_evening', giveUpPoint: 'gup_wieczor', eveningEating: 'ee_binge', takeoutCost: undefined, stressLevel: 'st_high', halfPowerHours: 2, plannedTrainings: 3, missedTrainings: 2, weekendPattern: 'wp_shifted', mondayRecovery: 'mon_2', triedBefore: 'tb_3' };
  const a = selectExperiment(sel), b = selectExperiment(sel);
  assert.equal(a.experiment.id, b.experiment.id);
  const ans = { break_window: 'bw_evening', prediction: 'pr_sen', good_day: 'gd_glowa', primary_goal: 'goal_naped', tried_before: 'tb_3', work_load: 'wl_owner' };
  assert.deepEqual(buildDecision({ answers: ans, experiment: a.experiment, confidence: a.confidence, routePrimary: 'experiment' }),
    buildDecision({ answers: { ...ans }, experiment: b.experiment, confidence: b.confidence, routePrimary: 'experiment' }));
});

test('I20 petla powrotu: trzy wyniki na trzy stany, dni liczone w dol, bez ujemnych niespodzianek', () => {
  assert.equal(hypothesisFrom('pomoglo'), 'wzmocniona');
  assert.equal(hypothesisFrom('nic'), 'oslabiona');
  assert.equal(hypothesisFrom('czesciowo'), 'nierozstrzygnieta');
  const now = Date.UTC(2026, 8, 26, 12);
  assert.equal(daysSince(now - 7 * 864e5 + 1, now), 6);
  assert.equal(daysSince(now - 7 * 864e5, now), 7);
  assert.equal(daysSince(now - 8 * 864e5, now), 8);
  assert.ok(daysSince(now + 864e5, now) < 0);
});
