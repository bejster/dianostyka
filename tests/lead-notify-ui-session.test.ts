// P0 21.11: sesja zbudowana TAK JAK UI (bez pytań, których ekran nie pokazuje) musi przejść walidację /api/lead-notify.
// Od 21.10 każdy prawdziwy lead dostawał 422, bo serwer wymagał alcohol_intake, którego flow nie pyta.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { QUESTIONS, LEAD_NOTIFY_TOLERATE_MISSING, UI_SKIPPED_IDS } from '../app/lib/assessment-config.ts';
import { invalidDiagnosticFields } from '../app/lib/lead-integrity.ts';

const route = readFileSync(new URL('../app/api/lead-notify/route.ts', import.meta.url), 'utf8');
const flow = readFileSync(new URL('../app/components/SingleQuestionFlow.tsx', import.meta.url), 'utf8');

function uiSession(pickIndex: number): Record<string, unknown> {
  const a: Record<string, unknown> = {};
  for (const q of QUESTIONS) {
    if (UI_SKIPPED_IDS.has(q.id) || q.type === 'contact' || q.optional) continue;
    if (q.condition && !q.condition(a)) continue;
    if (q.type === 'single') a[q.id] = q.options![Math.min(pickIndex, q.options!.length - 1)].id;
    else if (q.type === 'multi') a[q.id] = [q.options![0].id];
    else if (q.type === 'slider' || q.type === 'number') a[q.id] = q.min ?? 0;
    else if (q.type === 'text') a[q.id] = 'w tygodniu trzymam plan a weekend wszystko kasuje';
  }
  return a;
}

test('sesja jak z UI (różne ścieżki odpowiedzi) przechodzi walidację serwera', () => {
  for (const pick of [0, 1, 2, 3]) {
    const s = uiSession(pick);
    assert.equal('alcohol_intake' in s, false, 'UI nie pyta o alkohol');
    const invalid = invalidDiagnosticFields(s, LEAD_NOTIFY_TOLERATE_MISSING).filter((id) => id !== 'instagram');
    assert.deepEqual(invalid, [], `ścieżka ${pick}: ${invalid.join(',')}`);
  }
});

test('pole pominięte w UI nadal odrzucone, gdy przyjdzie z błędną wartością', () => {
  const s = { ...uiSession(1), alcohol_intake: 'alc_nieistnieje' };
  assert.deepEqual(invalidDiagnosticFields(s, LEAD_NOTIFY_TOLERATE_MISSING).filter((id) => id !== 'instagram'), ['alcohol_intake']);
});

test('jedna lista: ekran i serwer korzystają z tego samego źródła', () => {
  assert.match(flow, /UI_SKIPPED_IDS/);
  assert.match(route, /invalidDiagnosticFields\(b\.raw_answers, LEAD_NOTIFY_TOLERATE_MISSING\)/);
});
