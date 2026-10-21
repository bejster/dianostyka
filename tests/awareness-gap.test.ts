// ── LUSTRO v2.9: luka miedzy samoocena a zachowaniem ──
// Sekcja istnieje po to, zeby uswiadomic czlowieka, ktory uwaza, ze u niego wszystko gra.
// Te testy pilnuja trzech rzeczy naraz: rachunek ma byc uczciwy (§6, kazdy punkt z odpowiedzi),
// bezpieczny (zero tezy hormonalnej przy niskim napedzie) oraz milczacy przy cienkich danych.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeAwarenessGap } from '../app/lib/awareness-gap.ts';
import { QUESTIONS } from '../app/lib/assessment-config.ts';

const visible = (id: string) => {
  const q = QUESTIONS.find((x) => x.id === id);
  assert.ok(q, `pytanie ${id} musi istniec w banku`);
  return !q.condition || q.condition({});
};

test('trzy nowe pytania swiadomosci sa w zywym flow', () => {
  for (const id of ['self_energy', 'stagnation_12m', 'self_drive']) {
    assert.equal(visible(id), true, `${id} musi byc widoczne`);
  }
});

test('self_energy stoi przed kazdym pytaniem o zachowanie', () => {
  // Kto najpierw przeczyta pytania o sen, wieczory i weekend, poda liczbe juz skalibrowana.
  // Wtedy cala roznica znika i sekcja Lustro przestaje cokolwiek uswiadamiac.
  const ids = QUESTIONS.filter((q) => !q.condition || q.condition({})).map((q) => q.id);
  const self = ids.indexOf('self_energy');
  assert.ok(self >= 0);
  for (const behav of ['break_window', 'sleep_quality', 'stress_level', 'half_power_hours', 'evening_eating', 'weekend_pattern', 'monday_recovery']) {
    assert.ok(self < ids.indexOf(behav), `self_energy musi byc przed ${behav}`);
  }
});

test('nowe pytania nie ruszaja scoringu: wszystkie wagi i wartosci na zero', () => {
  for (const id of ['self_energy', 'stagnation_12m', 'self_drive']) {
    const q = QUESTIONS.find((x) => x.id === id)!;
    assert.equal(q.upstreamWeight, 0, `${id}.upstreamWeight musi byc 0`);
    assert.equal(q.crossDomainImpact, 0, `${id}.crossDomainImpact musi byc 0`);
    for (const o of q.options ?? []) assert.equal(o.value, 0, `${id}.${o.id} musi miec value 0`);
  }
});

test('pinowane opcje silnika przetrwaly patch v2.9 co do jednej', () => {
  // scoring-engine.ts + answers-to-fd.ts czytaja te id i wartosci 1:1. Kazda zmiana cicho psuje wynik.
  const PIN: Record<string, Record<string, number>> = {
    sleep_quality: { sq_great: 0, sq_ok: 30, sq_heavy: 70, sq_wrecked: 100 },
    stress_level: { st_low: 0, st_mid: 40, st_high: 80, st_max: 100 },
    evening_eating: { ee_clean: 0, ee_snack: 45, ee_binge: 70, ee_uncontrolled: 90, ee_chaos: 100 },
    weekend_pattern: { wp_same: 0, wp_slight: 35, wp_shifted: 75, wp_reset: 100 },
    alcohol_intake: { alc_zero: 0, alc_low: 35, alc_mid: 70, alc_high: 90, alc_extreme: 100 },
  };
  for (const [qid, opts] of Object.entries(PIN)) {
    const q = QUESTIONS.find((x) => x.id === qid)!;
    for (const [oid, val] of Object.entries(opts)) {
      const o = q.options!.find((x) => x.id === oid);
      assert.ok(o, `${qid}.${oid} zniknelo`);
      assert.equal(o.value, val, `${qid}.${oid} zmienilo wartosc`);
    }
  }
});

test('give_up_point zostaje w flow, bo bez niego confidence nigdy nie bedzie HIGH', () => {
  // experiment-bank.computeConfidence: HIGH wymaga hasGup. Przy LOW selektor wymusza
  // wylacznie eksperymenty obserwacyjne, wiec wyciecie tego pytania zjada Beat 5.
  assert.equal(visible('give_up_point'), true);
});

test('czlowiek, ktory uwaza, ze jest git, dostaje swoja wlasna roznice', () => {
  const g = computeAwarenessGap({
    self_energy: 8,
    sleep_quality: 'sq_heavy',
    stress_level: 'st_high',
    monday_recovery: 'mon_2',
    evening_eating: 'ee_binge',
    half_power_hours: 3,
  });
  assert.equal(g.verdict, 'ABOVE');
  assert.equal(g.selfEnergy, 8);
  // 10 - (2,5 + 1,5 + 1,5 + 0,75 + 2,25) = 1,5
  assert.equal(g.measuredEnergy, 1.5);
  assert.equal(g.gap, 6.5);
  assert.ok(g.headline.includes('8/10'));
  assert.ok(g.headline.includes('1,5/10'));
});

