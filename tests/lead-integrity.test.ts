import assert from 'node:assert/strict';
import test from 'node:test';
import { QUESTIONS } from '../app/lib/assessment-config.ts';
import { cleanInstagram, enoughContent, invalidDiagnosticFields, isGibberish, validAnswer, validEmail, validInstagram } from '../app/lib/lead-integrity.ts';

function completeAnswers(): Record<string, unknown> {
  const a: Record<string, unknown> = {};
  for (const q of QUESTIONS) {
    if (q.condition && !q.condition(a)) continue;
    if (q.optional) continue;
    if (q.type === 'single') a[q.id] = q.options?.[0]?.id;
    else if (q.type === 'multi') a[q.id] = [q.options![0].id];
    else if (q.type === 'slider' || q.type === 'number') a[q.id] = q.min ?? 0;
    else if (q.type === 'text') a[q.id] = 'Po pracy mam zbyt mało energii i trudno mi zrobić trening.';
    else if (q.type === 'contact') a[q.id] = 'test.nick_123';
  }
  return a;
}

test('pełny formularz, zera i opcjonalne pole bez odpowiedzi', () => {
  const a = completeAnswers();
  assert.deepEqual(invalidDiagnosticFields(a), []);
  assert.equal(a.half_power_hours, 0);
  assert.equal(a.planned_trainings, 0);
  assert.equal(a.morning_wood, undefined);
});
test('brak, pusty lub fałszywy Instagram blokuje ukończenie', () => {
  const a = completeAnswers();
  for (const handle of ['', '  ', '@', '@brak', 'bad handle', 'u..n', '.start', 'a'.repeat(31), undefined]) {
    a.instagram = handle;
    assert.ok(invalidDiagnosticFields(a).includes('instagram'), `should reject ${String(handle)}`);
  }
  a.instagram = '@dobry.nick_123';
  assert.deepEqual(invalidDiagnosticFields(a), []);
});
test('brak pytania wyboru albo tekstu nie może przyjść jako gotowy wynik', () => {
  const a = completeAnswers();
  a.sleep_quality = '';
  assert.ok(invalidDiagnosticFields(a).includes('sleep_quality'));
  a.sleep_quality = 'sq_FAKE';
  assert.ok(invalidDiagnosticFields(a).includes('sleep_quality'));
  a.sleep_quality = 'sq_great';
  a.user_pain = 'asdfghjk';
  assert.ok(invalidDiagnosticFields(a).includes('user_pain'));
  a.user_pain = 'Jestem zmęczony, ale chciałbym częściej trenować.';
  assert.deepEqual(invalidDiagnosticFields(a), []);
});
test('warunkowe pytania: treningi i weekend wymagane tylko wtedy, gdy dotyczy', () => {
  const a = completeAnswers();
  assert.equal(a.missed_trainings, undefined);
  a.planned_trainings = 3;
  assert.ok(invalidDiagnosticFields(a).includes('missed_trainings'));
  a.missed_trainings = 0;
  assert.ok(!invalidDiagnosticFields(a).includes('missed_trainings'));
  // weekend_cash wycięte w linii release 2026-08-26 (condition: () => false): nie może bramkować leada.
  a.weekend_pattern = 'wp_reset';
  assert.ok(!invalidDiagnosticFields(a).includes('weekend_cash'));
  assert.deepEqual(invalidDiagnosticFields(a), []);
});
test('zakresy, stopnie suwaka i brak zawyżania przy zerze', () => {
  const q = QUESTIONS.find(q => q.id === 'half_power_hours')!;
  assert.equal(validAnswer(q, { half_power_hours: 0 }), true);
  assert.equal(validAnswer(q, { half_power_hours: undefined }), false);
  assert.equal(validAnswer(q, { half_power_hours: 4.5 }), false);
  assert.equal(validAnswer(q, { half_power_hours: 0.3 }), false);
});
test('normalizacja i poprawny email', () => {
  assert.equal(cleanInstagram('  @Some.Name_7  '), 'some.name_7');
  assert.equal(validInstagram('@some.name_7'), true);
  assert.equal(validInstagram('@brak'), false);
  assert.equal(validEmail('someone@example.org'), true);
  assert.equal(validEmail(''), false);
  assert.equal(isGibberish('asdfghjk'), true);
  assert.equal(enoughContent('Nadal brakuje mi energii po pracy'), true);
});
