'use client';

// /diagnoza, żywy flow Diagnostyki V2 (integracja Faz 1-2 + teaser Fazy 3).
// intake (1 pytanie/ekran) -> teaser (wynik przed mailem) -> gate (email) -> potwierdzenie.
// Stare "/" (v1) zostaje nietknięte do czasu pełnego QA i cutoveru.

import React, { useState } from 'react';
import SingleQuestionFlow from '../components/SingleQuestionFlow';
import WeekPage from '../components/WeekPage';
import { calculateScoring, type RawAnswers, type ScoringResult } from '../lib/scoring-engine';
import { answersToFD } from '../lib/answers-to-fd';
import { score, costs, pickArchetype, tagScoreWeighted } from '../lib/diagnostic-core';
import { buildWeekPlan } from '../lib/week-plan';

const GOLD = '#c8a84e';
const BG = '#0e0e0e';

type Phase = 'intake' | 'teaser' | 'gate' | 'done';

// Reframe z wlasnych slow usera (LLM /api/diagnoza). Ksztalt zgodny z json.reframe
// z route.ts oraz z opcjonalnym polem `reframe` w WeekPlanInput (week-plan.ts).
interface ReframeData {
  cytat?: string;
  falszywe_zalozenie?: string;
  mechanizm?: string;
  kolejnosc?: string[];
  pulapka?: string;
}

