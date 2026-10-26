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
    headline: 'Możesz zamknąć tę stronę. Serio.',
    accent: 'Ale co tym razem zmienisz od poniedziałku?',
    body: 'Siemano :D Jeżeli od miesięcy masz ten sam numer: w niedzielę nowy plan, w czwartek robota wywala Ci trening, a później znowu zaczynasz od zera… to powiedz mi, co załatwi kolejna rozpiska? Pracy Ci nagle ubędzie? Po całym dniu pojawi się więcej siły? I tak potrafi zlecieć kolejne pół roku. Plan za planem, a forma dalej stoi.',
    proof: 'Właśnie dlatego zrobiłem Mapę 168. Chcę, żebyś najpierw zobaczył, gdzie zaczyna Ci się sypać tydzień. Na koniec pokażę, co ja bym sprawdził jako pierwsze, czego bym nie ruszał i jaki jeden ruch możesz przetestować przez 72 godziny.',
    cta: 'Dobra, sprawdzam, co mnie trzyma',
  },
  hit: {
    headline: 'Na kolejnego calla znajdziesz jeszcze siłę. A dla siebie?',
    body: 'Siemano :D Masz przed sobą kolejne pilne zadanie, więc jakoś wyciągasz resztki energii. Ale trening? Znowu wypada. W niedzielę rozpisujesz wszystko od nowa i liczysz, że następny tydzień będzie spokojniejszy. No dobra, tylko co zrobisz, kiedy znowu skończysz pracę późno? Znowu zmienisz plan, czy w końcu sprawdzisz, gdzie się wykładasz?',
    proof: 'Po to zrobiłem Mapę 168. Przeklikasz swój rzeczywisty tydzień, zobaczysz, co ja bym sprawdził jako pierwsze i jaki jeden ruch sam bym przetestował przez 72 godziny. Nie musisz wierzyć mi na słowo.',
    cta: 'Dobra, sprawdzam, gdzie się wykładam',
  },
  th2: {
    headline: 'Impreza się skończyła. Czemu reszta tygodnia dalej idzie się jebać?',
    body: 'Siemano :D Impreza była w sobotę, a we wtorek dalej jesteś bez siły. Zrobiłem Mapę 168, żebyś nie musiał zgadywać, co się posypało.',
    proof: 'Zobacz, co mówią Twoje odpowiedzi. Masz jeden test na 72 godziny.',
    cta: 'Sprawdzam, gdzie mi pęka tydzień',
  },
};
