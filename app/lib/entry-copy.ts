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
    headline: 'W robocie dowozisz. A po pracy nie masz już siły na siebie?',
    accent: 'A jeśli sypie się dużo wcześniej?',
    body: 'Siemano :D Zrobiłem Mapę 168, bo możesz od miesięcy naprawiać nie ten moment.',
    proof: 'Obstaw przyczynę. Zestawię ją z odpowiedziami i dam test na 72 godziny.',
    cta: 'Dobra, sprawdzam swój tydzień',
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
