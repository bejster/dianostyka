import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildFollowEarlyObservation } from '../app/lib/flow-insights.ts';

const base = { weekend_pattern: 'wp_same', monday_recovery: 'mon_0', primary_goal: 'goal_forma' };
const scenarios = [
 { name: 'stable weekend / normal monday', data: base, expected: /nie wygląda na główną przeszkodę/ },
 { name: 'changed weekend / slow return', data: { ...base, weekend_pattern: 'wp_reset', monday_recovery: 'mon_3' }, expected: /powrót trwa dłużej/ },
 { name: 'changed weekend / fast return', data: { ...base, weekend_pattern: 'wp_shifted', monday_recovery: 'mon_0' }, expected: /powrót jest dość szybki/ },
 { name: 'stable weekend / slow return', data: { ...base, monday_recovery: 'mon_2' }, expected: /Powrót trwa dłużej/ },
];
for (const s of scenarios) {
 test(s.name, () => {
  const result = buildFollowEarlyObservation(s.data);
  assert.ok(result);
  assert.match(result.title, s.expected);
  assert.match(result.evidence, /Zaznaczyłeś/);
  assert.match(result.explanation, /obserwacja, nie przyczyna/);
  assert.doesNotMatch(JSON.stringify(result), /gwarantuj|diagnoza|testosteron/i);
  assert.deepEqual(Object.keys(result).sort(),['evidence','explanation','kicker','title']);
 });
}
test('incomplete answers: no fabricated signal', () => {
 assert.equal(buildFollowEarlyObservation({ ...base, monday_recovery: undefined }), null);
 assert.equal(buildFollowEarlyObservation({ ...base, primary_goal: undefined }), null);
 assert.equal(buildFollowEarlyObservation({ ...base, weekend_pattern: 'invalid' }), null);
});
test('changing an unrelated declared goal does not invent a different cause', () => {
 const x=buildFollowEarlyObservation(base);
 const y=buildFollowEarlyObservation({ ...base, primary_goal: 'goal_energia' });
 assert.equal(x?.title,y?.title);
 assert.equal(x?.evidence,y?.evidence);
});