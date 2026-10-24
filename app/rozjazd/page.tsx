import type { Metadata } from 'next';

export { default } from '../diagnoza/page';

// Link z DM i bio TH2: podgląd ma mówić to samo co hero TH2, nie hero general z layoutu.
const TITLE = 'Gdzie pęka Twój tydzień?';
const DESCRIPTION = 'Sen, energia, apetyt, stres, trening i powrót po weekendzie. Zobaczysz, gdzie problem się zaczyna i który jeden ruch sprawdzić najpierw. 5 minut, wynik od razu.';
// Karta linku: obraz zadaje pytanie, og:title nie może go powtarzać.
const OG_TITLE = 'Pilnujesz się cały tydzień, a w weekend wszystko się sypie?';
const OG_DESCRIPTION = 'Sen, apetyt czy stres? Wynik pokaże, od czego to się zaczyna.';
const OG_IMAGE = 'https://168.talerzihantle.com/api/og?v=th2';

export const metadata: Metadata = {
  title: `${TITLE} | Mapa 168`,
  description: DESCRIPTION,
  alternates: { canonical: 'https://168.talerzihantle.com/rozjazd' },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    url: 'https://168.talerzihantle.com/rozjazd',
    siteName: 'Mapa 168 | Talerz i Hantle',
    images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
    locale: 'pl_PL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE],
  },
};
