'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QUESTIONS as CONFIG_QUESTIONS, QuestionDef, QuestionOption } from '../lib/assessment-config';
import { RawAnswers } from '../lib/scoring-engine';
import { track, trackDiag } from '../lib/analytics';
import { Atmosphere } from '../diagnoza/atmosphere';
import { WeekInstrument, buildWeekState } from './WeekInstrument';

interface Props {
  onComplete: (answers: RawAnswers) => void;
  initialAnswers?: RawAnswers;
}

const STORAGE_KEY = 'diagnostyka_v2_session_answers';
const STEP_KEY = 'diagnostyka_v2_session_step_weekend_first';

// Cold flow zaczyna od konkretu, który każdy potrafi ocenić bez samo-diagnozy.
// Scoring i ID pytań pozostają bez zmian; zmieniamy wyłącznie kolejność ekspozycji.
const FIRST_VISIBLE_IDS = ['weekend_pattern', 'monday_recovery', 'primary_goal'];
const EXCLUDED_COLD_IDS = new Set(['alcohol_intake']);
function sanitizeFlowAnswers(raw: RawAnswers): RawAnswers {
  const clean = { ...raw } as RawAnswers;
  for (const id of EXCLUDED_COLD_IDS) delete (clean as Record<string, unknown>)[id];
  return clean;
}
const FLOW_QUESTIONS: QuestionDef[] = [
  ...FIRST_VISIBLE_IDS.map(id => CONFIG_QUESTIONS.find(q => q.id === id)).filter((q): q is QuestionDef => Boolean(q)),
  ...CONFIG_QUESTIONS.filter(q => !FIRST_VISIBLE_IDS.includes(q.id) && !EXCLUDED_COLD_IDS.has(q.id)),
];

// Polska odmiana jednostek w suwaku. Sztywny unit lamal "4 lat" zamiast "4 lata", "1 rok".
function fmtVal(val: number, unit?: string): string {
  const u = (unit || '').trim();
  if (u === 'lat') {
    const n = Math.round(val);
    const d = n % 10, dd = n % 100;
    if (n === 1) return '1 rok';
    if (d >= 2 && d <= 4 && (dd < 10 || dd >= 20)) return `${n} lata`;
    return `${n} lat`;
  }
  return u ? `${val} ${u}` : `${val}`;
}

// ── Antybełkot: wykrywa klepanie w klawiaturę ("zzz", "asdfgh", "ee ee ee") w pytaniu otwartym ──
// Cel: nie przepuścić leada, który nabił byle co. Konserwatywne progi, żeby nie krzyczeć na realne zdania.
const _CONS = 'bcdfghjklmnpqrstvwxzżźćńłś';
function isGibberish(raw: string): boolean {
  const t = (raw || '').trim().toLowerCase();
  const letters = t.replace(/[^a-ząćęłńóśźż]/g, '');
  if (letters.length < 5) return false; // za krótko, jeszcze nie oceniamy
  // 1) ten sam znak 4+ pod rząd: zzzz, aaaaa
  if (/(.)\1{3,}/.test(t)) return true;
  // 2) dłuższy tekst, a mało różnych liter: asdasdasd, ee ee ee, aaa bbb ccc
  if (letters.length >= 10 && new Set(letters).size < 5) return true;
  // 3) brak samogłosek albo prawie same samogłoski (bdfg / eeee)
  const vowels = (letters.match(/[aeiouyąęó]/g) || []).length;
  if (letters.length >= 6 && vowels === 0) return true;
  if (letters.length >= 6 && vowels / letters.length > 0.85) return true;
  // 4) token z ciągiem 6+ spółgłosek: asdfghjk (polskie słowa nie mają tak długich zbitek)
  const consRun = new RegExp('[' + _CONS + ']{6,}');
  if (t.split(/\s+/).some(w => consRun.test(w))) return true;
  return false;
}
// Minimum treści: 15 znaków i co najmniej 3 słowa (2+ liter). Odsiewa "ok", "nie wiem".
function enoughContent(raw: string): boolean {
  const t = (raw || '').trim();
  if (t.length < 15) return false;
  const tokens = t.toLowerCase().split(/\s+/).filter(w => w.replace(/[^a-ząćęłńóśźż]/g, '').length >= 2);
  return tokens.length >= 3;
}

