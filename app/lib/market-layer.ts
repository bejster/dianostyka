// WARSTWA RYNKU 168 (2026-11-22). Kanon: Notion "Diagnostyka 168 — diagnostic product/runtime", sekcja 19.11.
// Trzy rzeczy poza scoringiem:
// 1) zaproszenie dla znajomego z atrybucja (utm_content = ref zglaszajacego), bez danych osobowych w URL,
// 2) przedsprzedaz planu 14 dni tylko dla osob, ktore same zadeklarowaly "ogarne sam",
// 3) opcjonalne wideo Michala per archetyp (puste = ukryte).
// Wszystko sterowane env, wiec bez ustawionych zmiennych wynik wyglada jak dzis.

export const INVITE_TEXT: Record<string, string> = {
  wiedza_bez_wdrozenia: 'wyszło mi: wiem wszystko, nie dowożę. sprawdź, czy ty też tylko oglądasz rolki o treningu',
  weekend_reset: 'weekend cofa mnie do zera. wysyłam ci, bo w poniedziałek wyglądasz gorzej ode mnie',
  glowa_zajezdza: 'wyszło, że głowa mnie zajeżdża. zrób, zobaczymy kto bardziej',
  wieczorny_odpad: 'jadę cały dzień na kredycie. ty pewnie też, tylko jeszcze o tym nie wiesz',
  silnik_bez_paliwa: 'silnik bez paliwa, tak mi wyszło. 5 minut i wiesz, co z tobą',
};
export const INVITE_FALLBACK = 'zrobiłem mapę swojego tygodnia w 5 minut. sprawdź, co wyjdzie tobie';

export function inviteText(archKey: string): string {
  return INVITE_TEXT[archKey] || INVITE_FALLBACK;
}

// Ref to anonimowy prefiks submissionId (ten sam, ktory juz trafia do shareSafe). Laduje w utm_content,
// ktory istniejacy captureAcquisition zapisuje first-touch przy zgloszeniu znajomego. Zero nowego backendu.
export function buildInviteUrl(origin: string, submissionId?: string): string {
  const params = new URLSearchParams({
    door: 'hit',
    src: 'share',
    utm_source: 'share',
    utm_medium: 'friend',
    utm_campaign: 'zaproszenie168',
  });
  const ref = (submissionId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24);
  if (ref) params.set('utm_content', `ref_${ref}`);
  return `${origin.replace(/\/$/, '')}/diagnoza?${params.toString()}`;
}

// Przedsprzedaz pokazujemy tylko samodzielnym: oni i tak nie wybiora prowadzenia, wiec 1:1 nic nie traci.
export function isSelfServe(answers: Record<string, unknown>): boolean {
  return answers.intent === 'in_sam' || answers.agency_mode === 'ag_solo';
}

function cleanUrl(raw: string | undefined): string {
  const v = (raw || '').trim();
  return /^https:\/\/\S+$/.test(v) ? v : '';
}

// Stripe Payment Link przyjmuje client_reference_id, wiec wplate da sie polaczyc z wynikiem bez danych osobowych.
export function presaleHref(baseUrl: string | undefined, submissionId?: string): string {
  const base = cleanUrl(baseUrl);
  if (!base) return '';
  const ref = (submissionId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  if (!ref) return base;
  return `${base}${base.includes('?') ? '&' : '?'}client_reference_id=${encodeURIComponent(ref)}`;
}

// NEXT_PUBLIC_RESULT_VIDEOS = {"weekend_reset":"https://..."}; zly JSON albo brak = brak wideo.
export function resultVideoUrl(rawJson: string | undefined, archKey: string): string {
  if (!rawJson) return '';
  try {
    const map = JSON.parse(rawJson) as Record<string, unknown>;
    const v = map[archKey];
    return typeof v === 'string' ? cleanUrl(v) : '';
  } catch {
    return '';
  }
}

export const PRESALE_COPY = {
  kicker: 'Wolisz ogarnąć to sam?',
  title: 'Robię plan 14 dni pod Twój wynik.',
  body: 'Bez prowadzenia i bez rozmów. Dzień po dniu: co ruszasz, czego nie ruszasz i co robisz, kiedy tydzień się sypie. Pierwsza edycja startuje 8.12. Jeśli nie wystartuje, oddaję całą kwotę.',
  pay: 'Wchodzę za 79 zł',
  waitlist: 'Daj znać, jak ruszy',
  waitlistDone: 'Zapisane. Odezwę się, jak ruszy.',
};
