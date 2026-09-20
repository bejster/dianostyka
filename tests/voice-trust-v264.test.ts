import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/components/DecisionDiagnostic.tsx', 'utf8');
const result = fs.readFileSync('app/components/ResultExperience.tsx', 'utf8');
const questions = fs.readFileSync('app/lib/assessment-config.ts', 'utf8');
const packs = fs.readFileSync('app/lib/result-content.ts', 'utf8');
const flow = fs.readFileSync('app/components/SingleQuestionFlow.tsx', 'utf8');

test('v3 names Michal and demonstrates a concrete first step without invented credentials', () => {
  assert.match(page, /Michał · Hantle i Talerz · Diagnostyka 168/);
  assert.match(page, /Dlaczego pytam o to, co było wcześniej/);
  assert.match(page, /Wynik powstaje automatycznie/);
  assert.doesNotMatch(page, /Human Performance Coach|Twój sufit/);
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
  assert.match(questions, /potrzebuję go tylko po to, żeby wiedzieć, do kogo należy wynik\./);
});
