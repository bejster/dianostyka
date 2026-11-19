// Ogon Mapy 168 (16.11): galaz jednej proby, wydatek 12 mies., pilnosc do lata. Poza scoringiem.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { QUESTIONS, TAIL_168_IDS, TAIL_168_VERSION, ASSESSMENT_VERSION } from '../app/lib/assessment-config.ts';
import { calculateScoring, type RawAnswers } from '../app/lib/scoring-engine.ts';
import { answersToFD } from '../app/lib/answers-to-fd.ts';
import { score, costs, pickArchetype } from '../app/lib/diagnostic-core.ts';
import { invalidDiagnosticFields } from '../app/lib/lead-integrity.ts';
import { buildReplySignals, replyPriorityHeader, fitHintLine, REPLY_PRIORITY_LABEL } from '../app/lib/reply-priority.ts';
import { buildLeadBrief } from '../app/lib/lead-brief.ts';
import { rowFromNotionPage, toCsv168, csvEscape } from '../app/lib/export-168.ts';

const route = readFileSync(new URL('../app/api/lead-notify/route.ts', import.meta.url), 'utf8');
const flow = readFileSync(new URL('../app/components/SingleQuestionFlow.tsx', import.meta.url), 'utf8');

// Kompletna sesja modelowa (bez ogona), zbudowana z pierwszej opcji / srodka zakresu kazdego widocznego pytania.
function baseSession(): Record<string, unknown> {
  const a: Record<string, unknown> = {};
  for (const q of QUESTIONS) {
    if (TAIL_168_IDS.has(q.id)) continue;
    if (q.condition && !q.condition(a)) continue;
    if (q.type === 'single') a[q.id] = q.options![q.options!.length > 1 ? 1 : 0].id;
    else if (q.type === 'multi') a[q.id] = [q.options![0].id];
    else if (q.type === 'slider' || q.type === 'number') a[q.id] = q.min ?? 0;
    else if (q.type === 'text') a[q.id] = 'w tygodniu trzymam plan a weekend wszystko kasuje';
    else if (q.type === 'contact') a[q.id] = 'testowy_lead';
  }
  return a;
}

const URGENT = 'dalej będę odkładał i w wakacje znowu schowam się pod koszulką';

test('ogon: 6 pytań w kolejności tuż po start_when i przed kontaktem', () => {
  const ids = QUESTIONS.map(q => q.id);
  const start = ids.indexOf('start_when');
  assert.deepEqual(ids.slice(start + 1), [
    'attempt_status', 'attempt_desc', 'attempt_result', 'attempt_blocker', 'spend_12m', 'if_nothing_changes', 'instagram',
  ]);
  assert.equal(TAIL_168_VERSION, 'tail-2026-11-16');
  assert.equal(ASSESSMENT_VERSION, '3.0.0', 'wersja scoringu bez zmian');
});

test('ogon jest poza scoringiem: wartości i wagi = 0', () => {
  for (const q of QUESTIONS.filter(x => TAIL_168_IDS.has(x.id))) {
    assert.equal(q.upstreamWeight, 0, q.id);
    assert.equal(q.crossDomainImpact, 0, q.id);
    for (const o of q.options ?? []) assert.equal(o.value, 0, `${q.id}/${o.id}`);
  }
});

test('wynik, profil, FD, score i koszty identyczne z ogonem i bez', () => {
  const base = baseSession();
  const tails: Record<string, unknown>[] = [
    { attempt_status: 'att_past', attempt_desc: 'pół roku z trenerem online i liczenie kalorii', attempt_result: 'ar_came_back', spend_12m: 'spend12_5k_plus', if_nothing_changes: URGENT },
    { attempt_status: 'att_none', attempt_blocker: 'ab_rozmowa', spend_12m: 'spend12_0' },
    { attempt_status: 'att_unsure', spend_12m: 'spend12_na' },
  ];
  const ref = calculateScoring(base as RawAnswers);
  const refD = answersToFD(base as RawAnswers);
  for (const t of tails) {
    const withTail = { ...base, ...t } as RawAnswers;
    assert.deepEqual(calculateScoring(withTail), ref);
    const D = answersToFD(withTail);
    assert.deepEqual(D, refD);
    assert.equal(score(D), score(refD));
    assert.deepEqual(costs(D), costs(refD));
    assert.deepEqual(pickArchetype(D, 'Sen'), pickArchetype(refD, 'Sen'));
  }
});

