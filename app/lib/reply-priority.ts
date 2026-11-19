// ── OGON 168: sygnaly dla operatora z pytan o probe, wydatek i pilnosc. POZA SCORINGIEM. ──
// Liczone po stronie serwera z raw_answers (nie ufamy fladze z przegladarki).
// PRIORYTET ODPISU = wydatek w ostatnich 12 mies. >= 1000 zl ORAZ wypelnione "co jak do lata nic sie nie zmieni".
// To kolejnosc odpisow Michala, nie ocena czlowieka i nie wejscie do wyniku.
import { QUESTIONS, TAIL_168_VERSION } from './assessment-config.ts';
import { enoughContent, isGibberish } from './lead-integrity.ts';

export const REPLY_PRIORITY_LABEL = 'PRIORYTET ODPISU';
// Audyt ICP 18.11: wyższy wydatek NIE oznacza dobrego dopasowania do współpracy.
// Flaga ustala tylko kolejność odpisów; dopasowanie pokazujemy osobno (fitHintLine).
export const REPLY_PRIORITY_NOTE = 'kolejność odpisu, nie ocena dopasowania';
const SPEND_1K_PLUS = new Set(['spend12_1k_5k', 'spend12_5k_plus']);

type Bag = Record<string, unknown>;

export type FreeTextState = 'opis' | 'nie_pamieta' | 'woli_rozmowe' | 'pominiete' | 'nie_dotyczy' | 'brak_pytania';

export interface ReplySignals {
  tail_version: string;
  has_tail: boolean; // false = sesja sprzed wdrozenia ogona (brak pytan, nie "odmowa")
  attempt_status: string;
  attempt_desc_state: FreeTextState;
  attempt_result: string;
  attempt_blocker_state: FreeTextState;
  spend_12m: string;
  spend_12m_label: string;
  spend_1k_plus: boolean;
  urgency_filled: boolean;
  priority_reply: boolean;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function filledText(v: unknown): boolean {
  const s = str(v);
  return s.length > 0 && s.length <= 500 && enoughContent(s) && !isGibberish(s);
}

function optionLabel(qid: string, id: string): string {
  const q = QUESTIONS.find(x => x.id === qid);
  return q?.options?.find(o => o.id === id)?.label ?? '';
}

function textState(raw: Bag, qid: string, applies: boolean, hasTail: boolean): FreeTextState {
  if (!hasTail) return 'brak_pytania';
  if (!applies) return 'nie_dotyczy';
  const v = str(raw[qid]);
  if (v === 'ad_nie_pamietam') return 'nie_pamieta';
  if (v === 'ad_rozmowa' || v === 'ab_rozmowa') return 'woli_rozmowe';
  return filledText(v) ? 'opis' : 'pominiete';
}

export function buildReplySignals(rawInput: unknown): ReplySignals {
  const raw = (rawInput && typeof rawInput === 'object' && !Array.isArray(rawInput) ? rawInput : {}) as Bag;
  const status = str(raw.attempt_status);
  const spend = str(raw.spend_12m);
  // Ogon jest obowiazkowy od statusu proby i wydatku; brak obu = stary klient.
  const hasTail = Boolean(status || spend);
  const tried = status === 'att_active' || status === 'att_past';
  const spend1k = SPEND_1K_PLUS.has(spend);
  const urgency = filledText(raw.if_nothing_changes);
  return {
    tail_version: hasTail ? TAIL_168_VERSION : '',
    has_tail: hasTail,
    attempt_status: status,
    attempt_desc_state: textState(raw, 'attempt_desc', tried, hasTail),
    attempt_result: tried ? str(raw.attempt_result) : '',
    attempt_blocker_state: textState(raw, 'attempt_blocker', status === 'att_none', hasTail),
    spend_12m: spend,
    spend_12m_label: spend ? optionLabel('spend_12m', spend) : '',
    spend_1k_plus: spend1k,
    urgency_filled: urgency,
    priority_reply: spend1k && urgency,
  };
}

// Jedna linia na sama gore briefu w CRM, zeby priorytet byl widoczny bez otwierania JSON.
export function replyPriorityHeader(s: ReplySignals): string {
  if (!s.has_tail) return '';
  const spend = s.spend_12m_label ? `wydatek 12 mies.: ${s.spend_12m_label}` : 'wydatek 12 mies.: brak odpowiedzi';
  const urgency = s.urgency_filled ? 'pilność: wypełniona' : 'pilność: pusta';
  return s.priority_reply
    ? `${REPLY_PRIORITY_LABEL} (${REPLY_PRIORITY_NOTE}) · ${spend} · ${urgency}`
    : `Kolejka zwykła · ${spend} · ${urgency}`;
}

// Sygnały dopasowania, celowo oddzielone od wydatku: co się stało z próbą i co robi po dostaniu kierunku.
// To materiał do oceny przez Michała, nie automatyczny werdykt.
export function fitHintLine(rawInput: unknown): string {
  const raw = (rawInput && typeof rawInput === 'object' && !Array.isArray(rawInput) ? rawInput : {}) as Bag;
  const status = str(raw.attempt_status);
  if (!status && !str(raw.spend_12m)) return '';
  const tried = status === 'att_active' || status === 'att_past';
  const attempt = tried
    ? (optionLabel('attempt_result', str(raw.attempt_result)) || optionLabel('attempt_status', status))
    : optionLabel('attempt_status', status);
  const agency = optionLabel('agency_mode', str(raw.agency_mode));
  const parts = [attempt && `próba: ${attempt}`, agency && `po kierunku: ${agency}`].filter(Boolean);
  return parts.length ? `DOPASOWANIE (osobno od wydatku): ${parts.join(' · ')}` : '';
}
