import assert from 'node:assert/strict';
import test from 'node:test';

import { buildWeekPlan, type WeekPlanInput } from '../app/lib/week-plan.ts';

const ARCHETYPES: Array<{ key: string; label: string; tagline: string; worstCat: string }> = [
  { key: 'weekend_reset', label: 'Weekend cofa mnie do zera', tagline: 'Pięć dni budujesz. Dwa dni kasujesz.', worstCat: 'Weekend' },
  { key: 'wieczorny_odpad', label: 'Dzień na kredycie', tagline: 'W dzień masz kontrolę. Wieczorem organizm odbiera dług.', worstCat: 'Żywienie' },
  { key: 'glowa_zajezdza', label: 'Głowa zajeżdża ciało', tagline: 'Problem zaczyna się w głowie o 22:00.', worstCat: 'Stres' },
  { key: 'wiedza_bez_wdrozenia', label: 'Wiem wszystko, nie dowożę', tagline: 'Teorię znasz lepiej niż połowa trenerów.', worstCat: 'Trening' },
  { key: 'silnik_bez_paliwa', label: 'Silnik bez paliwa', tagline: 'Niby wszystko robisz. Niby nic nie działa.', worstCat: 'Sen' },
];

function baseInput(over: Partial<WeekPlanInput> = {}): WeekPlanInput {
  return {
    archetypeKey: 'wieczorny_odpad',
    archetypeLabel: 'Dzień na kredycie',
    archetypeTagline: 'W dzień masz kontrolę. Wieczorem organizm odbiera dług.',
    worstCat: 'Żywienie',
    breakWindow: 4,
    score: 50,
    costTotal: 6000,
    wknd: 2,
    ...over,
  };
}

test('każdy archetyp daje kompletną, poprawną stronę tygodnia', () => {
  for (const a of ARCHETYPES) {
    const plan = buildWeekPlan(baseInput({ archetypeKey: a.key, archetypeLabel: a.label, archetypeTagline: a.tagline, worstCat: a.worstCat }));
    assert.equal(plan.week.length, 7, `${a.key}: 7 dni`);
    assert.equal(plan.plan.length, 6, `${a.key}: 6 kotwic`);
    assert.equal(plan.bridge.length, 4, `${a.key}: 4 ścieżki mostu`);
    assert.ok(plan.problem.name.length > 0, `${a.key}: nazwa problemu`);
    assert.ok(plan.problem.falseAssumption.length > 0, `${a.key}: fałszywe założenie`);
    assert.ok(plan.deeper.label.length > 0 && plan.deeper.body.length > 0 && plan.deeper.analogy.length > 0, `${a.key}: drugie dno kompletne`);
    assert.ok(plan.hiddenCost.multiplier.length > 0 && plan.hiddenCost.headline.length > 0, `${a.key}: ukryty koszt`);
    assert.ok(plan.potential.usedPct >= 15 && plan.potential.usedPct <= 90, `${a.key}: potencjał w zakresie`);
    assert.ok(plan.potential.punch.length > 0, `${a.key}: pointa potencjału`);
    assert.ok(plan.invitation.length > 0, `${a.key}: zaproszenie`);
    assert.ok(plan.metric.length > 0, `${a.key}: wskaźnik`);
    // most zawsze ma zapis i współpracę = zawsze jest akcja
    const kinds = plan.bridge.map(b => b.kind);
    assert.ok(kinds.includes('save') && kinds.includes('coop'), `${a.key}: most ma zapis i współpracę`);
    for (const d of plan.week) {
      assert.ok(['good', 'ok', 'risk', 'break'].includes(d.state), `${a.key}: stan dnia ${d.state}`);
    }
  }
});

test('reframe nadpisuje fałszywe założenie, ale strona stoi bez niego', () => {
  const withReframe = buildWeekPlan(baseInput({ reframe: { falszywe_zalozenie: 'Twoje własne słowa tutaj.' } }));
  assert.equal(withReframe.problem.falseAssumption, 'Twoje własne słowa tutaj.');
  const without = buildWeekPlan(baseInput());
  assert.ok(without.problem.falseAssumption.length > 0);
});

test('most zawsze zaczyna od zapisu, nigdy nie wpycha współpracy na wejściu', () => {
  const hot = buildWeekPlan(baseInput({ potentialPct: 30 }));
  const cold = buildWeekPlan(baseInput({ potentialPct: 70 }));
  assert.equal(hot.bridge[0].kind, 'save', 'najpierw zapis karty');
  assert.equal(cold.bridge[0].kind, 'save');
  // realny routing: gorący widzi prowadzenie wcześniej, zimny ma je na końcu i miękko
  const hotCoop = hot.bridge.findIndex(b => b.kind === 'coop');
  const coldCoop = cold.bridge.findIndex(b => b.kind === 'coop');
  assert.ok(hotCoop < coldCoop, 'gorący widzi prowadzenie wcześniej niż zimny');
  assert.ok(hot.bridge.some(b => b.kind === 'coop') && cold.bridge.some(b => b.kind === 'coop'), 'obaj mają ścieżkę współpracy');
  // ton zaproszenia adaptuje się do wielkości zablokowanego potencjału
  assert.notEqual(hot.invitation, cold.invitation, 'zaproszenie różne dla różnego upside');
});

test('twarde sygnały zmieniają kotwicę do usunięcia', () => {
  const booze = buildWeekPlan(baseInput({ drinks: 12 }));
  const phone = buildWeekPlan(baseInput({ drinks: 0, screenBed: 3 }));
  const remBooze = booze.plan.find(p => p.kind === 'Jedna rzecz do usunięcia')!;
  const remPhone = phone.plan.find(p => p.kind === 'Jedna rzecz do usunięcia')!;
  assert.ok(remBooze.text.toLowerCase().includes('alkohol'));
  assert.ok(remPhone.text.toLowerCase().includes('telefon'));
});

test('brak em-dash i zakazanej konstrukcji w wygenerowanym copy', () => {
  for (const a of ARCHETYPES) {
    const plan = buildWeekPlan(baseInput({ archetypeKey: a.key, archetypeLabel: a.label, archetypeTagline: a.tagline, worstCat: a.worstCat }));
    const blob = JSON.stringify(plan);
    assert.ok(!blob.includes('—'), `${a.key}: zero em-dash`);
    assert.ok(!/\bto nie [^.]{1,50}[.,]\s*to\b/i.test(blob), `${a.key}: zero "to nie X, to Y"`);
    assert.ok(!/nie chodzi o [^.]{1,50}, chodzi o /i.test(blob), `${a.key}: zero "nie chodzi o X, chodzi o Y"`);
  }
});
