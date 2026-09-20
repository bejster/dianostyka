import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/components/DecisionDiagnostic.tsx', 'utf8');
const flow = fs.readFileSync('app/components/SingleQuestionFlow.tsx', 'utf8');
const result = fs.readFileSync('app/components/ResultExperience.tsx', 'utf8');

test('contact is required only after explicit help/coaching intent', () => {
  assert.match(flow, /intentId === 'in_prowadz' \|\| intentId === 'in_zobacz'/);
  assert.match(flow, /!contactRequired \|\| igClean\.length >= 2/);
  assert.match(flow, /contact_required: contactRequired/);
  assert.match(flow, /Wybrałeś prowadzenie\. Wynik dostajesz od razu\./);
  assert.match(flow, /Chcesz zobaczyć, jak wygląda praca ze mną\./);
});

test('entry promises a bounded diagnostic task and an immediate optional-contact result', () => {
  assert.match(page, /Od 6 do 11 odpowiedzi/);
  assert.match(page, /Co z Twojego dnia odbija się później na formie/);
  assert.match(page, /wynik bez podawania kontaktu/);
  assert.doesNotMatch(page, /Twój sufit|Sprawdź mój poziom|michal-portrait/);
});

test('completion analytics records only completion and question count', () => {
  assert.match(page, /event\('diag_complete', \{ question_count: nextQuestions.length \}\)/);
  assert.match(page, /event\('diag_result_viewed'\)/);
  assert.doesNotMatch(page, /content_signal|contentSignals/);
});

test('every public telemetry call excludes answers and contact', () => {
  const calls = [...page.matchAll(/\bevent\('[^']+'(?:,\s*\{([^}]+)\})?\)/g)];
  assert.ok(calls.length >= 10);
  for (const call of calls) assert.doesNotMatch(call[1] || '', /instagram|answers|fit|objection|health|symptoms|evidence/);
});
