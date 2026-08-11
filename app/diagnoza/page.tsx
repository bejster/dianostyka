'use client';

// /diagnoza, żywy flow Diagnostyki V2.
// intro -> intake (1 pytanie/ekran) -> teaser (Karta Tygodnia, koniec). Lead leci na Telegram w handleComplete.
// Mail wycięty (backend Faza 4 niepodłączony, nie kłamiemy). Stare "/" (v1) nietknięte.

import { useState, useEffect } from 'react';
import { track, identify } from '../lib/analytics';
import SingleQuestionFlow from '../components/SingleQuestionFlow';
import WeekPage from '../components/WeekPage';
import { type RawAnswers } from '../lib/scoring-engine';
import { answersToFD } from '../lib/answers-to-fd';
import { score, costs, pickArchetype, tagScoreWeighted, hourRange } from '../lib/diagnostic-core';
import { buildWeekPlan } from '../lib/week-plan';
import { buildLeadBrief } from '../lib/lead-brief';
import { Atmosphere } from './atmosphere';

const GOLD = '#c8a84e';
const BG = '#08080a';

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

// ── Kwalifikacja leada na prowadzenie 1:1 (niewidoczna dla usera) ──
// budżet z realnego wydatku (hardTotal, bez pytania o zarobki), gotowość z intencji + kiedy chce ruszyć + ile razy próbował.
// priorityLead = mocny ból + budżet + gotowość. wantsHelp = miękki sygnał (chce z kimś, nie sam) -> routing na współpracę.
function qualify(raw: RawAnswers, triedBefore: number, sc: number, hardTotal: number) {
  const intent = typeof raw.intent === 'string' ? raw.intent : '';
  const startWhen = typeof raw.start_when === 'string' ? raw.start_when : '';
  const budgetProxy = hardTotal >= 3000 ? 3 : hardTotal >= 1500 ? 2 : 1;
  const intentPts = intent === 'in_prowadz' ? 2 : intent === 'in_zobacz' ? 1 : 0;
  const startPts = (startWhen === 'sw_7dni' || startWhen === 'sw_30dni') ? 1 : 0;
  const commitment = Math.min((triedBefore >= 2 ? 2 : triedBefore) + intentPts + startPts, 5);
  const priorityLead = sc >= 40 && commitment >= 3 && budgetProxy >= 2;
  const wantsHelp = intent === 'in_prowadz' || intent === 'in_zobacz';
  return { intent, startWhen, budgetProxy, commitment, priorityLead, wantsHelp };
}

