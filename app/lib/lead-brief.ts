// ── LEAD BRIEF: pełny, czytelny zrzut WSZYSTKICH odpowiedzi leada dla personalizacji LLM ──
// Cel: nakarmić /api/diagnoza realnymi wyborami usera (etykiety, liczby, własne słowa),
// żeby reframe cytował JEGO tydzień, a nie generował z 6 szablonów archetypu.
// Zero PII w briefie (bez IG i imienia). Zero score/wag, to nie jest do liczenia.

import { QUESTIONS, type QuestionDef } from './assessment-config';
import { type RawAnswers } from './scoring-engine';

// Pytania pominięte w briefie: kontakt (PII) + techniczne. Reszta idzie w całości.
const SKIP_IN_BRIEF = new Set(['instagram', 'imie', 'name']);

// Czytelna etykieta wybranej odpowiedzi dla jednego pytania.
function answerLabel(q: QuestionDef, raw: RawAnswers): string | null {
  const val = raw[q.id];

  if (q.type === 'single' || q.type === 'contact') {
    if (typeof val !== 'string' || !val) return null;
    const opt = q.options?.find(o => o.id === val);
    return opt ? opt.label : null;
  }

  if (q.type === 'multi') {
    const arr = Array.isArray(val) ? (val as string[]) : [];
    if (!arr.length) return null;
    const labels = arr.map(id => q.options?.find(o => o.id === id)?.label).filter(Boolean);
    return labels.length ? labels.join('; ') : null;
  }

  if (q.type === 'slider' || q.type === 'number') {
    if (typeof val !== 'number' || Number.isNaN(val)) return null;
    const u = (q.unit || '').trim();
    return u ? `${val} ${u}` : String(val);
  }

  if (q.type === 'text') {
    if (typeof val !== 'string' || !val.trim()) return null;
    return `„${val.trim()}”`;
  }

  return null;
}

// Krótki, gęsty tytuł tematu pytania do briefu (bez znaku zapytania, w formie hasła).
function briefKey(q: QuestionDef): string {
  const map: Record<string, string> = {
    age: 'Wiek',
    sleep_quality: 'Budzi się wyspany',
    break_window: 'Dzień psuje się',
    stress_level: 'Głowa wieczorem w robocie',
    half_power_hours: 'Godzin na pół mocy dziennie',
    evening_eating: 'Jedzenie po 18:00',
    takeout_cost: 'Wydatek na dowozy / mies',
    planned_trainings: 'Planowane treningi / tydz',
    missed_trainings: 'Treningi wypadające przy gorszym tygodniu',
    weekend_pattern: 'Weekend psuje rytm',
    alcohol_intake: 'Używki w weekend',
    weekend_cash: 'Koszt jednego wyjścia',
    monday_recovery: 'Dni powrotu po weekendzie',
    symptoms_chips: 'Co najbardziej siada',
    morning_wood: 'Poranne wzwody',
    tried_before: 'Plany, które padły w tym roku',
    user_pain: 'Co go najbardziej wkurwia (własne słowa)',
    user_trigger: 'Czemu sprawdza to teraz (własne słowa)',
    user_selfdx: 'Co jego zdaniem go trzyma (własne słowa)',
    intent: 'Jak woli działać',
    start_when: 'Kiedy chce zacząć',
  };
  return map[q.id] || q.section;
}

export interface LeadBriefParts {
  brief: string;        // pełny, czytelny brief (wszystkie pola)
  pain: string;         // user_pain (własne słowa)
  trigger: string;      // user_trigger (własne słowa)
  selfDx: string;       // user_selfdx (własne słowa)
  hasFreeText: boolean; // czy jest cokolwiek własnymi słowami (gate na LLM)
}

// Zbiera cały brief + wyciąga 3 pola wolnego tekstu (BOL/TRIGGER/SELF-DX) osobno.
export function buildLeadBrief(raw: RawAnswers): LeadBriefParts {
  const lines: string[] = [];
  for (const q of QUESTIONS) {
    if (SKIP_IN_BRIEF.has(q.id)) continue;
    // pytania wycięte (condition: () => false) nie mają odpowiedzi, answerLabel zwróci null
    const label = answerLabel(q, raw);
    if (label == null) continue;
    lines.push(`${briefKey(q)}: ${label}`);
  }

  const pain = typeof raw.user_pain === 'string' ? raw.user_pain.trim() : '';
  const trigger = typeof raw.user_trigger === 'string' ? raw.user_trigger.trim() : '';
  const selfDx = typeof raw.user_selfdx === 'string' ? raw.user_selfdx.trim() : '';

  return {
    brief: lines.join('\n'),
    pain,
    trigger,
    selfDx,
    hasFreeText: Boolean(pain || trigger || selfDx),
  };
}
