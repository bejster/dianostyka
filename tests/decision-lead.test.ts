import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as engine from '../app/lib/decision-diagnostic.ts';

// Execute the actual route with isolated env/fetch: no CRM or Telegram traffic in tests.
const require = createRequire(import.meta.url);
const source = ts.transpileModule(fs.readFileSync('app/api/decision-lead/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function handler(env: Record<string, string> = {}, delivery = true) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const exports: { POST?: (req: { text(): Promise<string> }) => Promise<Response> } = {};
  vm.runInNewContext(source, {
    exports, process: { env }, AbortSignal,
    require: (name: string) => name === 'next/server' ? require('next/server') : engine,
    fetch: async (url: string, init: { body: string }) => { calls.push({ url, body: JSON.parse(init.body) }); return { ok: delivery }; },
  });
  return { calls, post: (body: unknown) => exports.POST!({ text: async () => JSON.stringify(body) }) };
}
const complete = {
  version: engine.DECISION_VERSION, consent: true, fit: 'coaching', objection: 'price', instagram: '@tester',
  answers: { goal: 'form', scene: 'steady', previous: 'none', protect: 'rest', why: 'curious' },
};

test('contact endpoint rejects lack of consent, non-fit and incomplete answers without delivery', async () => {
  for (const body of [{ ...complete, consent: false }, { ...complete, fit: 'self' }, { ...complete, answers: {} }, { ...complete, version: '2.9.0' }]) {
    const h = handler({ N8N_DIAGNOSTYKA_WEBHOOK: 'https://example.invalid/webhook' });
    assert.equal((await h.post(body)).status, 400);
    assert.equal(h.calls.length, 0);
  }
});

test('explicit contact sends a server-built factual brief and no inferred sales score', async () => {
  const h = handler({ N8N_DIAGNOSTYKA_WEBHOOK: 'https://example.invalid/webhook' });
  const response = await h.post({ ...complete, answers: { ...complete.answers, score: 99 }, diagnostyka_brief: 'untrusted client text' });
  assert.equal(response.status, 200);
  assert.equal(h.calls.length, 1);
  const body = h.calls[0].body;
  assert.equal(body.instagram, '@tester');
  assert.equal(body.assessment_version, '3.0.0');
  assert.equal(body.objection, 'price');
  assert.match(String(body.diagnostyka_brief), /Zachowaj to, co już Ci działa/);
  assert.doesNotMatch(JSON.stringify(body), /untrusted client text|premium_fit|severity|"score"/);
  assert.equal((body.consent as { granted: boolean }).granted, true);
});

test('missing or failed delivery never reports a successful contact request', async () => {
  for (const h of [handler(), handler({ N8N_DIAGNOSTYKA_WEBHOOK: 'https://example.invalid/webhook' }, false)]) {
    const response = await h.post(complete);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).ok, false);
  }
});

test('contact endpoint rejects an oversized body before any delivery', async () => {
  const h = handler({ N8N_DIAGNOSTYKA_WEBHOOK: 'https://example.invalid/webhook' });
  assert.equal((await h.post({ ...complete, excess: 'x'.repeat(12000) })).status, 413);
  assert.equal(h.calls.length, 0);
});
