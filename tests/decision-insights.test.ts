import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecisionResult, cleanAnswers, invitation, getQuestions, updateAnswer, type Answers } from '../app/lib/decision-diagnostic.ts';
import { contentSignal, getContextQuestion, INSIGHT_REACTIONS, reactionNext } from '../app/lib/decision-insights.ts';
const base: Answers = { why: 'curious', goal: 'form', scene: 'training', previous: 'none', before: 'work', context: 'extra', planned: 3, missed: 1, protect: 'rest', impact: 'training' };

test('three work collisions produce three different actions and falsification paths', () => {
  const reports = ['unexpected', 'extra', 'overlap'].map(context => buildDecisionResult({ ...base, context }));
  for (const field of ['action', 'no', 'trap'] as const) assert.equal(new Set(reports.map(r => r.insight[field])).size, 3);
  assert.match(reports[1].insight.action, /ostatnie zadanie/);
  assert.match(reports[2].insight.action, /dojazd/);
});

test('screen after trouble falling asleep is never turned into the cause of that trouble', () => {
  const r = buildDecisionResult({ ...base, scene: 'sleep', before: 'screen', context: 'awake', frequency: '3' });
  assert.match(r.title, /Telefon pojawił się po/);
  assert.match(r.insight.action, /pomiędzy/);
  assert.doesNotMatch(r.experiment.action, /odłóż telefon|koniec odcinka/);
});

test('available meal without a break is not treated as a meal prep problem', () => {
  const r = buildDecisionResult({ ...base, scene: 'food', before: 'meal', context: 'work', frequency: '3' });
  assert.match(r.experiment.action, /końcem konkretnego bloku pracy/);
  assert.doesNotMatch(r.experiment.action, /Przygotuj.*posiłek|kup/);
});

test('each known scene/upstream/detail has a concrete distinct output; unknown detail stays observation', () => {
  const sceneQ = getQuestions({}).find(q => q.id === 'scene')!;
  const actions = new Set<string>(); let routes = 0;
  for (const scene of sceneQ.options!) {
    const beforeQ = getQuestions({ scene: scene.id, previous: 'none' }).find(q => q.id === 'before');
    for (const before of beforeQ?.options || []) {
      if (before.id === 'unknown') continue;
      const contexts = getContextQuestion(scene.id, before.id)?.options || [{ id: '', label: '' }];
      for (const context of contexts) {
        const a = { ...base, scene: scene.id, before: before.id, context: context.id, frequency: '3' };
        const r = buildDecisionResult(a);
        if (context.id === 'unknown') { assert.equal(r.certainty, 'observation'); continue; }
        assert.equal(r.certainty, 'hypothesis', `${scene.id}:${before.id}:${context.id}`);
        assert.ok(r.insight.no.length > 50 && r.insight.yes.length > 30);
        actions.add(r.experiment.action); routes++;
      }
    }
  }
  assert.equal(actions.size, routes);
  assert.equal(routes, 28);
});

test('working and unevaluated previous attempts skip questions that cannot alter the next action', () => {
  for (const attempt of ['works', 'no_change']) {
    const a = { ...base, previous: 'plan', attempt };
    assert.ok(!getQuestions(a).some(q => ['before', 'context', 'planned', 'missed'].includes(q.id)));
    assert.equal(cleanAnswers(a).context, undefined);
  }
});

test('a new upstream branch clears the old discrimination answer', () => {
  const a = updateAnswer(base, 'before', 'tired');
  assert.equal(a.context, undefined);
  assert.ok(getQuestions(a).some(q => q.id === 'context'));
});

test('good-week anchors produce different preservation actions, with no invented failure', () => {
  const results = ['space', 'prepared', 'flex', 'help', 'unknown'].map(anchor => buildDecisionResult({ ...base, scene: 'steady', anchor }));
  assert.equal(new Set(results.map(r => r.experiment.action)).size, 5);
  for (const r of results) assert.equal(r.certainty, 'maintain');
});

test('content opt-in payload strips contacts, numbers, free text and report text', () => {
  const safe = cleanAnswers({ ...base, instagram: '@private', score: 99, report: 'private', free_text: 'private' });
  const signal = contentSignal(safe, 'off', 'coaching', 'price');
  assert.equal(signal.scene, 'training'); assert.equal(signal.reaction, 'off'); assert.equal(signal.objection, 'price');
  assert.doesNotMatch(JSON.stringify(signal), /private|planned|missed|score|report|goal/);
  assert.equal(contentSignal(safe, 'private', 'self', 'price').objection, undefined);
  assert.equal(contentSignal(safe, 'private', 'self', 'price').reaction, undefined);
});

test('each result reaction routes to a distinct useful next action', () => {
  assert.equal(new Set(INSIGHT_REACTIONS.map(r => reactionNext(r.id))).size, 4);
  assert.match(reactionNext('off'), /Nie wiem albo było inaczej/);
  assert.match(reactionNext('obvious'), /Nie rób tego jeszcze raz/);
});

 test('rejected interpretations never invite visitors to try the rejected task', () => {
  for (const reaction of ['off', 'obvious']) for (const fit of ['', 'self']) {
    const r = invitation(fit, '', 'curious', reaction);
    assert.match(r.text, /Najpierw doprecyzuj wynik/);
    assert.doesNotMatch(r.text, /Sprawdź go|najpierw sprawdzić ten krok sam/);
  }
  assert.equal(invitation('medical', '', 'curious', 'off').showNabor, false);
});
