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

type EntryCopy = {
  headline: string;
  // Druga czesc H1 w zlotej kursywie, tylko gdy drzwi jej potrzebuja.
  accent?: string;
  body: string;
  proof: string;
  cta: string;
};

export const ENTRY_COPY: Record<EntryDoor, EntryCopy> = {
  general: {
    headline: 'Cały dzień się pilnujesz, a wieczorem i tak pękasz?',
    accent: 'A jeśli to zaczyna się dużo wcześniej?',
    body: 'Obiad przesuwa się na 16 albo wypada, robota siedzi w głowie do nocy, a potem obwiniasz silną wolę. Obstaw, co Cię rozkłada. Twój ostatni tydzień pokaże, czy masz rację. Albo czy od miesięcy naprawiasz nie to miejsce.',
    proof: 'Na końcu zobaczysz, gdzie to się u Ciebie zaczyna. Do tego jeden ruch na 3 dni, który to sprawdzi.',
    cta: 'Sprawdzam, gdzie to się zaczyna',
  },
  hit: {
    headline: 'Wiesz, co robić. Więc na czym znowu się wykładasz?',
    body: 'Po robocie nie masz już siły na trening. Wieczorem jesz, co jest pod ręką. Potem obiecujesz sobie, że kolejny tydzień będzie inny. Zaznacz, jak wyglądało to u Ciebie.',
    proof: 'Porównasz swoje podejrzenie z resztą odpowiedzi i dostaniesz jeden ruch do sprawdzenia przez 3 dni.',
    cta: 'Sprawdzam, co przeoczam',
  },
  th2: {
    headline: 'Impreza się skończyła. Czemu reszta tygodnia dalej idzie się jebać?',
    body: 'Śpisz dłużej, a dalej nie masz siły. Robota się ciągnie, trening wypada, wieczorem jesz więcej, niż chciałeś. I już sam nie wiesz, czy jeszcze dochodzisz do siebie, czy coś innego dokłada Ci problemów. Zaznacz, jak wyglądało to u Ciebie.',
    proof: 'Porównasz swoje podejrzenie z resztą odpowiedzi i dostaniesz jeden ruch do sprawdzenia przez 3 dni.',
    cta: 'Sprawdzam, gdzie mi się to sypie',
  },
};