test('gałąź próby: opis i wynik tylko po próbie, przeszkoda tylko przy "jeszcze nie"', () => {
  const vis = (status: string) => QUESTIONS
    .filter(q => ['attempt_desc', 'attempt_result', 'attempt_blocker'].includes(q.id))
    .filter(q => !q.condition || q.condition({ attempt_status: status }))
    .map(q => q.id);
  assert.deepEqual(vis('att_active'), ['attempt_desc', 'attempt_result']);
  assert.deepEqual(vis('att_past'), ['attempt_desc', 'attempt_result']);
  assert.deepEqual(vis('att_none'), ['attempt_blocker']);
  assert.deepEqual(vis('att_unsure'), []);
});

test('pytania 2 i 3: brzmienie i odpowiedzi 1:1 z briefu', () => {
  const spend = QUESTIONS.find(q => q.id === 'spend_12m')!;
  assert.equal(spend.title, 'Ile przez ostatnie 12 miesięcy wydałeś na ogarnięcie formy (trener, plany, suple, karnet)?');
  assert.equal(spend.optional, undefined, 'wydatek wymagany, jest opcja "wolę nie mówić"');
  assert.deepEqual(spend.options!.map(o => o.label), ['0 zł', 'Do 1000 zł', '1000-5000 zł', '5000+ zł', 'Wolę nie mówić.']);
  const urg = QUESTIONS.find(q => q.id === 'if_nothing_changes')!;
  assert.equal(urg.title, 'Co się stanie, jak do lata nic się nie zmieni?');
  assert.equal(urg.type, 'text');
  assert.equal(urg.optional, true);
});

test('walidacja: stara sesja bez ogona przechodzi tylko z tolerancją, zła wartość nadal odpada', () => {
  const base = baseSession();
  assert.deepEqual(invalidDiagnosticFields(base, TAIL_168_IDS), []);
  assert.ok(invalidDiagnosticFields(base).includes('spend_12m'), 'bez tolerancji brak = błąd');
  assert.deepEqual(invalidDiagnosticFields({ ...base, spend_12m: 'spend12_milion' }, TAIL_168_IDS), ['spend_12m']);
  assert.deepEqual(invalidDiagnosticFields({ ...base, attempt_status: 'att_past', spend_12m: 'spend12_0', attempt_result: 'ar_kept', attempt_desc: 'ad_nie_pamietam' }, TAIL_168_IDS), []);
  assert.deepEqual(invalidDiagnosticFields({ ...base, attempt_status: 'att_past', spend_12m: 'spend12_0', attempt_result: 'ar_kept', attempt_desc: 'asdfghjkl' }, TAIL_168_IDS), ['attempt_desc']);
  assert.deepEqual(invalidDiagnosticFields({ ...base, attempt_status: 'att_none', spend_12m: 'spend12_0', attempt_blocker: 'ab_rozmowa' }, TAIL_168_IDS), []);
});

test('PRIORYTET ODPISU: wydatek >= 1000 zł i wypełnione pyt. 3, nic więcej', () => {
  const cases: Array<[string, unknown, boolean]> = [
    ['spend12_1k_5k', URGENT, true],
    ['spend12_5k_plus', URGENT, true],
    ['spend12_lt1k', URGENT, false],
    ['spend12_0', URGENT, false],
    ['spend12_na', URGENT, false],
    ['spend12_5k_plus', '', false],
    ['spend12_5k_plus', undefined, false],
    ['spend12_5k_plus', 'nic', false],
    ['spend12_5k_plus', 'asdfgh qwrtzx plkmnb', false],
  ];
  for (const [spend, text, expected] of cases) {
    const s = buildReplySignals({ attempt_status: 'att_unsure', spend_12m: spend, if_nothing_changes: text });
    assert.equal(s.priority_reply, expected, `${spend} / ${String(text)}`);
  }
  assert.match(replyPriorityHeader(buildReplySignals({ attempt_status: 'att_none', spend_12m: 'spend12_1k_5k', if_nothing_changes: URGENT })), new RegExp(`^${REPLY_PRIORITY_LABEL} \\(kolejność odpisu, nie ocena dopasowania\\) · wydatek 12 mies\\.: 1000-5000 zł`));
});

