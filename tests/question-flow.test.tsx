import assert from 'node:assert/strict';
import test, {afterEach,before} from 'node:test';
import React from 'react';
import { JSDOM } from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,HTMLElement:dom.window.HTMLElement});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
import Flow from '../app/components/SingleQuestionFlow.tsx';
import {QUESTIONS} from '../app/lib/assessment-config.ts';
let render: typeof import('@testing-library/react').render;
let cleanup: typeof import('@testing-library/react').cleanup;
let fireEvent: typeof import('@testing-library/react').fireEvent;
before(async()=>{({render,cleanup,fireEvent}=await import('@testing-library/react'));});
afterEach(()=>{cleanup();localStorage.clear();});
function step(id:string,answers:Record<string,unknown>={}){
 localStorage.setItem('diagnostyka_v2_session_step',String(QUESTIONS.findIndex(q=>q.id===id)));
 return render(<Flow initialAnswers={answers as never} onComplete={()=>{throw new Error('must not submit')}}/>);
}
test('untouched slider explains why confirmation is unavailable',()=>{
 const v=step('age');assert.equal((v.getByRole('button',{name:/Zatwierdź/i}) as HTMLButtonElement).disabled,true);
 assert.match(v.getByRole('status').textContent??'',/suwak|wybierz/i);
});
test('resuming a confirmed zero does not require moving the slider again',()=>{
 const v=step('planned_trainings',{planned_trainings:0});
 assert.equal((v.getByRole('button',{name:/Zatwierdź/i}) as HTMLButtonElement).disabled,false);
});
test('whitespace text shows a concrete correction and remains blocked',()=>{
 const v=step('user_pain',{user_pain:'   '});
 assert.equal((v.getByRole('button',{name:/Dalej/i}) as HTMLButtonElement).disabled,true);
 assert.match(v.getByRole('status').textContent??'',/15 znaków.*3 słowa/);
});
test('invalid contact is not silently rewritten into someone else’s handle',()=>{
 const v=step('instagram');const input=v.getByPlaceholderText('twoj_nick');
 fireEvent.change(input,{target:{value:'bad handle'}});
 assert.equal((input as HTMLInputElement).value,'bad handle');
 assert.equal((v.getByRole('button',{name:/Pokaż/i}) as HTMLButtonElement).disabled,true);
});
test('missed training slider respects the currently declared plan',()=>{
 const v=step('missed_trainings',{planned_trainings:2});
 assert.equal(v.getByRole('slider').getAttribute('max'),'2');
});
test('corrupt saved state cannot crash the questionnaire',()=>{
 localStorage.setItem('diagnostyka_v2_session_answers','null');
 const v=render(<Flow onComplete={()=>{}}/>);
 assert.ok(v.getByRole('heading',{name:'Ile masz lat?'}));
});

test('result remains available but failed delivery is visible with a manual retry',async()=>{
 const a:Record<string,unknown>={};
 for(const q of QUESTIONS){
  if(q.optional||(q.condition&&!q.condition(a)))continue;
  a[q.id]=q.type==='single'?q.options![0].id:q.type==='multi'?[q.options![0].id]:q.type==='contact'?'qa.synthetic_2026':q.type==='text'?'Po pracy brakuje mi energii na przygotowanie jedzenia.':q.min??0;
 }
 localStorage.setItem('diagnostyka_v2_session_answers',JSON.stringify(a));
 localStorage.setItem('diagnostyka_v2_session_step',String(QUESTIONS.findIndex(q=>q.id==='instagram')));
 window.scrollTo=()=>{};
 const oldFetch=globalThis.fetch;
 const requests:Record<string,unknown>[]=[];
 globalThis.fetch=(async(url,init)=>{
  if(String(url).includes('lead-notify'))requests.push(JSON.parse(String(init?.body)));
  return new Response(JSON.stringify({ok:false,error:'crm_unavailable'}),{status:503});
 }) as typeof fetch;
 try {
  const {default:Page}=await import('../app/diagnoza/page.tsx');
  const v=render(<Page/>);
  fireEvent.click(v.getByRole('button',{name:/Pokaż mi ten dzień/i}));
  fireEvent.click(v.getByRole('button',{name:/Pokaż mój wynik/i}));
  assert.match((await v.findByRole('alert')).textContent??'',/nie.*przekazać|nie.*wysłać/i);
  fireEvent.click(v.getByRole('button',{name:/Spróbuj ponownie/i}));
  await v.findByRole('button',{name:/Spróbuj ponownie/i});
  assert.equal(requests.length,2);
  assert.ok(requests[0].lead_ref);assert.equal(requests[0].lead_ref,requests[1].lead_ref);
 } finally {globalThis.fetch=oldFetch;}
});

