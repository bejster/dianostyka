export const ACQUISITION_KEYS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'source', 'source_asset', 'source_campaign', 'keyword',
] as const;

export type AcquisitionKey = (typeof ACQUISITION_KEYS)[number];
export type AcquisitionAttribution = Partial<Record<AcquisitionKey, string>>;

const SESSION_KEY = 'diagnostyka_acquisition_v1';
const CONTROL_CHARACTER = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
const EMAIL_ADDRESS = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u;
const PHONE_NUMBER_SHAPE = /^\+?[\d\s().-]{9,}$/u;

function looksLikePhoneNumber(value: string): boolean {
  if (!PHONE_NUMBER_SHAPE.test(value)) return false;
  const digits = value.replace(/\D/g, '').length;
  return digits >= 9 && digits <= 15;
}

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const compact = value.trim().replace(/\s+/g, ' ').slice(0, 160);
  if (!compact || CONTROL_CHARACTER.test(compact)) return undefined;
  if (EMAIL_ADDRESS.test(compact) || looksLikePhoneNumber(compact)) return undefined;
  return compact;
}

export function acquisitionFromSearch(search: string): AcquisitionAttribution {
  const params = new URLSearchParams(search.replace(/^\?/, ''));
  const out: AcquisitionAttribution = {};
  for (const key of ACQUISITION_KEYS) {
    const safe = clean(params.get(key));
    if (safe) out[key] = safe;
  }
  return out;
}

export function mergeAcquisitionFirstTouch(
  existing: AcquisitionAttribution,
  incoming: AcquisitionAttribution,
): AcquisitionAttribution {
  const out: AcquisitionAttribution = { ...existing };
  for (const key of ACQUISITION_KEYS) {
    if (!out[key] && incoming[key]) out[key] = incoming[key];
  }
  return out;
}

export function captureAcquisition(search?: string): AcquisitionAttribution {
  if (typeof window === 'undefined') return {};
  const incoming = acquisitionFromSearch(search ?? window.location.search);
  let existing: AcquisitionAttribution = {};
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    existing = raw ? acquisitionFromObject(JSON.parse(raw)) : {};
  } catch {}
  const merged = mergeAcquisitionFirstTouch(existing, incoming);
  try {
    if (Object.keys(merged).length) sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged));
  } catch {}
  return merged;
}

export function acquisitionFromObject(input: unknown): AcquisitionAttribution {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const obj = input as Record<string, unknown>;
  const out: AcquisitionAttribution = {};
  for (const key of ACQUISITION_KEYS) {
    const safe = clean(obj[key]);
    if (safe) out[key] = safe;
  }
  return out;
}

export function withAcquisition(url: string, acquisition: AcquisitionAttribution): string {
  const target = new URL(url);
  for (const key of ACQUISITION_KEYS) {
    const value = acquisition[key];
    if (value) target.searchParams.set(key, value);
  }
  return target.toString();
}
