import test from 'node:test';
import assert from 'node:assert/strict';
import { createChoiceGate, journeyCue, journeyStage, questionContext } from '../app/lib/question-journey.ts';
import { getQuestions, type Answers } from '../app/lib/decision-diagnostic.ts';

test('rapid repeated taps commit only the first choice', () => {
  const queue: (() => void)[] = [];
  const gate = createChoiceGate(fn => { queue.push(fn); return () => {}; });
  const choices: string[] = [];
  assert.equal(gate.choose(() => choices.push('first'), 180), true);
  assert.equal(gate.choose(() => choices.push('second'), 180), false);
  assert.equal(choices.length, 0);
  queue[0]();
  assert.deepEqual(choices, ['first']);
  assert.equal(gate.choose(() => choices.push('next question'), 180), true);
  queue[1]();
  assert.deepEqual(choices, ['first', 'next question']);
});

test('leaving the flow invalidates a queued callback even if the scheduler fires it later', () => {
  const queue: (() => void)[] = [];
  const gate = createChoiceGate(fn => { queue.push(fn); return () => {}; });
  let commits = 0;
  gate.choose(() => commits++, 180);
  gate.cancel();
  gate.choose(() => commits++, 0);
  queue[0]();
  assert.equal(commits, 0);
  assert.equal(gate.choose(() => commits++, 0), false);
  queue[1]();
  assert.equal(commits, 1);
});

test('context repeats the actual selected answer without inventing its cause', () => {
  const a: Answers = { why: 'curious', goal: 'sleep', scene: 'sleep', previous: 'none', before: 'screen', context: 'awake' };
  assert.equal(questionContext(a, 'context')?.quote, 'Zostałem przy telefonie albo serialu.');
  assert.equal(questionContext({ ...a, scene: 'unknown' }, 'before'), undefined);
  assert.equal(questionContext({}, 'context'), undefined);
});

test('stage order stays forward on short, long and maintenance routes', () => {
  const examples: Answers[] = [
    { scene: 'unknown', previous: 'none' },
    { scene: 'steady', previous: 'plan', attempt: 'works', anchor: 'prepared' },
    { scene: 'training', previous: 'plan', attempt: 'schedule', before: 'work', context: 'extra', planned: 3 },
  ];
  for (const answers of examples) {
    const stages = getQuestions(answers).map(q => journeyStage(q.id));
    assert.deepEqual(stages, [...stages].sort());
    assert.equal(stages[0], 0);
    assert.equal(stages.at(-1), 2);
  }
});

test('countdown appears only when the caller knows the remaining route', () => {
  assert.equal(journeyCue('protect'), '');
  assert.doesNotMatch(journeyCue('context'), /Ostatnia|Zostały/);
  assert.match(journeyCue('protect', 1), /^Ostatnia odpowiedź/);
  assert.match(journeyCue('protect', 2), /^Jeszcze dwie odpowiedzi/);
});
