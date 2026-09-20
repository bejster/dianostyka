import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecisionResult, type Answers } from '../app/lib/decision-diagnostic.ts';
import { ACTION_HEADINGS, actionHeading, analyticsEnvironment, resultStatus } from '../app/lib/decision-presentation.ts';

const base: Answers = { why: 'curious', goal: 'sleep', scene: 'sleep', previous: 'none', before: 'screen', context: 'own', frequency: '3', protect: 'rest', impact: 'rest' };

test('visually similar screen scenes retain different, evidence-bound next actions', () => {
  const results = ['own', 'auto', 'awake'].map(context => buildDecisionResult({ ...base, context }));
  assert.equal(new Set(results.map(actionHeading)).size, 3);
  assert.match(actionHeading(results[2]), /przed telefonem/);
  assert.match(results[2].title, /Telefon pojawił się po/);
});

test('unknown context or zero frequency never gets a confident intervention heading', () => {
  const patches: Answers[] = [{ context: 'unknown' }, { frequency: '0' }, { frequency: 'unknown' }];
  for (const patch of patches) {
    const result = buildDecisionResult({ ...base, ...patch });
    assert.equal(resultStatus(result), 'Najpierw sprawdź');
    assert.equal(actionHeading(result), result.experiment.title);
  }
});

test('all 28 intervention headings resolve to an actual route without changing the selected action', () => {
  assert.equal(Object.keys(ACTION_HEADINGS).length, 28);
  for (const [key, title] of Object.entries(ACTION_HEADINGS)) {
    const [scene, before, context] = key.split(':');
    const result = buildDecisionResult({ ...base, scene, before, ...(context ? { context } : {}), planned: 3, missed: 2 });
    assert.equal(result.experiment.id, key);
    assert.equal(actionHeading(result), title);
    assert.ok(result.experiment.action.length > 50);
  }
});

test('a working previous attempt stays a maintenance result', () => {
  const result = buildDecisionResult({ ...base, previous: 'plan', attempt: 'works' });
  assert.equal(resultStatus(result), 'Co warto zachować');
  assert.equal(actionHeading(result), result.experiment.title);
});

test('only the real production hostname is classified as production', () => {
  assert.equal(analyticsEnvironment('diagnostyka.talerzihantle.com'), 'production');
  for (const host of ['localhost', 'dianostyka-example.vercel.app', 'diagnostyka.talerzihantle.com.other.com', '']) {
    assert.equal(analyticsEnvironment(host), 'preview');
  }
});
