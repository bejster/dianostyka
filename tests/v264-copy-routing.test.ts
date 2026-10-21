import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'app/diagnoza/page.tsx'), 'utf8');
const result = fs.readFileSync(path.join(root, 'app/components/ResultExperience.tsx'), 'utf8');
const cfg = fs.readFileSync(path.join(root, 'app/lib/assessment-config.ts'), 'utf8');
const flow = fs.readFileSync(path.join(root, 'app/components/SingleQuestionFlow.tsx'), 'utf8');

test('v2.8.1 keeps cold entry minimal and human proof later in the result', () => {
  assert.match(cfg, /ASSESSMENT_VERSION = '3\.0\.0'/);
  assert.doesNotMatch(page, /michal-portrait\.jpg/);
  assert.match(result, /michal-portrait\.jpg/);
  assert.doesNotMatch(page + result, /Human Performance Coach|Performance Coach/i);
});

test('ready-to-buy intent is never downgraded by diagnostic tier (V3: routeDecision is a pure function of intent+start_when only)', () => {
  const router = fs.readFileSync(path.join(root, 'app/lib/result-router-v3.ts'), 'utf8');
  // routeDecision() nie przyjmuje score/tier/severity jako argumentu — nie ma jak je uwzglednic.
  assert.match(router, /export function routeDecision\(intentRaw: string, startWhenRaw: string\)/);
  assert.match(router, /const near = sw === 'sw_7dni' \|\| sw === 'sw_30dni'/);
  assert.match(router, /if \(intent === 'in_prowadz'\) return/);
  assert.match(page, /const route = routeDecision\(intentStr, startWhenStr\)/);
  assert.doesNotMatch(result, /route\.primary === 'dm'/);
  assert.match(result, /className="rx-final-action"/);
});


test('flow never starts or resumes on a condition-false question', () => {
  assert.match(flow, /const visible = \(idx: number\)/);
  assert.match(flow, /if \(visible\(candidate\)\) return candidate/);
  assert.match(flow, /for \(let idx = candidate \+ 1; idx < FLOW_QUESTIONS\.length; idx\+\+\) if \(visible\(idx\)\) return idx/);
});
