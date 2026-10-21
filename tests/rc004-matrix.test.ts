// rc004-matrix.test.ts — automated content-layer matrix (Beat 7 endLine + Beat 5 duration contract).
// Wymiar ARCHETYPU (5) jest deterministyczny i testowany tutaj; wymiar INTENCJI (Beat 8, 4 warianty)
// zyje w ResultExperience.tsx i jest weryfikowany w przegladarce (preview). node:test, bez JSX.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RESULT_CONTENT,
  packFor,
  silnikExperiment,
  silnikBeat4,
  silnikEndLine,
  DOMAIN_EXPERIMENT,
} from '../app/lib/result-content.ts';

const ARCHES = ['wieczorny_odpad', 'weekend_reset', 'glowa_zajezdza', 'wiedza_bez_wdrozenia', 'silnik_bez_paliwa'];
const DOMAINS = ['Sen', 'Stres', 'Żywienie', 'Weekend', 'Trening', 'Głowa'];
const STATES = ['clear', 'tied', 'neutral'] as const;

const EMDASH = /—/;
// Sloganowa antyteza X/Y (fingerprint AI) — nie moze pojawic sie w gotowej tresci wyniku.
const XY = /\bto nie [^,.]+, to\b|nie chodzi o [^,.]+, (tylko )?o\b|nie potrzebujesz [^,.]+, potrzebujesz\b/i;

test('all 5 archetypes exist with non-empty Beat 7 endLine + experiment', () => {
  for (const key of ARCHES) {
    const pack = packFor(key);
    assert.ok(pack, `pack ${key} missing`);
    assert.equal(typeof pack.endLine, 'string');
    assert.ok(pack.endLine.length > 20, `${key} endLine too short`);
    assert.ok(pack.experiment && pack.experiment.headline && pack.experiment.lookFor, `${key} experiment incomplete`);
  }
});

test('packFor falls back safely for unknown archetype', () => {
  assert.equal(packFor('___nope___').endLine, RESULT_CONTENT.wieczorny_odpad.endLine);
});

test('weekend_reset carries weekend duration contract (P1-5); week archetypes default', () => {
  const wk = packFor('weekend_reset').experiment;
  assert.equal(wk.durationLabel, 'ten weekend');
  assert.equal(wk.afterLabel, 'Po weekendzie szukasz');
  // week-type archetypes leave duration undefined -> component defaults to "7 dni" / "Po 7 dniach szukasz"
  for (const key of ['wieczorny_odpad', 'glowa_zajezdza', 'wiedza_bez_wdrozenia']) {
    assert.equal(packFor(key).experiment.durationLabel, undefined, `${key} should default duration`);
  }
});

test('silnik dynamic experiment: 6 domains x 3 states, truth-gated headline', () => {
  for (const d of DOMAINS) {
    assert.ok(DOMAIN_EXPERIMENT[d], `DOMAIN_EXPERIMENT missing ${d}`);
    for (const state of STATES) {
      const exp = silnikExperiment(d, state);
      assert.ok(exp.headline.includes(d), `${d}/${state} headline should name domain`);
      assert.ok(exp.lookFor && exp.doCheck, `${d}/${state} base fields missing`);
      // truth gate: neutral/tied nie moga twierdzic "najmocniejszy sygnal / ostre pekniecie"
      if (state !== 'clear') {
        assert.ok(!/najmocniejszy sygnał/i.test(exp.headline), `${d}/${state} must not assert strongest signal`);
      }
    }
    const bt = silnikBeat4(d, 'clear');
    assert.ok(bt.includes(d), `silnikBeat4 ${d} should name domain`);
    assert.ok(silnikEndLine(d).includes(d), `silnikEndLine ${d} should name domain`);
  }
});

test('no em-dash and no X/Y antithesis anywhere in result content strings', () => {
  const strings: string[] = [];
  for (const key of ARCHES) {
    const p = packFor(key);
    strings.push(p.endLine, p.beat1Line, p.firstMove, p.experiment.headline, p.experiment.lookFor, p.experiment.doCheck);
  }
  for (const d of DOMAINS) {
    for (const state of STATES) strings.push(silnikExperiment(d, state).headline, silnikBeat4(d, state));
    strings.push(silnikEndLine(d));
  }
  for (const s of strings) {
    assert.ok(!EMDASH.test(s), `em-dash found: ${s.slice(0, 60)}`);
    assert.ok(!XY.test(s), `X/Y antithesis found: ${s.slice(0, 60)}`);
  }
});
