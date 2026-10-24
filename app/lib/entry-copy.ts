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
  "general": {
    "headline": "Umiesz dowieźć robotę. To czemu własny tydzień ciągle Ci się sypie?",
    "accent": "Może winisz nie ten moment.",
    "body": "Siemano :D Zrobiłem Mapę 168, bo ciągle widzę ten sam numer: plan na trening jest, o jedzeniu wiesz sporo, a potem wpada zwykły cięższy dzień i wszystko się rozjeżdża. I znowu obwiniasz dyscyplinę. Tylko skąd wiesz, że właśnie tam zaczyna się problem?",
    "proof": "Najpierw sam obstawisz przyczynę. Ja zestawię to z Twoimi odpowiedziami, pokażę pierwszy trop i jeden test na 72 godziny. Bez udawania, że ankieta wie o Tobie wszystko.",
    "cta": "Dobra, sprawdzam swój tydzień"
  },
  "hit": {
    "headline": "Nie masz siły na trening po pracy. A kto powiedział, że problemem jest trening?",
    "accent": "Sprawdźmy, co sypie się wcześniej.",
    "body": "Siemano :D Zrobiłem Mapę 168 dla gościa, który w robocie ogarnia trudniejsze rzeczy niż dieta. A potem wraca bez siły, przekłada trening, je byle co i kolejny raz obiecuje sobie poniedziałek od zera. Chcę sprawdzić, co naprawdę odpala ten schemat.",
    "proof": "Obstawisz, co Cię blokuje. Porównam to z odpowiedziami z Twojego zwykłego tygodnia i pokażę jeden trop oraz test na 72 godziny. Bez maila, bez kolejnego idealnego planu.",
    "cta": "Sprawdźmy, gdzie pęka mój tydzień"
  },
  "th2": {
    "headline": "Impreza się skończyła. Czemu reszta tygodnia dalej idzie się jebać?",
    "body": "Siemano :D Zrobiłem Mapę 168, bo ten numer wraca bez przerwy: impreza była w sobotę, a we wtorek dalej brakuje Ci energii, trening wypada i apetyt robi swoje. Chcę, żebyś zobaczył, co dzieje się z resztą tygodnia — i czy sam weekend na pewno tłumaczy cały rozjazd.",
    "proof": "Najpierw obstawisz przyczynę. Potem porównamy to z Twoimi odpowiedziami i wybierzemy jeden trop do sprawdzenia przez 72 godziny. Ankieta nie zmierzy hormonów ani nie zastąpi badań.",
    "cta": "Sprawdzam, gdzie mi pęka tydzień"
  }
};