test('audyt ICP 18.11: dopasowanie pokazane osobno od wydatku, bez automatycznego werdyktu', () => {
  assert.equal(
    fitHintLine({ attempt_status: 'att_past', attempt_result: 'ar_came_back', agency_mode: 'ag_data', spend_12m: 'spend12_5k_plus' }),
    'DOPASOWANIE (osobno od wydatku): próba: Był efekt, później problem wrócił. · po kierunku: Zrobię, tylko chcę, żeby ktoś patrzył w dane i mówił, co poprawić.',
  );
  assert.equal(fitHintLine({ attempt_status: 'att_none', spend_12m: 'spend12_0' }), 'DOPASOWANIE (osobno od wydatku): próba: Jeszcze nie.');
  assert.equal(fitHintLine({ intent: 'in_sam' }), '', 'stara sesja bez ogona: brak linii');
  assert.match(route, /REPLY_PRIORITY_NOTE/);
  assert.match(route, /fitHint \? \[fitHint\]/);
  assert.match(route, /\[replyHeader, fitHint,/);
});

test('stany opisu próby są rozróżnione (audyt 23.10: nie zlewać braku, pominięcia i rozmowy)', () => {
  const st = (extra: Record<string, unknown>) => buildReplySignals({ spend_12m: 'spend12_0', ...extra });
  assert.equal(st({ attempt_status: 'att_past', attempt_desc: 'trzy miesiące liczenia kalorii w aplikacji' }).attempt_desc_state, 'opis');
  assert.equal(st({ attempt_status: 'att_past', attempt_desc: 'ad_nie_pamietam' }).attempt_desc_state, 'nie_pamieta');
  assert.equal(st({ attempt_status: 'att_past', attempt_desc: 'ad_rozmowa' }).attempt_desc_state, 'woli_rozmowe');
  assert.equal(st({ attempt_status: 'att_past' }).attempt_desc_state, 'pominiete');
  assert.equal(st({ attempt_status: 'att_none' }).attempt_desc_state, 'nie_dotyczy');
  assert.equal(st({ attempt_status: 'att_none', attempt_blocker: 'ab_rozmowa' }).attempt_blocker_state, 'woli_rozmowe');
  const old = buildReplySignals({ intent: 'in_sam' });
  assert.equal(old.has_tail, false);
  assert.equal(old.attempt_desc_state, 'brak_pytania');
  assert.equal(replyPriorityHeader(old), '');
});

test('brief CRM pokazuje szybką odpowiedź jako etykietę, nie id', () => {
  const brief = buildLeadBrief({ ...baseSession(), attempt_status: 'att_past', attempt_desc: 'ad_rozmowa', attempt_result: 'ar_came_back', spend_12m: 'spend12_1k_5k', if_nothing_changes: URGENT } as RawAnswers).brief;
  assert.match(brief, /Jedna próba \(własne słowa\): \[Wolę dopowiedzieć w rozmowie\]/);
  assert.match(brief, /Wydatek na formę w 12 mies\.: 1000-5000 zł/);
  assert.match(brief, /Co jak do lata nic się nie zmieni \(własne słowa\): „dalej będę/);
  assert.doesNotMatch(brief, /testowy_lead/, 'brief bez IG');
});

test('lead-notify: flaga liczona z raw_answers i zapisana w istniejących kolumnach CRM', () => {
  assert.match(route, /invalidDiagnosticFields\(b\.raw_answers, TAIL_168_IDS\)/);
  assert.match(route, /buildReplySignals\(b\.raw_answers\)/);
  assert.match(route, /chunkForNotion\(derivedSignals, 2\)/);
  assert.match(route, /chunkForNotion\(crmBrief, 3\)/);
  assert.match(route, /priority_reply: reply\.priority_reply/);
  assert.doesNotMatch(route, /nie pytaliśmy'/);
  assert.ok(route.indexOf('buildReplySignals') < route.indexOf('MAKE_DIAGNOSTYKA_WEBHOOK'), 'sygnały przed zapisem Make');
});

test('UI: szybkie odpowiedzi i "Pomiń" czyści niedokończony tekst', () => {
  assert.match(flow, /handleQuickAnswer\(qa\.id\)/);
  assert.match(flow, /delete fresh\[currentQ\.id\]/);
  assert.match(flow, /onClick=\{handleSkip\}/);
});

// ── EKSPORT CSV ──
function notionPage(over: { raw?: unknown; derived?: unknown; ig?: string; type?: string; kpi?: boolean; at?: string; rawText?: string }) {
  const rawText = over.rawText ?? JSON.stringify(over.raw ?? {});
  const chunks = [rawText.slice(0, 1900), rawText.slice(1900, 3800)].filter(Boolean);
  return {
    id: `page-${over.ig ?? 'x'}`,
    created_time: over.at ?? '2026-11-17T10:00:00.000Z',
    properties: {
      Name: { title: [{ plain_text: over.ig ?? 'Diagnostyka abc' }] },
      Instagram: { rich_text: [{ plain_text: over.ig ?? '' }] },
      'Lead Ref': { rich_text: [{ plain_text: 'lr_web_1' }] },
      'Record Type': { select: { name: over.type ?? 'REAL' } },
      'Exclude from KPI': { checkbox: over.kpi ?? false },
      'Acquisition Channel': { select: { name: 'HiT Organic' } },
      'Acquisition Detail': { rich_text: [{ plain_text: 'hit' }] },
      'Diagnostyka Sync At': { date: { start: over.at ?? '2026-11-17T10:00:00.000Z' } },
      'Raw Answers JSON': { rich_text: chunks.map(c => ({ plain_text: c })) },
      'Derived Signals JSON': { rich_text: [{ plain_text: JSON.stringify(over.derived ?? { score: 42, severity_band: 'high', archetyp: 'Weekend' }) }] },
    },
  };
}

test('CSV: BOM, ;, etykiety zamiast id, priorytet, TEST odfiltrowany, JSON sklejony z kawałków', () => {
  const longPain = 'weekend mi wszystko kasuje, '.repeat(80).trim(); // > 1900 znaków po serializacji
  const pages = [
    notionPage({ ig: 'gorący', at: '2026-11-17T12:00:00.000Z', raw: { ...baseSession(), user_pain: longPain.slice(0, 480), attempt_status: 'att_past', attempt_desc: 'rok na siłowni; plan z internetu', attempt_result: 'ar_no_progress', spend_12m: 'spend12_5k_plus', if_nothing_changes: URGENT } }),
    notionPage({ ig: 'stary', at: '2026-11-10T12:00:00.000Z', raw: baseSession() }),
    notionPage({ ig: 'test', type: 'TEST', kpi: true, raw: baseSession() }),
    notionPage({ ig: 'ucięty', rawText: '{"spend_12m":"spend12_5k' }),
  ];
  const rows = pages.map(rowFromNotionPage);
  assert.equal(rows[0].raw_answers_text.length > 0, true);
  const { csv, count, priority, brokenJson } = toCsv168(rows);
  assert.ok(csv.startsWith('﻿priorytet_odpisu;data;instagram'));
  assert.equal(count, 3);
  assert.equal(priority, 1);
  assert.equal(brokenJson, 1);
  const lines = csv.trim().split('\r\n');
  assert.match(lines[1], /;stary;/, 'sortowanie po dacie: starszy pierwszy');
  const hot = lines.find(l => l.includes('gorący'))!;
  assert.match(hot, /^TAK;/);
  assert.match(hot, /5000\+ zł/);
  assert.match(hot, /Wykonywałem ustalenia i nie widziałem postępów\./);
  assert.match(hot, /"rok na siłowni; plan z internetu"/, 'średnik w treści cytowany');
  assert.doesNotMatch(csv, /;test;/, 'TEST poza eksportem domyślnym');
  assert.equal(toCsv168(rows, { includeTest: true }).count, 4);
  const header = lines[0].replace('﻿', '').split(';');
  for (const id of TAIL_168_IDS) assert.ok(header.includes(`q_${id}`), id);
});

test('CSV: ochrona przed formułami Excela i cudzysłowy', () => {
  assert.equal(csvEscape('=HYPERLINK("x")', ';'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvEscape('-5', ';'), "'-5");
  assert.equal(csvEscape('linia\nnowa', ';'), '"linia\nnowa"');
  assert.equal(csvEscape('zwykły tekst', ';'), 'zwykły tekst');
});
