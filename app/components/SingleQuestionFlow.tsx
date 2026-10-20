'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { QUESTIONS, QuestionDef, QuestionOption } from '../lib/assessment-config';
import { RawAnswers } from '../lib/scoring-engine';
import { track } from '../lib/analytics';
import { Atmosphere } from '../diagnoza/atmosphere';
import { activeDiagnosticAnswers, answerHint, invalidDiagnosticFields, validAnswer, validInstagram } from '../lib/lead-integrity';

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

export default function SingleQuestionFlow({ onComplete, initialAnswers }: Props) {
  const [answers, setAnswers] = useState<RawAnswers>(() => {
    if (initialAnswers && Object.keys(initialAnswers).length > 0) return initialAnswers;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as RawAnswers;
        }
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
          if (!isNaN(parsed) && parsed >= 0 && parsed < QUESTIONS.length) {
            const visible = QUESTIONS.findIndex((q, i) => i >= parsed && (!q.condition || q.condition(answers)));
            return visible >= 0 ? visible : 0;
          }
        }
      } catch (_e) {}
    }
    return 0;
  });

  const [transitionState, setTransitionState] = useState<'idle' | 'out' | 'in'>('idle');
  const [flowErr, setFlowErr] = useState('');

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

  // Jeden kontrakt wymaganych odpowiedzi dla UI i API. Zero jest poprawną odpowiedzią.
  const advanceOk = validAnswer(currentQ, answers as Record<string, unknown>);
  const hint = answerHint(currentQ, answers);
  const numericMax = currentQ.id === 'missed_trainings' && typeof answers.planned_trainings === 'number'
    ? answers.planned_trainings : currentQ.max;

  // Haptic feedback na mobile
  const vibe = useCallback((pattern: number | number[] = 8) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (_e) {}
  }, []);

  const goToNext = useCallback((nextAnswers: RawAnswers = answers) => {
    // Walidacja także w handlerze: nie da się obejść disabled ani ominąć pola z przywróconej sesji.
    if (!validAnswer(currentQ, nextAnswers as Record<string, unknown>)) {
      setFlowErr(answerHint(currentQ, nextAnswers));
      return;
    }
    setFlowErr('');
    let next = currentIndex + 1;
    while (next < QUESTIONS.length) {
      const c = QUESTIONS[next].condition;
      if (!c || c(nextAnswers as Record<string, unknown>)) break;
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
      const invalid = invalidDiagnosticFields(nextAnswers);
      if (invalid.length) {
        const first = QUESTIONS.findIndex(q => q.id === invalid[0]);
        setCurrentIndex(Math.max(0, first));
        setFlowErr('Dokończ brakującą odpowiedź, zanim wyświetlimy wynik.');
        return;
      }
      vibe([20, 50, 20]);
      onComplete(activeDiagnosticAnswers(nextAnswers) as RawAnswers);
    }
  }, [currentIndex, currentQ, answers, onComplete, vibe]);

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
    const updated = { ...answers, [currentQ.id]: opt.id };
    setAnswers(updated);
    // Warunki kolejnego pytania muszą widzieć wybór z TEGO kliknięcia, nie poprzedni render.
    setTimeout(() => goToNext(updated), 280);
  };

  const handleSliderChange = (val: number) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
  };

  const handleNumberChange = (val: number) => {
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
        <h2 id="diagnostic-question" style={{
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

        {flowErr && <p role="alert" style={{ color: '#ff8f84', fontSize: 13.5, lineHeight: 1.45 }}>{flowErr}</p>}

        {/* Podtytuł */}
        {currentQ.subtitle && (
          <p style={{ fontSize: 14.5, color: '#999999', lineHeight: 1.55, marginBottom: 28 }}>
            {currentQ.subtitle}
          </p>
        )}

        {hint && <p id="answer-hint" role="status" aria-live="polite" style={{ color: '#d5bd7a', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 16px' }}>{hint}</p>}

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
            onClick={() => goToNext()}
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
              aria-labelledby="diagnostic-question"
              aria-describedby={hint ? "answer-hint" : undefined}
              min={currentQ.min ?? 4}
              max={numericMax ?? 12}
              step={currentQ.step ?? 0.5}
              value={Number(answers[currentQ.id] ?? currentQ.min ?? 7)}
              onPointerDown={() => { if (answers[currentQ.id] === undefined) handleSliderChange(Number(currentQ.min ?? 7)); }}
              onKeyDown={e => {
                if (answers[currentQ.id] === undefined && ['Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
                  handleSliderChange(Number(e.currentTarget.value));
                }
              }}
              onChange={e => handleSliderChange(parseFloat(e.target.value))}
              style={{
                width: '100%', height: 10, borderRadius: 5, accentColor: '#c8a84e',
                background: 'rgba(255,255,255,0.1)', cursor: 'pointer', outline: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: 11, color: '#666', marginTop: 12 }}>
              <span>{fmtVal(currentQ.min ?? 0, currentQ.unit)}</span>
              <span>{fmtVal(numericMax ?? 0, currentQ.unit)}</span>
            </div>

            <button
              onClick={() => goToNext()}
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
                aria-labelledby="diagnostic-question"
                aria-describedby={hint ? "answer-hint" : undefined}
                step={currentQ.step ?? 1}
                min={currentQ.min ?? 0}
                max={currentQ.max ?? 10000}
                value={typeof answers[currentQ.id] === 'number' ? answers[currentQ.id] as number : ''}
                placeholder="Wpisz liczbę"
                onChange={e => {
                  if (e.target.value === '') {
                    setAnswers(prev => ({ ...prev, [currentQ.id]: undefined }));
                  } else {
                    handleNumberChange(Number(e.target.value));
                  }
                }}
                style={{
                  flex: 1, minWidth: 0, padding: '16px', borderRadius: 14, background: 'rgba(255,255,255,0.04)',
                  border: '1.5px solid rgba(200,168,78,0.4)', color: '#ffffff',
                  fontFamily: 'monospace', fontSize: 24, fontWeight: 700, outline: 'none',
                }}
              />
              <span style={{ fontFamily: 'monospace', fontSize: 18, color: '#c8a84e', fontWeight: 700 }}>
                {currentQ.unit} / mies.
              </span>
            </div>

            <button
              onClick={() => goToNext()}
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
              onClick={() => goToNext()}
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
              aria-labelledby="diagnostic-question"
              aria-describedby={hint ? "answer-hint" : undefined}
              aria-invalid={!advanceOk}
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

            <button
              onClick={() => goToNext()}
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
                aria-label="Nick Instagram"
                aria-describedby={hint ? "answer-hint" : undefined}
                value={String(answers.instagram || '').replace(/^@/, '')}
                onChange={e => { setFlowErr(''); setAnswers(prev => ({ ...prev, instagram: e.target.value.replace(/^@/, '').slice(0, 40) })); }}
                aria-invalid={Boolean(answers.instagram) && !validInstagram(answers.instagram)}
                style={{
                  flex: 1, minWidth: 0, padding: '16px', borderRadius: '0 14px 14px 0', background: 'rgba(255,255,255,0.04)',
                  border: '1.5px solid rgba(200,168,78,0.4)', borderLeft: 'none', color: '#ffffff',
                  fontSize: 17, fontWeight: 600, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {Boolean(answers.instagram) && !validInstagram(answers.instagram) && (
              <p role="alert" style={{ color: '#ff8f84', fontSize: 12.5, margin: '0 0 12px' }}>
                Podaj prawdziwy nick Instagram: 2–30 znaków, litery, cyfry, kropki lub podkreślniki.
              </p>
            )}

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
              onClick={() => goToNext()}
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
