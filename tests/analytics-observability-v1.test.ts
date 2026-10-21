import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const analytics = fs.readFileSync(path.join(root, 'app/lib/analytics.ts'), 'utf8');
const flow = fs.readFileSync(path.join(root, 'app/components/SingleQuestionFlow.tsx'), 'utf8');
const result = fs.readFileSync(path.join(root, 'app/components/ResultExperience.tsx'), 'utf8');

test('all diagnostic events carry the shared analytics schema and surface', () => {
  assert.match(analytics, /analytics_schema: 'site-analytics-v1'/);
  assert.match(analytics, /surface: 'diagnostyka'/);
});

test('question abandonment snapshot is explicit, useful and answer-free', () => {
  const m = flow.match(/trackDiag\('question_exit',[\s\S]*?\n\s*\}\);/);
  assert.ok(m, 'question_exit event not found');
  assert.match(m![0], /question_id/); assert.match(m![0], /active_ms/); assert.match(m![0], /progress_pct/);
  assert.doesNotMatch(m![0], /\banswers\b|instagram|imie|user_pain|symptoms_chips|\bvalue\b/i);
});

test('result captures depth, section dwell and the final exit snapshot', () => {
  for (const ev of ['result_scroll_depth', 'result_beat_dwell', 'result_exit_snapshot']) assert.match(result, new RegExp(ev));
  assert.match(result, /\[25, 50, 75, 90, 100\]/);
  assert.match(result, /last_beat/); assert.match(result, /max_scroll_pct/); assert.match(result, /active_ms/);
});

test('result exit analytics never carries contact or raw answer fields', () => {
  const m = result.match(/trackDiag\('result_exit_snapshot',\s*\{[\s\S]*?\}\);/);
  assert.ok(m, 'result_exit_snapshot event not found');
  assert.doesNotMatch(m![0], /instagram|imie|userPain|answers|contentSignals|symptoms_chips/i);
});

// 2026-09-26: localhost, preview i testy headless pisaly do kohorty prawdziwego ruchu.
test('PostHog laduje sie tylko na produkcji (albo przez swiadomy FORCE)', () => {
  const layout = fs.readFileSync(path.join(process.cwd(), 'app/layout.tsx'), 'utf8');
  assert.match(layout, /const PH_ON = process\.env\.VERCEL_ENV === 'production'/);
  assert.match(layout, /\{PH_ON && PH_KEY && \(/);
  assert.equal((layout.match(/posthog\.init\(/g) || []).length, 1);
});

test('eventy diagnostyki niosa tag warstwy wizualnej', () => {
  const a = fs.readFileSync(path.join(process.cwd(), 'app/lib/analytics.ts'), 'utf8');
  assert.match(a, /ui: UI_VARIANT/);
});
