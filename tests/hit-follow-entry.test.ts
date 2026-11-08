import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ENTRY_COPY, HIT_FOLLOW_ENTRY_COPY, isHiTFollowEntry, resolveEntryDoor } from '../app/lib/entry-copy.ts';

const url = 'https://168.talerzihantle.com/?door=hit&src=dm&utm_source=instagram&utm_medium=dm&utm_campaign=follow_welcome_168';
const params = (s: string) => new URL(s, 'https://168.talerzihantle.com/').searchParams;

test('canonical IG follow link reaches existing HiT diagnostic with a distinct opening', () => {
  assert.equal(resolveEntryDoor(params(url), '/'), 'hit');
  assert.equal(isHiTFollowEntry(params(url), '/'), true);
  assert.equal(isHiTFollowEntry(params(url), '/diagnoza'), true);
});

const excluded = [
  'door=hit&src=story&utm_campaign=follow_welcome_168',
  'door=hit&src=dm&utm_campaign=lead2026',
  'door=th2&src=dm&utm_campaign=follow_welcome_168',
  'door=general&src=dm&utm_campaign=follow_welcome_168',
  'door=hit&src=dm&campaign=follow_welcome_168',
  'utm_campaign=hit_bio&src=dm',
  'door=hit&src=other&utm_campaign=follow_welcome_168',
];
for (const q of excluded) {
 test('does not leak IG welcome copy into existing routes: '+q, () => {
   assert.equal(isHiTFollowEntry(new URLSearchParams(q), '/'), false);
 });
}
test('TH2 clean route never receives HiT copy regardless of query', () => {
 assert.equal(isHiTFollowEntry(new URLSearchParams('door=hit&src=dm&utm_campaign=follow_welcome_168'), '/rozjazd'), false);
});
test('welcome copy delivers real value without fake scarcity or instant results', () => {
 assert.match(HIT_FOLLOW_ENTRY_COPY.proof, /72 godziny/);
 assert.match(HIT_FOLLOW_ENTRY_COPY.cta, /tydzień/);
 assert.doesNotMatch(JSON.stringify(HIT_FOLLOW_ENTRY_COPY), /30 sekund|250.?000|gwarantuj|zacznij.{0,4}dziś albo/i);
 assert.match(ENTRY_COPY.th2.headline, /Impreza/);
 assert.match(ENTRY_COPY.hit.headline, /trening/);
});