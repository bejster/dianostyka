'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { QUESTIONS, QuestionDef, QuestionOption } from '../lib/assessment-config';
import { RawAnswers } from '../lib/scoring-engine';
import { track } from '../lib/analytics';
import { Atmosphere } from '../diagnoza/atmosphere';

interface Props {
  onComplete: (answers: RawAnswers) => void;
  initialAnswers?: RawAnswers;
}

const STORAGE_KEY = 'diagnostyka_v2_session_answers';
const STEP_KEY = 'diagnostyka_v2_session_step';

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
    if (initialAnswers && Object.keys(initialAnswers).length > 0) return initialAnswers;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch (_e) {}
    }
    // Zero domyslnych wartosci: slider/number bez ruchu = brak odpowiedzi (nie zapisujemy smieci).
    return { symptoms_chips: [] };
  });

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedStep = localStorage.getItem(STEP_KEY);
        if (savedStep) {
          const parsed = parseInt(savedStep, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed < QUESTIONS.length) return parsed;
        }
      } catch (_e) {}
    }
    return 0;
  });

  const [transitionState, setTransitionState] = useState<'idle' | 'out' | 'in'>('idle');
  // Pytania realnie dotkniete (slider/number musi byc ruszony, inaczej "Zatwierdz" zablokowany).
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Autosave w localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
        localStorage.setItem(STEP_KEY, String(currentIndex));
      }
    } catch (_e) {}
  }, [answers, currentIndex]);

  const currentQ: QuestionDef = QUESTIONS[currentIndex] || QUESTIONS[0];
  // Pytania warunkowe (np. wydatki weekendowe) pokazujemy tylko gdy warunek spełniony.
  // Licznik i pasek liczą po WIDOCZNYCH pytaniach, nie po całej tablicy, więc długość maleje.
  const visibleQuestions = QUESTIONS.filter(q => !q.condition || q.condition(answers as Record<string, unknown>));
  const visiblePos = Math.max(1, visibleQuestions.findIndex(q => q.id === currentQ.id) + 1);
  const visibleTotal = visibleQuestions.length;
  const progressPct = Math.round((visiblePos / visibleTotal) * 100);

  // Lejek: ekspozycja kazdego pytania -> widac dokladnie, na ktorym kroku ludzie odpadaja.
  useEffect(() => {
    track('diag_step_viewed', { index: currentIndex, id: currentQ.id, pos: visiblePos, total: visibleTotal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // Bramka "Dalej": slider/number musi być ruszony, multi min 1 chip, tekst min 15 znaków.
  const chipsCount = Array.isArray(answers.symptoms_chips) ? (answers.symptoms_chips as string[]).length : 0;
  // Handle IG bez @ i spacji; gate kontaktu wymaga min. 2 znakow (bez tego lead jest anonimowy).
  const igClean = String(answers.instagram || '').replace(/[@\s]/g, '');
  const advanceOk =
    currentQ.type === 'multi' ? chipsCount >= 1 :
    currentQ.type === 'text' ? enoughContent(String(answers[currentQ.id] || '')) && !isGibberish(String(answers[currentQ.id] || '')) :
    currentQ.type === 'contact' ? igClean.length >= 2 :
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

  const goToNext = useCallback(() => {
    let next = currentIndex + 1;
    while (next < QUESTIONS.length) {
      const c = QUESTIONS[next].condition;
      if (!c || c(answers as Record<string, unknown>)) break;
      next++;
    }
    if (next < QUESTIONS.length) {
      vibe(12);
      setTransitionState('out');
      setTimeout(() => {
        setCurrentIndex(next);
        setTransitionState('in');
        setTimeout(() => setTransitionState('idle'), 250);
      }, 200);
    } else {
      vibe([20, 50, 20]);
      onComplete(answers);
    }
  }, [currentIndex, answers, onComplete, vibe]);

  const goToPrev = useCallback(() => {
    let prev = currentIndex - 1;
    while (prev >= 0) {
      const c = QUESTIONS[prev].condition;
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
    setAnswers(prev => ({ ...prev, [currentQ.id]: opt.id }));
    setTimeout(() => {
      goToNext();
    }, 280);
  };

  const handleSliderChange = (val: number) => {
    setTouched(t => new Set(t).add(currentQ.id));
    setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
  };

  const handleNumberChange = (val: number) => {
    setTouched(t => new Set(t).add(currentQ.id));
    setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
  };

  const handleMultiChipToggle = (chipId: string) => {
    vibe(8);
    setAnswers(prev => {
      const existing: string[] = Array.isArray(prev.symptoms_chips) ? [...prev.symptoms_chips] : [];
      const idx = existing.indexOf(chipId);
      if (idx >= 0) existing.splice(idx, 1);
      else if (existing.length < 3) existing.push(chipId); // TWARDY limit max 3 (label nie kłamie)
      return { ...prev, symptoms_chips: existing };
    });
  };

  const handleTextChange = (text: string) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: text.slice(0, 500) }));
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08080a',
      color: '#f0f0f0',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Inter", sans-serif',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <Atmosphere />
      {/* ── TOP BAR: PROGRESS BAR + SEKCJA ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50, background: 'rgba(14,14,14,0.95)',
        backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Continuous progress line */}
        <div style={{ width: '100%', height: 3, background: 'rgba(200,168,78,0.12)' }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg, #c8a84e, #e8cc80)',
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 10px rgba(200,168,78,0.5)',
          }} />
        </div>

        <div style={{
          maxWidth: 520, margin: '0 auto', padding: '12px 18px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {/* Przycisk wstecz */}
          {currentIndex > 0 ? (
            <button
              onClick={goToPrev}
              style={{
                background: 'none', border: 'none', color: '#c8a84e',
                fontFamily: 'monospace', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 0',
              }}
            >
              &larr; Wstecz
            </button>
          ) : <div />}

          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#c8a84e', fontWeight: 700 }}>
            {currentQ.sectionNum}. {currentQ.section}
          </div>

          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#888', fontVariantNumeric: 'tabular-nums' }}>
            {visiblePos} / {visibleTotal}
          </div>
        </div>
      </div>

      {/* ── EKRAN PYTANIA (1 NA WIDOK) ── */}
      <div style={{
        flex: 1, maxWidth: 520, width: '100%', margin: '0 auto', padding: '24px 20px 100px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box',
        position: 'relative', zIndex: 1,
        opacity: transitionState === 'out' ? 0 : 1,
        transform: transitionState === 'out' ? 'translateY(-12px)' : transitionState === 'in' ? 'translateY(12px)' : 'none',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}>
        {/* Tytuł pytania */}
        <h2 style={{
          fontFamily: 'Georgia, serif',
          fontSize: 'clamp(24px, 5.8vw, 32px)',
          fontWeight: 400,
          lineHeight: 1.25,
          color: '#ffffff',
          marginBottom: currentQ.subtitle ? 10 : 24,
          letterSpacing: '-0.01em',
        }}>
          {currentQ.title}
        </h2>

        {/* Podtytuł */}
        {currentQ.subtitle && (
          <p style={{ fontSize: 14.5, color: '#999999', lineHeight: 1.55, marginBottom: 28 }}>
            {currentQ.subtitle}
          </p>
        )}

        {/* TYP 1: SINGLE CHOICE CARDS */}
        {currentQ.type === 'single' && currentQ.options && (
          <div style={{ display: 'grid', gap: 12 }}>
            {currentQ.options.map(opt => {
              const isSelected = answers[currentQ.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSingleSelect(opt)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    minHeight: 56, padding: '16px 20px', borderRadius: 14,
                    background: isSelected ? 'rgba(200,168,78,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${isSelected ? '#c8a84e' : 'rgba(255,255,255,0.08)'}`,
                    color: isSelected ? '#ffffff' : '#dddddd',
                    fontSize: 15.5, fontWeight: isSelected ? 600 : 400,
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 20px rgba(200,168,78,0.15)' : 'none',
                  }}
                >
                  <span>{opt.label}</span>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: `2px solid ${isSelected ? '#c8a84e' : '#555'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSelected ? '#c8a84e' : 'transparent', flexShrink: 0, marginLeft: 12,
                  }}>
                    {isSelected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0e0e0e' }} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {currentQ.type === 'single' && currentQ.optional && (
          <button
            onClick={goToNext}
            style={{
              marginTop: 14, width: '100%', padding: '12px', borderRadius: 12,
              background: 'transparent', color: '#888',
              fontWeight: 600, fontSize: 13, border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', letterSpacing: 0.5,
            }}
          >
            Pomiń to pytanie
          </button>
        )}

        {/* TYP 2: SLIDER */}
        {currentQ.type === 'slider' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{
              textAlign: 'center', fontFamily: 'monospace', fontSize: 48, fontWeight: 900,
              color: '#c8a84e', marginBottom: 20, fontVariantNumeric: 'tabular-nums',
            }}>
              {fmtVal(Number(answers[currentQ.id] ?? currentQ.min ?? 7), currentQ.unit)}
            </div>

            <input
              type="range"
              min={currentQ.min ?? 4}
              max={currentQ.max ?? 12}
              step={currentQ.step ?? 0.5}
              value={Number(answers[currentQ.id] ?? currentQ.min ?? 7)}
              onPointerDown={() => { if (answers[currentQ.id] === undefined) handleSliderChange(Number(currentQ.min ?? 7)); }}
              onChange={e => handleSliderChange(parseFloat(e.target.value))}
              style={{
                width: '100%', height: 10, borderRadius: 5, accentColor: '#c8a84e',
                background: 'rgba(255,255,255,0.1)', cursor: 'pointer', outline: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: 11, color: '#666', marginTop: 12 }}>
              <span>{fmtVal(currentQ.min ?? 0, currentQ.unit)}</span>
              <span>{fmtVal(currentQ.max ?? 0, currentQ.unit)}</span>
            </div>

            <button
              onClick={goToNext}
              disabled={!advanceOk}
              style={{
                marginTop: 36, width: '100%', padding: '16px', borderRadius: 14,
                background: 'linear-gradient(135deg, #c8a84e, #8a7535)', color: '#0e0e0e',
                fontWeight: 800, fontSize: 15, border: 'none', cursor: advanceOk ? 'pointer' : 'not-allowed',
                opacity: advanceOk ? 1 : 0.4,
                letterSpacing: 1, textTransform: 'uppercase',
              }}
            >
              Zatwierdź &rarr;
            </button>
          </div>
        )}

        {/* TYP 3: NUMBER INPUT */}
        {currentQ.type === 'number' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 28 }}>
              <input
                type="number"
                min={currentQ.min ?? 0}
                max={currentQ.max ?? 10000}
                value={Number(answers[currentQ.id] ?? 300)}
                onChange={e => handleNumberChange(parseInt(e.target.value, 10) || 0)}
                style={{
                  flex: 1, padding: '16px', borderRadius: 14, background: 'rgba(255,255,255,0.04)',
                  border: '1.5px solid rgba(200,168,78,0.4)', color: '#ffffff',
                  fontFamily: 'monospace', fontSize: 24, fontWeight: 700, outline: 'none',
                }}
              />
              <span style={{ fontFamily: 'monospace', fontSize: 18, color: '#c8a84e', fontWeight: 700 }}>
                {currentQ.unit} / mies.
              </span>
            </div>

            <button
              onClick={goToNext}
              disabled={!advanceOk}
              style={{
                width: '100%', padding: '16px', borderRadius: 14,
                background: 'linear-gradient(135deg, #c8a84e, #8a7535)', color: '#0e0e0e',
                fontWeight: 800, fontSize: 15, border: 'none', cursor: advanceOk ? 'pointer' : 'not-allowed',
                opacity: advanceOk ? 1 : 0.4,
                letterSpacing: 1, textTransform: 'uppercase',
              }}
            >
              Zatwierdź &rarr;
            </button>
          </div>
        )}

        {/* TYP 4: MULTI SELECT CHIPS */}
        {currentQ.type === 'multi' && currentQ.options && (
          <div style={{ display: 'grid', gap: 10 }}>
            {currentQ.options.map(opt => {
              const selectedArr: string[] = Array.isArray(answers.symptoms_chips) ? answers.symptoms_chips : [];
              const isSelected = selectedArr.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => handleMultiChipToggle(opt.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    minHeight: 52, padding: '14px 18px', borderRadius: 12,
                    background: isSelected ? 'rgba(200,168,78,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${isSelected ? '#c8a84e' : 'rgba(255,255,255,0.08)'}`,
                    color: isSelected ? '#ffffff' : '#cccccc', fontSize: 15, fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease',
                  }}
                >
                  <span>{opt.label}</span>
                  <span style={{
                    width: 22, height: 22, borderRadius: 6,
                    border: `2px solid ${isSelected ? '#c8a84e' : '#555'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSelected ? '#c8a84e' : 'transparent', color: '#0e0e0e', fontWeight: 900, fontSize: 12,
                  }}>
                    {isSelected ? '✓' : ''}
                  </span>
                </button>
              );
            })}

            <button
              onClick={goToNext}
              disabled={!advanceOk}
              style={{
                marginTop: 20, width: '100%', padding: '16px', borderRadius: 14,
                background: 'linear-gradient(135deg, #c8a84e, #8a7535)', color: '#0e0e0e',
                fontWeight: 800, fontSize: 15, border: 'none', cursor: advanceOk ? 'pointer' : 'not-allowed',
                opacity: advanceOk ? 1 : 0.4,
                letterSpacing: 1, textTransform: 'uppercase',
              }}
            >
              Dalej ({Array.isArray(answers.symptoms_chips) ? answers.symptoms_chips.length : 0}) &rarr;
            </button>
          </div>
        )}

        {/* TYP 5: TEXT INPUT (SŁOWA USERA LEADA) */}
        {currentQ.type === 'text' && (
          <div>
            <textarea
              rows={4}
              placeholder="np. Trenuję regularnie, trzymam miskę w dzień, ale po 21:00 zjadam pół lodówki i w poniedziałki w ogóle nie mam siły..."
              value={String(answers[currentQ.id] || '')}
              onChange={e => handleTextChange(e.target.value)}
              style={{
                width: '100%', padding: '16px', borderRadius: 14, background: 'rgba(255,255,255,0.04)',
                border: '1.5px solid rgba(200,168,78,0.4)', color: '#ffffff',
                fontSize: 15, lineHeight: 1.6, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: '#666', marginTop: 6 }}>
              {String(answers[currentQ.id] || '').length} / 500 znaków
            </div>

            {/* Antybełkot: ktoś naklepał byle co ("zzz", "asdfgh") -> pociśnij w głosie Michała */}
            {isGibberish(String(answers[currentQ.id] || '')) && (
              <div style={{
                marginTop: 14, padding: '14px 16px', borderRadius: 12,
                background: 'rgba(220,70,60,0.10)', border: '1.5px solid rgba(220,70,60,0.45)',
                color: '#ff8f84', fontSize: 14.5, lineHeight: 1.55, fontWeight: 500,
              }}>
                Stary, nie wal w chuja. Jak nie chce Ci się tego wypełniać i klepiesz byle co, to wyjdź stąd i nie marnuj mojego czasu. A chcesz, żebym Ci realnie pomógł? Napisz jedno prawdziwe zdanie, co Cię wkurwia.
              </div>
            )}
            {/* Za mało treści (ale nie bełkot): miękka podpowiedź, bez krzyku */}
            {!isGibberish(String(answers[currentQ.id] || '')) && String(answers[currentQ.id] || '').trim().length > 0 && !enoughContent(String(answers[currentQ.id] || '')) && (
              <div style={{ marginTop: 12, fontSize: 13.5, color: '#999', lineHeight: 1.5 }}>
                Napisz jedno pełne zdanie własnymi słowami. Bez tego nie ruszymy dalej.
              </div>
            )}

            <button
              onClick={goToNext}
              disabled={!advanceOk}
              style={{
                marginTop: 20, width: '100%', padding: '16px', borderRadius: 14,
                background: 'linear-gradient(135deg, #c8a84e, #8a7535)', color: '#0e0e0e',
                fontWeight: 800, fontSize: 15, border: 'none', cursor: advanceOk ? 'pointer' : 'not-allowed',
                opacity: advanceOk ? 1 : 0.4,
                letterSpacing: 1, textTransform: 'uppercase',
              }}
            >
              Dalej &rarr;
            </button>
          </div>
        )}

        {/* TYP 6: KONTAKT (IG wymagane + imie opcjonalne) — ostatni ekran przed wynikiem */}
        {currentQ.type === 'contact' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 12 }}>
              <span style={{
                padding: '16px 10px 16px 16px', borderRadius: '14px 0 0 14px', background: 'rgba(255,255,255,0.04)',
                borderTop: '1.5px solid rgba(200,168,78,0.4)', borderBottom: '1.5px solid rgba(200,168,78,0.4)',
                borderLeft: '1.5px solid rgba(200,168,78,0.4)', color: '#c8a84e',
                fontFamily: 'monospace', fontSize: 20, fontWeight: 800,
              }}>@</span>
              <input
                type="text"
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="twoj_nick"
                value={String(answers.instagram || '').replace(/^@/, '')}
                onChange={e => setAnswers(prev => ({ ...prev, instagram: e.target.value.replace(/[@\s]/g, '').slice(0, 40) }))}
                style={{
                  flex: 1, padding: '16px', borderRadius: '0 14px 14px 0', background: 'rgba(255,255,255,0.04)',
                  border: '1.5px solid rgba(200,168,78,0.4)', borderLeft: 'none', color: '#ffffff',
                  fontSize: 17, fontWeight: 600, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <input
              type="text"
              placeholder="Imię (opcjonalnie)"
              value={String(answers.imie || '')}
              onChange={e => setAnswers(prev => ({ ...prev, imie: e.target.value.slice(0, 40) }))}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)',
                border: '1.5px solid rgba(255,255,255,0.08)', color: '#ffffff',
                fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 8,
              }}
            />

            <button
              onClick={goToNext}
              disabled={!advanceOk}
              style={{
                marginTop: 20, width: '100%', padding: '16px', borderRadius: 14,
                background: 'linear-gradient(135deg, #c8a84e, #8a7535)', color: '#0e0e0e',
                fontWeight: 800, fontSize: 15, border: 'none', cursor: advanceOk ? 'pointer' : 'not-allowed',
                opacity: advanceOk ? 1 : 0.4,
                letterSpacing: 1, textTransform: 'uppercase',
              }}
            >
              Pokaż mój wynik &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
