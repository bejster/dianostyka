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
    headline: 'Twój plan działa. Do pierwszego gorszego czwartku.',
    accent: 'I znowu „od poniedziałku”?',
    body: 'Robota się przeciąga. Trening wypada. Wieczorem jesz, co akurat jest. A w niedzielę układasz nowy plan. Jakby następny czwartek miał nie nadejść.',
    proof: 'Najpierw sam obstawisz, co Cię blokuje. Potem zobaczysz, czy reszta odpowiedzi to potwierdza i co sprawdzić przez 72 godziny.',
    cta: 'Sprawdzam, co mi rozwala tydzień',
  },
  hit: {
    headline: 'Trzy treningi w planie. Gorszy tydzień zostawia jeden.',
    body: 'Ktoś wrzuca pilne zadanie pod koniec pracy, trening wypada. Kolację ogarniasz z doskoku. W niedzielę znowu zmieniasz plan. Jakby w następnym tygodniu miało już nie być roboty.',
    proof: 'Sprawdź, co najpierw sypie się w Twoim tygodniu. Porównam to z Twoimi odpowiedziami i pokażę jeden ruch na 72 godziny.',
    cta: 'Sprawdzam, gdzie to się zaczyna',
  },
  th2: {
    headline: 'Impreza się skończyła. Czemu reszta tygodnia dalej idzie się jebać?',
    body: 'Siemano :D Impreza była w sobotę, a we wtorek dalej jesteś bez siły. Zrobiłem Mapę 168, żebyś nie musiał zgadywać, co się posypało.',
    proof: 'Zobacz, co mówią Twoje odpowiedzi. Masz jeden test na 72 godziny.',
    cta: 'Sprawdzam, gdzie mi pęka tydzień',
  },
};