test('kazdy driver wskazuje konkretna odpowiedz, nigdy interpretacje', () => {
  const g = computeAwarenessGap({
    self_energy: 9,
    sleep_quality: 'sq_wrecked',
    stress_level: 'st_max',
    monday_recovery: 'mon_3',
    evening_eating: 'ee_clean',
    half_power_hours: 0,
  });
  assert.equal(g.drivers.length, 3);
  // najdrozsza skladowa na gorze
  assert.ok(g.drivers[0].includes('prawie nigdy'));
  // skladowe bez kosztu nie maja czego robic na liscie zabranych punktow
  for (const d of g.drivers) assert.ok(!d.includes('zaplanowałeś'));
});

test('zgodna samoocena nie jest karana, a zanizona zostaje nazwana', () => {
  const base = { sleep_quality: 'sq_ok', stress_level: 'st_mid', monday_recovery: 'mon_1', evening_eating: 'ee_snack', half_power_hours: 1 };
  // 10 - (1 + 0,5 + 0,5 + 0,25 + 0,75) = 7
  assert.equal(computeAwarenessGap({ ...base, self_energy: 7 }).verdict, 'ALIGNED');
  assert.equal(computeAwarenessGap({ ...base, self_energy: 4 }).verdict, 'BELOW');
  assert.equal(computeAwarenessGap({ ...base, self_energy: 10 }).verdict, 'ABOVE');
});

test('wynik nigdy nie wychodzi poza skale 1-10', () => {
  const worst = computeAwarenessGap({
    self_energy: 10, sleep_quality: 'sq_wrecked', stress_level: 'st_max',
    monday_recovery: 'mon_3', evening_eating: 'ee_chaos', half_power_hours: 4,
  });
  assert.equal(worst.measuredEnergy, 1);
  const best = computeAwarenessGap({
    self_energy: 1, sleep_quality: 'sq_great', stress_level: 'st_low',
    monday_recovery: 'mon_0', evening_eating: 'ee_clean', half_power_hours: 0,
  });
  assert.equal(best.measuredEnergy, 10);
});

test('brak samooceny albo za cienkie dane = sekcja milczy zamiast zgadywac', () => {
  assert.equal(computeAwarenessGap({ sleep_quality: 'sq_wrecked', stress_level: 'st_max', monday_recovery: 'mon_3' }).verdict, 'NONE');
  assert.equal(computeAwarenessGap({ self_energy: 8, sleep_quality: 'sq_wrecked', stress_level: 'st_max' }).verdict, 'NONE');
});

test('niski naped nie stawia zadnej tezy hormonalnej', () => {
  const g = computeAwarenessGap({
    self_energy: 8, self_drive: 2, sleep_quality: 'sq_heavy',
    stress_level: 'st_high', monday_recovery: 'mon_2', evening_eating: 'ee_binge', half_power_hours: 2,
  });
  assert.ok(g.driveLine);
  const blob = g.driveLine!.toLowerCase();
  for (const banned of ['testosteron', 'hormon', 'kortyzol', 'niedobór', 'niedobor']) {
    assert.ok(!blob.includes(banned), `driveLine nie moze zawierac "${banned}"`);
  }
  assert.ok(blob.includes('lekarz'));
  // wysoki naped nie generuje zadnego zdania
  assert.equal(computeAwarenessGap({
    self_energy: 8, self_drive: 8, sleep_quality: 'sq_heavy',
    stress_level: 'st_high', monday_recovery: 'mon_2', evening_eating: 'ee_binge', half_power_hours: 2,
  }).driveLine, undefined);
});

test('stagnacja 12 miesiecy ma zdanie dla kazdej opcji, takze dla "nie sprawdzalem"', () => {
  const q = QUESTIONS.find((x) => x.id === 'stagnation_12m')!;
  for (const o of q.options!) {
    const g = computeAwarenessGap({ stagnation_12m: o.id });
    assert.ok(g.stagnationLine, `brak zdania dla ${o.id}`);
  }
});

test('strona wyniku renderuje Lustro przed Mapa 168', () => {
  const src = readFileSync(new URL('../app/components/ResultExperience.tsx', import.meta.url), 'utf8');
  const mirror = src.indexOf('data-beat="mirror"');
  const map = src.indexOf('data-beat="map"');
  assert.ok(mirror > 0, 'brak sekcji Lustro');
  assert.ok(mirror < map, 'Lustro musi stac przed mapa');
  assert.ok(src.includes('Nie jest wynikiem medycznym'), 'brak zastrzezenia przy liczbie');
});
