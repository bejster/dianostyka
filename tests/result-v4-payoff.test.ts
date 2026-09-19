import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const result = fs.readFileSync('app/components/ResultExperience.tsx', 'utf8');
const bank = fs.readFileSync('app/lib/experiment-bank.ts', 'utf8');
const page = fs.readFileSync('app/components/DecisionDiagnostic.tsx', 'utf8');

test('v3 replaces calculated axes with answer receipts and one action', () => {
  assert.match(page, /className="dd-receipts"/);
  assert.match(page, /className="dd-action"/);
  assert.doesNotMatch(page, /\bstatuses\b|\bredCount\b|rx-radar|awarenessGap/);
});

test('72h module is visual and public experiment names are Polish', () => {
  assert.match(result, /className="rx-72line"/);
  for (const token of ['FALLBACK MEAL','DECISION LOCK','WORK SHUTDOWN','PARKING LOT','ENERGY MAP','WAKE WINDOW']) {
    assert.doesNotMatch(bank, new RegExp(token, 'i'), `public English label leaked: ${token}`);
  }
});

test('v3 displays period-bounded facts and supports unknown frequency', () => {
  assert.match(page, /Ostatnie cztery weekendy/);
  assert.match(page, /Ostatnie siedem dni/);
  assert.match(page, /answers.frequency === 'unknown'/);
  assert.match(page, /Zaplanowane: \$\{answers.planned\}. Niewykonane: \$\{answers.missed\}/);
});

test('1:1 bridge is personalized from the actual result rather than generic coaching copy', () => {
  assert.match(result, /Gdybym brał ten wynik do prowadzenia, zacząłbym tak/);
  assert.match(result, /breakPos\.label/);
  assert.match(result, /weakestStatus\?\.label/);
  assert.match(result, /strongestStatus\?\.label/);
  assert.match(result, /experiment\.name/);
  assert.match(result, /repairLead/);
});


test('v3 presents no synthetic severity as a measured truth', () => {
  assert.doesNotMatch(page, /\bredCount\b|catScores|\bstatuses\b|severity|scoreBucket/);
  assert.match(page, /Hipotezy wymagają sprawdzenia/);
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
