// Wewnetrzne podglady na mock-danych jada w buildzie produkcyjnym, bo sa czescia tego samego
// projektu. Nie moga byc indeksowalne: pokazuja wymyslone dane i wygladaja jak realny wynik.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

for (const route of ['lab', 'preview-wow']) {
  test(`/diagnoza/${route} ma noindex`, () => {
    const src = readFileSync(new URL(`../app/diagnoza/${route}/layout.tsx`, import.meta.url), 'utf8');
    assert.match(src, /robots:\s*\{[^}]*index:\s*false/);
    assert.match(src, /follow:\s*false/);
  });
}
