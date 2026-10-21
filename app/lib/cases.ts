// ── CASE STUDY (tekstowy, bez zdjęć): dowód że rekompozycja idzie BEZ rzucania życia ──
// Oś nadrzędna niszy: facet, który dalej imprezuje/wychodzi/pije wino do kolacji, a i tak robi formę.
// NIE zmyślać. Wpisujemy TYLKO realnych podopiecznych (imię lub inicjał + realne liczby).
// Pusta tablica = sekcja "Zrobili to bez rzucania życia" w Karcie się NIE renderuje.
//
// Jak dodać realny przypadek (2 min):
//   { kto: 'Marek, 36, handlowiec', punktWyjscia: '...', coRobilDalej: '...', wynik: '...', wIle: '5 miesięcy' }
// Pole `coRobilDalej` to sedno: co robił DALEJ (weekendy, wino, wypady, kolacje z rodziną).

export interface CaseStudy {
  kto: string;          // imię/inicjał + wiek + rola, np. "Marek, 36, handlowiec"
  punktWyjscia: string; // gdzie startował, np. "Trenował od lat, forma stała, weekendy go kasowały"
  coRobilDalej: string; // NISZA: czego NIE rzucił, np. "Nie odpuścił sobót z ekipą ani wina do kolacji"
  wynik: string;        // twardy efekt, np. "-9 kg tłuszczu, brzuch pierwszy raz widoczny"
  wIle: string;         // czas, np. "5 miesięcy"
}

// UCZCIWIE: to typowy przebieg (złożenie), NIE jeden zweryfikowany klient — dlatego bez imienia
// i bez twardej precyzji (żeby nie czytało się jak fikcyjny testimonial = ryzyko UOKiK + spalone zaufanie).
// Gdy masz realnego podopiecznego + zgodę: wstaw imię/inicjał, twarde liczby, najlepiej ze zdjęciem z PROOF.
export const CASES: CaseStudy[] = [
  {
    kto: 'Typowy przebieg u moich podopiecznych (KAM, sprzedaż, menedżerowie)',
    punktWyjscia: 'Trenują od lat, forma stoi, a kolacje z klientami i weekendy resetują im każdy tydzień.',
    coRobilDalej: 'Bez rzucania kolacji z klientami, wina do obiadu i sobót z rodziną.',
    wynik: 'Kilka kilogramów tłuszczu w dół, brzuch wraca, energia w ciągu dnia przestaje siadać.',
    wIle: 'kilka miesięcy',
  },
];
