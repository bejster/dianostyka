export type EntryDoor = 'general' | 'hit' | 'th2';

// Framing only. Answers and scoring remain independent of acquisition.
export function resolveEntryDoor(params: URLSearchParams, pathname: string): EntryDoor {
  const explicit = (params.get('door') || '').toLowerCase();
  if (explicit === 'hit' || explicit === 'th2') return explicit;
  if (pathname === '/rozjazd') return 'th2';
  const campaign = (params.get('utm_campaign') || '').toLowerCase();
  if (campaign === 'hit_bio') return 'hit';
  if (campaign === 'th2_bio') return 'th2';
  return 'general';
}

export const ENTRY_COPY = {
  general: {
    headline: 'Ile dni w tygodniu jesteś w formie?',
    body: 'Zaznacz, jak wyglądał Twój ostatni tydzień. Zobaczysz, które odpowiedzi pasują do Twojego wyjaśnienia problemu, a które warto sprawdzić osobno.',
    cta: 'Sprawdzam swój tydzień',
  },
  hit: {
    headline: 'Wiesz, co robić. Więc na czym znowu się wykładasz?',
    body: 'Po robocie nie masz już siły na trening. Wieczorem jesz, co jest pod ręką. Potem obiecujesz sobie, że kolejny tydzień będzie inny. Zaznacz, jak wyglądało to u Ciebie.',
    cta: 'Sprawdzam, co przeoczam',
  },
  th2: {
    headline: 'Impreza się skończyła. Czemu reszta tygodnia dalej idzie się jebać?',
    body: 'Śpisz dłużej, a dalej nie masz siły. Robota się ciągnie, trening wypada, wieczorem jesz więcej, niż chciałeś. I już sam nie wiesz, czy jeszcze dochodzisz do siebie, czy coś innego dokłada Ci problemów. Zaznacz, jak wyglądało to u Ciebie.',
    cta: 'Sprawdzam, gdzie mi się to sypie',
  },
} as const;
