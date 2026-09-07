import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'app/diagnoza/page.tsx'), 'utf8');
const result = fs.readFileSync(path.join(root, 'app/components/ResultExperience.tsx'), 'utf8');
const cfg = fs.readFileSync(path.join(root, 'app/lib/assessment-config.ts'), 'utf8');
const flow = fs.readFileSync(path.join(root, 'app/components/SingleQuestionFlow.tsx'), 'utf8');

test('v2.6.4 uses Michał portrait and removes Human Performance Coach from rendered funnel', () => {
  assert.match(cfg, /ASSESSMENT_VERSION = '2\.6\.4'/);
  assert.match(page, /michal-portrait\.jpg/);
  assert.match(result, /michal-portrait\.jpg/);
  assert.doesNotMatch(page + result, /Human Performance Coach|Performance Coach/i);
});

test('ready-to-buy intent is never downgraded by diagnostic tier', () => {
  assert.match(result, /const fastLane = intent === 'in_prowadz'/);
  assert.match(result, /startWhen === 'sw_7dni'/);
  assert.match(result, /startWhen === 'sw_30dni'/);
  assert.match(result, /nextStep\.route === 'dm' \? dmHref : ctaHref/);
  assert.doesNotMatch(result, /const nextStep = tier === 'A'/);
  assert.match(page, /startWhen=\{typeof answers\.start_when === 'string'/);
});


test('flow never starts or resumes on a condition-false question', () => {
  assert.match(flow, /const visible = \(idx: number\)/);
  assert.match(flow, /if \(visible\(candidate\)\) return candidate/);
  assert.match(flow, /for \(let idx = candidate \+ 1; idx < QUESTIONS\.length; idx\+\+\) if \(visible\(idx\)\) return idx/);
});
