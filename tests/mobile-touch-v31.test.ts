import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const flow = fs.readFileSync('app/components/SingleQuestionFlow.tsx', 'utf8');
const result = fs.readFileSync('app/components/ResultExperience.tsx', 'utf8');
const page = fs.readFileSync('app/components/DecisionDiagnostic.tsx', 'utf8');

test('mobile quiz keeps vertical page scrolling available', () => {
  assert.match(flow, /overflowX: 'hidden'/);
  assert.match(flow, /overflowY: 'visible'/);
  assert.match(flow, /touchAction: 'pan-y'/);
  assert.doesNotMatch(flow, /overflow: 'hidden'/);
});

test('gesture-aware slider has a real mobile touch target', () => {
  assert.match(flow, /className="diag-slider"/);
  assert.match(flow, /\.diag-slider\{[^}]*height:44px/);
  assert.match(flow, /width:44px;height:44px/);
  assert.match(flow, /role="slider"/);
  assert.match(flow, /onPointerDown=\{onSliderPointerDown\}/);
  assert.match(flow, /mode:'pending'\|'horizontal'\|'vertical'/);
});

test('result hero can never remain invisible after completion', () => {
  assert.match(result, /classList\.add\('in'\)/);
  assert.match(result, /\.rx-hero\{[^}]*opacity:1;transform:none/);
});

test('completion is local and explicit contact has a synchronous duplicate guard', () => {
  const commit = page.slice(page.indexOf('function commit('), page.indexOf('function save('));
  assert.doesNotMatch(commit, /fetch|lead-notify|sendContact/);
  assert.match(page, /sendingRef.current \|\| sent/);
  assert.match(page, /sendingRef.current = true/);
  assert.match(page, /sending \|\| sent \|\| !consent/);
});
