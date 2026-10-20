import { NextRequest, NextResponse } from 'next/server';
import { answersToFD } from '../../lib/answers-to-fd';
import { score, pickArchetype, hourRange, tagScoreWeighted } from '../../lib/diagnostic-core';
import { activeDiagnosticAnswers, cleanInstagram, invalidDiagnosticFields } from '../../lib/lead-integrity';
import { persistDiagnosticLead } from '../../lib/diagnostic-crm';
import type { RawAnswers } from '../../lib/scoring-engine';

const INTENTS: Record<string, string> = {
  in_sam: 'samodzielnie — bez oferty',
  in_zobacz: 'chce zobaczyć prowadzenie',
  in_prowadz: 'chce prowadzenia',
  in_niewiem: 'jeszcze nie zdecydował',
};
const STARTS: Record<string, string> = {
  sw_7dni: 'w tym tygodniu',
  sw_30dni: 'w tym miesiącu',
  sw_kwartal: 'za 2–3 miesiące',
  sw_sprawdzam: 'na razie sprawdza',
};
const s = (v: unknown, max = 100) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function worstCategory(D: ReturnType<typeof answersToFD>): string {
  const categories = [
    { label: 'Sen', pct: Math.max(100 - Math.round(((D.sleepQ + D.screenBed) / 6 + (7.5 - Math.min(D.sleep, 7.5)) / 1.5) * 55), 5) },
    { label: 'Stres', pct: Math.max(100 - Math.round(((D.stress + D.energy + (D.workHours > 9 ? 1 : 0)) / 7) * 100), 5) },
    { label: 'Żywienie', pct: Math.max(100 - Math.round((D.binge / 4) * 70 + (D.veggies + D.protein) * 7), 5) },
    { label: 'Weekend', pct: Math.max(100 - Math.round((D.drinks / 12) * 40 + D.wknd * 10 + D.mondayFeel * 8), 5) },
    { label: 'Trening', pct: Math.max(100 - Math.round(((D.miss * 1.5 + (D.trainHappy >= 1 && D.trainHappy <= 2 ? 1 : 0)) / 4) * 100), 5) },
    { label: 'Głowa', pct: Math.max(100 - Math.round((tagScoreWeighted(D.tags) / 10) * 60 + D.defer * 8 + D.dopamine * 6 + (D.triedBefore >= 2 ? 10 : 0)), 5) },
  ];
  return categories.reduce((a, b) => a.pct < b.pct ? a : b).label;
}

