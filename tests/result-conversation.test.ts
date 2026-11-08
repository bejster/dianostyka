import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const result = readFileSync('app/components/ResultExperience.tsx', 'utf8').replace(/\r\n/g, '\n');
const talk = readFileSync('app/components/ResultConversation.tsx', 'utf8');
const router = readFileSync('app/lib/result-router-v3.ts', 'utf8');

test('human handoff comes right after the first result and before the long evidence sections', () => {
  const hero = result.indexOf('data-beat="1"');
  const handoff = result.indexOf('<ResultConversation archKey={archKey} primaryRoute={route.primary} />');
  const mirror = result.indexOf('data-beat="mirror"');
  assert.ok(hero >= 0 && handoff > hero && mirror > handoff);
  assert.match(result, /Wynik liczy się automatycznie z Twoich odpowiedzi według mojej Mapy 168/);
  assert.match(talk, /Nie widziałem całego Twojego tygodnia/);
  assert.match(talk, /Tego nie wyjaśni żaden gotowy formularz/);
  assert.doesNotMatch(talk, /osobiście przeanalizowałem|ręcznie przeczytałem/);
});

test('the actual contact is an optional Instagram click with an honest non-send caveat', () => {
  assert.match(talk, /ig\.me\/m\/hantleitalerz\?text=/);
  assert.match(talk, /encodeURIComponent\(prepared\)/);
  assert.match(talk, /Niczego nie wysyłam za Ciebie/);
  assert.match(talk, /type="button" aria-pressed=\{reason === id\}/);
  assert.match(talk, /setReason\(id\)/);
  assert.match(talk, /navigator\.clipboard\.writeText\(prepared\)/);
  assert.match(talk, /result_conversation_clicked/);
  assert.match(talk, /result_conversation_copied/);
  assert.doesNotMatch(talk, /submit\(|fetch\(|\bpostEvent\(/);
});

test('prewritten conversation openers contain no client answers, personal health detail or tracking payload', () => {
  assert.match(talk, /type Reason = 'nie_pasuje' \| 'skad_wniosek' \| 'prowadz_1na1'/);
  assert.match(talk, /CONVERSATION_CHOICES: Record<Reason, Choice>/);
  assert.match(talk, /const prepared = CONVERSATION_CHOICES\[reason\]\.message/);
  assert.doesNotMatch(talk, /encodeURIComponent\((?:userPain|instagram|submissionId|decision|answers|contentSignals)/);
  assert.doesNotMatch(talk, /(?:message:\s*'.*?)(?:libido|używki|alkohol|hormony|diagnoza medyczna)/i);
  assert.match(talk, /topic: reason, arch: archKey, route: primaryRoute/);
});

test('deep explanations remain complete but optional, without hiding the test or coaching', () => {
  const open = result.indexOf('<details className="rx-deep-dive" id="wyjasnienie">');
  const close = result.indexOf('</details>\n\n        {/* BEAT 5', open);
  const experiment = result.indexOf('data-beat="5" id="test-72h"');
  assert.ok(open > 0 && close > open && experiment > close);
  const deep = result.slice(open,close);
  for(const beat of ['fracture','2','3','4']) assert.match(deep,new RegExp('data-beat="'+beat+'"'));
  assert.match(result, /<ResultConversation archKey=/);
  assert.match(result, /href="#porozmawiaj"/);
  assert.match(result, /href="#test-72h"/);
  assert.match(result, /id="plan-1na1"/);
  assert.match(result, /className="rx-final-action"/);
  assert.match(router, /routeDecision\(intentRaw: string, startWhenRaw: string\)/);
});

test('contact is a secondary lane, retaining existing experiment and sales options', () => {
  assert.match(result, /route\.primary === 'nabor'/);
  assert.match(result, /onClick=\{commitExperiment\}/);
  assert.match(result, /href=\{naborHref\}/);
  assert.doesNotMatch(talk, /gwarantuj|odpowiem w \d|darmowa konsultacja/i);
});
