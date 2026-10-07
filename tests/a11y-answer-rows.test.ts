import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// regresja 2026-09-27: wiersze odpowiedzi (.mrow) to przyciski-przelaczniki. Stan zaznaczenia byl tylko
// w data-on, czytnik ekranu go nie widzial (WCAG 4.1.2). Kazdy .mrow musi niesc aria-pressed.
test('kazdy przycisk .mrow ma aria-pressed powiazany z isSelected', () => {
  const src = readFileSync(new URL('../app/components/SingleQuestionFlow.tsx', import.meta.url), 'utf8');
  const rows = src.split('className="mrow"').slice(1).map((s) => s.slice(0, s.indexOf('>')));
  assert.ok(rows.length >= 2, 'oczekiwane wiersze single i multi');
  for (const r of rows) assert.match(r, /aria-pressed=\{isSelected\}/);
});
