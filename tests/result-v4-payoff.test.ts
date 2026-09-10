import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const result = fs.readFileSync('app/components/ResultExperience.tsx', 'utf8');
const bank = fs.readFileSync('app/lib/experiment-bank.ts', 'utf8');
const page = fs.readFileSync('app/diagnoza/page.tsx', 'utf8');

test('V4 renders a real Mapa 168 visual from existing five-axis data', () => {
  assert.match(page, /statuses=\{statuses\}/);
  assert.match(result, /Mapa 168/);
  assert.match(result, /className="rx-radar"/);
  assert.match(result, /className="rx-axis-track"/);
  assert.match(result, /Jak czytać te liczby/);
  assert.match(result, /Każda liczba powstaje wyłącznie z odpowiedzi/);
  assert.match(result, /Pod każdą osią masz odpowiedź, która najmocniej przesunęła liczbę\./);
  assert.match(result, /className="rx-axis-reason"/);
});

test('72h module is visual and public experiment names are Polish', () => {
  assert.match(result, /className="rx-72line"/);
  for (const token of ['FALLBACK MEAL','DECISION LOCK','WORK SHUTDOWN','PARKING LOT','ENERGY MAP','WAKE WINDOW']) {
    assert.doesNotMatch(bank, new RegExp(token, 'i'), `public English label leaked: ${token}`);
  }
});

test('Mapa 168 uses only answers still collected in the live flow', () => {
  const block = page.match(/const T = new Set<string>[\s\S]*?const statuses = \[/)?.[0] || '';
  assert.ok(block, 'Mapa 168 formula block missing');
  assert.doesNotMatch(block, /D\.morningWood/);
  assert.doesNotMatch(block, /D\.junk/);
  assert.doesNotMatch(block, /wkndSev[^\n]*D\.drinks/);
  assert.match(block, /0\.55 \* \(D\.wknd \/ 4\) \+ 0\.45 \* \(D\.mondayFeel \/ 3\)/);
  assert.match(block, /cnt\(\['libido', 'motivation', 'confidence', 'recovery'\]\)/);
  assert.match(block, /D\.miss \/ D\.plan/);
});

test('1:1 bridge is personalized from the actual result rather than generic coaching copy', () => {
  assert.match(result, /Gdybym brał ten wynik do prowadzenia, zacząłbym tak/);
  assert.match(result, /breakPos\.label/);
  assert.match(result, /weakestStatus\?\.label/);
  assert.match(result, /strongestStatus\?\.label/);
  assert.match(result, /experiment\.name/);
  assert.match(result, /repairLead/);
});


test('public result uses one visible severity truth', () => {
  assert.match(page, /const redCount = statuses\.filter\(\(st\) => st\.score < 45\)\.length/);
  assert.doesNotMatch(page, /const redCount = catScores\.filter/);
});

test('dead reframe LLM path is not fired from the live diagnostic flow', () => {
  assert.doesNotMatch(page, /fetch\('\/api\/diagnoza'/);
  assert.doesNotMatch(page, /reframe_shown/);
  assert.doesNotMatch(page, /buildWeekPlan/);
});

test('committing the 72h test still leaves a concrete final action', () => {
  assert.match(result, /committed && !saved/);
  assert.match(result, /Zapisz wynik na te 72 godziny/);
  assert.match(result, /onClick=\{shareSafe\}/);
});
