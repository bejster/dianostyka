import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildFlowInsight } from '../app/lib/flow-insights.ts';

const flow = readFileSync('app/components/SingleQuestionFlow.tsx','utf8');
const result = readFileSync('app/components/ResultExperience.tsx','utf8');
const helper = readFileSync('app/lib/flow-insights.ts','utf8');

test('three real-data micro-insights appear without extra steps or changes to questionnaire', () => {
  const weekend = buildFlowInsight('monday_recovery',{weekend_pattern:'wp_reset'});
  assert.ok(weekend);
  assert.match(weekend.title,/Weekend i czas powrotu/);
  assert.match(weekend.evidence,/Zaznaczyłeś/);
  assert.match(weekend.explanation,/Nie będę z góry liczył soboty i niedzieli/);
  const moment = buildFlowInsight('good_day',{break_window:'bw_afterwork'});
  assert.match(moment?.title ?? '',/po pracy/);
  assert.match(moment?.explanation ?? '',/pomylić moment/);
  const later = buildFlowInsight('intent',{give_up_point:'gup_wieczor'});
  assert.match(later?.evidence ?? '',/Wieczorem/);
  assert.equal(buildFlowInsight('sleep_quality',{}),null);
  assert.equal(buildFlowInsight('monday_recovery',{}),null);
  assert.equal(buildFlowInsight('good_day',{break_window:'invalid'}),null);
  assert.equal(buildFlowInsight('intent',{give_up_point:'invalid'}),null);
  assert.match(flow,/data-insight-id=\{currentQ\.id\}/);
  assert.match(flow,/flow_insight_viewed/);
  assert.match(flow,/KROK \{visiblePos\} \/ \{visibleTotal\}/);
  assert.match(flow,/const FLOW_QUESTIONS: QuestionDef\[\]/);
  assert.doesNotMatch(helper,/fetch\(|postEvent\(|localStorage|Math\.random/);
});

test('first reward and test action are shown before expandable breakdown', () => {
  const hero = result.indexOf('data-beat="1"');
  const payoff = result.indexOf('className="rx-top-payoff"');
  const details = result.indexOf('className="rx-readout-details"');
  const talk = result.indexOf('<ResultConversation');
  const mirror = result.indexOf('data-beat="mirror"');
  assert.ok(hero>=0 && payoff>hero && details>payoff && talk>details && mirror>talk);
  assert.match(result,/className="rx-payoff-action"/);
  assert.match(result,/href="#test-72h"/);
  assert.match(result,/href="#porozmawiaj"/);
  assert.match(result,/href="#wyjasnienie"/);
  assert.match(result,/<details className="rx-readout-details">/);
  assert.match(result,/<dl className="rx-readout">/);
  assert.match(result,/Wynik liczy się automatycznie/);
});

test('trust block avoids displaying an old numeric Google rating as currently verified', () => {
  const proof = result.match(/<div className="rx-proof">([\s\S]*?)<\/div>\s*<details/)?.[1] ?? '';
  assert.ok(proof,'Google proof block missing');
  assert.match(proof,/Zobacz aktualne opinie o współpracy w Google/);
  assert.doesNotMatch(proof,/\{GOOGLE_AGG\.rating\}|\{GOOGLE_AGG\.count\}/);
  assert.match(proof,/href=\{GOOGLE_AGG\.url\}/);
});

test('premium mobile selection cards respect original controls and reduced motion', () => {
  assert.match(flow,/\.dx-experience \.dx-shell \.mrow\{/);
  assert.match(flow,/\.dx-experience \.dx-shell \.dx-go\{/);
  assert.match(flow,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(flow,/onClick=\{\(\) => handleSingleSelect\(opt\)\}/);
  assert.match(flow,/onClick=\{\(\) => goToNext\(\)\}/);
});
