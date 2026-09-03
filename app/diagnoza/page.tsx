'use client';

// /diagnoza, żywy flow Diagnostyki V2.
// intro -> intake (1 pytanie/ekran) -> teaser (Karta Tygodnia, koniec). Lead leci na Telegram w handleComplete.
// Mail wycięty (backend Faza 4 niepodłączony, nie kłamiemy). Stare "/" (v1) nietknięte.

import { useState, useEffect, useRef } from 'react';
import { track, trackDiag, registerContext } from '../lib/analytics';
import SingleQuestionFlow from '../components/SingleQuestionFlow';
import WeekPage from '../components/WeekPage';
import { type RawAnswers } from '../lib/scoring-engine';
import { answersToFD } from '../lib/answers-to-fd';
import { score, costs, pickArchetype, tagScoreWeighted, hourRange, patternStrength } from '../lib/diagnostic-core';
import { buildWeekPlan } from '../lib/week-plan';
import ResultExperience from '../components/ResultExperience';
import { packFor, silnikExperiment, silnikBeat4, silnikEndLine } from '../lib/result-content';
import { ASSESSMENT_VERSION } from '../lib/assessment-config';
import { buildLeadBrief } from '../lib/lead-brief';
import { Atmosphere } from './atmosphere';

const GOLD = '#c8a84e';
const BG = '#08080a';