export default function SingleQuestionFlow({ onComplete, initialAnswers }: Props) {
  const [answers, setAnswers] = useState<RawAnswers>(() => {
    if (initialAnswers && Object.keys(initialAnswers).length > 0) return sanitizeFlowAnswers(initialAnswers);
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return sanitizeFlowAnswers(JSON.parse(saved));
      } catch (_e) {}
    }
    // Zero domyslnych wartosci: slider/number bez ruchu = brak odpowiedzi (nie zapisujemy smieci).
    return { symptoms_chips: [] };
  });

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    // Start/resume zawsze na pytaniu, które jest faktycznie widoczne.
    // Wcześniej FLOW_QUESTIONS[0] mogło mieć condition:false, więc ukryte `age` flashowało jako 1/18.
    let seed: RawAnswers = initialAnswers && Object.keys(initialAnswers).length > 0 ? sanitizeFlowAnswers(initialAnswers) : { symptoms_chips: [] };
    let candidate = 0;
    if (typeof window !== 'undefined') {
      try {
        const savedAnswers = localStorage.getItem(STORAGE_KEY);
        if ((!initialAnswers || Object.keys(initialAnswers).length === 0) && savedAnswers) seed = sanitizeFlowAnswers(JSON.parse(savedAnswers));
        const savedStep = localStorage.getItem(STEP_KEY);
        if (savedStep) {
          const parsed = parseInt(savedStep, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed < FLOW_QUESTIONS.length) candidate = parsed;
        }
      } catch (_e) {}
    }
    const visible = (idx: number) => {
      const q = FLOW_QUESTIONS[idx];
      return Boolean(q && (!q.condition || q.condition(seed as Record<string, unknown>)));
    };
    if (visible(candidate)) return candidate;
    for (let idx = candidate + 1; idx < FLOW_QUESTIONS.length; idx++) if (visible(idx)) return idx;
    for (let idx = 0; idx < candidate; idx++) if (visible(idx)) return idx;
    return 0;
  });

  // znacznik ekspozycji biezacego pytania -> elapsed_ms w question_answer (bez PII)
  const shownAt = useRef<number>(0);
  const questionHiddenAtRef = useRef<number>(0);
  const completionRef = useRef(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const sliderGesture = useRef<{ pointerId:number; startX:number; startY:number; lastX:number; lastY:number; mode:'pending'|'horizontal'|'vertical' } | null>(null);

  const [transitionState, setTransitionState] = useState<'idle' | 'out' | 'in'>('idle');
  const [isCompleting, setIsCompleting] = useState(false);
  // Pytania realnie dotkniete (slider/number musi byc ruszony, inaczej "Zatwierdz" zablokowany).
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Stabilny submission_id per sesja (przetrwa reload) — klucz upsertu wiersza w Notion.
  const [submissionId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const K = 'diagnostyka_v2_submission_id';
      let id = localStorage.getItem(K);
      if (!id) {
        id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(K, id);
      }
      return id;
    } catch { return `s_${Date.now()}`; }
  });

  // Autosave w localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
        localStorage.setItem(STEP_KEY, String(currentIndex));
      }
    } catch (_e) {}
  }, [answers, currentIndex]);

  const currentQ: QuestionDef = FLOW_QUESTIONS[currentIndex] || FLOW_QUESTIONS[0];
  // Pytania warunkowe (np. wydatki weekendowe) pokazujemy tylko gdy warunek spełniony.
  // Licznik i pasek liczą po WIDOCZNYCH pytaniach, nie po całej tablicy, więc długość maleje.
  const visibleQuestions = FLOW_QUESTIONS.filter(q => !q.condition || q.condition(answers as Record<string, unknown>));
  const visiblePos = Math.max(1, visibleQuestions.findIndex(q => q.id === currentQ.id) + 1);
  const visibleTotal = visibleQuestions.length;
  const progressPct = Math.round((visiblePos / visibleTotal) * 100);
  // Stan przyrządu 168: które godziny tygodnia są już pokryte odpowiedziami.
  const weekState = buildWeekState(
    visibleQuestions as unknown as Parameters<typeof buildWeekState>[0],
    answers as Record<string, unknown>,
  );

  // Progresywny zapis: kazda odpowiedz leci osobno (event-per-row) -> /api/diag-event -> n8n -> Notion.
  // keepalive: przetrwa nawigacje/zamkniecie karty, wiec lapiemy tez ostatnia odpowiedz przed porzuceniem.
  const postEvent = useCallback((qId: string, value: unknown) => {
    if (!submissionId || typeof fetch === 'undefined') return;
    try {
      fetch('/api/diag-event', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({ submission_id: submissionId, q_id: qId, value, pos: visiblePos, total: visibleTotal, ts: Date.now() }),
      }).catch(() => {});
    } catch (_e) {}
  }, [submissionId, visiblePos, visibleTotal]);

  // Lejek: ekspozycja kazdego pytania -> widac dokladnie, na ktorym kroku ludzie odpadaja.
  // question_view: DEDUP od re-renderow — dep = [currentIndex], wiec odpala tylko przy realnym wejsciu
  // na ekran pytania (mount + zmiana pytania + revisit po back). Typowanie/ruch slidera nie zmienia
  // currentIndex -> zaden dodatkowy view.
  useEffect(() => {
    shownAt.current = Date.now();
    const base = { question_id: currentQ.id, index: currentIndex, pos: visiblePos, total: visibleTotal };
    trackDiag('question_view', base);
    trackDiag('diag_step_viewed', { index: currentIndex, id: currentQ.id, pos: visiblePos, total: visibleTotal }); // legacy alias, wspólny schema
    if (currentQ.type === 'contact') trackDiag('contact_view', base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // Abandonment proof: zapisuje ostatni ekran i realny czas aktywności na nim przy wyjściu/reloadzie.
  // Zero treści odpowiedzi i zero PII. Dzięki temu drop-off nie jest zgadywany tylko z braku kolejnego eventu.
  useEffect(() => {
    const onPageHide = () => {
      const now = Date.now();
      const pendingHidden = questionHiddenAtRef.current ? now - questionHiddenAtRef.current : 0;
      trackDiag('question_exit', {
        question_id: currentQ.id, index: currentIndex, pos: visiblePos, total: visibleTotal,
        active_ms: Math.max(0, now - shownAt.current - pendingHidden), progress_pct: progressPct,
      });
    };
    if (typeof window !== 'undefined') window.addEventListener('pagehide', onPageHide);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('pagehide', onPageHide); };
  }, [currentIndex, currentQ.id, visiblePos, visibleTotal, progressPct]);

  // Czas aktywny: pauzuj timer gdy karta ukryta (nie licz czasu w innej karcie/apce).
  useEffect(() => {
    const onVis = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'hidden') questionHiddenAtRef.current = Date.now();
      else if (questionHiddenAtRef.current) {
        shownAt.current += Date.now() - questionHiddenAtRef.current;
        questionHiddenAtRef.current = 0;
      }
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
    return () => { if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis); };
  }, []);

  // Bramka "Dalej": slider/number musi być ruszony, multi min 1 chip, tekst min 15 znaków.
  const chipsCount = Array.isArray(answers[currentQ.id]) ? (answers[currentQ.id] as string[]).length : 0;
  // Kontakt jest warunkowy: jawna chęć pomocy/prowadzenia wymaga IG, self-serve zostaje bez tarcia.
  const igClean = String(answers.instagram || '').replace(/[@\s]/g, '');
  const intentId = String(answers.intent || '');
  const contactRequired = currentQ.type === 'contact' && (intentId === 'in_prowadz' || intentId === 'in_zobacz');
  const advanceOk =
    currentQ.type === 'multi' ? chipsCount >= 1 :
    currentQ.type === 'text' ? enoughContent(String(answers[currentQ.id] || '')) && !isGibberish(String(answers[currentQ.id] || '')) :
    currentQ.type === 'contact' ? (!contactRequired || igClean.length >= 2) :
    (currentQ.type === 'slider' || currentQ.type === 'number') ? touched.has(currentQ.id) :
    true;

  // Haptic feedback na mobile
  const vibe = useCallback((pattern: number | number[] = 8) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (_e) {}
  }, []);

  const goToNext = useCallback((opts?: { skipped?: boolean; answersOverride?: Record<string, unknown> }) => {
    // Zapis odpowiedzi biezacego pytania (single leci osobno w handleSingleSelect, tu reszta typow).
    const cq = FLOW_QUESTIONS[currentIndex] || FLOW_QUESTIONS[0];
    // Przy single setAnswers jeszcze nie zdazyl wrocic do tej domkniecia, a nastepne pytanie moze
    // warunkowac sie wlasnie na tej odpowiedzi (agency_mode patrzy na intent). Dlatego liczymy
    // widocznosc na swiezym stanie przekazanym z handleSingleSelect, nie na stanie sprzed kliku.
    const ans = (opts?.answersOverride || answers) as Record<string, unknown>;
    // ── Analytics per-pytanie (PostHog): BEZ PII, BEZ tresci odpowiedzi. Surowe wartosci ida tylko do Notion (postEvent). ──
    const vq = FLOW_QUESTIONS.filter(q => !q.condition || q.condition(ans));
    const pos = Math.max(1, vq.findIndex(q => q.id === cq.id) + 1);
    // question_answer = COMMIT (przejscie dalej), NIE kazdy input/ruch slidera. Jeden commit = jeden event. ZERO wartosci odpowiedzi.
    const ev = { question_id: cq.id, index: currentIndex, pos, total: vq.length, elapsed_ms: Math.max(0, Date.now() - shownAt.current) };
    if (cq.type === 'contact') {
      // P1-2: kontakt opcjonalny -> continue mierzymy ZAWSZE (has_contact bool), a realny opt-in IG osobnym eventem.
      const provided = String(answers.instagram || '').replace(/[@\s]/g, '').length >= 2;
      trackDiag('contact_continue', { index: currentIndex, total: vq.length, has_contact: provided, contact_required: contactRequired });
      if (provided) trackDiag('contact_provided', { index: currentIndex, total: vq.length }); // zero raw handle w PostHog
    }
    else if (opts?.skipped === true) trackDiag('question_skip', ev);
    else trackDiag('question_answer', ev);
    if (cq.type !== 'single') {
      const v = cq.type === 'contact' ? { instagram: answers.instagram, imie: answers.imie }
        : answers[cq.id];
      postEvent(cq.id, v);
    }
    let next = currentIndex + 1;
    while (next < FLOW_QUESTIONS.length) {
      const c = FLOW_QUESTIONS[next].condition;
      if (!c || c(ans)) break;
      next++;
    }
    if (next < FLOW_QUESTIONS.length) {
      vibe(12);
      setTransitionState('out');
      setTimeout(() => {
        setCurrentIndex(next);
        setTransitionState('in');
        setTimeout(() => setTransitionState('idle'), 250);
      }, 200);
    } else {
      if (completionRef.current) return;
      completionRef.current = true;
      setIsCompleting(true);
      vibe([20, 50, 20]);
      // diag_complete NIE tutaj — odpala page.tsx po realnym commit wyniku (setPhase 'teaser'), nie przed
      // ostatnie pytanie tez moze byc typu single, wiec oddajemy stan ze swieza odpowiedzia
      onComplete(ans as typeof answers);
    }
  }, [currentIndex, answers, onComplete, vibe, postEvent, contactRequired]);

  const goToPrev = useCallback(() => {
    trackDiag('question_back', { question_id: (FLOW_QUESTIONS[currentIndex] || FLOW_QUESTIONS[0]).id, index: currentIndex });
    let prev = currentIndex - 1;
    while (prev >= 0) {
      const c = FLOW_QUESTIONS[prev].condition;
      if (!c || c(answers as Record<string, unknown>)) break;
      prev--;
    }
    if (prev >= 0) {
      vibe(8);
      setTransitionState('out');
      setTimeout(() => {
        setCurrentIndex(prev);
        setTransitionState('in');
        setTimeout(() => setTransitionState('idle'), 250);
      }, 200);
    }
  }, [currentIndex, answers, vibe]);

  const handleSingleSelect = (opt: QuestionOption) => {
    vibe(10);
    const fresh = { ...answers, [currentQ.id]: opt.id };
    setAnswers(prev => ({ ...prev, [currentQ.id]: opt.id }));
    postEvent(currentQ.id, opt.id);
    setTimeout(() => {
      goToNext({ answersOverride: fresh as Record<string, unknown> });
    }, 280);
  };

  const handleSliderChange = (val: number) => {
    setTouched(t => new Set(t).add(currentQ.id));
    setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
  };

  const setSliderFromClientX = (clientX: number) => {
    const el = sliderRef.current; if (!el) return;
    const min = Number(currentQ.min ?? 0), max = Number(currentQ.max ?? 100), step = Number(currentQ.step ?? 1);
    const rect = el.getBoundingClientRect();
    // Igła ma 2 px, więc skala biegnie przez pełną szerokość. Wcześniejsze 22 px
    // marginesu było wielkością okrągłej gałki, której już nie ma.
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    const raw = min + ratio * (max - min);
    const value = Math.min(max, Math.max(min, Number((min + Math.round((raw - min) / step) * step).toFixed(4))));
    handleSliderChange(value);
  };

  const onSliderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    sliderGesture.current = { pointerId:e.pointerId, startX:e.clientX, startY:e.clientY, lastX:e.clientX, lastY:e.clientY, mode:e.pointerType === 'mouse' ? 'horizontal' : 'pending' };
    if (e.pointerType === 'mouse') { e.currentTarget.setPointerCapture(e.pointerId); setSliderFromClientX(e.clientX); }
  };
  const onSliderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = sliderGesture.current; if (!g || g.pointerId !== e.pointerId) return;
    g.lastX=e.clientX; g.lastY=e.clientY; const dx=e.clientX-g.startX, dy=e.clientY-g.startY;
    if (g.mode === 'pending') {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx) * 1.15) { g.mode='vertical'; return; }
      if (Math.abs(dx) > 8 && Math.abs(dx) >= Math.abs(dy)) { g.mode='horizontal'; e.currentTarget.setPointerCapture(e.pointerId); }
    }
    if (g.mode === 'horizontal') { e.preventDefault(); setSliderFromClientX(e.clientX); }
  };
  const onSliderPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = sliderGesture.current; if (!g || g.pointerId !== e.pointerId) return;
    if (g.mode === 'pending' && Math.hypot(g.lastX-g.startX, g.lastY-g.startY) < 8) setSliderFromClientX(e.clientX);
    else if (g.mode === 'horizontal') setSliderFromClientX(e.clientX);
    try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    sliderGesture.current=null;
  };
  const onSliderKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const min=Number(currentQ.min ?? 0), max=Number(currentQ.max ?? 100), step=Number(currentQ.step ?? 1), cur=Number(answers[currentQ.id] ?? min);
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); handleSliderChange(Math.min(max, Number((cur+step).toFixed(4)))); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); handleSliderChange(Math.max(min, Number((cur-step).toFixed(4)))); }
    if (e.key === 'Home') { e.preventDefault(); handleSliderChange(min); }
    if (e.key === 'End') { e.preventDefault(); handleSliderChange(max); }
  };

  const handleNumberChange = (val: number) => {
    setTouched(t => new Set(t).add(currentQ.id));
    setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
  };

  // Chipy zapisujemy pod ID pytania, nie pod 'symptoms_chips'. Wczesniej multi bylo tylko jedno,
  // wiec klucz mogl byc na sztywno. Teraz spillover tez jest multi i wpadalby do listy objawow,
  // ktora idzie do scoringu. Limit bierzemy z pytania, zeby label nie klamal.
  const handleMultiChipToggle = (chipId: string) => {
    vibe(8);
    const key = currentQ.id;
    const limit = currentQ.maxSelect ?? 3;
    setAnswers(prev => {
      const existing: string[] = Array.isArray(prev[key]) ? [...(prev[key] as string[])] : [];
      const idx = existing.indexOf(chipId);
      if (idx >= 0) existing.splice(idx, 1);
      else if (existing.length < limit) existing.push(chipId);
      return { ...prev, [key]: existing };
    });
  };

  const handleTextChange = (text: string) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: text.slice(0, 500) }));
  };

  const sliderMin = Number(currentQ.min ?? 0);
  const sliderMax = Number(currentQ.max ?? 100);
  const sliderValue = Number(answers[currentQ.id] ?? sliderMin);
  const sliderPct = sliderMax > sliderMin ? Math.max(0, Math.min(100, ((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100)) : 0;

  return (
    <div style={{
      minHeight: '100svh',
      background: '#08080a',
      color: '#f0f0f0',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Inter", sans-serif',
      boxSizing: 'border-box',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'visible',
      WebkitOverflowScrolling: 'touch',
      touchAction: 'pan-y',
    }}>
      <Atmosphere />
      <style>{`
        .diag-slider-shell{overscroll-behavior-y:contain}
        @media (max-width:640px){.diag-slider-shell{padding-top:12px!important;padding-bottom:12px!important}}
      `}</style>
      {/* ── TOP BAR: PROGRESS BAR + SEKCJA ── */}
      <div className="dx-topbar">
        {/* Postep jako podzialka, tym samym jezykiem co suwak. Swiecacy pasek
            3 px z pulsujacym glow byl drugim jezykiem wizualnym nad przyrzadem. */}
        <div className="dx-progress" aria-hidden>
          <div className="dx-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <div style={{
          maxWidth: 'var(--w-shell)', margin: '0 auto', padding: '12px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {/* Przycisk wstecz */}
          {currentIndex > 0 ? (
            <button
              onClick={goToPrev}
              className="dx-back"
            >
              &larr; Wstecz
            </button>
          ) : <div />}

          <div className="dx-meta dx-topbar-section">
            {currentQ.section}
          </div>

          <div className="dx-meta">
            KROK {visiblePos}
          </div>
        </div>
      </div>

      {/* ── EKRAN PYTANIA (1 NA WIDOK) ──
          Powłoka dwukolumnowa: treść po lewej, przyrząd 168 po prawej.
          Poniżej 900 px przyrząd zwija się do paska (patrz globals.css). */}
      <div className="dx-shell" style={{
        flex: 1, width: '100%', padding: '24px 24px max(104px, calc(env(safe-area-inset-bottom) + 80px))',
        boxSizing: 'border-box', position: 'relative', zIndex: 1,
      }}>
      <div className="dx-main dx-stage" key={currentQ.id} style={{
        width: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box',
        opacity: transitionState === 'out' ? 0 : 1,
        transform: transitionState === 'out' ? 'translateY(-12px)' : transitionState === 'in' ? 'translateY(12px)' : 'none',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}>
        {/* Tytuł pytania. Kontakt zmienia copy po jawnej intencji, bez ukrytej kwalifikacji. */}
        <h2 style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 'var(--t-q)',
          fontWeight: 400,
          lineHeight: 1.1,
          color: '#ffffff',
          marginBottom: currentQ.subtitle ? 'var(--s-3)' : 'var(--s-5)',
          letterSpacing: '-0.015em',
          textWrap: 'balance',
        }}>
          {currentQ.type === 'contact' && contactRequired
            ? 'Zostaw @ z Instagrama, żebym mógł połączyć ten wynik z Tobą.'
            : currentQ.title}
        </h2>

        {/* Podtytuł */}
        {(currentQ.subtitle || (currentQ.type === 'contact' && contactRequired)) && (
          <p style={{ fontSize: 14.5, color: '#999999', lineHeight: 1.55, marginBottom: 28 }}>
            {currentQ.type === 'contact' && contactRequired
              ? (intentId === 'in_prowadz'
                ? 'Wybrałeś prowadzenie. Wynik dostajesz od razu. @ pozwala mi przypisać tę diagnostykę do właściwej rozmowy.'
                : 'Chcesz zobaczyć, jak wygląda praca ze mną. Wynik dostajesz od razu. @ pozwala mi przypisać tę diagnostykę do właściwej rozmowy.')
              : currentQ.subtitle}
          </p>
        )}

        {/* TYP 1: SINGLE CHOICE CARDS */}
        {currentQ.type === 'single' && currentQ.options && (
          /* Wiersze pomiarowe zamiast kart. Karta z kółkiem radio to domyślny
             komponent biblioteki i czyta się jak formularz. Wiersz z kreską
             czyta się jak odczyt z przyrządu. */
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {currentQ.options.map((opt, i) => {
              const isSelected = answers[currentQ.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  className="mrow"
                  data-on={isSelected ? '1' : '0'}
                  style={{ '--i': i } as React.CSSProperties}
                  onClick={() => handleSingleSelect(opt)}
                >
                  <span className="mrow-tick" />
                  <span className="mrow-idx">{String(i + 1).padStart(2, '0')}</span>
                  <span className="mrow-label">{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* TYP 2: SLIDER */}
        {currentQ.type === 'slider' && (
          <div className="diag-slider-shell" style={{ padding: '4px 0', touchAction: 'pan-y' }}>
            <div className="dx-readval">
              {fmtVal(Number(answers[currentQ.id] ?? currentQ.min ?? 7), currentQ.unit)}
            </div>

            <div
              ref={sliderRef}
              className="dx-gauge"
              role="slider"
              tabIndex={0}
              aria-label={currentQ.title}
              aria-valuemin={sliderMin}
              aria-valuemax={sliderMax}
              aria-valuenow={sliderValue}
              aria-valuetext={fmtVal(sliderValue, currentQ.unit)}
              onPointerDown={onSliderPointerDown}
              onPointerMove={onSliderPointerMove}
              onPointerUp={onSliderPointerEnd}
              onPointerCancel={() => { sliderGesture.current = null; }}
              onKeyDown={onSliderKeyDown}
            >
              <div className="dx-gauge-ticks" />
              <div className="dx-gauge-fill" style={{ width: `${sliderPct}%` }} />
              <div className="dx-gauge-rule" />
              <div className="dx-gauge-needle" style={{ left: `${sliderPct}%` }} />
            </div>

            <div className="dx-meta" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <span>{fmtVal(currentQ.min ?? 0, currentQ.unit)}</span>
              <span>{fmtVal(currentQ.max ?? 0, currentQ.unit)}</span>
            </div>

            <button className="dx-go" onClick={() => goToNext()} disabled={!advanceOk}>
              <span>Dalej</span><span>&rarr;</span>
            </button>
          </div>
        )}

        {/* TYP 3: NUMBER INPUT */}
        {currentQ.type === 'number' && (
          <div style={{ paddingTop: 4 }}>
            <div style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'flex-end' }}>
              <input
                type="number"
                className="dx-field dx-field-mono"
                min={currentQ.min ?? 0}
                max={currentQ.max ?? 10000}
                value={Number(answers[currentQ.id] ?? 300)}
                onChange={e => handleNumberChange(parseInt(e.target.value, 10) || 0)}
              />
              <span className="dx-meta" style={{ paddingBottom: 'var(--s-4)', whiteSpace: 'nowrap' }}>
                {currentQ.unit} / mies.
              </span>
            </div>

            <button className="dx-go" onClick={() => goToNext()} disabled={!advanceOk}>
              <span>Dalej</span><span>&rarr;</span>
            </button>
          </div>
        )}

        {/* TYP 4: MULTI SELECT CHIPS */}
        {currentQ.type === 'multi' && currentQ.options && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {currentQ.options.map((opt, i) => {
              const selectedArr: string[] = Array.isArray(answers[currentQ.id]) ? (answers[currentQ.id] as string[]) : [];
              const isSelected = selectedArr.includes(opt.id);
              // Limit był wcześniej niewidoczny: klik po prostu nic nie robił.
              // Wygaszony wiersz mówi wprost, że pula jest wyczerpana.
              const blocked = !isSelected && selectedArr.length >= (currentQ.maxSelect ?? 3);
              return (
                <button
                  key={opt.id}
                  className="mrow"
                  data-on={isSelected ? '1' : '0'}
                  style={{ '--i': i } as React.CSSProperties}
                  disabled={blocked}
                  onClick={() => handleMultiChipToggle(opt.id)}
                >
                  <span className="mrow-tick" />
                  <span className="mrow-idx">{String(i + 1).padStart(2, '0')}</span>
                  <span className="mrow-label">{opt.label}</span>
                  <span className="mrow-box" />
                </button>
              );
            })}

            <div className="dx-meta" style={{ marginTop: 'var(--s-3)' }}>
              ZAZNACZONO {chipsCount} / {currentQ.maxSelect ?? 3}
            </div>

            <button className="dx-go" onClick={() => goToNext()} disabled={!advanceOk}>
              <span>Dalej</span><span>&rarr;</span>
            </button>
          </div>
        )}

        {/* TYP 5: TEXT INPUT (SŁOWA USERA LEADA) */}
        {currentQ.type === 'text' && (
          <div>
            <textarea
              className="dx-field dx-area"
              rows={4}
              placeholder={currentQ.placeholder || 'np. Trenuję regularnie, trzymam miskę w dzień, ale po 21:00 zjadam pół lodówki i w poniedziałki w ogóle nie mam siły...'}
              value={String(answers[currentQ.id] || '')}
              onChange={e => handleTextChange(e.target.value)}
            />
            <div className="dx-meta" style={{ textAlign: 'right', marginTop: 'var(--s-2)' }}>
              {String(answers[currentQ.id] || '').length} / 500 ZNAKÓW
            </div>

            {/* Antybełkot: ktoś naklepał byle co -> neutralny recovery (P1-4: bez shamingu cold leada) */}
            {isGibberish(String(answers[currentQ.id] || '')) && (
              <div className="dx-note">
                Wygląda, jakby to było wpisane na szybko. Możesz pominąć to pytanie. Jeśli chcesz, żebym wykorzystał odpowiedź w wyniku, napisz jedno prawdziwe zdanie własnymi słowami.
              </div>
            )}
            {/* Za mało treści (ale nie bełkot): miękka podpowiedź, bez krzyku */}
            {!isGibberish(String(answers[currentQ.id] || '')) && String(answers[currentQ.id] || '').trim().length > 0 && !enoughContent(String(answers[currentQ.id] || '')) && (
              <div className="dx-note">
                Napisz jedno pełne zdanie własnymi słowami.
              </div>
            )}

            <button className="dx-go" onClick={() => goToNext()} disabled={!advanceOk}>
              <span>Dalej</span><span>&rarr;</span>
            </button>
            {/* Skip POD polem (secondary/muted) — tylko dla realnie opcjonalnych pytan (np. user_trigger VOC) */}
            {currentQ.optional && (
              <button className="dx-skip" onClick={() => goToNext({ skipped: true })}>
                Pomiń to pytanie
              </button>
            )}
          </div>
        )}

        {/* TYP 6: KONTAKT — wymagany tylko po jawnej intencji pomocy/prowadzenia. */}
        {currentQ.type === 'contact' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--s-2)' }}>
              <span className="dx-prefix">@</span>
              <input
                type="text"
                className="dx-field"
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="twoj_nick"
                value={String(answers.instagram || '').replace(/^@/, '')}
                onChange={e => setAnswers(prev => ({ ...prev, instagram: e.target.value.replace(/[@\s]/g, '').slice(0, 40) }))}
                style={{ fontSize: 18 }}
              />
            </div>

            <input
              type="text"
              className="dx-field"
              placeholder="Imię (opcjonalnie)"
              value={String(answers.imie || '')}
              onChange={e => setAnswers(prev => ({ ...prev, imie: e.target.value.slice(0, 40) }))}
              style={{ marginTop: 'var(--s-4)' }}
            />

            <button
              className="dx-go"
              onClick={() => { if (!isCompleting) goToNext(); }}
              disabled={!advanceOk || isCompleting}
            >
              <span>{isCompleting ? 'Ładuję wynik' : 'Pokaż mój wynik'}</span><span>&rarr;</span>
            </button>
            <p style={{ marginTop: 'var(--s-3)', fontSize: 12.5, color: '#6a6a6a', lineHeight: 1.5 }}>
              {contactRequired
                ? '@ użyję tylko po to, żeby połączyć wynik z właściwą rozmową.'
                : '@Instagram jest opcjonalny. Zostaw go, jeśli chcesz, żebym połączył wynik z Twoją późniejszą wiadomością.'}
            </p>
          </div>
        )}

        {/* Mobile: przyrząd jako pasek pod treścią. */}
        <WeekInstrument state={weekState} activeSection={currentQ.section} variant="strip" />
      </div>

      {/* Desktop: pełny przyrząd 168 w prawej szynie. */}
      <WeekInstrument state={weekState} activeSection={currentQ.section} variant="panel" />
      </div>
    </div>
  );
}
