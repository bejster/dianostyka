export const FUNNEL_PILOT_VERSION = 'pilot_v1';

const SAFE_INBOUND_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

const SAFE_CONTEXT_KEYS = [
  ...SAFE_INBOUND_KEYS,
  'funnel_version',
  'funnel_referrer',
  'origin_utm_content',
  'diagnostic_segment',
  'diagnostic_score_bucket',
  'diagnostic_top_category',
  'diagnostic_intent',
] as const;

function clean(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return normalized ? normalized.slice(0, 120) : null;
}

function paramsFrom(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

const BLOCKED_ANALYTICS_KEY = /(email|e-mail|name|imie|phone|telefon|instagram|handle|raw_answer|odpowiedzi)/i;

export function sanitizeAnalyticsData(data?: Record<string, unknown>): Record<string, unknown> {
  if (!data) return {};
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => !BLOCKED_ANALYTICS_KEY.test(key)),
  );
}

export function isFunnelDryRunHost(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '::1'].includes(hostname) || hostname.endsWith('.vercel.app');
}

export function readSafeFunnelContext(search: string): Record<string, string> {
  const params = paramsFrom(search);
  const context: Record<string, string> = {};

  for (const key of SAFE_CONTEXT_KEYS) {
    const value = clean(params.get(key));
    if (value) context[key] = value;
  }

  return context;
}

export function diagnosticScoreBucket(score: number): 'low' | 'mid' | 'high' {
  if (score >= 60) return 'high';
  if (score >= 40) return 'mid';
  return 'low';
}

export function diagnosticLeadSegment(score: number): 'goracy' | 'cieply' | 'zimny' {
  if (score > 60) return 'goracy';
  if (score > 40) return 'cieply';
  return 'zimny';
}

interface NaborPilotUrlInput {
  destination?: string;
  incomingSearch: string;
  placement: string;
  score: number;
  topCategory: string;
  intent?: number | null;
}

export function buildNaborPilotUrl({
  destination = 'https://nabor.talerzihantle.com/',
  incomingSearch,
  placement,
  score,
  topCategory,
  intent,
}: NaborPilotUrlInput): string {
  const target = new URL(destination);
  const incoming = paramsFrom(incomingSearch);

  for (const key of SAFE_INBOUND_KEYS) {
    const value = clean(incoming.get(key));
    if (value) target.searchParams.set(key, value);
  }

  const previousContent = target.searchParams.get('utm_content');
  if (previousContent) target.searchParams.set('origin_utm_content', previousContent);

  if (!target.searchParams.has('utm_source')) target.searchParams.set('utm_source', 'diagnostyka');
  if (!target.searchParams.has('utm_medium')) target.searchParams.set('utm_medium', 'funnel_pilot');
  target.searchParams.set('utm_content', clean(placement) || 'result');
  target.searchParams.set('funnel_referrer', 'diagnostyka');
  target.searchParams.set('funnel_version', FUNNEL_PILOT_VERSION);
  target.searchParams.set('diagnostic_segment', diagnosticLeadSegment(score));
  target.searchParams.set('diagnostic_score_bucket', diagnosticScoreBucket(score));
  target.searchParams.set('diagnostic_top_category', clean(topCategory) || 'unknown');

  if (intent !== null && intent !== undefined) {
    target.searchParams.set('diagnostic_intent', String(intent));
  }

  return target.toString();
}
