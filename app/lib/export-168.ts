// ── EKSPORT CSV: wszystkie odpowiedzi z Mapy 168 z kanonicznego CRM (Notion "Leady"). ──
// Czysta funkcja: strony Notion (data_sources/{id}/query) -> CSV. Bez sieci, bez PII w logach.
// Kolumny: metadane rekordu + jedno pole na pytanie (czytelna etykieta, nie id) + sygnaly ogona 168.
// Separator ';' i BOM, bo Excel w polskich ustawieniach inaczej sklada wszystko w jedna kolumne.
import { QUESTIONS } from './assessment-config.ts';
import { buildReplySignals } from './reply-priority.ts';

type Json = Record<string, unknown>;

export interface Lead168Row {
  page_id: string;
  created_time: string;
  sync_at: string;
  name: string;
  instagram: string;
  lead_ref: string;
  record_type: string;
  exclude_kpi: boolean;
  acquisition_channel: string;
  acquisition_detail: string;
  raw_answers_text: string;
  derived_text: string;
}

function prop(page: Json, name: string): Json {
  const props = (page.properties ?? {}) as Json;
  return (props[name] ?? {}) as Json;
}

function richText(p: Json): string {
  const arr = (p.rich_text ?? p.title ?? []) as Array<{ plain_text?: string; text?: { content?: string } }>;
  return Array.isArray(arr) ? arr.map(t => t.plain_text ?? t.text?.content ?? '').join('') : '';
}

export function rowFromNotionPage(page: Json): Lead168Row {
  const sel = (n: string) => String(((prop(page, n).select ?? {}) as Json).name ?? '');
  return {
    page_id: String(page.id ?? ''),
    created_time: String(page.created_time ?? ''),
    sync_at: String(((prop(page, 'Diagnostyka Sync At').date ?? {}) as Json).start ?? ''),
    name: richText(prop(page, 'Name')),
    instagram: richText(prop(page, 'Instagram')),
    lead_ref: richText(prop(page, 'Lead Ref')),
    record_type: sel('Record Type'),
    exclude_kpi: prop(page, 'Exclude from KPI').checkbox === true,
    acquisition_channel: sel('Acquisition Channel'),
    acquisition_detail: richText(prop(page, 'Acquisition Detail')),
    raw_answers_text: richText(prop(page, 'Raw Answers JSON')),
    derived_text: richText(prop(page, 'Derived Signals JSON')),
  };
}

function parse(text: string): { ok: boolean; value: Json } {
  if (!text.trim()) return { ok: false, value: {} };
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? { ok: true, value: v as Json } : { ok: false, value: {} };
  } catch {
    return { ok: false, value: {} };
  }
}

// Czytelna wartosc odpowiedzi: etykieta opcji, lista etykiet, liczba z jednostka, tekst wlasny.
export function answerCell(qid: string, value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  const q = QUESTIONS.find(x => x.id === qid);
  if (!q) return typeof value === 'string' ? value : JSON.stringify(value);
  if (Array.isArray(value)) {
    return value.map(id => q.options?.find(o => o.id === id)?.label ?? String(id)).join(' | ');
  }
  if (typeof value === 'string') {
    return q.options?.find(o => o.id === value)?.label
      ?? q.quickAnswers?.find(o => o.id === value)?.label
      ?? value;
  }
  return String(value);
}

// Kolumny pytan: wszystkie pytania z configu w jego kolejnosci. Wylaczone zostaja jako puste kolumny,
// bo starsze rekordy moga je miec.
const ANSWER_COLUMNS = QUESTIONS.map(q => q.id);
const EXTRA_ANSWER_KEYS = ['imie'];

const META_COLUMNS = [
  'priorytet_odpisu', 'data', 'instagram', 'imie_crm', 'lead_ref', 'zrodlo', 'zrodlo_szczegol',
  'record_type', 'wykluczony_z_kpi', 'json_ok', 'score', 'severity_band', 'archetyp',
  'wydatek_12m', 'wydatek_1000_plus', 'pilnosc_wypelniona', 'status_proby', 'opis_proby_stan', 'wynik_proby',
];

export function csvEscape(v: unknown, sep: string): string {
  const s = v === undefined || v === null ? '' : String(v);
  // Formula injection w Excelu: komorka zaczynajaca sie od = + - @ dostaje apostrof.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /["\n\r]/.test(safe) || safe.includes(sep) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export interface ExportOptions {
  includeTest?: boolean; // domyslnie TEST i wykluczone z KPI odpadaja
  sep?: string;
  bom?: boolean;
}

export function toCsv168(rows: Lead168Row[], opts: ExportOptions = {}): { csv: string; count: number; priority: number; brokenJson: number } {
  const sep = opts.sep ?? ';';
  const kept = rows.filter(r => opts.includeTest || (r.record_type !== 'TEST' && !r.exclude_kpi));
  kept.sort((a, b) => (a.sync_at || a.created_time).localeCompare(b.sync_at || b.created_time));
  const header = [...META_COLUMNS, ...ANSWER_COLUMNS.map(id => `q_${id}`), ...EXTRA_ANSWER_KEYS.map(k => `q_${k}`)];
  const lines = [header.map(h => csvEscape(h, sep)).join(sep)];
  let priority = 0;
  let brokenJson = 0;
  for (const r of kept) {
    const raw = parse(r.raw_answers_text);
    const derived = parse(r.derived_text).value;
    if (!raw.ok) brokenJson++;
    const s = buildReplySignals(raw.value);
    if (s.priority_reply) priority++;
    const meta = [
      s.priority_reply ? 'TAK' : '',
      r.sync_at || r.created_time,
      r.instagram,
      r.name,
      r.lead_ref,
      r.acquisition_channel,
      r.acquisition_detail,
      r.record_type,
      r.exclude_kpi ? 'TAK' : '',
      raw.ok ? 'TAK' : 'NIE (ucięty lub pusty Raw Answers JSON)',
      derived.score ?? '',
      derived.severity_band ?? '',
      derived.archetyp ?? '',
      s.spend_12m_label,
      s.has_tail ? (s.spend_1k_plus ? 'TAK' : 'NIE') : '',
      s.has_tail ? (s.urgency_filled ? 'TAK' : 'NIE') : '',
      answerCell('attempt_status', s.attempt_status),
      s.has_tail ? s.attempt_desc_state : '',
      answerCell('attempt_result', s.attempt_result),
    ];
    const answers = [...ANSWER_COLUMNS, ...EXTRA_ANSWER_KEYS].map(id => answerCell(id, raw.value[id]));
    lines.push([...meta, ...answers].map(v => csvEscape(v, sep)).join(sep));
  }
  const body = lines.join('\r\n') + '\r\n';
  return { csv: (opts.bom ?? true) ? `﻿${body}` : body, count: kept.length, priority, brokenJson };
}
