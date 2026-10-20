// Wspólna walidacja: UI, komplet sesji i endpoint leadowy. Nie myl 0 z brakiem odpowiedzi.
import { INIT } from './diagnostic-core.ts';
import { QUESTIONS, type QuestionDef } from './assessment-config.ts';

type AnswerBag = Record<string, unknown>;

const PLACEHOLDER_HANDLES = new Set(['brak', 'none', 'unknown', 'anonim', 'anonymous', 'niewiem', 'niema', 'testtest']);

export function cleanInstagram(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^@/, '').toLowerCase();
}

export function validInstagram(value: unknown): boolean {
  const handle = cleanInstagram(value);
  return /^[a-z0-9._]{2,30}$/.test(handle)
    && !handle.startsWith('.') && !handle.endsWith('.')
    && !handle.includes('..') && !PLACEHOLDER_HANDLES.has(handle);
}

export function validEmail(value: unknown): boolean {
  return typeof value === 'string'
    && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
    && value.trim().length <= 254;
}

export function isGibberish(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  const letters = t.replace(/[^a-ząćęłńóśźż]/g, '');
  if (letters.length < 5) return false;
  if (/(.)\1{3,}/.test(t)) return true;
  if (letters.length >= 10 && new Set(letters).size < 5) return true;
  const vowels = (letters.match(/[aeiouyąęó]/g) || []).length;
  if (letters.length >= 6 && (vowels === 0 || vowels / letters.length > 0.85)) return true;
  return t.split(/\s+/).some(w => /[bcdfghjklmnpqrstvwxzżźćńłś]{6,}/.test(w));
}

export function enoughContent(raw: string): boolean {
  const t = raw.trim();
  if (t.length < 15) return false;
  return t.toLowerCase().split(/\s+/)
    .filter(w => w.replace(/[^a-ząćęłńóśźż]/g, '').length >= 2).length >= 3;
}

function missing(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === 'string' && !v.trim());
}

export function validAnswer(q: QuestionDef, answers: AnswerBag): boolean {
  const v = answers[q.id];
  if (missing(v)) return q.optional === true;
  switch (q.type) {
    case 'single':
      return typeof v === 'string' && !!q.options?.some(o => o.id === v);
    case 'slider':
    case 'number': {
      if (typeof v !== 'number' || !Number.isFinite(v)) return false;
      if (q.id === 'missed_trainings' && typeof answers.planned_trainings === 'number' && v > answers.planned_trainings) return false;
      if (v < (q.min ?? Number.NEGATIVE_INFINITY) || v > (q.max ?? Number.POSITIVE_INFINITY)) return false;
      const step = q.step ?? 1;
      return step > 0 && Math.abs((v - (q.min ?? 0)) / step - Math.round((v - (q.min ?? 0)) / step)) < 1e-6;
    }
    case 'multi': {
      if (!Array.isArray(v) || v.length < 1 || v.length > 3) return false;
      const allowed = new Set((q.options || []).map(o => o.id));
      return new Set(v).size === v.length && v.every(id => typeof id === 'string' && allowed.has(id));
    }
    case 'text':
      return typeof v === 'string' && v.length <= 500 && enoughContent(v) && !isGibberish(v);
    case 'contact':
      return validInstagram(v);
  }
}

export function invalidDiagnosticFields(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ['answers'];
  const answers = raw as AnswerBag;
  return QUESTIONS.filter(q => !q.condition || q.condition(answers))
    .filter(q => !validAnswer(q, answers))
    .map(q => q.id);
}

// Only active, validated answers can influence a result or leave the server.
export function activeDiagnosticAnswers(raw: AnswerBag): AnswerBag {
  const active: AnswerBag = {};
  for (const q of QUESTIONS) {
    if ((!q.condition || q.condition(raw)) && validAnswer(q, raw) && !missing(raw[q.id])) {
      active[q.id] = q.type === 'contact' ? cleanInstagram(raw[q.id])
        : typeof raw[q.id] === 'string' ? (raw[q.id] as string).trim() : raw[q.id];
    }
  }
  if (typeof raw.imie === 'string' && raw.imie.trim()) active.imie = raw.imie.trim().slice(0, 40);
  return active;
}

export function answerHint(q: QuestionDef, answers: AnswerBag): string {
  if (validAnswer(q, answers)) return '';
  switch (q.type) {
    case 'slider': case 'number':
      if (q.id === 'missed_trainings' && typeof answers.planned_trainings === 'number')
        return `Podaj liczbę od 0 do ${answers.planned_trainings}, zgodnie z planem treningów.`;
      return `Wybierz liczbę od ${q.min ?? 0} do ${q.max ?? 10000}${q.min === 0 ? '. Zero też jest odpowiedzią' : ''}.`;
    case 'text': return 'Napisz jedno zdanie: minimum 15 znaków i 3 słowa, maksymalnie 500 znaków.';
    case 'contact': return 'Podaj nick Instagram: 2–30 znaków, litery, cyfry, kropki lub podkreślniki. Bez spacji i linku.';
    case 'multi': return 'Wybierz od 1 do 3 odpowiedzi.';
    case 'single': return 'Wybierz jedną odpowiedź.';
  }
}

// The retained V1 endpoint consumes FD, not the V2 questionnaire answer IDs.
// Require the full numeric snapshot it actually sends, never an arbitrary non-empty object.
export function validLegacyDiagnosticAnswers(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const a = value as AnswerBag;
  const numericKeys = Object.entries(INIT).filter(([key, v]) => typeof v === 'number' && key !== 'supps').map(([key]) => key);
  if (!numericKeys.every(key => typeof a[key] === 'number' && Number.isFinite(a[key]))) return false;
  return (a.age as number) >= 18 && (a.age as number) <= 50
    && (a.sleep as number) >= 0 && (a.sleep as number) <= 24
    && (a.plan as number) >= 0 && (a.plan as number) <= 7
    && (a.miss as number) >= 0 && (a.miss as number) <= (a.plan as number)
    && Array.isArray(a.tags) && a.tags.every(t => typeof t === 'string' && t.trim().length > 0)
    && typeof a.pain === 'string' && enoughContent(a.pain) && !isGibberish(a.pain);
}
