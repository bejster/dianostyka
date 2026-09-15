import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/diagnoza/page.tsx', 'utf8');
const flow = fs.readFileSync('app/components/SingleQuestionFlow.tsx', 'utf8');
const result = fs.readFileSync('app/components/ResultExperience.tsx', 'utf8');

test('contact is required only after explicit help/coaching intent', () => {
  assert.match(flow, /intentId === 'in_prowadz' \|\| intentId === 'in_zobacz'/);
  assert.match(flow, /!contactRequired \|\| igClean\.length >= 2/);
  assert.match(flow, /contact_required: contactRequired/);
  assert.match(flow, /Wybrałeś prowadzenie\. Wynik dostajesz od razu\./);
  assert.match(flow, /Chcesz zobaczyć, jak wygląda praca ze mną\./);
});

test('cold entry preserves curiosity and does not expose the hot sales branch', () => {
  assert.match(page, /TWÓJ ZWYKŁY TYDZIEŃ · 168 H/);
  assert.match(page, /Sprawdź, czy Twój obecny poziom to naprawdę Twój sufit\./);
  // v2.8.3 pass jezykowy: "jak funkcjonujesz" to jezyk ankiety, nie Michala. Funkcja zdania zostaje
  // ta sama (uczciwe ustawienie oczekiwan przed startem), wiec kontrakt trzyma dalej ten sam poziom.
  assert.match(page, /Kilkanaście krótkich pytań o to, jak wygląda Twój zwykły tydzień\./);
  assert.doesNotMatch(page, /michal-portrait\.jpg/);
  assert.doesNotMatch(page, /Wiem, że chcę działać/);
  assert.match(flow, /EXCLUDED_COLD_IDS = new Set\(\['alcohol_intake'\]\)/);
  assert.doesNotMatch(flow, /\{currentQ\.sectionNum\}\. \{currentQ\.section\}/);
});

test('content intelligence emits one safe categorical summary on result view', () => {
  assert.match(page, /const contentSignals: Record<string, string \| boolean>/);
  for (const key of ['break_window','give_up_point','weekend_pattern','tried_before','intent','start_when','archetype','experiment_id','experiment_confidence','route_primary','has_pain_text','has_trigger_text']) {
    assert.match(page, new RegExp(`${key}:`), `missing content signal: ${key}`);
  }
  assert.match(result, /trackDiag\('content_signal', contentSignals\)/);
});

test('content signal payload excludes raw sensitive or identifying fields', () => {
  const m = page.match(/const contentSignals:[\s\S]*?= \{([\s\S]*?)\n    \};/);
  assert.ok(m, 'contentSignals block missing');
  const block = m![1];
  for (const forbidden of ['instagram','imie','user_pain:','user_trigger:','symptoms_chips','alcohol_intake','morning_wood','drinks','objawy','lead_ref']) {
    assert.doesNotMatch(block, new RegExp(forbidden, 'i'), `unsafe content-signal field: ${forbidden}`);
  }
});
