import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/lead-notify/route.ts';
import { POST as subscribe } from '../app/api/subscribe/route.ts';
import { QUESTIONS } from '../app/lib/assessment-config.ts';

const answers: Record<string,unknown> = {};
for (const q of QUESTIONS) {
  if (q.optional || (q.condition && !q.condition(answers))) continue;
  answers[q.id] = q.type==='single' ? q.options![0].id : q.type==='multi' ? [q.options![0].id] : q.type==='text' ? 'Po pracy brakuje mi energii na trening i jedzenie.' : q.type==='contact' ? 'qa.synthetic_2026' : q.min??0;
}
const request = (body:unknown) => new NextRequest('http://localhost/api/lead-notify',{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}});
const envKeys=['MAKE_DIAGNOSTYKA_WEBHOOK','N8N_DIAGNOSTYKA_WEBHOOK','TELEGRAM_LEADS_BOT_TOKEN','TELEGRAM_BOT_TOKEN','TELEGRAM_LEADS_CHAT_ID','TELEGRAM_CHAT_ID','MAILERLITE_API_KEY','MAILERLITE_GROUP_ID'];

async function harness(run:(calls:{url:string;body:Record<string,unknown>}[])=>Promise<void>, options:{crm?:boolean;crmStatus?:number;telegramBody?:unknown}={}) {
  const previous = Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
  for(const k of envKeys) delete process.env[k];
  if(options.crm!==false) process.env.MAKE_DIAGNOSTYKA_WEBHOOK='https://crm.invalid/capture';
  process.env.TELEGRAM_LEADS_BOT_TOKEN='SYNTHETIC_NOT_A_SECRET';
  process.env.TELEGRAM_LEADS_CHAT_ID='SYNTHETIC_CHAT';
  const oldFetch=globalThis.fetch;
  const calls:{url:string;body:Record<string,unknown>}[]=[];
  globalThis.fetch=(async(url, init)=>{
    calls.push({url:String(url),body:JSON.parse(String(init?.body))});
    if(String(url).includes('crm.invalid')) return new Response('{}',{status:options.crmStatus??200});
    return new Response(JSON.stringify(options.telegramBody??{ok:true,result:{message_id:123}}),{status:200});
  }) as typeof fetch;
  try {await run(calls);} finally {globalThis.fetch=oldFetch;for(const k of envKeys){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}}
}

test('real handler rejects every missing required answer before ANY external I/O',async()=>harness(async calls=>{
 for(const q of QUESTIONS.filter(q=>!q.optional&&(!q.condition||q.condition(answers)))) {
  const r=await POST(request({answers:{...answers,[q.id]:'  '}})); assert.equal(r.status,422,q.id);
 }
 assert.equal(calls.length,0);
}));
test('valid synthetic input restores canonical CRM payload before Telegram, ignores forged score',async()=>harness(async calls=>{
 const r=await POST(request({answers,lead_ref:'qa-run-20261020',score:100,priority_lead:true}));
 const result=await r.json();
 assert.equal(r.status,200);assert.equal(result.crm,true);assert.equal(result.telegram,true);
 assert.equal(calls[0]?.url,'https://crm.invalid/capture');
 const body=calls[0].body;
 assert.equal(body.instagram,'qa.synthetic_2026');assert.notEqual(body.score,100);
 assert.equal(body.followup_priority,false);assert.equal(body.lead_ref,'qa-run-20261020');
 const chunks=[1,2,3,4].map(i=>JSON.parse(String(body[`raw_${i}_json`]))).join('');
 assert.deepEqual(JSON.parse(chunks),answers);
 assert.equal(calls.filter(c=>c.url.includes('api.telegram.org')).length,1);
}));
test('missing CRM cannot be reported as a saved lead or emit a sales alert',async()=>harness(async calls=>{
 const r=await POST(request({answers}));assert.equal(r.status,503);assert.equal((await r.json()).ok,false);assert.equal(calls.length,0);
},{crm:false}));
test('CRM failure prevents Telegram and is not a success',async()=>harness(async calls=>{
 const r=await POST(request({answers}));assert.equal(r.status,502);assert.equal((await r.json()).ok,false);assert.equal(calls.length,1);
},{crmStatus:500}));
test('Telegram API logical error is not delivered even with HTTP 200',async()=>harness(async()=>{
 const r=await POST(request({answers}));const data=await r.json();assert.equal(data.telegram,false);
},{telegramBody:{ok:false,description:'synthetic rejection'}}));
test('legacy subscribe rejects empty diagnostic answers and zero-length score before I/O',async()=>harness(async calls=>{
 const r=await subscribe(request({email:'qa@example.invalid',source:'diagnostyka_hit',odpowiedzi:{},wynik_score:''}));
 assert.equal(r.status,422);assert.equal(calls.length,0);
}));

test('legacy subscribe rejects sparse answers even when the claimed score is numeric',async()=>harness(async calls=>{
 const r=await subscribe(request({email:'qa@example.invalid',source:'diagnostyka_hit',odpowiedzi:{sleep:7},wynik_score:0}));
 assert.equal(r.status,422);assert.equal(calls.length,0);
}));
test('legacy source omission cannot bypass diagnostic validation',async()=>harness(async calls=>{
 const r=await subscribe(request({email:'qa@example.invalid'}));
 assert.equal(r.status,422);assert.equal(calls.length,0);
}));
