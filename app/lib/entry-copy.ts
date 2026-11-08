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
    headline: 'W robocie masz zapierdol. Wracasz i nie masz już siły nawet na siebie?',
    accent: 'A jeśli problem zaczyna się, zanim w ogóle wyjdziesz z pracy?',
    body: 'Masz już swoje podejrzenie, skąd ten brak siły? Zobaczymy, czy po kilku pytaniach dalej będziesz obstawiał to samo.',
    proof: 'Zobaczysz, od czego zacząć. Dostaniesz test na 72 godziny.',
    cta: 'Dobra, sprawdzam, gdzie tracę siłę',
  },
  hit: {
    headline: 'Nie masz siły na trening po pracy. A kto powiedział, że problemem jest trening?',
    body: 'Siemano :D Zrobiłem to dla gościa, który wszystko ogarnia w robocie, a wieczorem znów odpuszcza trening i jedzenie. Może problem zaczął się wcześniej, niż myślisz.',
    proof: 'Obstaw przyczynę. Ja pokażę pierwszy trop i test na 72 godziny.',
    cta: 'Sprawdźmy, gdzie pęka mój tydzień',
  },
  th2: {
    headline: 'Impreza się skończyła. Czemu reszta tygodnia dalej idzie się jebać?',
    body: 'Siemano :D Impreza była w sobotę, a we wtorek dalej jesteś bez siły. Zrobiłem Mapę 168, żebyś nie musiał zgadywać, co się posypało.',
    proof: 'Zobacz, co mówią Twoje odpowiedzi. Masz jeden test na 72 godziny.',
    cta: 'Sprawdzam, gdzie mi pęka tydzień',
  },
};


// Dedykowane powitanie po dobrowolnym kliknięciu w wiadomości po follow.
// JEDEN silnik: żadnych dodatkowych pytań, punktacji, formularzy ani ścieżek CRM.
export function isHiTFollowEntry(params: URLSearchParams, pathname: string): boolean {
  const pathOk = pathname === '/' || pathname === '/diagnoza';
  return pathOk &&
    resolveEntryDoor(params, pathname) === 'hit' &&
    (params.get('src') || '').toLowerCase() === 'dm' &&
    (params.get('utm_campaign') || '').toLowerCase() === 'follow_welcome_168';
}

export const HIT_FOLLOW_ENTRY_COPY: EntryCopy = {
  headline: 'Pokaż, jak naprawdę wygląda Twój tydzień.',
  accent: 'Zobaczysz, od czego zacząć z formą.',
  body: 'Nie chcę Ci wciskać kolejnej rozpiski w ciemno. Odpowiedz na pytania o jedzenie, trening, sen i weekend. Ta Mapa porówna odpowiedzi i pokaże Ci pierwszy trop do sprawdzenia.',
  proof: 'Na koniec jeden konkretny test na 72 godziny. Bez obietnicy cudów.',
  cta: 'Sprawdzam swój tydzień',
};
