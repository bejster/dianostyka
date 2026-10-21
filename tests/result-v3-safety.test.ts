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
  // v2.8.1 pass jezykowy: "rozwazasz" -> "myslisz o". Ta sama funkcja (reset oczekiwan przed CTA),
  // ten sam poziom asercji: fraza musi stac w Beacie 6 doslownie, inaczej test pada.
  assert.match(result, /Jeśli myślisz o prowadzeniu, niżej masz następny krok\./);
  assert.match(result, /Ta diagnostyka jest już punktem wyjścia\./);
});

test('analytics events use only the safe frozen event names', () => {
  const allowed = new Set([
    'result_viewed', 'current_state_viewed',
    // v2.9: beat Lustro (samoocena vs zachowanie). Nazwa bez PII, sam fakt obejrzenia sekcji.
    'mirror_viewed',
    'map_viewed', 'evidence_viewed', 'fracture_viewed',
    'loop_viewed', 'experiment_viewed', 'horizon_viewed', 'experiment_committed',
    'method_demo_viewed', 'result_saved', 'cta_nabor_clicked', 'calibration_answer', 'content_signal',
    'result_beat_dwell', 'result_scroll_depth', 'result_exit_snapshot',
    // 3.0 warstwa decyzyjna: same kategorie (id odpowiedzi, stan, dzwignia), zero PII i tekstu.
    'desire_selected', 'prediction_locked', 'contrast_completed', 'failed_solution', 'constraint_selected',
    'prediction_gap_type', 'confidence_state', 'experiment_shown', 'experiment_accepted',
    'help_route', 'data_needed_route', 'self_serve_route',
  ]);
  // literal trackDiag('x', ...) calls + the beat->event lookup map (dynamic trackDiag(EVT[b], ...))
  const direct = [...result.matchAll(/trackDiag\('([a-z_]+)'/g)].map((m) => m[1]);
  // czytamy CALY blok EVT, nie tylko klucze numeryczne — inaczej nowy beat moglby przemycic nieautoryzowany event
  const evtBlock = result.match(/const EVT: Record<string, string> = \{([^}]*)\}/)?.[1] ?? '';
  assert.ok(evtBlock, 'beat->event lookup map (EVT) not found');
  const mapped = [...evtBlock.matchAll(/: '([a-z_]+)'/g)].map((m) => m[1]);
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

// Kontrakt bloku "dlaczego to wraca": trigger i konsekwencja NIGDY nie moga siedziec w tej samej
// domenie. Poprzednia wersja dobierala konkret pasujacy do triggera, wiec zdanie zjadalo samo
// siebie ("wchodzi weekend, wiec wypada staly rytm weekendu"). To jest tautologia, nie mechanizm.
test('konsekwencja w bloku "dlaczego to wraca" jest zawsze z innej domeny niż trigger', () => {
  // weekend jako trigger nie moze dostac weekendu jako konsekwencji, nawet gdy wp_reset jest zaznaczone
  const weekend = computeWhyRepeats({ give_up_point: 'gup_weekend', evening_eating: 'ee_snack', weekend_pattern: 'wp_reset' });
  assert.doesNotMatch(weekend, /rytm weekendu/);
  assert.match(weekend, /podjadaniem/);

  // wieczor jako trigger nie moze dostac wieczoru jako konsekwencji
  const wieczor = computeWhyRepeats({ give_up_point: 'gup_wieczor', evening_eating: 'ee_binge', stress_level: 'st_max' });
  assert.doesNotMatch(wieczor, /jedzeniem wieczorem/);
  assert.match(wieczor, /spokojne zejście z pracy/);

  // praca jako trigger nie moze dostac zejscia z pracy jako konsekwencji
  const stres = computeWhyRepeats({ give_up_point: 'gup_stres', evening_eating: 'ee_clean', stress_level: 'st_max', weekend_pattern: 'wp_reset' });
  assert.doesNotMatch(stres, /spokojne zejście z pracy/);
  assert.match(stres, /rytm weekendu/);

  // najcichszy sygnal ma pierwszenstwo: sen bije jedzenie, bo nikt sam go nie laczy z triggerem
  const sen = computeWhyRepeats({ give_up_point: 'gup_weekend', sleep_quality: 'sq_wrecked', evening_eating: 'ee_binge' });
  assert.match(sen, /gasisz światło/);

  // wypadajacy trening jest konsekwencja, kiedy sen jest czysty
  const trening = computeWhyRepeats({ give_up_point: 'gup_wieczor', sleep_quality: 'sq_great', planned_trainings: 3, missed_trainings: 2, evening_eating: 'ee_binge' });
  assert.match(trening, /trening, który miałeś wpisany w tydzień/);

  // kiedy nic nie jest podniesione, ogolnik jest uczciwy
  const spokoj = computeWhyRepeats({ give_up_point: 'gup_czas', sleep_quality: 'sq_great', evening_eating: 'ee_clean', stress_level: 'st_low', weekend_pattern: 'wp_same' });
  assert.match(spokoj, /pierwszy punkt planu/);
});

// Wczesniejsze ogniwo i policzony koszt powrotu. Bez tego blok tylko powtarzal odpowiedzi.
test('"dlaczego to wraca" bierze work_load jako wcześniejsze ogniwo i liczy koszt powrotu', () => {
  const owner = computeWhyRepeats({ give_up_point: 'gup_weekend', work_load: 'wl_owner', monday_recovery: 'mon_2' });
  assert.match(owner, /każda niezrobiona rzecz i tak wróci na Twoje biurko/);
  assert.match(owner, /sobota, niedziela, poniedziałek i wtorek/);
  assert.match(owner, /4 dni z siedmiu/);

  const firefight = computeWhyRepeats({ give_up_point: 'gup_stres', work_load: 'wl_firefight', monday_recovery: 'mon_3' });
  assert.match(firefight, /gaszenie cudzych pożarów/);
  assert.match(firefight, /5 dni z siedmiu/);

  // mon_0 to brak kosztu, wiec zadnej liczby nie wolno wymyslac
  const zeroCost = computeWhyRepeats({ give_up_point: 'gup_weekend', work_load: 'wl_clock', monday_recovery: 'mon_0' });
  assert.doesNotMatch(zeroCost, /dni z siedmiu/);
});

test('last result section always ends with a concrete action', () => {
  assert.match(result, /className="rx-final-action"/);
  assert.match(result, /Zanim zamkniesz wynik/);
  assert.match(result, /Biorę test 72h/);
});
