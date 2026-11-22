import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { QUESTIONS } from '../app/lib/assessment-config.ts';
import { classifyPremiumFit } from '../app/lib/premium-fit.ts';
import { answersToFD } from '../app/lib/answers-to-fd.ts';
import { buildInviteUrl, inviteText, INVITE_FALLBACK, isSelfServe, presaleHref, resultVideoUrl } from '../app/lib/market-layer.ts';

test('work_load ma opcje wl_physical poza scoringiem', () => {
  const q = QUESTIONS.find((x) => x.id === 'work_load')!;
  const o = q.options!.find((x) => x.id === 'wl_physical');
  assert.ok(o);
  assert.equal(o!.value, 0);
  assert.doesNotMatch(o!.label, /ciało/i);
});

test('work_what stoi zaraz po work_load, opcjonalne, waga 0', () => {
  const i = QUESTIONS.findIndex((x) => x.id === 'work_load');
  const q = QUESTIONS[i + 1];
  assert.equal(q.id, 'work_what');
  assert.equal(q.optional, true);
  assert.equal(q.type, 'single');
  assert.equal(q.upstreamWeight, 0);
  assert.equal(q.crossDomainImpact, 0);
  assert.ok(q.options!.every((o) => o.value === 0));
});

test('wl_physical nie odpala spillover i nie liczy sie jako odpowiedzialnosc', () => {
  const spill = QUESTIONS.find((x) => x.id === 'spillover')!;
  assert.equal(spill.condition!({ work_load: 'wl_physical' }), false);
  assert.equal(spill.condition!({ work_load: 'wl_owner' }), true);
  assert.equal(classifyPremiumFit({ work_load: 'wl_physical' }).responsibility, false);
  assert.equal(classifyPremiumFit({ work_load: 'wl_owner' }).responsibility, true);
});

test('wl_physical daje neutralne 8h jak brak odpowiedzi', () => {
  assert.equal(answersToFD({ work_load: 'wl_physical' }).workHours, answersToFD({}).workHours);
});

test('zaproszenie prowadzi na start mapy z anonimowym ref, bez danych osobowych', () => {
  const url = new URL(buildInviteUrl('https://168.talerzihantle.com/', 'sub_ABC-123.xyz@evil'));
  assert.equal(url.pathname, '/diagnoza');
  assert.equal(url.searchParams.get('utm_campaign'), 'zaproszenie168');
  assert.equal(url.searchParams.get('utm_content'), 'ref_sub_ABC-123xyzevil');
  assert.equal(url.searchParams.get('arch'), null);
  assert.equal(new URL(buildInviteUrl('https://x.pl')).searchParams.get('utm_content'), null);
});

test('tekst zaproszenia per archetyp + fallback', () => {
  assert.match(inviteText('weekend_reset'), /poniedziałek/);
  assert.equal(inviteText('nieznany'), INVITE_FALLBACK);
});

test('przedsprzedaz tylko dla samodzielnych i tylko z https', () => {
  assert.equal(isSelfServe({ intent: 'in_sam' }), true);
  assert.equal(isSelfServe({ agency_mode: 'ag_solo' }), true);
  assert.equal(isSelfServe({ intent: 'in_prowadz', agency_mode: 'ag_data' }), false);
  assert.equal(presaleHref(undefined, 's1'), '');
  assert.equal(presaleHref('javascript:alert(1)', 's1'), '');
  assert.equal(presaleHref('https://buy.stripe.com/abc', 's1'), 'https://buy.stripe.com/abc?client_reference_id=s1');
});

test('wideo per archetyp z env JSON, zly JSON = brak', () => {
  assert.equal(resultVideoUrl('{"weekend_reset":"https://v.pl/a.mp4"}', 'weekend_reset'), 'https://v.pl/a.mp4');
  assert.equal(resultVideoUrl('{zle', 'weekend_reset'), '');
  assert.equal(resultVideoUrl(undefined, 'weekend_reset'), '');
});

test('wynik: blok przedsprzedazy i wideo zalezne od env, zaproszenie obok zapisu', () => {
  const src = readFileSync(new URL('../app/components/ResultExperience.tsx', import.meta.url), 'utf8');
  assert.match(src, /presaleUrl && \(/);
  assert.match(src, /videoUrl && <video/);
  assert.match(src, /Wyślij komuś, kto ma gorzej/);
  assert.match(src, /Same odpowiedzi czytam sam/);
});
