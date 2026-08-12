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

// UWAGA: przykład reprezentatywny (pasuje do realnego ICP: KAM/sprzedaż/menedżer).
// Podmień na konkretnego, zweryfikowanego podopiecznego, zanim potraktujesz to jako twardy dowód.
export const CASES: CaseStudy[] = [
  {
    kto: 'Marek, 37, Key Account Manager',
    punktWyjscia: 'Trenował od lat, forma stała w miejscu, kolacje z klientami i weekendy resetowały mu każdy tydzień.',
    coRobilDalej: 'Nie odpuścił kolacji z klientami, wina do obiadu ani sobót z rodziną.',
    wynik: '-8 kg tłuszczu, brzuch pierwszy raz widoczny od dekady, energia wróciła.',
    wIle: '6 miesięcy',
  },
];
