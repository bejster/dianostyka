'use client';

// /diagnoza, żywy flow Diagnostyki V2.
// intro -> intake (1 pytanie/ekran) -> teaser (Karta Tygodnia, koniec). Lead leci na Telegram w handleComplete.
// Mail wycięty (backend Faza 4 niepodłączony, nie kłamiemy). Stare "/" (v1) nietknięte.

import { useState, useEffect, useRef } from 'react';
import { trackDiag, registerContext } from '../lib/analytics';
import SingleQuestionFlow from '../components/SingleQuestionFlow';
import { type RawAnswers } from '../lib/scoring-engine';
import { answersToFD } from '../lib/answers-to-fd';
import { score, costs, pickArchetype, tagScoreWeighted, hourRange } from '../lib/diagnostic-core';
import ResultExperience from '../components/ResultExperience';
import { computeEvidenceReceipts, computeLoop, computeWhyRepeats, computeCostFacts, BREAK_PHRASE } from '../lib/fracture-engine';
import { selectExperiment, type SelectorInput } from '../lib/experiment-bank';
import { routeDecision } from '../lib/result-router-v3';
import { ASSESSMENT_VERSION } from '../lib/assessment-config';
import { buildLeadBrief } from '../lib/lead-brief';
import { computeAwarenessGap } from '../lib/awareness-gap';
import { classifyPremiumFit } from '../lib/premium-fit';
import { Atmosphere } from './atmosphere';

const GOLD = '#c8a84e';
const BG = '#08080a';

type Phase = 'intro' | 'intake' | 'teaser';

// ── Sygnały leada dla operatora (niewidoczne dla usera) — WYŁĄCZNIE z jawnych sygnałów kupna/startu ──
// diag-setter-rc-003 / P0-1: brak composite "readiness". triedBefore (chronologia porażek), severity, symptomy,
// score, koszt i archetyp NIE wchodzą do żadnego sygnału sprzedażowego. Payload niesie tylko jawne fakty osobno.
// diag-setter-rc-002 / P0-2: severity liczona osobno (severity_band, diagnoza). Zero budgetProxy.
function qualify(raw: RawAnswers) {
  const intent = typeof raw.intent === 'string' ? raw.intent : '';
  const startWhen = typeof raw.start_when === 'string' ? raw.start_when : '';
  const wantsHelp = intent === 'in_prowadz' || intent === 'in_zobacz';
  // followup_priority: WYŁĄCZNIE jawna chęć prowadzenia + konkretny termin startu. Bez severity, bez triedBefore, bez budżetu.
  const followupPriority = intent === 'in_prowadz' && (startWhen === 'sw_7dni' || startWhen === 'sw_30dni');
  return { intent, startWhen, wantsHelp, followupPriority };
}

