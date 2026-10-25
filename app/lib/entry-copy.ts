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
    headline: 'Siemano :D Zrobiłem coś takiego, żebyś mógł obadać swój tydzień.',
    body: 'Bo wiesz, jak w czwartek wypada Ci trening, to łatwo powiedzieć, że znowu zabrakło dyscypliny. No dobra, tylko co się działo wcześniej? Jak spałeś, ile miałeś roboty, kiedy pierwszy raz siadła Ci energia? Bo ja bym właśnie od tego zaczął.',
    proof: 'Przeklikaj kilka pytań o swój tydzień. Na koniec pokażę Ci, co ja bym sprawdził jako pierwsze i dlaczego.',
    cta: 'Dobra, sprawdzam',
  },
  hit: {
    headline: 'Siemano :D Zrobiłem taką Mapę 168, bo ciągle widzę jedną rzecz.',
    body: 'Ktoś ma w planie trzy treningi, ale wystarczą dwa cięższe dni w pracy i nagle dwa wypadają. No dobra, tylko po co od razu zmieniać trening? Ja bym najpierw chciał zobaczyć, co mu się działo z resztą tygodnia, że w ogóle do tego doszło.',
    proof: 'Przeklikaj kilka pytań, a pokażę Ci, co z tego wynika i co bym sprawdził na początku.',
    cta: 'Dobra, sprawdzam',
  },
  th2: {
    headline: 'Impreza się skończyła. Czemu reszta tygodnia dalej idzie się jebać?',
    body: 'Siemano :D Impreza była w sobotę, a we wtorek dalej jesteś bez siły. Zrobiłem Mapę 168, żebyś nie musiał zgadywać, co się posypało.',
    proof: 'Zobacz, co mówią Twoje odpowiedzi. Masz jeden test na 72 godziny.',
    cta: 'Sprawdzam, gdzie mi pęka tydzień',
  },
};
