// premium-icp-patch-v1.test.ts — kontrakty dla PREMIUM ICP / VOC CANON — PATCH V1
//
// Trzy pytania kwalifikacyjne (work_load, spillover, agency_mode) maja wartosc 0 i ZERO wplywu
// na severity, Mape 168, archetyp i routing CTA. Ten plik pilnuje, zeby tak zostalo,
// oraz zeby sygnal fit szedl wylacznie na prywatny kanal (Telegram + n8n), nigdy do PostHoga.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { QUESTIONS } from '../app/lib/assessment-config.ts';
import { classifyPremiumFit } from '../app/lib/premium-fit.ts';

const q = (id: string) => QUESTIONS.find((x) => x.id === id);

// ── §3: obecnosc i zerowa waga ──────────────────────────────────────────────

test('trzy pytania PATCH V1 istnieja w konfiguracji', () => {
  for (const id of ['work_load', 'spillover', 'agency_mode']) {
    assert.ok(q(id), `brak pytania ${id}`);
  }
});

test('pytania PATCH V1 nie ruszaja scoringu: kazda opcja value 0, zero wag', () => {
  for (const id of ['work_load', 'spillover', 'agency_mode']) {
    const def = q(id)!;
    assert.equal(def.upstreamWeight, 0, `${id}: upstreamWeight musi byc 0`);
    assert.equal(def.crossDomainImpact, 0, `${id}: crossDomainImpact musi byc 0`);
    assert.ok(def.options, `${id}: brak opcji`);
    for (const o of def.options!) {
      assert.equal(o.value, 0, `${id}/${o.id}: value musi byc 0`);
    }
  }
});

test('work_load nie jest pierwszym pytaniem swojej domeny, wiec nie przejmuje dzwigni chaos', () => {
  const chaos = QUESTIONS.filter((x) => x.domain === 'chaos');
  assert.ok(chaos.length > 0);
  assert.notEqual(chaos[0].id, 'work_load');
  assert.notEqual(chaos[0].id, 'spillover');
  assert.notEqual(chaos[0].id, 'agency_mode');
});

// ── branching: dlugosc quizu placi tylko ten, kto ma o czym opowiadac ───────

test('work_load widza wszyscy, bo to router calej galezi', () => {
  assert.equal(q('work_load')!.condition, undefined);
});

test('spillover znika dla kogos, kto konczy o 17', () => {
  const cond = q('spillover')!.condition!;
  assert.equal(cond({ work_load: 'wl_clock' }), false);
  assert.equal(cond({ work_load: 'wl_owner' }), true);
  assert.equal(cond({ work_load: 'wl_firefight' }), true);
});

test('agency_mode znika dla kogos, kto juz wybral in_sam', () => {
  const cond = q('agency_mode')!.condition!;
  assert.equal(cond({ intent: 'in_sam' }), false);
  assert.equal(cond({ intent: 'in_prowadz' }), true);
});

test('lead bez odpowiedzialnosci dostaje tylko jedno pytanie wiecej', () => {
  const extra = ['work_load', 'spillover', 'agency_mode']
    .map((id) => q(id)!)
    .filter((def) => !def.condition || def.condition({ work_load: 'wl_clock', intent: 'in_sam' }));
  assert.deepEqual(extra.map((d) => d.id), ['work_load']);
});

// ── regresja: warunek liczony na swiezej odpowiedzi, nie na stanie sprzed kliku ─────
// agency_mode warunkuje sie na intent, czyli na pytaniu bezposrednio przed nim. Przy 'single'
// setAnswers nie zdazy wrocic do domkniecia goToNext, wiec bez override ekran pokazywal sie
// mimo wybranego in_sam i licznik spadal do "KROK 1".

const FLOW = readFileSync(new URL('../app/components/SingleQuestionFlow.tsx', import.meta.url), 'utf8');

