// 2026-10-19: relay Telegram z kanałami HiT (CARE / SALES / OPS). Dane syntetyczne.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { parseChannel, relaySend, resolveRelayTarget } from '../app/lib/hit-relay.ts';

const ENV = {
  HIT_TG_BOT_TOKEN: 'synthetic-hit-token',
  HIT_TG_SALES_CHAT_ID: '-100111',
  HIT_TG_SALES_TOPIC_ID: '7',
  HIT_TG_OPS_CHAT_ID: '-100222',
  TELEGRAM_BOT_TOKEN: 'synthetic-legacy',
  TELEGRAM_CHAT_ID: '999',
};
const noSleep = async () => {};
function fakeFetch(statuses: number[], calls: Array<{ url: string; body: Record<string, unknown> }>) {
  let i = 0;
  return async (url: string, init: { body: string }) => {
    calls.push({ url, body: JSON.parse(init.body) });
    const status = statuses[Math.min(i++, statuses.length - 1)];
    return { ok: status >= 200 && status < 300, status, json: async () => ({ parameters: { retry_after: 1 } }) };
  };
}

test('parseChannel: brak = SALES, znane kanały, obcy = null', () => {
  assert.equal(parseChannel(undefined), 'SALES');
  assert.equal(parseChannel('ops'), 'OPS');
  assert.equal(parseChannel('CARE'), 'CARE');
  assert.equal(parseChannel('NOCNA'), null);
});

test('resolveRelayTarget: HIT z topic, OPS bez topic, CARE bez configu spada na legacy', () => {
  const sales = resolveRelayTarget('SALES', ENV);
  assert.deepEqual(sales, { token: 'synthetic-hit-token', chatId: '-100111', topicId: 7, source: 'HIT' });
  assert.equal(resolveRelayTarget('OPS', ENV)?.topicId, null);
  assert.equal(resolveRelayTarget('CARE', ENV)?.source, 'LEGACY');
  assert.equal(resolveRelayTarget('SALES', {}), null);
});

test('relaySend: message_thread_id, retry 5xx/429, stop na 400, log bez treści i chat ID', async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const target = resolveRelayTarget('SALES', ENV)!;
  const logs: string[] = [];
  const orig = console.log;
  console.log = (...a: unknown[]) => { logs.push(a.map(String).join(' ')); };
  let r;
  try {
    r = await relaySend(target, 'Sekretna Ania', 'SALES', { fetch: fakeFetch([502, 429, 200], calls), sleep: noSleep });
  } finally { console.log = orig; }
  assert.deepEqual(r, { ok: true, http: 200, attempts: 3 });
  assert.equal(calls[0].body.message_thread_id, 7);
  assert.equal(calls[0].body.chat_id, '-100111');
  const line = logs.find((l) => l.startsWith('HIT_TG_DELIVERY'))!;
  assert.match(line, /"status":"SENT"/);
  assert.doesNotMatch(line, /Sekretna|Ania|-100111|synthetic-hit-token/);
  const c2: typeof calls = [];
  assert.equal((await relaySend(target, 't', 'SALES', { fetch: fakeFetch([400], c2), sleep: noSleep })).ok, false);
  assert.equal(c2.length, 1);
  const boom = await relaySend(target, 't', 'SALES', { fetch: async () => { throw new Error('ECONNRESET'); }, sleep: noSleep });
  assert.deepEqual(boom, { ok: false, http: null, attempts: 3 });
});

test('route: OIDC zostaje, kanał z body, 503/502 bez zmian', () => {
  const src = readFileSync(new URL('../app/api/telegram-lead/route.ts', import.meta.url), 'utf8');
  assert.match(src, /verifyLandingCaller\(token\)/);
  assert.match(src, /parseChannel\(/);
  assert.match(src, /status: 503/);
  assert.match(src, /status: 502/);
  assert.doesNotMatch(src, /process\.env\.TELEGRAM_BOT_TOKEN/);
});
