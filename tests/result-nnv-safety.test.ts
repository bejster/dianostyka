import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeWhyRepeats, computeLoop } from '../app/lib/fracture-engine.ts';
import { computeAwarenessGap } from '../app/lib/awareness-gap.ts';
import { EXPERIMENT_BANK } from '../app/lib/experiment-bank.ts';

const result = readFileSync('app/components/ResultExperience.tsx', 'utf8');
const fracture = readFileSync('app/lib/fracture-engine.ts', 'utf8');
const awareness = readFileSync('app/lib/awareness-gap.ts', 'utf8');

test('belief shift is grounded in declared timing and weakest axis, without an invented cause', () => {
  assert.match(result, /className="rx-belief-shift"/);
  assert.match(result, /Słabszy wynik pokazuje, gdzie szukać/);
  assert.match(result, /breakId === 'bw_varies'/);
  assert.match(result, /jedno nie wynika automatycznie z drugiego/);
  assert.match(result, /To są Twoje odpowiedzi\. Teraz oddzielmy je od mojej hipotezy/);
  assert.doesNotMatch(result, /To są Twoje własne odpowiedzi, nie moja interpretacja/);
  assert.doesNotMatch(result, /Te odpowiedzi układają się w jeden wzorzec, który wraca co tydzień/);
});

test('a three-day observation is not sold as causal confirmation', () => {
  assert.match(result, /observationOnly \?/);
  assert.match(result, /Trzy dni to wstęp, nie dowód przyczyny/);
  assert.match(result, /sam nie dowodzi przyczyny/);
  assert.doesNotMatch(result, /ten sygnał się powtórzy, mamy lepszy argument/);
  assert.doesNotMatch(result, /Trzy dni mają rozstrzygnąć jedno: czy trafiliśmy w miejsce/);
  assert.match(result, /Jeśli nie pomaga, zmieniam ruch/);
  assert.match(result, /Jeśli nie, zbieram kolejne obserwacje lub zmieniam pytanie/);
  const low = computeLoop('różnie', [], { give_up_point: 'gup_wieczor' }, 'LOW');
  assert.match(low.nodes.at(-1)?.text || '', /obserwacji/);
  assert.doesNotMatch(low.nodes.at(-1)?.text || '', /potwierdzić albo wykluczyć/);
});

test('comparison of two subjective time frames is never called a measured deficit', () => {
  const value = computeAwarenessGap({ self_energy: 8, sleep_quality: 'sq_wrecked', stress_level: 'st_high', monday_recovery: 'mon_2', evening_eating: 'ee_binge', half_power_hours: 2 });
  assert.equal(value.verdict, 'ABOVE');
  assert.match(value.headline, /Roboczy wskaźnik typowego tygodnia/);
  assert.match(value.body, /Jedna ocena dotyczy dzisiaj/);
  assert.doesNotMatch(awareness, /Jesteś dla siebie ostrzejszy niż Twój własny tydzień/);
  assert.match(result, /To dwa różne okresy, a nie drugi pomiar tej samej energii/);
});

test('end-of-week fatigue does not manufacture lost weekend days or imaginary client histories', () => {
  const text = computeWhyRepeats({ work_load: 'wl_owner', give_up_point: 'gup_weekend', monday_recovery: 'mon_3' });
  assert.match(text, /w środę albo później/);
  assert.doesNotMatch(text, /stracone dni|4 dni z siedmiu|5 dni z siedmiu/);
  assert.doesNotMatch(fracture, /const RETURN_COST/);
  assert.doesNotMatch(result, /poniedziałek, który wygląda tak samo jak dwa lata temu|Nigdy nie sprawdziłeś tego|Jak grupa kontrolna w badaniu/);
  assert.match(result, /\.map\(\(st\) => \(\{ label: st.label, cost: st.reason \}\)\)/);
});

test('all twenty explanations provide decisions without generic AI visual metaphors', () => {
  assert.equal(Object.keys(EXPERIMENT_BANK).length, 20);
  for(const exp of Object.values(EXPERIMENT_BANK)) {
    assert.ok(exp.why.length >= 80 && exp.why.length <= 240, exp.id);
    assert.doesNotMatch(exp.why, /korki też|łódka|otwarte karty w przeglądarce|bateria telefonu|wizyta u dentysty|przeprowadzka zamiast sprzątania/i, exp.id);
  }
});

test('the prediction readout does not promise a causal verdict from three days', () => {
  const src = readFileSync('app/lib/decision-engine.ts', 'utf8');
  assert.doesNotMatch(src, /test rozstrzygnie|test 72h pokaże, kto ma rację|przyczyna siedzi tutaj|test ma ten trop potwierdzić albo odrzucić/i);
});
