import test from 'node:test';
import assert from 'node:assert/strict';
import { refinementOptions, selectedRefinement, refinementAsText, nextRepairIndex } from '../app/lib/result-refinement.ts';
import { buildDecisionResult, getQuestions, updateAnswer, type Answers } from '../app/lib/decision-diagnostic.ts';

const food: Answers = { why: 'curious', goal: 'form', scene: 'food', previous: 'none', before: 'meal', context: 'work', frequency: '3', protect: 'rest', impact: 'none' };

test('feasibility changes the task without rewriting the original scene', () => {
  const original = structuredClone(food);
  const r = buildDecisionResult(food);
  const access = selectedRefinement(food, r, '', 'food_access')!;
  const pause = selectedRefinement(food, r, '', 'food_break')!;
  assert.notEqual(access.action, pause.action);
  assert.match(access.action, /zabrać/);
  assert.match(pause.action, /ustalenia z kimś/);
  assert.deepEqual(food, original);
  assert.equal(selectedRefinement(food, r, '', 'food_ready')!.action, r.experiment.action);
});

test('observation, successful attempts and unverified families do not get meal interventions', () => {
  for (const a of [{ ...food, frequency: '0' }, { ...food, frequency: 'unknown' }, { ...food, context: 'unknown' }, { ...food, previous: 'plan', attempt: 'works' }, { ...food, previous: 'plan', attempt: 'no_change' }, { ...food, scene: 'sleep', before: 'screen', context: 'awake' }]) {
    assert.equal(refinementOptions(a, buildDecisionResult(a), '').length, 0);
  }
});

test('rejected advice cannot be turned into a new trial by a stale choice', () => {
  const r = buildDecisionResult(food);
  assert.equal(selectedRefinement(food, r, 'off', 'food_access'), undefined);
  assert.equal(selectedRefinement(food, r, 'obvious', 'food_access'), undefined);
  for (const o of refinementOptions(food, r, 'obvious')) assert.equal(o.canTry, false);
  assert.equal(new Set(refinementOptions(food, r, 'obvious').map(o => o.action)).size, 4);
});

test('unknown barriers remain unresolved instead of receiving a fabricated prescription', () => {
  const o = selectedRefinement(food, buildDecisionResult(food), '', 'food_other')!;
  assert.equal(o.canTry, false);
  assert.match(o.observe, /nie ma dość informacji/);
});

test('export retains rejection even with no further answer and rejects unknown IDs', () => {
  const r = buildDecisionResult(food);
  assert.match(refinementAsText(food, r, 'off', ''), /nie oddaje mojej sytuacji/);
  assert.match(refinementAsText(food, r, 'obvious', ''), /nie zostało zaakceptowane/);
  assert.equal(refinementAsText(food, r, '', 'fabricated'), '');
});

test('repair asks only missing dependencies and leaves independent answers intact', () => {
  const a = updateAnswer(food, 'before', 'no_food');
  assert.equal(a.why, food.why);
  assert.equal(a.protect, food.protect);
  assert.equal(a.context, undefined);
  assert.equal(nextRepairIndex(getQuestions(a), a), -1);
  const b = updateAnswer(food, 'scene', 'training');
  const questions = getQuestions(b);
  assert.equal(questions[nextRepairIndex(questions, b)].id, 'before');
  assert.equal(b.previous, food.previous);
});
