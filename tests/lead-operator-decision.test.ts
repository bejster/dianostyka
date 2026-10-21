import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildLeadOperatorDecision } from '../app/lib/lead-operator-decision.ts';

const base = {
  hasInstagram: true,
  intent: 'in_zobacz',
  startWhen: 'sw_7dni',
  premiumFit: 'PRO',
  wantsHelp: true,
  followupPriority: false,
};

test('PRO + chce pomocy + szybki start = QUALIFY_NOW + HP 1:1', () => {
  const r = buildLeadOperatorDecision(base);
  assert.equal(r.lane, 'QUALIFY_NOW');
  assert.equal(r.offer, 'HP_1_1');
  assert.match(r.blocker, /finanse/i);
});

test('PRO + jawne prowadzenie + termin = SALES_NOW', () => {
  const r = buildLeadOperatorDecision({ ...base, intent: 'in_prowadz', followupPriority: true });
  assert.equal(r.lane, 'SALES_NOW');
  assert.equal(r.offer, 'HP_1_1');
});

test('brak IG wygrywa nad resztą i blokuje ręczny kontakt', () => {
  const r = buildLeadOperatorDecision({ ...base, hasInstagram: false, intent: 'in_prowadz', followupPriority: true });
  assert.equal(r.lane, 'NO_CONTACT');
});

test('woli sam + tylko sprawdza = NURTURE bez oferty', () => {
  const r = buildLeadOperatorDecision({
    ...base,
    intent: 'in_sam',
    startWhen: 'sw_sprawdzam',
    premiumFit: 'KIERUNEK',
    wantsHelp: false,
  });
  assert.equal(r.lane, 'NURTURE');
  assert.equal(r.offer, 'NONE');
});

test('niska samodzielność przy dużej potrzebie wsparcia = REVIEW', () => {
  const r = buildLeadOperatorDecision({
    ...base,
    intent: 'in_prowadz',
    premiumFit: 'RYZYKO',
    followupPriority: true,
  });
  assert.equal(r.lane, 'REVIEW');
  assert.equal(r.offer, 'REVIEW');
});