test('goToNext przyjmuje swieze odpowiedzi i na nich liczy skok', () => {
  assert.ok(/goToNext = useCallback\(\(opts\?: \{[^}]*answersOverride/.test(FLOW));
  assert.ok(FLOW.includes('const ans = (opts?.answersOverride || answers)'));
  assert.ok(FLOW.includes('if (!c || c(ans)) break;'), 'skok w przod musi czytac ans');
  assert.ok(FLOW.includes('q.condition(ans)'), 'licznik widocznych musi czytac ans');
});

test('handleSingleSelect podaje dalej odpowiedz, ktora wlasnie padla', () => {
  assert.ok(FLOW.includes('goToNext({ answersOverride: fresh'));
});

// ── regresja: chipy spilloveru nie moga wpasc do listy objawow ──────────────
// symptoms_chips jest scorowane. Gdy multi bylo zapisywane pod stalym kluczem, zaznaczenie
// czegokolwiek w spilloverze dopisywalo sie do objawow i podnosilo severity pytaniem o wadze 0.

test('chipy zapisuja sie pod ID pytania, nie pod symptoms_chips', () => {
  assert.ok(!/prev\.symptoms_chips/.test(FLOW), 'handler multi nie moze czytac stalego klucza');
  assert.ok(!/answers\.symptoms_chips/.test(FLOW), 'render multi nie moze czytac stalego klucza');
  assert.ok(FLOW.includes('const key = currentQ.id;'));
});

test('spillover ma wlasny limit dwoch chipow, zgodny z tym, co obiecuje podtytul', () => {
  const def = q('spillover')!;
  assert.equal(def.maxSelect, 2);
  assert.match(def.subtitle || '', /maksymalnie 2/);
  assert.ok(FLOW.includes('currentQ.maxSelect ?? 3'), 'limit ma isc z pytania, domyslnie 3');
});

test('symptoms_chips zostaje przy domyslnym limicie trzech', () => {
  assert.equal(q('symptoms_chips')!.maxSelect, undefined);
});

// ── §4: macierz AGENCY x CONTROL NEED x STAKES ─────────────────────────────

const withStakes = { work_load: 'wl_owner', spillover: ['sp_night'] };

test('§4 PRO: dowozi sam i chce, zeby ktos patrzyl w dane', () => {
  const r = classifyPremiumFit({ ...withStakes, agency_mode: 'ag_data' });
  assert.equal(r.fit, 'PRO');
  assert.equal(r.agency, 'wysoka');
  assert.equal(r.controlNeed, 'wysoki');
  assert.equal(r.responsibility, true);
  assert.equal(r.stakes, true);
});

test('§4 KIERUNEK: wysoka agency, niska potrzeba kontroli', () => {
  const r = classifyPremiumFit({ ...withStakes, agency_mode: 'ag_solo' });
  assert.equal(r.fit, 'KIERUNEK');
  assert.equal(r.controlNeed, 'niski');
});

test('§4 RYZYKO: chce dostac wszystko podane, i to wygrywa nad stakes', () => {
  const r = classifyPremiumFit({ ...withStakes, agency_mode: 'ag_handoff' });
  assert.equal(r.fit, 'RYZYKO');
  assert.equal(r.agency, 'niska');
});

test('RYZYKO lapie sie takze bez stakes, bo to ostrzezenie, nie nagroda', () => {
  const r = classifyPremiumFit({ work_load: 'wl_clock', agency_mode: 'ag_handoff' });
  assert.equal(r.fit, 'RYZYKO');
});

test('PODSTAWA: konczy o 17, wiec brak odpowiedzialnosci', () => {
  const r = classifyPremiumFit({ work_load: 'wl_clock', agency_mode: 'ag_data' });
  assert.equal(r.fit, 'PODSTAWA');
  assert.equal(r.responsibility, false);
});

test('PODSTAWA: niesie odpowiedzialnosc, ale chodzi mu tylko o sylwetke', () => {
  const r = classifyPremiumFit({ work_load: 'wl_owner', spillover: ['sp_none'], agency_mode: 'ag_data' });
  assert.equal(r.fit, 'PODSTAWA');
  assert.equal(r.stakes, false);
});

test('ag_return to srednia agency, nie ryzyko', () => {
  const r = classifyPremiumFit({ ...withStakes, agency_mode: 'ag_return' });
  assert.equal(r.agency, 'srednia');
  assert.equal(r.fit, 'KIERUNEK');
});

test('in_sam bez agency_mode: ukryty ekran czytamy jako wysoka agency i niski control need', () => {
  const r = classifyPremiumFit({ ...withStakes, intent: 'in_sam' });
  assert.equal(r.agency, 'wysoka');
  assert.equal(r.controlNeed, 'niski');
  assert.equal(r.fit, 'KIERUNEK');
});

test('in_sam bez stakes schodzi do PODSTAWA', () => {
  const r = classifyPremiumFit({ work_load: 'wl_clock', intent: 'in_sam' });
  assert.equal(r.fit, 'PODSTAWA');
});

test('pusty lead nie dostaje zadnej etykiety na wyrost', () => {
  const r = classifyPremiumFit({});
  assert.equal(r.responsibility, false);
  assert.equal(r.stakes, false);
  assert.equal(r.fit, 'PODSTAWA');
});

// ── payload: prywatny kanal, nigdy PostHog ─────────────────────────────────

const PAGE = readFileSync(new URL('../app/diagnoza/page.tsx', import.meta.url), 'utf8');
const ROUTE = readFileSync(new URL('../app/api/lead-notify/route.ts', import.meta.url), 'utf8');

test('lead-notify dostaje surowe odpowiedzi i wyliczony fit', () => {
  for (const field of ['work_load:', 'spillover:', 'agency_mode:', 'premium_fit:', 'premium_signals:']) {
    assert.ok(PAGE.includes(field), `brak pola ${field} w payloadzie`);
  }
  assert.ok(PAGE.includes('classifyPremiumFit'));
});

test('fit nigdy nie wychodzi do PostHoga', () => {
  const posthog = PAGE.split('\n').filter((l) => /posthog|capture\(/i.test(l)).join('\n');
  assert.ok(!/premium_fit|premium_signals|work_load|spillover|agency_mode/.test(posthog));
});

test('Telegram pokazuje linie fit i koszt poza lustrem', () => {
  assert.ok(ROUTE.includes('Fit: '));
  assert.ok(ROUTE.includes('Koszt poza lustrem'));
  for (const sym of ['fitMap', 'fitIco', 'workLoadMap', 'spillMap', 'spillTxt']) {
    assert.ok(ROUTE.includes(sym), `brak ${sym} w route`);
  }
});

test('linia fit stoi pod gotowoscia, nie nad werdyktem', () => {
  const fit = ROUTE.indexOf('Fit: ${fitMap');
  const verdict = ROUTE.indexOf('Werdykt:');
  assert.ok(fit > verdict && verdict > 0);
});

test('n8n dostaje caly payload, wiec fit jedzie do Notion bez osobnego mapowania', () => {
  assert.ok(/const n8nBody = \{[^}]*\.\.\.b/.test(ROUTE.replace(/\r/g, '')));
});