// Wyłącznie kontaktowalne, KOMPLETNE leady. Nie przyjmujemy scoringu/budżetu od przeglądarki.
// Anonimowe wyniki są analityką, nie kandydatami do DM.
export async function POST(req: NextRequest) {
  const rawBody: unknown = await req.json().catch(() => null);
  const b = rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
    ? rawBody as Record<string, unknown> : null;
  const invalid = invalidDiagnosticFields(b?.answers);
  if (invalid.length) {
    return NextResponse.json(
      { ok: false, error: 'incomplete_lead', invalid_fields: invalid },
      { status: 422 },
    );
  }

  const raw = activeDiagnosticAnswers(b!.answers as Record<string, unknown>) as RawAnswers;
  const ig = cleanInstagram(raw.instagram);
  const D = answersToFD(raw);
  const sc = score(D);
  const worst = worstCategory(D);
  const archetype = pickArchetype(D, worst);
  const intent = String(raw.intent);
  const start = String(raw.start_when);
  const wantsHelp = intent === 'in_prowadz' || intent === 'in_zobacz';
  const soon = start === 'sw_7dni' || start === 'sw_30dni';
  // Priorytet ≠ duży problem. Nie udajemy, że wydatki na weekend = budżet na opiekę.
  const priority = wantsHelp && soon && sc >= 40;
  const name = s(raw.imie ?? raw.name, 40);
  const label = name ? `${name} · @${ig}` : `@${ig}`;
  const point = hourRange(D);
  const statedProblem = s(raw.user_pain, 200); // własne słowa z wymaganego pola, bez dopisywania interpretacji

  const followUp =
    intent === 'in_prowadz'
      ? `DM: „Cześć${name ? ' ' + name : ''}, widzę, że chcesz, żeby ktoś Cię poprowadził. Zaznaczyłeś, że tydzień zaczyna Ci się psuć: ${point}. Co dokładnie dzieje się wtedy, zanim odpuścisz plan?”`
      : intent === 'in_zobacz'
      ? `DM: „Cześć${name ? ' ' + name : ''}, widzę, że chcesz sprawdzić, jak wygląda prowadzenie. Zanim coś podeślę: gdy zaczyna się u Ciebie ${point}, co najczęściej wypada jako pierwsze?”`
      : intent === 'in_sam'
      ? 'Następny ruch: deklaruje samodzielne działanie. Nie wysyłaj oferty bez nowego sygnału zainteresowania.'
      : 'Następny ruch: nie zdecydował. Bez presji i przypisywania pilności; poczekaj na nowy sygnał.';

  const lines = [
    `${priority ? '🔥' : '📩'} NOWY LEAD — DIAGNOSTYKA`,
    `👤 ${label} → instagram.com/${ig}`,
    `Natężenie problemu: ${sc}/100 · ${archetype.label}`,
    `Punkt pęknięcia: ${point} · obszar: ${worst}`,
    `Jego słowa: „${statedProblem}”`,
    `Intencja: ${INTENTS[intent]} · start: ${STARTS[start]}`,
    `Priorytet kontaktu: ${priority ? 'P1 — prosi o pomoc i wskazał termin' : 'standardowy — bez potwierdzenia pilnej decyzji'}`,
    '',
    followUp,
  ];

  const leadRef = typeof b!.lead_ref === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(b!.lead_ref)
    ? b!.lead_ref : crypto.randomUUID();
  let crm;
  try {
    crm = await persistDiagnosticLead({
      lead_ref: leadRef, instagram: ig, imie: name, score: sc,
      severity_band: sc >= 40 ? 'goracy' : sc >= 20 ? 'cieply' : 'zimny',
      archetyp: archetype.label, archetypKey: archetype.key,
      followup_priority: priority, wants_help: wantsHelp, intencja: intent, kiedy_start: start,
      pain: statedProblem, raw_answers: raw,
      derived_signals: {score:sc,worst_category:worst,break_window:point,intent,start_when:start},
      diagnostyka_brief: lines.join('\n'),
    });
  } catch {
    return NextResponse.json({ok:false,error:'crm_payload_failed',crm:false,telegram:false},{status:502});
  }
  if (!crm.accepted) {
    return NextResponse.json({ok:false,error:crm.configured ? 'crm_failed' : 'crm_unavailable',crm:false,telegram:false,lead_ref:leadRef}, {status:crm.configured ? 502 : 503});
  }
  const receipt = {ok:true,crm:true,crm_status:'accepted',make:crm.make,n8n:crm.n8n,lead_ref:leadRef};

  const token = process.env.TELEGRAM_LEADS_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_LEADS_CHAT_ID || '-1004328603395';
  if (!token || !chat) {
    console.error('diagnostic lead delivery unavailable: missing configuration');
    return NextResponse.json({ ...receipt, telegram: false, warning: 'telegram_unavailable' });
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: lines.join('\n'), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    const telegramBody = await res.json().catch(() => null);
    if (!res.ok || telegramBody?.ok !== true) {
      console.error('diagnostic lead delivery failed', res.status);
      return NextResponse.json({ ...receipt, telegram: false, warning: 'telegram_failed' });
    }
    return NextResponse.json({ ...receipt, telegram: true });
  } catch {
    console.error('diagnostic lead delivery exception');
    return NextResponse.json({ ...receipt, telegram: false, warning: 'telegram_failed' });
  }
}
