// Wspólna walidacja: UI, komplet sesji i endpoint leadowy. Nie myl 0 z brakiem odpowiedzi.
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
      if (v < (q.min ?? Number.NEGATIVE_INFINITY) || v > (q.max ?? Number.POSITIVE_INFINITY)) return false;
      const step = q.step ?? 1;
      return step > 0 && Math.abs((v - (q.min ?? 0)) / step - Math.round((v - (q.min ?? 0)) / step)) < 1e-6;
    }
    case 'multi': {
      if (!Array.isArray(v) || v.length < 1 || v.length > (q.maxSelect ?? 3)) return false;
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
