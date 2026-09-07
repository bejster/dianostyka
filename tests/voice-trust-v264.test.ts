import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/diagnoza/page.tsx', 'utf8');
const result = fs.readFileSync('app/components/ResultExperience.tsx', 'utf8');
const questions = fs.readFileSync('app/lib/assessment-config.ts', 'utf8');
const packs = fs.readFileSync('app/lib/result-content.ts', 'utf8');
const flow = fs.readFileSync('app/components/SingleQuestionFlow.tsx', 'utf8');

test('v2.6.4 uses a real human trust anchor', () => {
  assert.match(questions, /ASSESSMENT_VERSION = '2\.6\.4'/);
  assert.match(page, /src="\/michal-portrait\.jpg"/);
  assert.match(result, /src="\/michal-portrait\.jpg"/);
  assert.match(page, /Naprawiam facetom tydzień, który regularnie wykłada im formę i napęd\./);
  assert.match(result, /Naprawiam facetom tydzień, który regularnie wykłada im formę i napęd\./);
  assert.match(page + result, /Michał · Metoda 168|MICHAŁ · METODA 168/);
  assert.doesNotMatch(page + result, /Human Performance Coach/i);
});

test('public copy removes known AI contrast fingerprints', () => {
  const live = page + questions + result + packs + flow;
  assert.doesNotMatch(live, /Nie szukaj najgorszego momentu\. Szukaj pierwszego\./i);
  assert.doesNotMatch(live, /Problemem nie jest jeden gorszy dzień/i);
  assert.doesNotMatch(live, /nie sam weekend, tylko/i);
  assert.doesNotMatch(live, /nie idealny tydzień, tylko/i);
  assert.doesNotMatch(live, /Zamiast ruszać wszystko naraz/i);
  assert.doesNotMatch(live, /nie chodzi o wiedzę/i);
});

test('open loops stay grounded in what the flow actually uses', () => {
  assert.match(questions, /Za chwilę sprawdzimy, ile z niego zostaje przy gorszym tygodniu\./);
  assert.match(questions, /Co wydarzyło się ostatnio, że wszedłeś w ten test właśnie dziś\?/);
  assert.match(questions, /Dzięki @ będę wiedział, który wynik jest Twój, gdy do mnie napiszesz\./);
});
