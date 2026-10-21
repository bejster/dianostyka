// ── OPINIE GOOGLE (wizytowka „Talerz i Hantle") ──
// Realne, tylko 5-gwiazdkowe, dobrane pod ICP HiT. Zaciagniete recznie z profilu (78 opinii).
// Pietrzako wykluczony (do-not-use). Zrzuty: public/proof/google/. Karty = wlasne slowa autorow,
// przyciete do czystego fragmentu (bez dopisywania claimow). Agregat = do potwierdzenia przez Michala.
export interface GoogleReview { name: string; text: string; when: string; }

// Zweryfikowane u zrodla 2026-08-14 (naglowek wizytowki .F7nice + wzrokowo): 5,0 z 56 opinii, same 5-gwiazdkowe.
export const GOOGLE_AGG = {
  rating: '5,0',
  count: 56,
  url: 'https://share.google/DZotZ18joTPlXEhXf',
};

// Ciemne karty (Karta-style), autorzy inni niz na zrzutach (zero dubli).
export const GOOGLE_CARDS: GoogleReview[] = [
  { name: 'Michał R.', when: 'kwartał współpracy', text: 'Michał to mega profesjonalista z bardzo bogatym backgroundem: doświadczenie i wiedza o neurochemii. Jestem po pierwszym kwartale współpracy i absolutnie ukontentowany.' },
  { name: 'Paweł S.', when: '5 miesięcy', text: 'Współpracując z nim udało mi się w 5 miesięcy zbudować 10 kg masy mięśniowej. Podejście do analizy treningów i suplementacji to topka, bez presji.' },
  { name: 'Dawid G.', when: 'pół roku', text: 'Całe życie sceptycznie podchodzę do tych wszystkich coachów i trenerów. Ale na tyle zaprzyjaźniłem się z kontentem Michała, że postanowiłem spróbować. Pół roku, co mi szkodzi?' },
];

// Realne zrzuty jako dowod autentycznosci (2 sztuki, ICP-gold, zero wzmianki o uzywkach).
// Zrzuty w public ROOT (podfolder public/proof/ nie wciagal sie na Vercel, root serwuje pewnie).
export const GOOGLE_SHOTS: { src: string; alt: string }[] = [
  { src: '/gr-radoslaw.png', alt: 'Opinia Google, Radosław, 5 gwiazdek: prawie rok współpracy, 14 kg w dół, forma bez rezygnacji z życia' },
  { src: '/gr-zlatan.png', alt: 'Opinia Google, Zlatan, 5 gwiazdek: działa nawet przy pracy do późna, weekendach i braku czasu' },
];