export default function DiagnozaPage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [answers, setAnswers] = useState<RawAnswers | null>(null);
  // Reframe personalizujacy Karte Tygodnia. Dochodzi w tle po LLM, re-renderuje teaser.
  const [reframe, setReframe] = useState<ReframeData | null>(null);

  // Wejscie na strone diagnostyki (pierwszy ekran). Lejek: intro_view -> started -> step_view... -> completed.
  useEffect(() => { track('diag_intro_viewed'); }, []);

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
    const q = qualify(raw, D.triedBefore, sc, C.hardTotal);
    const segment = sc >= 40 ? 'goracy' : sc >= 20 ? 'cieply' : 'zimny';

    // Podepnij cala sesje (kroki + nagranie) pod handle IG leada, jesli go zostawil.
    if (typeof raw.instagram === 'string' && raw.instagram.length > 0) {
      identify(raw.instagram, { segment, score: sc, priority_lead: q.priorityLead });
    }
    // Lejek: quiz dokonczony + wynik pokazany (jeden moment). Bez PII, tylko metryki.
    track('diag_completed', { score: sc, segment, worstCat, priority_lead: q.priorityLead, has_ig: typeof raw.instagram === 'string' && raw.instagram.length > 0 });
    track('diag_result_viewed', { score: sc, segment, worstCat });

    const painText = typeof raw.user_pain === 'string' ? raw.user_pain.trim() : '';
    const leadBrief = buildLeadBrief(raw); // pelny brief + 3 pola wolnego tekstu do personalizacji
    const rawImie = raw.imie ?? raw.name;

    // ── Powiadomienie leada na Telegram: ZAWSZE, gdy ktoś skończył quiz (Michał chce wiedzieć od razu) ──
    void fetch('/api/lead-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: sc,
        segment: segment.toUpperCase(),
        worstCat,
        archetyp: pickArchetype(D, worstCat).label,
        archetypKey: pickArchetype(D, worstCat).key,
        godzina: hourRange(D),
        kwota: C.total,
        priority_lead: q.priorityLead,
        budget_proxy: q.budgetProxy,
        commitment: q.commitment,
        intencja: q.intent,
        kiedy_start: q.startWhen,
        pain: painText,
        imie: typeof rawImie === 'string' ? rawImie : '',
        instagram: typeof raw.instagram === 'string' ? raw.instagram.replace(/^@?/, '@') : '',
        objawy: Array.isArray(raw.symptoms_chips) ? (raw.symptoms_chips as string[]).join(',') : '',
        triedBefore: D.triedBefore,
        drinks: D.drinks,
      }),
    }).catch(() => {});

    // ── Reframe z wlasnych slow usera (LLM), gdy cokolwiek napisal. Karmimy CALY brief (wszystkie
    //    odpowiedzi), nie jedno zdanie. Fire-and-forget, Karta stoi bez niego (fallback deterministyczny). ──
    if (leadBrief.hasFreeText) {
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
              worstCat, segment, age: D.age, triedBefore: D.triedBefore,
            }),
          });
          const json = await res.json();
          if (json?.ok && json.reframe) {
            setReframe(json.reframe as ReframeData);
            // #17: wiemy, czy reframe z wlasnych slow usera realnie sie pokazal (wartosc Karty)
            track('reframe_shown', { worstCat, segment });
          }
        } catch {
          // cisza: bez reframe Karta i tak stoi (fallback deterministyczny)
        }
      })();
    }
  };

  if (phase === 'intro') {
    return (
      <div style={{ minHeight: '100vh', background: BG, color: '#ece7db', fontFamily: '"Inter", sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 22px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
        <Atmosphere />
        <div style={{ maxWidth: 480, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: GOLD, fontWeight: 700, marginBottom: 22 }}>
            Test na 4 minuty &middot; wynik widzę tylko ja
          </div>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 'clamp(38px, 9vw, 58px)', lineHeight: 1.05, fontWeight: 400, color: '#fff', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            Robisz swoje, a i tak lecisz na pół mocy.
          </h1>
          <p style={{ fontSize: 16.5, color: '#c4bdb0', lineHeight: 1.65, margin: '0 0 28px' }}>
            W każdym tygodniu masz jeden dzień, który po cichu psuje Ci pozostałe sześć. Prawie nigdy nie jest to ten, który myślisz. Odpowiesz na kilka pytań, a pokażę Ci, który to i co z nim zrobić już jutro.
          </p>
          <button
            onClick={() => { track('diag_started'); setPhase('intake'); if (typeof window !== 'undefined') window.scrollTo({ top: 0 }); }}
            style={{ width: '100%', padding: '17px', borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD}, #8a7535)`, color: BG, fontWeight: 800, fontSize: 16, letterSpacing: 0.5 }}
          >
            Pokaż mi ten dzień &rarr;
          </button>
          <p style={{ fontSize: 12.5, color: '#8f887c', lineHeight: 1.55, margin: '16px 2px 0', textAlign: 'center' }}>
            9 lat roboty. Ponad 180 chłopa, których przeprowadziłem przez dokładnie to.
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
    const worstW = [...catScores].sort((a, b) => a.pct - b.pct)[0]?.label || 'Sen';
    const arch = pickArchetype(D, worstW);
    const rawImie = answers.imie ?? answers.name;
    const imie = typeof rawImie === 'string' ? rawImie : '';
    const q = qualify(answers, D.triedBefore, SC, C.hardTotal);
    const qualified = q.priorityLead || q.wantsHelp;
    // #1 handoff: niesie kontekst diagnozy do nabora w URL (nabor personalizuje sie po ?from=diagnoza).
    // Same-tab (#2) + parametry = ciaglosc lejka, zero przepisywania danych przez usera.
    const igClean = typeof answers.instagram === 'string' ? answers.instagram.replace(/^@?/, '') : '';
    const naborParams = new URLSearchParams({ from: 'diagnoza', arch: arch.key, score: String(SC), worst: worstW, q: qualified ? '1' : '0', kwota: String(C.total) });
    if (igClean) naborParams.set('ig', igClean);
    const naborUrl = `https://nabor.talerzihantle.com/?${naborParams.toString()}`;
    const wkPlan = buildWeekPlan({
      archetypeKey: arch.key, archetypeLabel: arch.label, archetypeTagline: arch.tagline, mirror: arch.mirror,
      qualified,
      worstCat: worstW, breakWindow: D.breakWindow, score: SC, costTotal: C.total, wknd: D.wknd,
      imie, potentialPct: 100 - SC, costMonths: C.stagnationMonths,
      trigger: typeof answers.user_trigger === 'string' ? answers.user_trigger : undefined,
      drinks: D.drinks, screenBed: D.screenBed, junk: D.junk, protein: D.protein,
      sleep: D.sleep, miss: D.miss, binge: D.binge, gym: D.gym,
      reframe: reframe || undefined,
    });
    return (
      <>
        {/* prowadzenie 1:1 na gorze: WeekPage ma most na dole (VII), to dodatkowy cue u szczytu */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(11,11,12,0.94)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #26262b', padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#8f887c', fontWeight: 700 }}>Diagnoza gotowa</span>
          <span style={{ flex: 1 }} />
          <a href={naborUrl} onClick={() => track('diag_nabor_click', { loc: 'header', qualified })} style={{ fontSize: 12.5, color: '#ece7db', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            {qualified ? 'zobacz, jak wygląda współpraca' : 'zobacz, jak pracuję z innymi'} &rarr;
          </a>
        </div>
        <WeekPage plan={wkPlan} imie={imie} qualified={qualified} instagram={igClean} naborHref={naborUrl} />
      </>
    );
  }

  return null;
}
