import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// regresja 2026-09-27: deterministyczny voice gate zlapal na zywym ekranie "realnie" (2 pytania),
// slogan "To nie jest etykieta dla samej etykiety. To..." i "Nie chodzi o X. Chodzi o Y".
// Sprawdzamy tylko literaly tekstowe (komentarze wyciete) w plikach, ktore renderuja flow i wynik.
// experiment-bank `purpose` nie jest renderowany, wiec go pomijamy.
const FILES = [
  'app/lib/assessment-config.ts',
  'app/components/ResultExperience.tsx',
  'app/components/SingleQuestionFlow.tsx',
  'app/diagnoza/page.tsx',
  'app/lib/decision-engine.ts',
  'app/lib/experiment-bank.ts',
];
const BANNED = [/realn/i, /prawda jest taka/i, /robi się ciekawie/i, /\bTo nie jest \S+ dla\b/, /Nie chodzi o/, /[—–]/];

function literals(src: string): string[] {
  const s = src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    .split('\n').filter((l) => !/^\s*purpose:/.test(l)).join('\n');
  const out: string[] = [];
  for (const m of s.matchAll(/'([^'\n]{8,})'|"([^"\n]{8,})"|`([^`]{8,})`|>([^<>{}\n]{8,})</g)) {
    const t = m[1] ?? m[2] ?? m[3] ?? m[4];
    if (t && / /.test(t)) out.push(t);
  }
  return out;
}

test('zywy tekst diagnostyki nie zawiera zakazanych fraz Michala', () => {
  const hits: string[] = [];
  for (const f of FILES) {
    const src = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    for (const t of literals(src)) for (const re of BANNED) if (re.test(t)) hits.push(`${f}: ${re} :: ${t.slice(0, 90)}`);
  }
  assert.deepEqual(hits, []);
});
