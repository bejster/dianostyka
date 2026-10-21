import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEntryDoor } from '../app/lib/entry-copy.ts';

test('actual bio URLs select their profile on both diagnostic routes', () => {
  for (const path of ['/', '/diagnoza']) {
    for (const brand of ['hit', 'th2'] as const) {
      assert.equal(resolveEntryDoor(new URLSearchParams(`utm_source=instagram&utm_medium=bio&utm_campaign=${brand}_bio`), path), brand);
    }
  }
});

test('explicit valid door wins; unknown campaigns stay general', () => {
  assert.equal(resolveEntryDoor(new URLSearchParams('door=hit&utm_campaign=th2_bio'), '/diagnoza'), 'hit');
  for (const query of ['', 'utm_campaign=unknown', 'door=unknown', 'utm_campaign=th2_bio_extra']) {
    assert.equal(resolveEntryDoor(new URLSearchParams(query), '/'), 'general');
  }
  assert.equal(resolveEntryDoor(new URLSearchParams(), '/rozjazd'), 'th2');
});
