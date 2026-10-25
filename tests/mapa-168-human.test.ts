import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDecision } from '../app/lib/decision-engine.ts';
import { EXPERIMENT_BANK } from '../app/lib/experiment-bank.ts';
import { buildResultHero } from '../app/lib/result-hero.ts';
import { ENTRY_COPY } from '../app/lib/entry-copy.ts';

const base = {
  primary_goal: 'goal_energia',
  break_window: 'bw_evening',
  give_up_point: 'gup_wieczor',
  evening_eating: 'ee_binge',
  tried_before: 'tb_2',
  work_load: 'wl_owner',
};

const weakness = { label: 'Głowa i stres', reason: 'głowa zostaje w robocie 4-5 wieczorów' };
function readout(prediction: string, confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH', extra: Record<string, string> = {}) {
  return buildDecision({
    answers: { ...base, prediction, ...extra },
    experiment: EXPERIMENT_BANK.E1,
    confidence,
    routePrimary: 'experiment',
  });
}

test('inne podejrzenie dostaje kontrast i konkretny trop na pierwszym ekranie', () => {
  const d = readout('pr_sen', 'HIGH', { good_day: 'gd_wieczor' });
  const h = buildResultHero(d, weakness, true);
  assert.match(h.headline, /Obstawiałeś sen\. Ja bym najpierw sprawdził wieczór i jedzenie/);
  assert.match(h.explanation, /Pierwsze pogorszenie zaznaczyłeś: wieczorem/);
  assert.match(h.explanation, /Głowa i stres/);
  assert.match(h.explanation, /nie pewna przyczyna/);
});

test('zgodne podejrzenie nie jest ogłaszane medyczną diagnozą', () => {
  const h = buildResultHero(readout('pr_jedzenie'), weakness, true);
  assert.match(h.headline, /Obstawiałeś wieczór i jedzenie/);
  assert.match(h.explanation, /nie dowodzi przyczyny/);
});

test('mało danych nie tworzy fałszywego winnego', () => {
  const h = buildResultHero(readout('pr_sen', 'LOW'), weakness, true);
  assert.match(h.headline, /Nie mam tu jednego pewnego winnego/);
  assert.doesNotMatch(h.headline, /Ja bym najpierw sprawdził/);
});

test('hormony nie są mierzone quizem', () => {
  const h = buildResultHero(readout('pr_hormony'), weakness, true);
  assert.match(h.headline, /ankiety nie zmierzę/);
  assert.doesNotMatch(h.headline, /testosteron.*(niski|wysoki)/i);
});

test('stabilne obszary nie są zamieniane w fałszywy problem', () => {
  const h = buildResultHero(readout('pr_sen'), weakness, false);
  assert.match(h.headline, /nic się nie wali/);
});

test('pusta odpowiedź i stare sesje mają uczciwy fallback', () => {
  const h = buildResultHero(undefined, undefined, false);
  assert.match(h.headline, /Zobaczmy/);
  assert.doesNotMatch(h.explanation, /Twoj[a-z]* problem|wiesz, że/i);
});

test('drzwi są napisane po ludzku bez mieszania marek', () => {
  for (const door of Object.values(ENTRY_COPY)) {
    assert.ok(door.body.length >= 45, 'scena zamiast reklamy narzędzia');
    assert.match(door.proof, /72 godziny/);
  }
  assert.doesNotMatch(ENTRY_COPY.hit.body, /impreza|używki|alkohol/i);
  assert.doesNotMatch(ENTRY_COPY.general.body, /Zrobiłem Mapę 168, bo/);
  assert.match(ENTRY_COPY.th2.body, /impreza/i);
});

test('168 jest kanoniczne, a stare API nie jest przekierowywane', () => {
  const layout = readFileSync('app/layout.tsx', 'utf8');
  const th2 = readFileSync('app/rozjazd/page.tsx', 'utf8');
  const cfg = readFileSync('next.config.ts', 'utf8');
  assert.match(layout, /canonical: 'https:\/\/168\.talerzihantle\.com\/'/);
  assert.match(th2, /canonical: 'https:\/\/168\.talerzihantle\.com\/rozjazd'/);
  assert.match(cfg, /\['\/', '\/diagnoza', '\/rozjazd', '\/w'\]/);
  assert.doesNotMatch(cfg, /source:\s*['"]\/api/);
  assert.match(cfg, /type: 'host' as const/);
});
