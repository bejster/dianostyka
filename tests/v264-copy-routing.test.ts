import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'app/components/DecisionDiagnostic.tsx'), 'utf8');
const result = fs.readFileSync(path.join(root, 'app/components/ResultExperience.tsx'), 'utf8');
const cfg = fs.readFileSync(path.join(root, 'app/lib/assessment-config.ts'), 'utf8');
const flow = fs.readFileSync(path.join(root, 'app/components/SingleQuestionFlow.tsx'), 'utf8');

test('v2.8.1 keeps cold entry minimal and human proof later in the result', () => {
  assert.match(cfg, /ASSESSMENT_VERSION = '2\.9\.0'/);
  assert.doesNotMatch(page, /michal-portrait\.jpg/);
  assert.match(result, /michal-portrait\.jpg/);
  assert.doesNotMatch(page + result, /Human Performance Coach|Performance Coach/i);
});

test('nabor invitation depends on expressed fit and objection, never a calculated tier', () => {
  assert.match(page, /invitation\(fit, objection, String\(answers.why/);
  assert.match(page, /invite.showNabor/);
  assert.doesNotMatch(page, /severity|scoreBucket|routeDecision|premium_fit/);
});


test('flow never starts or resumes on a condition-false question', () => {
  assert.match(flow, /const visible = \(idx: number\)/);
  assert.match(flow, /if \(visible\(candidate\)\) return candidate/);
  assert.match(flow, /for \(let idx = candidate \+ 1; idx < FLOW_QUESTIONS\.length; idx\+\+\) if \(visible\(idx\)\) return idx/);
});