export default function DiagnozaPage() {
  const [phase, setPhase] = useState<Phase>('intake');
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [answers, setAnswers] = useState<RawAnswers | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reportConsent, setReportConsent] = useState(false);
  const [error, setError] = useState('');
  // Reframe personalizujacy Karte Tygodnia. Dochodzi w tle po LLM, re-renderuje teaser.
  const [reframe, setReframe] = useState<ReframeData | null>(null);

  const handleComplete = (raw: RawAnswers) => {
    const scored = calculateScoring(raw);
    setAnswers(raw);
    setResult(scored);
    setPhase('teaser');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });

    // ── Reframe z wlasnych slow usera (LLM) ──
    // Fire-and-forget: Karta jest widoczna od razu (fallback deterministyczny w week-plan.ts),
    // reframe dochodzi w tle i re-renderuje teaser. Cichy fallback gdy fetch padnie.
    const painText = typeof raw.user_pain === 'string' ? raw.user_pain.trim() : '';
    if (painText) {
      const D = answersToFD(raw);
      // worstCat liczony tak samo jak w teaser branch (te same wagi FD), zeby prompt trafil w kategorie
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
      // segment wg score, spojnie z analityka page.tsx (v1): zly wynik = goracy lead
      const segment = sc >= 40 ? 'goracy' : sc >= 20 ? 'cieply' : 'zimny';
      // trigger/selfDx nie sa zbierane w flow /diagnoza (brak pol w RawAnswers) -> puste;
      // route.ts akceptuje puste, wymaga tylko niepustego pain LUB selfDx (mamy user_pain).
      void (async () => {
        try {
          const res = await fetch('/api/diagnoza', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pain: painText, selfDx: '', trigger: '', worstCat, segment, age: D.age }),
          });
          const json = await res.json();
          if (json?.ok && json.reframe) setReframe(json.reframe as ReframeData);
        } catch {
          // cisza: bez reframe Karta i tak stoi (fallback deterministyczny)
        }
      })();
    }
  };

  const handleGateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) { setError('Podaj poprawny adres e-mail.'); return; }
    if (!reportConsent) { setError('Zaznacz zgodę na wygenerowanie i wysłanie raportu.'); return; }
    setError('');
    // TODO Faza 4: POST /api/subscribe (MailerLite + tag profilu/lead) + email transakcyjny.
    //   Zgody = LEGAL_REVIEW_REQUIRED. Bez sekretów => na razie zapis lokalny + potwierdzenie.
    setPhase('done');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };

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
    const wkPlan = buildWeekPlan({
      archetypeKey: arch.key, archetypeLabel: arch.label, archetypeTagline: arch.tagline,
      worstCat: worstW, breakWindow: D.breakWindow, score: SC, costTotal: C.total, wknd: D.wknd,
      imie, potentialPct: 100 - SC, costMonths: C.stagnationMonths,
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
          <a href={'https://nabor.talerzihantle.com/'} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: '#ece7db', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            następny krok: <strong style={{ color: '#c8a84e' }}>prowadzenie 1:1</strong> &rarr;
          </a>
        </div>
        <WeekPage plan={wkPlan} imie={imie} naborHref={'https://nabor.talerzihantle.com/'} />
        {/* pasek zapisu: Karta jest widoczna od razu, e-mail dopiero jako opcja pod nia (gate zostaje) */}
        <div style={{ background: '#0b0b0c', borderTop: '1px solid #26262b', padding: '32px 22px 56px', textAlign: 'center' }}>
          <div style={{ maxWidth: 460, margin: '0 auto' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 21, color: '#ece7db', lineHeight: 1.4, margin: '0 0 8px', fontWeight: 400 }}>
              Chcesz mieć tę Kartę Tygodnia zawsze pod ręką?
            </p>
            <p style={{ fontSize: 14, color: '#a49e92', lineHeight: 1.55, margin: '0 0 20px' }}>
              Wyślę Ci pełny raport na e-mail, żebyś wrócił do niego w dowolnym momencie tygodnia.
            </p>
            <button
              onClick={() => { setPhase('gate'); if (typeof window !== 'undefined') window.scrollTo({ top: 0 }); }}
              style={{ width: '100%', maxWidth: 360, padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #c8a84e, #8a7535)', color: '#0b0b0c', fontWeight: 800, fontSize: 15, letterSpacing: 0.5 }}
            >
              Wyślij mi raport na e-mail &rarr;
            </button>
          </div>
        </div>
      </>
    );
  }

  if (phase === 'gate' && result) {
    return (
      <div style={{ minHeight: '100vh', background: BG, color: '#f0f0f0', fontFamily: '"Inter", sans-serif' }}>
        <div style={{ maxWidth: 460, margin: '0 auto', padding: '52px 20px 120px', boxSizing: 'border-box' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: GOLD, fontWeight: 700, marginBottom: 16 }}>
            Krok ostatni &middot; Profil {result.profile.code}
          </div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 400, lineHeight: 1.25, color: '#fff', marginBottom: 12 }}>
            Odbierz pełną mapę tygodnia i plan na 14 dni
          </h1>
          <p style={{ fontSize: 14.5, color: '#aaa', lineHeight: 1.55, marginBottom: 28 }}>
            Sześć obszarów, mapa pęknięcia tygodnia, łańcuch przyczynowy i trzy ruchy dopasowane do profilu {result.profile.code}. Raport online plus PDF.
          </p>

          <form onSubmit={handleGateSubmit}>
            <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Imię</label>
            <input
              value={name} onChange={e => setName(e.target.value)} placeholder="Michał"
              style={{ width: '100%', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 15, marginBottom: 16, boxSizing: 'border-box', outline: 'none' }}
            />
            <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>E-mail</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ty@example.com"
              style={{ width: '100%', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1.5px solid ${GOLD}55`, color: '#fff', fontSize: 15, marginBottom: 20, boxSizing: 'border-box', outline: 'none' }}
            />

            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#bbb', lineHeight: 1.45, marginBottom: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={reportConsent} onChange={e => setReportConsent(e.target.checked)} style={{ marginTop: 2, accentColor: GOLD, flexShrink: 0 }} />
              <span>Zgadzam się na przetworzenie odpowiedzi w celu wygenerowania i wysłania raportu. {/* LEGAL_REVIEW_REQUIRED */}</span>
            </label>

            {error && <div role="alert" style={{ fontSize: 13, color: '#e07a5f', marginBottom: 14 }}>{error}</div>}

            <button type="submit" style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD}, #8a7535)`, color: BG, fontWeight: 800, fontSize: 15, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Wyślij mi raport &rarr;
            </button>
          </form>

          <button onClick={() => setPhase('teaser')} style={{ marginTop: 18, width: '100%', background: 'none', border: 'none', color: '#777', fontSize: 13, cursor: 'pointer' }}>
            &larr; Wróć do skróconego wyniku bez zapisu
          </button>
        </div>
      </div>
    );
  }

  // done
  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#f0f0f0', fontFamily: '"Inter", sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ maxWidth: 440, padding: '40px 24px' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>&#10003;</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 400, color: '#fff', marginBottom: 12 }}>
          Raport jest w drodze{name.trim() ? `, ${name.trim()}` : ''}.
        </h1>
        <p style={{ fontSize: 15, color: '#aaa', lineHeight: 1.55 }}>
          Wysyłamy pełną mapę tygodnia dla profilu {result?.profile.code} na {email || 'Twój e-mail'}. Sprawdź skrzynkę za chwilę.
        </p>
        <div style={{ marginTop: 20, fontFamily: 'monospace', fontSize: 11, color: '#555' }}>
          {/* TODO Faza 4: realna wysyłka. Teraz: potwierdzenie UI (backend niepodłączony). */}
          wersja preview &middot; podłączenie maila w kolejnym kroku
        </div>
      </div>
    </div>
  );
}