test('from first question to result, real API, captured CRM record and Telegram receipt (isolated)',async()=>{
 const {NextRequest}=await import('next/server');
 const {POST}=await import('../app/api/lead-notify/route.ts');
 const {default:Page}=await import('../app/diagnoza/page.tsx');
 const keys=['MAKE_DIAGNOSTYKA_WEBHOOK','N8N_DIAGNOSTYKA_WEBHOOK','TELEGRAM_LEADS_BOT_TOKEN','TELEGRAM_LEADS_CHAT_ID'];
 const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 process.env.MAKE_DIAGNOSTYKA_WEBHOOK='https://crm.invalid/capture';delete process.env.N8N_DIAGNOSTYKA_WEBHOOK;
 process.env.TELEGRAM_LEADS_BOT_TOKEN='SYNTHETIC_NOT_A_SECRET';process.env.TELEGRAM_LEADS_CHAT_ID='SYNTHETIC_CHAT';
 const calls:{url:string;body:Record<string,unknown>}[]=[];const oldFetch=globalThis.fetch;
 globalThis.fetch=(async(url,init)=>{
  if(url==='/api/lead-notify')return POST(new NextRequest('http://localhost/api/lead-notify',{method:init?.method,body:init?.body,headers:init?.headers,signal:init?.signal??undefined}));
  if(url==='/api/diagnoza')return new Response('{"ok":false}');
  calls.push({url:String(url),body:JSON.parse(String(init?.body))});
  assert.ok(String(url).startsWith('https://crm.invalid/')||String(url).includes('SYNTHETIC_NOT_A_SECRET'));
  return new Response(String(url).includes('api.telegram.org')?'{"ok":true,"result":{"message_id":123}}':'{"id":"synthetic-memory-record"}');
 }) as typeof fetch;
 window.scrollTo=()=>{};
 try {
  const v=render(<Page/>);fireEvent.click(v.getByRole('button',{name:/Pokaż mi ten dzień/i}));
  const a:Record<string,unknown>={};
  for(const q of QUESTIONS){
   if(q.condition&&!q.condition(a))continue;
   await v.findByRole('heading',{name:q.title});
   if(q.type==='single'){
    a[q.id]=q.id==='weekend_pattern'?'wp_reset':q.options![0].id;
    fireEvent.click(v.getByRole('button',{name:q.options!.find(o=>o.id===a[q.id])!.label}));
   } else if(q.type==='slider'||q.type==='number'){
    a[q.id]=q.id==='planned_trainings'?3:q.min??0;
    const input=v.getByRole(q.type==='slider'?'slider':'spinbutton');
    fireEvent.pointerDown(input);fireEvent.change(input,{target:{value:String(a[q.id])}});
    fireEvent.click(v.getByRole('button',{name:/Zatwierdź/i}));
   } else if(q.type==='multi'){
    a[q.id]=[q.options![0].id];fireEvent.click(v.getByRole('button',{name:q.options![0].label}));
    fireEvent.click(v.getByRole('button',{name:/Dalej/i}));
   } else if(q.type==='text'){
    a[q.id]='Po pracy brakuje mi energii na trening i jedzenie.';
    fireEvent.change(v.getByRole('textbox'),{target:{value:a[q.id]}});fireEvent.click(v.getByRole('button',{name:/Dalej/i}));
   } else {
    a[q.id]='qa.synthetic_2026';fireEvent.change(v.getByPlaceholderText('twoj_nick'),{target:{value:a[q.id]}});
    fireEvent.click(v.getByRole('button',{name:/Pokaż mój wynik/i}));
   }
  }
  await v.findByText('Zgłoszenie przyjęte. Wynik znajdziesz poniżej.');
  assert.ok(v.getByText('Diagnoza gotowa'));
  assert.equal(calls.length,2);assert.equal(calls[0].url,'https://crm.invalid/capture');
  const raw=[1,2,3,4].map(i=>JSON.parse(String(calls[0].body[`raw_${i}_json`]))).join('');
  assert.deepEqual(JSON.parse(raw),a);
  assert.equal(calls[1].body.chat_id,'SYNTHETIC_CHAT');
  assert.match(String(calls[1].body.text),/@qa.synthetic_2026/);
 } finally {globalThis.fetch=oldFetch;for(const k of keys){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}}
});

test('keyboard Home explicitly confirms a genuine zero',()=>{
 const v=step('planned_trainings');fireEvent.keyDown(v.getByRole('slider'),{key:'Home'});
 assert.equal((v.getByRole('button',{name:/Zatwierdź/i}) as HTMLButtonElement).disabled,false);
});
test('restoring an old hidden step resumes at a visible question',()=>{
 const v=step('sleep_hours',{age:30});
 assert.equal(v.getByRole('heading').textContent,'Jak często budzisz się wyspany?');
});
