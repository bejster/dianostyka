import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const flow = fs.readFileSync('app/components/SingleQuestionFlow.tsx', 'utf8');
const result = fs.readFileSync('app/components/ResultExperience.tsx', 'utf8');
const page = fs.readFileSync('app/diagnoza/page.tsx', 'utf8');
const css = fs.readFileSync('app/globals.css', 'utf8');

test('mobile quiz keeps vertical page scrolling available', () => {
  assert.match(flow, /overflowX: 'hidden'/);
  assert.match(flow, /overflowY: 'visible'/);
  assert.match(flow, /touchAction: 'pan-y'/);
  assert.doesNotMatch(flow, /overflow: 'hidden'/);
});

test('gesture-aware slider has a real mobile touch target', () => {
  // Okragla galka 44x44 zniknela razem z jezykiem kontrolki z telefonu.
  // Celem testu bylo realne pole dotyku, wiec pinujemy cala podzialke:
  // 60 px wysokosci na pelnej szerokosci to wiekszy target niz stary thumb.
  assert.match(flow, /className="dx-gauge"/);
  assert.match(css, /\.dx-gauge \{[^}]*height: 60px/);
  assert.match(flow, /role="slider"/);
  assert.match(flow, /onPointerDown=\{onSliderPointerDown\}/);
  assert.match(flow, /mode:'pending'\|'horizontal'\|'vertical'/);
});

test('result hero can never remain invisible after completion', () => {
  assert.match(result, /classList\.add\('in'\)/);
  assert.match(result, /\.rx-hero\{[^}]*opacity:1;transform:none/);
});

test('completion is guarded against duplicate Telegram submits', () => {
  assert.match(flow, /completionRef\.current/);
  assert.match(flow, /isCompleting/);
  assert.match(page, /completionHandledRef\.current/);
});
