import type { Metadata } from 'next';

export { default } from '../diagnoza/page';

// Link z DM i bio TH2: podgląd ma mówić to samo co hero TH2, nie hero general z layoutu.
const TITLE = 'Gdzie pęka Twój tydzień?';
const DESCRIPTION = 'Sen, energia, apetyt, stres, trening i powrót po weekendzie. Zobaczysz, gdzie problem się zaczyna i który jeden ruch sprawdzić najpierw. 5 minut, wynik od razu.';
const OG_IMAGE = 'https://diagnostyka.talerzihantle.com/api/og?v=th2';

export const metadata: Metadata = {
  title: `${TITLE} | Diagnostyka 168`,
  description: DESCRIPTION,
  alternates: { canonical: 'https://diagnostyka.talerzihantle.com/rozjazd' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://diagnostyka.talerzihantle.com/rozjazd',
    siteName: 'Diagnostyka 168 | Hantle i Talerz',
    images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
    locale: 'pl_PL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};