// ── ŻYWY INSTRUMENT (intro): rytm 7 dni, jeden dzień świeci na czerwono z pytajnikiem.
// Ten sam sygnał, który user dostaje w wyniku (krzywa TU PĘKA). Deterministyczny, zero danych.
function WeekPulse() {
  const ys = [62, 68, 58, 66, 60, 67, 61]; // neutralny puls — zaden dzien nie wyrozniony (nie sugeruj dnia przed odpowiedzia usera)
  const xAt = (i: number) => 26 + (408 * i) / 6;
  const pts = ys.map((y, i) => ({ x: xAt(i), y }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y}`;
  }
  const days = ['PON', 'WT', 'ŚR', 'CZW', 'PT', 'SOB', 'NDZ'];
  return (
    <div className="wpulse" style={{ maxWidth: 440, margin: '0 auto 30px' }}>
      <style>{`
        .wpu-line { stroke-dasharray: 1; stroke-dashoffset: 1; }
        @keyframes wpuDraw { to { stroke-dashoffset: 0; } }
        @keyframes wpuHot { 0%,100% { r: 5.5; opacity: 1; } 50% { r: 7; opacity: .72; } }
        @keyframes wpuRing { 0% { r: 6; opacity: .55; } 70% { r: 18; opacity: 0; } 100% { opacity: 0; } }
        @keyframes wpuQ { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: no-preference) {
          .wpu-line { animation: wpuDraw 1.8s .3s cubic-bezier(.4,0,.2,1) forwards; }
          .wpu-hot { animation: wpuHot 2.2s 1.4s ease-in-out infinite; }
          .wpu-ring { animation: wpuRing 2.2s 1.4s ease-out infinite; }
          .wpu-q { animation: wpuQ 2.2s 1.4s ease-in-out infinite; }
        }
      `}</style>
      <svg viewBox="0 0 460 120" width="100%" role="img" aria-label="rytm tygodnia" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="wpuGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8a7535" />
            <stop offset="50%" stopColor="#e8cc80" />
            <stop offset="100%" stopColor="#8a7535" />
          </linearGradient>
          <filter id="wpuGlow" x="-40%" y="-80%" width="180%" height="260%">
            <feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <line x1="26" x2="434" y1="98" y2="98" stroke="#26262b" strokeWidth="1" strokeDasharray="2 6" />
        <path d={d} fill="none" stroke="url(#wpuGrad)" strokeWidth="2.5" strokeLinecap="round" filter="url(#wpuGlow)" pathLength={1} className="wpu-line" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill="#08080a" stroke="#8f887c" strokeWidth={1.5} />
            <text x={p.x} y={116} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#5a5a60" fontWeight={500}>{days[i]}</text>
          </g>
        ))}
      </svg>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#8f887c', textAlign: 'center', marginTop: 8 }}>
        twój tydzień gdzieś tu pęka
      </div>
    </div>
  );
}

type Phase = 'intro' | 'intake' | 'teaser';

// Reframe z wlasnych slow usera (LLM /api/diagnoza). Ksztalt zgodny z json.reframe
// z route.ts oraz z opcjonalnym polem `reframe` w WeekPlanInput (week-plan.ts).
interface ReframeData {
  cytat?: string;
  falszywe_zalozenie?: string;
  mechanizm?: string;
  kolejnosc?: string[];
  pulapka?: string;
  // ── warstwa mostu (sekcja VII), pisana z realnych odpowiedzi leada ──
  slaby_punkt?: string;   // slaby punkt jego jezykiem (frazy)
  zaproszenie?: string;   // osobista linia "Ode mnie, na koniec"
  most_intro?: string;    // akapit pod zaproszeniem (zastepuje generyk)
}

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
  // Reframe personalizujacy Karte Tygodnia. Dochodzi w tle po LLM, re-renderuje teaser.
  const [reframe, setReframe] = useState<ReframeData | null>(null);
  // Async reveal: status personalizacji dolu Karty (VI). 'off' brak wolnego tekstu, 'pending' LLM leci
  // (shimmer „dopisuje pod Twoje slowa"), 'ready' wszedl, 'failed' timeout/blad (blok odczytu sie chowa,
  // reszta dolu stoi deterministycznie). Gora (I, III) jest zawsze deterministyczna, nie zalezy od tego.
  const [reframeStatus, setReframeStatus] = useState<'off' | 'pending' | 'ready' | 'failed'>('off');
  // P1-1: tryb wejscia. 'diagnostic' = domyslny (cold/warm, pelny flow). 'fast_fit' = tylko dla jawnego
  // ready-to-buy z ?mode=fast_fit (setter/DM), zeby NIE wpychac gotowego leada w 19 ekranow diagnozy.
  const [mode, setMode] = useState<'diagnostic' | 'fast_fit'>('diagnostic');
  // P1-3: opaque lead_ref/rid od settera. TYLKO do prywatnego payloadu leada (Telegram/CRM). NIGDY do PostHog ani do copy wyniku.
  const leadRef = useRef<string>('');

  // Wejscie na strone diagnostyki (pierwszy ekran). Lejek: intro_view -> started -> step_view... -> completed.
  // Tryb + atrybucja settera czytane z URL. Cold/direct traffic bez parametrow zostaje w diagnostic. Zero PII.
  useEffect(() => {
    trackDiag('diag_intro_viewed');
    try {
      const sp = new URLSearchParams(window.location.search);
      const m = sp.get('mode');
      if (m === 'fast_fit') { setMode('fast_fit'); trackDiag('fast_fit_intro_viewed'); }
      // P1-1: atrybucja settera — whitelist + walidacja, WYŁĄCZNIE do analytics (nigdy do scoringu/wyniku/fast-fit).
      const pick = (k: string, allow: string[]): string | undefined => {
        const v = (sp.get(k) || '').toLowerCase();
        return allow.includes(v) ? v : undefined;
      };
      const ctx: Record<string, string> = { mode: m === 'fast_fit' ? 'fast_fit' : 'diagnostic' };
      const src = pick('src', ['setter', 'organic', 'story', 'dm', 'other']);
      const lane = pick('lane', ['cold', 'warm', 'hot']); // ATRYBUCJA ONLY — nie miesza sie z diagnostycznym severity
      const campaignRaw = (sp.get('campaign') || '').toLowerCase().slice(0, 40);
      const campaign = /^[a-z0-9_-]+$/.test(campaignRaw) ? campaignRaw : undefined;
      if (src) ctx.src = src;
      if (lane) ctx.lane = lane;
      if (campaign) ctx.campaign = campaign;
      registerContext(ctx);
      // P1-3: opaque lead_ref/rid — strict token, bez @/kropek/spacji (nie moze byc handlem/mailem). Zero PII.
      const rid = (sp.get('rid') || sp.get('lead_ref') || '').trim();
      if (/^[A-Za-z0-9_-]{6,64}$/.test(rid)) leadRef.current = rid;
    } catch { /* brak URL API = zostajemy w diagnostic bez atrybucji */ }
  }, []);

  const handleComplete = (raw: RawAnswers) => {
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
      }),
    }).catch(() => {});

    // ── Reframe z wlasnych slow usera (LLM), gdy cokolwiek napisal. Karmimy CALY brief (wszystkie
    //    odpowiedzi), nie jedno zdanie. Fire-and-forget, Karta stoi bez niego (fallback deterministyczny). ──
    if (leadBrief.hasFreeText) {
      setReframeStatus('pending');
      // Timeout async reveal: shimmer nie wisi w nieskonczonosc. Po 10s odslon deterministyczny dol
      // (blok odczytu sie chowa). Jak LLM dojdzie pozniej, i tak podmieni (setReframe leci niezaleznie).
      // 10s = gorna granica z handoffa; latwe do strojenia, jak zmierzysz realny czas odpowiedzi.
      window.setTimeout(() => setReframeStatus((s) => (s === 'ready' ? s : 'failed')), 10000);
      void (async () => {
        try {
          const res = await fetch('/api/diagnoza', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brief: leadBrief.brief,
              pain: leadBrief.pain,
              trigger: leadBrief.trigger,
              selfDx: leadBrief.selfDx,
              worstCat, severity_band: severityBand, age: D.age, triedBefore: D.triedBefore,
            }),
          });
          const json = await res.json();
          if (json?.ok && json.reframe) {
            setReframe(json.reframe as ReframeData);
            setReframeStatus('ready');
            // #17: wiemy, czy reframe z wlasnych slow usera realnie sie pokazal (wartosc Karty)
            trackDiag('reframe_shown', { worstCat, severity_band: severityBand });
          } else {
            setReframeStatus((s) => (s === 'ready' ? s : 'failed'));
          }
        } catch {
          // bez reframe dol Karty stoi deterministycznie, blok odczytu sie chowa
          setReframeStatus((s) => (s === 'ready' ? s : 'failed'));
        }
      })();
    }
  };

  // ── P1-1 FAST FIT: tylko dla jawnego ready-to-buy (?mode=fast_fit). Zero forsowania 19 ekranow. ──
  // Ready-to-buy dostaje jasna sciezke do prowadzenia; kto woli, przechodzi do pelnej diagnostyki (never downgrade intent).
  if (phase === 'intro' && mode === 'fast_fit') {
    // P0-2: ready-to-buy NIE wraca na stronę sprzedażową (nabor). Fast lane = bezpośredni DM do Michała z prefillem.
    // Zero PII (handle Michała + generyczny prefill). Brak zweryfikowanego checkout/transaction route -> DM jest bezpiecznym fast lane.
    const fastLaneDm = `https://ig.me/m/hantleitalerz?text=${encodeURIComponent('Jestem zdecydowany, chcę sprawdzić fit/zakres i ruszyć.')}`;
    return (
      <div style={{ minHeight: '100vh', background: BG, color: '#ece7db', fontFamily: '"Inter", sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 22px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
        <Atmosphere />
        <div style={{ maxWidth: 480, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: GOLD, fontWeight: 700, marginBottom: 22 }}>
            Diagnostyka 168 · szybka ścieżka
          </div>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 'clamp(30px, 7.5vw, 48px)', lineHeight: 1.08, fontWeight: 400, color: '#fff', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            Wiesz, że chcesz ruszyć. Nie musisz przechodzić całej diagnostyki.
          </h1>
          <p style={{ fontSize: 16.5, color: '#c4bdb0', lineHeight: 1.65, margin: '0 0 26px' }}>
            To napisz do mnie na priv. Sprawdzimy fit i zakres, i jak pasuje, ruszamy. Bez przechodzenia całej diagnostyki.
          </p>
          <a
            href={fastLaneDm}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackDiag('fast_fit_to_dm')}
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none', width: '100%', padding: '17px', borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD}, #8a7535)`, color: BG, fontWeight: 800, fontSize: 16, letterSpacing: 0.5, boxSizing: 'border-box' }}
          >
            Napisz do mnie i ruszamy &rarr;
          </a>
          <button
            onClick={() => { trackDiag('fast_fit_to_diagnostic'); setMode('diagnostic'); if (typeof window !== 'undefined') window.scrollTo({ top: 0 }); }}
            style={{ marginTop: 14, width: '100%', padding: '13px', background: 'transparent', color: '#8f887c', fontSize: 14, border: '1px solid #26262b', borderRadius: 12, cursor: 'pointer', letterSpacing: 0.3 }}
          >
            Wolę najpierw przejść pełną diagnostykę
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div style={{ minHeight: '100vh', background: BG, color: '#ece7db', fontFamily: '"Inter", sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 22px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
        <Atmosphere />
        <div style={{ maxWidth: 480, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
          <WeekPulse />
          <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: GOLD, fontWeight: 700, marginBottom: 22 }}>
            Diagnostyka 168 · 5-7 min · prywatnie
          </div>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 'clamp(34px, 8vw, 54px)', lineHeight: 1.06, fontWeight: 400, color: '#fff', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            Znajdź moment, od którego reszta tygodnia zaczyna lecieć w dół.
          </h1>
          <p style={{ fontSize: 16.5, color: '#c4bdb0', lineHeight: 1.65, margin: '0 0 22px' }}>
            Odpowiesz na kilka pytań o swój realny tydzień. Na końcu pokażę Ci, gdzie najwcześniej pojawia się wzorzec, który później kosztuje Cię najwięcej, albo że w Twoim tygodniu nie ma jednego takiego punktu. I jeden test do sprawdzenia u siebie.
          </p>
          {/* P1-3: usunięty niezweryfikowany pasek liczb (9 lat / 1200+ / 200+). Kotwica = człowiek + epistemiczna uczciwość. */}
          <div style={{ margin: '0 0 22px', padding: '14px 16px', border: '1px solid #26262b', borderRadius: 12, background: '#141416' }}>
            <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: GOLD, fontWeight: 700, marginBottom: 6 }}>Michał &middot; Human Performance Coach</div>
            <div style={{ fontSize: 13.5, color: '#8f887c', lineHeight: 1.55 }}>Każdy wynik składa się z Twoich odpowiedzi. Gdy danych jest za mało, zobaczysz to wprost zamiast wymyślonej pewności.</div>
          </div>
          <button
            onClick={() => { trackDiag('diag_start'); setPhase('intake'); if (typeof window !== 'undefined') window.scrollTo({ top: 0 }); }}
            style={{ width: '100%', padding: '17px', borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD}, #8a7535)`, color: BG, fontWeight: 800, fontSize: 16, letterSpacing: 0.5 }}
          >
            Znajdź mój Punkt Pęknięcia &rarr;
          </button>
          <p style={{ fontSize: 12.5, color: '#8f887c', lineHeight: 1.55, margin: '16px 2px 0', textAlign: 'center' }}>
            Wynik zobaczysz od razu. @Instagram zostawisz tylko jeśli chcesz, żebym rzucił na niego okiem. Bez telefonu, bez calla.
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
    const SC = score(D);
    const C = costs(D);
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
    // truth gate stanu: gap>=6 = jedna domena realnie wybija sie; inaczej remis (tied) / wszystko zdrowe (neutral)
    const worstGap = (sortedDom[1]?.pct ?? 100) - (sortedDom[0]?.pct ?? 0);
    const worstState: 'clear' | 'tied' | 'neutral' = worstGap >= 6 ? 'clear' : ((sortedDom[0]?.pct ?? 0) >= 62 ? 'neutral' : 'tied');
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
    const napedSev = (0.42 * (D.morningWood / 2) + 0.40 * (cnt(['libido', 'motivation', 'confidence', 'recovery']) / 3) + 0.18 * (D.lost / 4)) * 100;
    const trainSev = D.plan >= 1 ? D.miss / D.plan : 0.85; // nie trenuje wcale = wysoki deficyt
    const formaSev = (0.40 * trainSev + 0.30 * (D.binge / 4) + 0.15 * clamp01(D.junk / 700) + 0.15 * (T.has('belly') ? 1 : 0)) * 100;
    const wkndSev = (0.35 * clamp01(D.drinks / 10) + 0.35 * (D.wknd / 4) + 0.30 * (D.mondayFeel / 3)) * 100;
    const glowaSev = (0.40 * (D.stress / 3) + 0.25 * (D.lost / 4) + 0.20 * (cnt(['focus', 'anxiety', 'fatigue']) / 3) + 0.15 * (D.triedBefore / 3)) * 100;
    const statuses = [
      { label: 'Forma', score: idx(formaSev) },
      { label: 'Sen i regeneracja', score: idx(senSev) },
      { label: 'Napęd i libido', score: idx(napedSev) },
      { label: 'Głowa i stres', score: idx(glowaSev) },
      { label: 'Weekend i rytm', score: idx(wkndSev) },
    ];
    const rawImie = answers.imie ?? answers.name;
    const imie = typeof rawImie === 'string' ? rawImie : '';
    const q = qualify(answers);
    // wantsHelp = TYLKO jawna intencja (bridge/CTA Beat 8). NIE podnosi tieru diagnozy ani żadnego elementu Beat 1-5 (P1-4 rename).
    const wantsHelp = q.wantsHelp;
    // #1 handoff: niesie kontekst diagnozy do nabora w URL (nabor personalizuje sie po ?from=diagnoza).
    // Same-tab (#2) + parametry = ciaglosc lejka, zero przepisywania danych przez usera.
    const igClean = typeof answers.instagram === 'string' ? answers.instagram.replace(/^@?/, '') : '';
    // URL naboru (Beat 8 End Experience): ZERO PII — tylko routing/analytics. IG/score/kwota NIE lecą.
    const naborUrl = `https://nabor.talerzihantle.com/?${new URLSearchParams({ from: 'diag', arch: arch.key, intent: typeof answers.intent === 'string' ? answers.intent : '', v: ASSESSMENT_VERSION }).toString()}#prowadzenie`;
    const wkPlan = buildWeekPlan({
      archetypeKey: arch.key, archetypeLabel: arch.label, archetypeTagline: arch.tagline, mirror: arch.mirror,
      qualified: wantsHelp, // buildWeekPlan input key (bridge-only); wartość = jawna intencja
      worstCat: worstW, breakWindow: D.breakWindow, score: SC, costTotal: C.total, wknd: D.wknd,
      imie, potentialPct: 100 - SC, costMonths: C.stagnationMonths,
      trigger: typeof answers.user_trigger === 'string' ? answers.user_trigger : undefined,
      drinks: D.drinks, screenBed: D.screenBed, junk: D.junk, protein: D.protein,
      sleep: D.sleep, miss: D.miss, binge: D.binge, gym: D.gym,
      reframe: reframe || undefined,
    });
    const pct = Math.max(35, Math.min(Math.round(SC), 78));
    // Werdykt 3-tier: WYŁĄCZNIE ciezkosc/potrzeba z liczby domen "na czerwono". Intencja zakupu NIE podnosi diagnozy (P0-2).
    const redCount = catScores.filter((c) => c.pct < 45).length;
    const tier: 'A' | 'B' | 'C' = redCount >= 3 ? 'C' : redCount <= 1 ? 'A' : 'B';
    const LEAK_LABEL: Record<string, string> = { Sen: 'sen', Stres: 'głowa wieczorem', 'Żywienie': 'wieczory', Weekend: 'weekend', Trening: 'wykonanie', 'Głowa': 'głowa wieczorem' };
    const leakLabel = LEAK_LABEL[worstW] || 'jeden dzień';
    // Beat 3 evidence lines — WYLACZNIE z realnych odpowiedzi (truth gate: bez wsparcia nie renderuj)
    const evidence: string[] = [];
    if (answers.stress_level === 'st_high' || answers.stress_level === 'st_max') evidence.push('Jednym z sygnałów jest napięcie, które zostaje z Tobą po całym dniu.');
    if (typeof answers.half_power_hours === 'number' && answers.half_power_hours >= 2.5) evidence.push('Do tego kilka godzin dziennie na pół mocy pokazuje, że energia zaczyna siadać wcześniej.');
    if (answers.evening_eating === 'ee_binge' || answers.evening_eating === 'ee_uncontrolled' || answers.evening_eating === 'ee_chaos') evidence.push('Wieczorem częściej puszcza też jedzenie.');
    // Beat 5 test: silnik_bez_paliwa izoluje TYLKO najmocniejszy sygnal (worstW); reszta bierze pack.experiment
    const experiment = arch.key === 'silnik_bez_paliwa' ? silnikExperiment(worstW, worstState) : packFor(arch.key).experiment;
    const beat4Teaser = arch.key === 'silnik_bez_paliwa' ? silnikBeat4(worstW, worstState) : undefined;
    const endLineDyn = arch.key === 'silnik_bez_paliwa' ? silnikEndLine(worstW) : undefined;
    return (
      <ResultExperience
        pack={packFor(arch.key)}
        tier={tier}
        archLabel={arch.label}
        archKey={arch.key}
        strength={patternStrength(SC)}
        redCount={redCount}
        breakId={typeof answers.break_window === 'string' ? answers.break_window : ''}
        mondayId={typeof answers.monday_recovery === 'string' ? answers.monday_recovery : ''}
        evidence={evidence}
        experiment={experiment}
        firstMove={beat4Teaser}
        endLine={endLineDyn}
        cytat={reframe?.cytat}
        imie={imie}
        instagram={igClean}
        ctaHref={naborUrl}
        wantsHelp={wantsHelp}
        intent={typeof answers.intent === 'string' ? answers.intent : ''}
      />
    );
  }

  return null;
}