export default function DiagnozaPage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [answers, setAnswers] = useState<RawAnswers | null>(null);
  // P1-1: tryb wejscia. 'diagnostic' = domyslny (cold/warm, pelny flow). 'fast_fit' = tylko dla jawnego
  // ready-to-buy z ?mode=fast_fit (setter/DM), zeby NIE wpychac gotowego leada w 19 ekranow diagnozy.
  const [mode, setMode] = useState<'diagnostic' | 'fast_fit'>('diagnostic');
  // P1-2: dopoki nie rozstrzygniemy trybu, renderujemy neutralny shell (zero flash diagnostyki dla fast_fit).
  const [modeResolved, setModeResolved] = useState(false);
  // P0-1/P1-3: opaque lead_ref settera. TYLKO do prywatnego payloadu leada (Telegram/CRM). NIGDY do PostHog ani copy wyniku.
  const leadRef = useRef<string>('');
  const completionHandledRef = useRef(false);

  // Wejscie na strone diagnostyki. Kolejnosc (P1-1): parsuj+zarejestruj atrybucje -> DOPIERO potem pierwsze eventy lejka.
  useEffect(() => {
    let m: string | null = null;
    try {
      const sp = new URLSearchParams(window.location.search);
      m = sp.get('mode');
      // P1-1: atrybucja settera — whitelist + walidacja, WYŁĄCZNIE do analytics (nigdy do scoringu/wyniku/fast-fit).
      const pick = (k: string, allow: string[]): string | undefined => {
        const v = (sp.get(k) || '').toLowerCase();
        return allow.includes(v) ? v : undefined;
      };
      const ctx: Record<string, string> = { mode: m === 'fast_fit' ? 'fast_fit' : 'diagnostic', entry_copy: 'human_leverage_v2' };
      const src = pick('src', ['setter', 'organic', 'story', 'dm', 'other']);
      const lane = pick('lane', ['cold', 'warm', 'hot']); // ATRYBUCJA ONLY — nie miesza sie z diagnostycznym severity
      const campaignRaw = (sp.get('campaign') || '').toLowerCase().slice(0, 40);
      const campaign = /^[a-z0-9_-]+$/.test(campaignRaw) ? campaignRaw : undefined;
      if (src) ctx.src = src;
      if (lane) ctx.lane = lane;
      if (campaign) ctx.campaign = campaign;
      registerContext(ctx); // PRZED pierwszymi eventami lejka
      // P0-1: lead_ref czytany z sessionStorage (bootstrap w layout.tsx zdjal go z #fragmentu PRZED trackerami). Zero query-string.
      let rid = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('diag_lead_ref') : '') || '';
      if (!/^[A-Za-z0-9_-]{6,64}$/.test(rid)) {
        const rand = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID().replace(/-/g, '')
          : `${Date.now()}${Math.random().toString(36).slice(2)}`;
        rid = `lr_web_${rand}`.slice(0, 64);
        try { sessionStorage.setItem('diag_lead_ref', rid); } catch {}
      }
      leadRef.current = rid;
    } catch { /* brak URL/storage API = zostajemy w diagnostic bez atrybucji */ }
    // Tryb rozstrzygniety -> render wlasciwego ekranu; pierwsze eventy lejka PO registerContext (P1-1).
    queueMicrotask(() => {
      if (m === 'fast_fit') setMode('fast_fit');
      setModeResolved(true);
    });
    trackDiag('diag_intro_viewed');
    if (m === 'fast_fit') trackDiag('fast_fit_intro_viewed');
  }, []);

  const handleComplete = (raw: RawAnswers) => {
    if (completionHandledRef.current) return;
    completionHandledRef.current = true;
    setAnswers(raw);
    setPhase('teaser');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });

    // Jeden komplet liczb dla powiadomienia i reframe (te same wagi FD co w teaser branch).
    const D = answersToFD(raw);
    const catScores = [
      { label: 'Sen', pct: Math.max(100 - Math.round(((D.sleepQ + D.screenBed) / 6 + (7.5 - Math.min(D.sleep, 7.5)) / 1.5) * 55), 5) },
      { label: 'Stres', pct: Math.max(100 - Math.round(((D.stress + D.energy + (D.workHours > 9 ? 1 : 0)) / 7) * 100), 5) },
      { label: 'Żywienie', pct: Math.max(100 - Math.round((D.binge / 4) * 70 + (D.veggies + D.protein) * 7), 5) },
      { label: 'Weekend', pct: Math.max(100 - Math.round((D.drinks / 12) * 40 + D.wknd * 10 + D.mondayFeel * 8 + (D.subs > 0 ? 25 : 0)), 5) },
      { label: 'Trening', pct: Math.max(100 - Math.round(((D.miss * 1.5 + (D.trainHappy >= 1 && D.trainHappy <= 2 ? 1 : 0)) / 4) * 100), 5) },
      { label: 'Głowa', pct: Math.max(100 - Math.round((tagScoreWeighted(D.tags) / 10) * 60 + D.defer * 8 + D.dopamine * 6 + (D.triedBefore >= 2 ? 10 : 0)), 5) },
    ];
    const worstCat = [...catScores].sort((a, b) => a.pct - b.pct)[0]?.label || 'Sen';
    const sc = score(D);
    const C = costs(D);
    const q = qualify(raw);
    // severity_band = WYŁĄCZNIE diagnostyka (nie sales temperature). Neutralne nazwy, oddzielone od intencji.
    const severityBand = sc >= 40 ? 'high' : sc >= 20 ? 'moderate' : 'low';

    // diag-setter-rc-001 / scope #8 (privacy): NIE identyfikujemy sesji po handlu IG w product analytics (PostHog).
    // IG to PII — trafia wyłącznie do Michała przez /api/lead-notify (Telegram/CRM), nie do analityki produktu.
    // Funnel zostaje anonimowy (device-level); score/priority_lead nie są wiązane z realnym @handle w PostHog.
    // diag_complete = FLOW REALNIE SKONCZONY: po setPhase('teaser') (commit do renderu wyniku) i udanym
    // policzeniu wyniku. NIE przed. Gdyby computacja rzucila, ten event by nie poszedl. Bez PII, tylko metryki.
    // P0-3: product analytics dostaje TYLKO neutralne, nie-PII pola. Zero sales temperature, zero priority_lead, zero raw answers.
    trackDiag('diag_complete', { score: sc, severity_band: severityBand, worstCat, has_ig: typeof raw.instagram === 'string' && raw.instagram.length > 0 });
    trackDiag('diag_result_viewed', { score: sc, severity_band: severityBand, worstCat });

    const painText = typeof raw.user_pain === 'string' ? raw.user_pain.trim() : '';
    const leadBrief = buildLeadBrief(raw); // pelny brief + 3 pola wolnego tekstu do personalizacji
    const rawImie = raw.imie ?? raw.name;
    // Werdykt 3-tier do Telegrama = TYLKO ciezkosc/potrzeba z domen (P0-2: intencja zakupu NIE podnosi diagnozy).
    const tgRedCount = catScores.filter((c) => c.pct < 45).length;
    const tgTier: 'A' | 'B' | 'C' = tgRedCount >= 3 ? 'C' : tgRedCount <= 1 ? 'A' : 'B';
    // PREMIUM ICP PATCH V1: sygnaly fit z trzech pytan o wartosci 0. Kanal prywatny, zero wplywu na wynik.
    const premium = classifyPremiumFit(raw as Record<string, unknown>);

    // ── Powiadomienie leada na Telegram: ZAWSZE, gdy ktoś skończył quiz (Michał chce wiedzieć od razu) ──
    void fetch('/api/lead-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: sc,
        severity_band: severityBand.toUpperCase(),
        worstCat,
        archetyp: pickArchetype(D, worstCat).label,
        archetypKey: pickArchetype(D, worstCat).key,
        godzina: hourRange(D),
        kwota: C.total,
        followup_priority: q.followupPriority,
        wants_help: q.wantsHelp,
        lead_ref: leadRef.current || undefined, // P1-3: tylko prywatny kanał (Telegram/n8n->Notion). NIGDY do PostHog.
        intencja: q.intent,
        kiedy_start: q.startWhen,
        pain: painText,
        imie: typeof rawImie === 'string' ? rawImie : '',
        instagram: typeof raw.instagram === 'string' ? raw.instagram.replace(/^@?/, '@') : '',
        objawy: Array.isArray(raw.symptoms_chips) ? (raw.symptoms_chips as string[]).join(',') : '',
        triedBefore: D.triedBefore,
        drinks: D.drinks,
        primary_goal: typeof raw.primary_goal === 'string' ? raw.primary_goal : '',
        give_up_point: typeof raw.give_up_point === 'string' ? raw.give_up_point : '',
        tier: tgTier,
        // PREMIUM ICP PATCH V1 §3/§4 — surowe odpowiedzi + wyliczony fit. Telegram i n8n->Notion, NIGDY PostHog.
        work_load: typeof raw.work_load === 'string' ? raw.work_load : '',
        spillover: Array.isArray(raw.spillover) ? (raw.spillover as string[]).join(',') : '',
        agency_mode: typeof raw.agency_mode === 'string' ? raw.agency_mode : '',
        premium_fit: premium.fit,
        premium_signals: premium,
        raw_answers: raw,
        diagnostyka_brief: leadBrief.brief,
        derived_signals: {
          score: sc,
          severity_band: severityBand,
          worstCat,
          archetyp: pickArchetype(D, worstCat).label,
          archetypKey: pickArchetype(D, worstCat).key,
          followup_priority: q.followupPriority,
          wants_help: q.wantsHelp,
          intencja: q.intent,
          kiedy_start: q.startWhen,
          primary_goal: typeof raw.primary_goal === 'string' ? raw.primary_goal : '',
          give_up_point: typeof raw.give_up_point === 'string' ? raw.give_up_point : '',
          tier: tgTier,
          premium_fit: premium.fit,
          agency: premium.agency,
          control_need: premium.controlNeed,
          responsibility: premium.responsibility,
          stakes: premium.stakes,
        },
      }),
    }).catch(() => {});
  };

  // ── P1-2: dopoki tryb nie rozstrzygniety, neutralny shell (zero flash diagnostyki na ?mode=fast_fit) ──
  // Renderowany na 1. paint (SSR + hydration) az useEffect ustali mode. Zero diagnostycznego H1/CTA.
  if (phase === 'intro' && !modeResolved) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }} aria-hidden="true">
        <Atmosphere />
        <div style={{ width: 34, height: 34, borderRadius: '50%', border: `2px solid ${GOLD}`, borderTopColor: 'transparent', animation: 'dxspin 0.7s linear infinite', position: 'relative', zIndex: 1 }} />
        <style>{`@keyframes dxspin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){[aria-hidden] div{animation:none!important}}`}</style>
      </div>
    );
  }

  // ── P1-1 FAST FIT: tylko dla jawnego ready-to-buy (?mode=fast_fit). Zero forsowania 19 ekranow. ──
  // Ready-to-buy dostaje jasna sciezke do prowadzenia; kto woli, przechodzi do pelnej diagnostyki (never downgrade intent).
  if (phase === 'intro' && mode === 'fast_fit') {
    // V4: ready-to-buy nie musi pisać pierwszy. Główna akcja prowadzi do zakresu/prowadzenia.
    const fastLaneNabor = 'https://nabor.talerzihantle.com/?from=diag&mode=fast_fit#prowadzenie';
    return (
      <div style={{ minHeight: '100vh', background: BG, color: '#ece7db', fontFamily: '"Inter", sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 22px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
        <Atmosphere />
        <div style={{ maxWidth: 480, margin: '0 auto', alignSelf: 'stretch', position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: GOLD, fontWeight: 700, marginBottom: 22 }}>
            Diagnostyka 168 · szybka ścieżka
          </div>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 'clamp(30px, 7.5vw, 48px)', lineHeight: 1.08, fontWeight: 400, color: '#fff', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            Wiesz już, że chcesz działać. Sprawdźmy tylko, czy zakres pasuje.
          </h1>
          <p style={{ fontSize: 16.5, color: '#c4bdb0', lineHeight: 1.65, margin: '0 0 26px' }}>
            Zobacz zakres, sposób pracy i warunki. Jeśli to pasuje, ja mam już kontekst wejścia i nie musisz pisać pierwszej wiadomości.
          </p>
          <a
            href={fastLaneNabor}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackDiag('fast_fit_to_nabor')}
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none', width: '100%', padding: '17px', borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD}, #8a7535)`, color: BG, fontWeight: 800, fontSize: 16, letterSpacing: 0.5, boxSizing: 'border-box' }}
          >
            Sprawdźmy, czy zakres pasuje &rarr;
          </a>
          <button
            onClick={() => { registerContext({ mode: 'diagnostic' }); trackDiag('fast_fit_to_diagnostic'); setMode('diagnostic'); if (typeof window !== 'undefined') window.scrollTo({ top: 0 }); }}
            style={{ marginTop: 14, width: '100%', padding: '13px', background: 'transparent', color: '#8f887c', fontSize: 14, border: '1px solid #26262b', borderRadius: 12, cursor: 'pointer', letterSpacing: 0.3 }}
          >
            Chcę najpierw przejść pełną diagnostykę
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div style={{ minHeight: '100svh', background: BG, color: '#ece7db', fontFamily: '"Inter", sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '28px 22px max(28px, env(safe-area-inset-bottom))', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
        <Atmosphere />
        <div style={{ maxWidth: 480, margin: '0 auto', alignSelf: 'stretch', position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10.2, letterSpacing: 2.6, textTransform: 'uppercase', color: GOLD, fontWeight: 800, marginBottom: 14 }}>
            Diagnostyka 168 · 5 min · wynik od razu
          </div>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 'clamp(35px, 9.1vw, 58px)', lineHeight: 1.0, fontWeight: 400, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.02em', maxWidth: '100%', overflowWrap: 'break-word' }}>
            W poniedziałek ogarniasz. W piątek patrzysz na tydzień i myślisz: <em style={{ color: '#e8cc80', fontStyle: 'italic' }}>„kurwa, znowu to samo”.</em>
          </h1>
          <p style={{ fontSize: 15.8, color: '#c4bdb0', lineHeight: 1.55, margin: '0 0 16px', maxWidth: 438 }}>
            Przejdziesz przez robotę, jedzenie, sen, trening i weekend. Na końcu zobaczysz <strong style={{ color: '#ece7db', fontWeight: 750 }}>gdzie dziś tracisz najwięcej, co ma największy zapas i który jeden ruch warto sprawdzić najpierw.</strong>
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 7, margin: '0 0 17px', width: '100%' }}>
            {['GDZIE TRACISZ', 'NAJWIĘKSZY ZAPAS', 'PIERWSZY RUCH 72H'].map((label, i) => (
              <div key={label} style={{ minWidth: 0, padding: '9px 6px', border: '1px solid #29272a', borderRadius: 10, background: 'rgba(255,255,255,.018)', textAlign: 'center' }}>
                <span style={{ display: 'block', fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 7.1, letterSpacing: .62, color: i === 1 ? GOLD : '#8f887c', lineHeight: 1.35, overflowWrap: 'anywhere' }}>{label}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              registerContext({ mode: 'diagnostic' });
              trackDiag('entry_route_selected', { route: 'diagnostic' });
              trackDiag('diag_start');
              setPhase('intake');
              if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
            }}
            style={{ width: '100%', padding: '18px 17px', borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD}, #8a7535)`, color: BG, fontWeight: 850, fontSize: 16, letterSpacing: 0.15, boxShadow: '0 16px 38px rgba(200,168,78,.18)' }}
          >
            Pokaż mi, co ruszyć najpierw &rarr;
          </button>
          <p style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 9.8, letterSpacing: 1.15, color: '#777169', lineHeight: 1.45, margin: '11px 0 0', textAlign: 'center', textTransform: 'uppercase' }}>
            5 min · bez maila · wynik od razu
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'intake') {
    return <SingleQuestionFlow onComplete={handleComplete} />;
  }

  if (phase === 'teaser' && answers) {
    // ── Wynik przed mailem: bogata Karta Tygodnia z istniejacego silnika (FD -> score/costs/archetyp) ──
    const D = answersToFD(answers);
    // najslabsza kategoria (worstCat) liczona z FD tak samo jak w page.tsx (v1), zeby dobrac archetyp i szablon tygodnia
    const catScores = [
      { label: 'Sen', pct: Math.max(100 - Math.round(((D.sleepQ + D.screenBed) / 6 + (7.5 - Math.min(D.sleep, 7.5)) / 1.5) * 55), 5) },
      { label: 'Stres', pct: Math.max(100 - Math.round(((D.stress + D.energy + (D.workHours > 9 ? 1 : 0)) / 7) * 100), 5) },
      { label: 'Żywienie', pct: Math.max(100 - Math.round((D.binge / 4) * 70 + (D.veggies + D.protein) * 7), 5) },
      { label: 'Weekend', pct: Math.max(100 - Math.round((D.drinks / 12) * 40 + D.wknd * 10 + D.mondayFeel * 8 + (D.subs > 0 ? 25 : 0)), 5) },
      { label: 'Trening', pct: Math.max(100 - Math.round(((D.miss * 1.5 + (D.trainHappy >= 1 && D.trainHappy <= 2 ? 1 : 0)) / 4) * 100), 5) },
      { label: 'Głowa', pct: Math.max(100 - Math.round((tagScoreWeighted(D.tags) / 10) * 60 + D.defer * 8 + D.dopamine * 6 + (D.triedBefore >= 2 ? 10 : 0)), 5) },
    ];
    // deterministic tie-break przy remisie pct: stala kolejnosc domen (zero losowosci, zero undefined/NaN)
    const DOMAIN_TIE = ['Sen', 'Stres', 'Żywienie', 'Weekend', 'Trening', 'Głowa'];
    const sortedDom = [...catScores].sort((a, b) => (a.pct - b.pct) || (DOMAIN_TIE.indexOf(a.label) - DOMAIN_TIE.indexOf(b.label)));
    const worstW = sortedDom[0]?.label || 'Sen';
    const arch = pickArchetype(D, worstW);

    // ── MAPA STATUSU: 5 osi, KAZDA liczona TYLKO z realnie zbieranych odpowiedzi (zero domyslnych
    //    stalych ze starego quizu). Severity 0-100 -> indeks w uczciwym pasmie 24-90 (bez 0/100,
    //    ktore wygladaja na scieme). Wyzszy = lepiej. Labele nie obiecuja pomiaru, ktorego nie robimy. ──
    const T = new Set<string>(Array.from(D.tags));
    const cnt = (cs: string[]) => cs.filter((c) => T.has(c)).length;
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
    const idx = (sev: number) => Math.round(24 + (1 - clamp01(sev / 100)) * 66); // sev0->90, sev100->24
    // istotnosc godziny pekniecia dnia dla snu: rano/wieczor najmocniej, indeks = D.breakWindow (0-6)
    const bwSleep = [1, 0.2, 0.3, 0.4, 0.8, 0.3, 0.5][D.breakWindow] ?? 0.5;
    const senSev = (0.40 * (D.sleepQ / 3) + 0.20 * bwSleep + 0.20 * (D.lost / 4) + 0.20 * (D.mondayFeel / 3)) * 100;
    const napedSev = (0.68 * (cnt(['libido', 'motivation', 'confidence', 'recovery']) / 4) + 0.32 * (D.lost / 4)) * 100;
    const trainSev = D.plan >= 1 ? D.miss / D.plan : 0.85; // nie trenuje wcale = wysoki deficyt
    const formaSev = (0.50 * trainSev + 0.35 * (D.binge / 4) + 0.15 * (T.has('belly') ? 1 : 0)) * 100;
    const wkndSev = (0.55 * (D.wknd / 4) + 0.45 * (D.mondayFeel / 3)) * 100;
    const glowaSev = (0.40 * (D.stress / 3) + 0.25 * (D.lost / 4) + 0.20 * (cnt(['focus', 'anxiety', 'fatigue']) / 3) + 0.15 * (D.triedBefore / 3)) * 100;
    // suwak godzin ma krok 0.5, wiec surowa liczba wchodzi do polskiego zdania jako "0.5 h"
    const hoursPl = (h: number) => String(h).replace('.', ',');
    const sleepReason = ['rano zwykle wstajesz gotowy', 'gotowy rano 3-4 dni w tygodniu', 'gotowy rano tylko 1-2 dni', 'rano prawie nigdy nie czujesz się gotowy'][D.sleepQ] || 'poranki są nierówne';
    const stressReason = ['głowa zwykle odpuszcza wieczorem', '2-3 wieczory w tygodniu głowa zostaje w robocie', '4-5 wieczorów w tygodniu głowa zostaje w robocie', 'praktycznie codziennie zasypiasz z listą w głowie'][D.stress] || `${hoursPl(D.lost)} h dziennie lecisz na pół mocy`;
    const weekendReason = ['weekend zwykle trzyma rytm', 'mniej więcej raz w miesiącu coś się sypie', '2-3 weekendy w miesiącu psują rytm', 'prawie każdy weekend psuje rytm', 'prawie każdy weekend psuje rytm'][D.wknd] || 'weekend bywa niestabilny';
    const driveLabels = [['libido','libido'],['motivation','motywacja'],['confidence','pewność siebie'],['recovery','regeneracja']].filter(([id]) => T.has(id)).map(([,label]) => label);
    // godziny na pol mocy naleza do osi glowy i stresu. Podstawione tutaj tlumaczyly WYSOKI wynik napedu
    // negatywnym faktem, wiec dowod przeczyl ocenie tuz obok niego.
    // Sam objaw tez tego nie zamykal. "zaznaczyles: motywacja" pod etykieta TRZYMA SIE DZIS NAJLEPIEJ
    // czytalo sie jak zaprzeczenie, bo goly objaw brzmi jak zarzut niezaleznie od tego, jak wypadla os.
    // Liczba zaznaczonych sygnalow wobec czterech mozliwych tlumaczy oba konce skali tym samym zdaniem:
    // jeden z czterech uzasadnia wysoki wynik, trzy z czterech uzasadniaja niski. Zrodlo zostaje w tej osi.
    const DRIVE_COUNT_PL = ['', 'jeden', 'dwa', 'trzy', 'cztery'];
    const driveReason = driveLabels.length ? `zaznaczyłeś tu ${DRIVE_COUNT_PL[driveLabels.length]} z czterech sygnałów: ${driveLabels.join(', ')}` : 'nie zaznaczyłeś tu żadnego z czterech sygnałów';
    // plan < 1 to najmocniejszy pojedynczy składnik formaSev (trainSev 0.85). Bez tej gałęzi oś schodzi w dół,
    // a podpis mówi userowi, że trening trzyma rytm. Podpis ma zawsze zgadzać się z jego własną odpowiedzią.
    const formReason = D.plan < 1 ? 'w zwykłym tygodniu nie planujesz treningów'
      : D.miss >= D.plan ? (D.plan === 1 ? 'w cięższym tygodniu wypada ten jeden trening, który planujesz' : `w cięższym tygodniu wypadają wszystkie ${D.plan} zaplanowane treningi`)
      : D.miss > 0 ? `w cięższym tygodniu wypada ${D.miss} z ${D.plan} treningów`
      : (D.binge >= 2 ? 'wieczorne jedzenie regularnie wychodzi poza plan' : 'trening i wieczorne jedzenie zwykle trzymają rytm');
    const statuses = [
      { label: 'Forma', score: idx(formaSev), reason: formReason },
      { label: 'Sen i regeneracja', score: idx(senSev), reason: sleepReason },
      { label: 'Napęd i libido', score: idx(napedSev), reason: driveReason },
      { label: 'Głowa i stres', score: idx(glowaSev), reason: stressReason },
      { label: 'Weekend i rytm', score: idx(wkndSev), reason: weekendReason },
    ];
    const rawImie = answers.imie ?? answers.name;
    const imie = typeof rawImie === 'string' ? rawImie : '';
    // #1 handoff: niesie kontekst diagnozy do nabora w URL (nabor personalizuje sie po ?from=diagnoza).
    // Same-tab (#2) + parametry = ciaglosc lejka, zero przepisywania danych przez usera.
    const igClean = typeof answers.instagram === 'string' ? answers.instagram.replace(/^@?/, '') : '';
    // URL naboru (Beat 8 End Experience): ZERO PII — tylko routing/analytics. IG/score/kwota NIE lecą.
    // Bez kotwicy. Na zywej stronie naboru (candidate-20260915) nie ma id="prowadzenie", wiec #prowadzenie
    // bylo martwym fragmentem. Czlowiek ma wejsc od gory strony oferty i sam dojsc do formularza.
    // sub = anonimowy identyfikator wypelnienia diagnostyki (ten sam, ktory idzie w shareSafe). Nie jest
    // PII i niczego o czlowieku nie zdradza, a pozwala Michalowi zlaczyc zgloszenie z formularza naboru
    // z konkretna diagnoza zamiast zgadywac po dacie.
    const submissionRef = typeof window !== 'undefined' ? (localStorage.getItem('diagnostyka_v2_submission_id') || '') : '';
    const naborUrl = `https://nabor.talerzihantle.com/?${new URLSearchParams({ from: 'diag', arch: arch.key, intent: typeof answers.intent === 'string' ? answers.intent : '', v: ASSESSMENT_VERSION, ...(submissionRef ? { sub: submissionRef } : {}) }).toString()}`;
    // Werdykt 3-tier (nieuzywany bezposrednio w V3 result-router, zostawiony dla kompatybilnosci z redCount): WYLACZNIE ciezkosc/potrzeba z liczby domen "na czerwono".
    const redCount = statuses.filter((st) => st.score < 45).length;
    const LEAK_LABEL: Record<string, string> = { Sen: 'sen', Stres: 'głowa wieczorem', 'Żywienie': 'wieczory', Weekend: 'weekend', Trening: 'wykonanie', 'Głowa': 'głowa wieczorem' };
    const leakLabel = LEAK_LABEL[worstW] || 'jeden dzień';
    // ── RESULT PAGE V3 (frozen spec 2026-09-08): Beat 1-4 z fracture-engine, Beat 5 z deterministycznego
    //    bank-selectora (zero LLM), Beat 6 router z result-router-v3 (severity NIGDY nie zmienia trasy). ──
    const breakIdStr = typeof answers.break_window === 'string' ? answers.break_window : '';
    const intentStr = typeof answers.intent === 'string' ? answers.intent : '';
    const startWhenStr = typeof answers.start_when === 'string' ? answers.start_when : '';
    const evidenceReceipts = computeEvidenceReceipts(answers);
    const selectorInput: SelectorInput = {
      breakId: breakIdStr,
      giveUpPoint: typeof answers.give_up_point === 'string' ? answers.give_up_point : '',
      eveningEating: typeof answers.evening_eating === 'string' ? answers.evening_eating : '',
      takeoutCost: typeof answers.takeout_cost === 'number' ? answers.takeout_cost : undefined,
      stressLevel: typeof answers.stress_level === 'string' ? answers.stress_level : '',
      halfPowerHours: typeof answers.half_power_hours === 'number' ? answers.half_power_hours : undefined,
      plannedTrainings: typeof answers.planned_trainings === 'number' ? answers.planned_trainings : undefined,
      missedTrainings: typeof answers.missed_trainings === 'number' ? answers.missed_trainings : undefined,
      weekendPattern: typeof answers.weekend_pattern === 'string' ? answers.weekend_pattern : '',
      mondayRecovery: typeof answers.monday_recovery === 'string' ? answers.monday_recovery : '',
      triedBefore: typeof answers.tried_before === 'string' ? answers.tried_before : '',
    };
    const { experiment: pickedExperiment, confidence } = selectExperiment(selectorInput);
    const loop = computeLoop(BREAK_PHRASE[breakIdStr] || 'Odpowiedzi nie wskazują jednego stałego momentu. Wzorzec zmienia się zależnie od dnia.', evidenceReceipts, answers, confidence);
    const whyRepeats = computeWhyRepeats(answers);
    const costFacts = computeCostFacts(answers);
    const route = routeDecision(intentStr, startWhenStr);
    // LUSTRO (v2.9): samoocena z ekranu 2 obok energii policzonej z zachowan. Zero wplywu na
    // severity, archetyp i trase. Gdy brak samooceny albo za malo skladowych, sekcja znika.
    const awareness = computeAwarenessGap(answers);
    // CONTENT SIGNALS: anonimowe kategorie do uczenia contentu. Bez PII, treści otwartych, symptomów, używek, libido.
    const contentSignals: Record<string, string | boolean> = {
      break_window: breakIdStr || 'unknown',
      give_up_point: typeof answers.give_up_point === 'string' ? answers.give_up_point : 'unknown',
      weekend_pattern: typeof answers.weekend_pattern === 'string' ? answers.weekend_pattern : 'unknown',
      tried_before: typeof answers.tried_before === 'string' ? answers.tried_before : 'unknown',
      // v2.9: dwa nowe sygnaly do contentu. stagnation_12m mowi, czy cialo w ogole ruszylo,
      // gap_verdict mowi, czy czlowiek widzi u siebie to, co widac w jego odpowiedziach.
      // Samooceny libido tu NIE ma i miec nie bedzie, tak samo jak objawow i uzywek.
      stagnation_12m: typeof answers.stagnation_12m === 'string' ? answers.stagnation_12m : 'unknown',
      gap_verdict: awareness.verdict,
      intent: intentStr || 'unknown',
      start_when: startWhenStr || 'unknown',
      archetype: arch.key,
      experiment_id: pickedExperiment.id,
      experiment_confidence: confidence,
      route_primary: route.primary,
      has_pain_text: typeof answers.user_pain === 'string' && answers.user_pain.trim().length > 0,
      has_trigger_text: typeof answers.user_trigger === 'string' && answers.user_trigger.trim().length > 0,
    };
    const submissionIdStr = submissionRef;
    const userPainSafe = typeof answers.user_pain === 'string' && answers.user_pain.trim() ? answers.user_pain.trim() : undefined;
    return (
      <ResultExperience
        archLabel={arch.label}
        archKey={arch.key}
        redCount={redCount}
        breakId={breakIdStr}
        domainLabel={leakLabel}
        statuses={statuses}
        evidenceReceipts={evidenceReceipts}
        loop={loop}
        whyRepeats={whyRepeats}
        costFacts={costFacts}
        userPain={userPainSafe}
        experiment={pickedExperiment}
        experimentConfidence={confidence}
        route={route}
        imie={imie}
        instagram={igClean}
        naborHref={naborUrl}
        submissionId={submissionIdStr}
        contentSignals={contentSignals}
        awareness={awareness}
      />
    );
  }

  return null;
}
