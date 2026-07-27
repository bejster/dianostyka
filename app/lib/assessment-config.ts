// assessment-config.ts, Wersjonowana konfiguracja pytań, domen i profili Diagnostyki Tygodnia V2

export const ASSESSMENT_VERSION = '2.0.0';

export type DomainKey = 'sleep' | 'energy' | 'nutrition' | 'training' | 'weekend' | 'chaos';

export interface DomainDef {
  key: DomainKey;
  label: string;
  shortLabel: string;
  description: string;
}

export const DOMAINS: Record<DomainKey, DomainDef> = {
  sleep: {
    key: 'sleep',
    label: 'Sen i dług regeneracyjny',
    shortLabel: 'Sen',
    description: 'Długość snu, jakość pobudki, architektura NREM i stałość pory zaśnięcia.',
  },
  energy: {
    key: 'energy',
    label: 'Energia i obciążenie',
    shortLabel: 'Stres',
    description: 'Moment pierwszego spadku energii, aktywacja osi HPA i obciążenie pracą.',
  },
  nutrition: {
    key: 'nutrition',
    label: 'Apetyt i kontrola jedzenia',
    shortLabel: 'Żywienie',
    description: 'Wieczorny napad głodu, chęć na słodkie i stabilność glikemiczna.',
  },
  training: {
    key: 'training',
    label: 'Trening i tarcie wykonawcze',
    shortLabel: 'Trening',
    description: 'Dopasowanie planu do realiów, odpuszczanie i elastyczność struktury.',
  },
  weekend: {
    key: 'weekend',
    label: 'Weekend i koszt powrotu',
    shortLabel: 'Weekend',
    description: 'Rozkojarzenie rytmu, rozbity poniedziałek i koszt regeneracji po weekendzie.',
  },
  chaos: {
    key: 'chaos',
    label: 'Odporność systemu na chaos',
    shortLabel: 'Głowa',
    description: 'Reakcja na brak idealnych warunków, prokrastynacja i powrót do planu.',
  },
};

export interface QuestionOption {
  id: string;
  label: string;
  sublabel?: string;
  value: number; // 0 (najlepszy wzorzec) do 100 (najsilniejszy punkt awarii)
  weights?: Partial<Record<DomainKey, number>>;
  tags?: string[];
}

export type QuestionType = 'single' | 'slider' | 'number' | 'multi' | 'text';

export interface QuestionDef {
  id: string;
  section: string;
  sectionNum: string;
  title: string;
  subtitle?: string;
  type: QuestionType;
  domain: DomainKey;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: QuestionOption[];
  condition?: (answers: Record<string, unknown>) => boolean;
  upstreamWeight: number; // jak bardzo ten problem jest przyrodzoną przyczyną
  crossDomainImpact: number; // ile innych domen pogarsza
}

export const QUESTIONS: QuestionDef[] = [
  // SEKCJA 1: SEN I REGENERACJA
  {
    id: 'sleep_hours',
    section: 'Sen i regeneracja',
    sectionNum: 'I',
    title: 'Ile godzin śpisz średnio w ciągu nocy w dni robocze?',
    subtitle: 'Mierzymy realną długość snu, nie czas przebywania w łóżku z telefonem.',
    type: 'slider',
    domain: 'sleep',
    min: 4,
    max: 9.5,
    step: 0.5,
    unit: 'h',
    upstreamWeight: 0.85,
    crossDomainImpact: 0.90,
  },
  {
    id: 'sleep_quality',
    section: 'Sen i regeneracja',
    sectionNum: 'I',
    title: 'Jak czujesz się rano po przebudzeniu?',
    subtitle: 'Pierwsze 15 minut decyduje o dobowej krzywej kortyzolu.',
    type: 'single',
    domain: 'sleep',
    upstreamWeight: 0.80,
    crossDomainImpact: 0.85,
    options: [
      { id: 'sq_great', label: 'Wstaję wypoczęty, bez potrzeby drzemki', value: 0 },
      { id: 'sq_ok', label: 'Potrzebuję chwilę na rozruch i kawę', value: 35 },
      { id: 'sq_heavy', label: 'Wstaję ciężki, jak po maratonie', value: 75 },
      { id: 'sq_wrecked', label: 'Bez budzika i mocnej kawy nie funkcjonuję', value: 100 },
    ],
  },
  {
    id: 'screen_bed',
    section: 'Sen i regeneracja',
    sectionNum: 'I',
    title: 'Kiedy odkładasz telefon lub ekran przed pójściem spać?',
    subtitle: 'Niebieskie światło blokuje nocne wydzielanie melatoniny i spłyca sen NREM.',
    type: 'single',
    domain: 'sleep',
    upstreamWeight: 0.75,
    crossDomainImpact: 0.70,
    options: [
      { id: 'sb_60min', label: 'Ponad 60 minut przed snem', value: 0 },
      { id: 'sb_30min', label: 'Około 30 minut przed snem', value: 30 },
      { id: 'sb_bed', label: 'Oglądam/przeglądam w łóżku do samego zaśnięcia', value: 80 },
      { id: 'sb_fallasleep', label: 'Zasypiam z telefonem w ręce lub włączonym TV', value: 100 },
    ],
  },

  // SEKCJA 2: ENERGIA I OBCIĄŻENIE
  {
    id: 'work_hours',
    section: 'Energia i obciążenie',
    sectionNum: 'II',
    title: 'Ile godzin dziennie spędzasz na pracy i sprawach zawodowych?',
    subtitle: 'Długi czas w stałym skupieniu podbija obciążenie układu nerwowego.',
    type: 'slider',
    domain: 'energy',
    min: 6,
    max: 14,
    step: 1,
    unit: 'h',
    upstreamWeight: 0.70,
    crossDomainImpact: 0.75,
  },
  {
    id: 'stress_level',
    section: 'Energia i obciążenie',
    sectionNum: 'II',
    title: 'Jak oceniasz stały poziom napięcia psychicznego w ciągu dnia?',
    subtitle: 'Przewlekłe obciążenie osi HPA obniża syntezę testosteronu i regenerację.',
    type: 'single',
    domain: 'energy',
    upstreamWeight: 0.90,
    crossDomainImpact: 0.95,
    options: [
      { id: 'st_low', label: 'Niskie, mam pełną kontrolę i spokój', value: 0 },
      { id: 'st_mid', label: 'Umiarkowane, bywają spięte momenty, ale dowożę', value: 40 },
      { id: 'st_high', label: 'Wysokie, stały pośpiech i ciągłe gaszenie pożarów', value: 80 },
      { id: 'st_max', label: 'Ekstremalne, żyję w stanie ciągłego alarmu', value: 100 },
    ],
  },
  {
    id: 'break_window',
    section: 'Energia i obciążenie',
    sectionNum: 'II',
    title: 'W którym momencie dnia czujesz największy spadek energii lub kontroli?',
    subtitle: 'Wskazujemy dokładny moment awarii na 24-godzinnej osi doby.',
    type: 'single',
    domain: 'energy',
    upstreamWeight: 0.80,
    crossDomainImpact: 0.80,
    options: [
      { id: 'bw_morning', label: 'Rano, zaraz po przebudzeniu', value: 60 },
      { id: 'bw_midday', label: 'Między 10:00 a 14:00 (południe)', value: 50 },
      { id: 'bw_afternoon', label: 'Między 14:00 a 18:00 (po pracy)', value: 75 },
      { id: 'bw_evening', label: 'Po 21:00 (wieczór w domu)', value: 90 },
      { id: 'bw_weekend', label: 'W weekendy (zmiana rytmu)', value: 85 },
      { id: 'bw_varies', label: 'Różnie, bez stałej pory', value: 70 },
    ],
  },

  // SEKCJA 3: APETYT I KONTROLA JEDZENIA
  {
    id: 'evening_eating',
    section: 'Apetyt i jedzenie',
    sectionNum: 'III',
    title: 'Jak wygląda Twoje żywienie po powrocie do domu (po 18:00–21:00)?',
    subtitle: 'Wieczorna utrata kontroli to fizjologiczna odpowiedź na całodniowy stres i grelinę.',
    type: 'single',
    domain: 'nutrition',
    upstreamWeight: 0.85,
    crossDomainImpact: 0.75,
    options: [
      { id: 'ee_clean', label: 'Zjadam zaplanowany posiłek i zamykam kuchnię', value: 0 },
      { id: 'ee_snack', label: 'Zjadłem kolację, ale jeszcze podjadam drobiazgi', value: 45 },
      { id: 'ee_binge', label: 'Szukam słodkiego/słonego do późnej nocy', value: 85 },
      { id: 'ee_uncontrolled', label: 'Wietrzę lodówkę i jedzenie przejmuje kontrolę', value: 100 },
    ],
  },
  {
    id: 'takeout_cost',
    section: 'Apetyt i jedzenie',
    sectionNum: 'III',
    title: 'Ile miesięcznie wydajesz na dowozy jedzenia, knajpy i szybkie przekąski?',
    subtitle: 'Nieregularność w żywieniu generuje bezpośredni wyciek finansowy.',
    type: 'number',
    domain: 'nutrition',
    min: 0,
    max: 3000,
    unit: 'zł',
    upstreamWeight: 0.50,
    crossDomainImpact: 0.40,
  },

  // SEKCJA 4: WEEKEND I KOSZT POWROTU
  {
    id: 'weekend_pattern',
    section: 'Weekend i powrót',
    sectionNum: 'IV',
    title: 'Co dzieje się z Twoim rytmem snu i jedzenia w weekend?',
    subtitle: 'Weekendowy rozjazd zegara biologicznego zmusza organizm do spłaty długu w poniedziałek.',
    type: 'single',
    domain: 'weekend',
    upstreamWeight: 0.85,
    crossDomainImpact: 0.85,
    options: [
      { id: 'wp_same', label: 'Trzymam ten sam rytm co w tygodniu', value: 0 },
      { id: 'wp_slight', label: 'Śpię godzinę dłużej, jedzenie nieco luźniejsze', value: 35 },
      { id: 'wp_shifted', label: 'Chodzę spać 2-3h później i podjadam bez planu', value: 75 },
      { id: 'wp_reset', label: 'Pełny reset, alkohol, późne noce i odcięcie', value: 100 },
    ],
  },
  {
    id: 'alcohol_intake',
    section: 'Weekend i powrót',
    sectionNum: 'IV',
    title: 'Ile porcji alkoholu pijesz w ciągu przeciętnego tygodnia?',
    subtitle: '1 porcja = piwo 500ml, kieliszek wina lub 50ml wódki. Alkohol kasuje głęboki sen NREM.',
    type: 'single',
    domain: 'weekend',
    upstreamWeight: 0.80,
    crossDomainImpact: 0.90,
    options: [
      { id: 'alc_zero', label: 'Zero / sporadycznie raz w miesiącu', value: 0 },
      { id: 'alc_low', label: '1–3 porcje (np. 1–2 piwa w weekend)', value: 35 },
      { id: 'alc_mid', label: '4–8 porcji w tygodniu', value: 70 },
      { id: 'alc_high', label: 'Powyżej 8 porcji w tygodniu', value: 100 },
    ],
  },

  // SEKCJA 5: TRENING I TARCIE WYKONAWCZE
  {
    id: 'gym_miss',
    section: 'Trening i wykonanie',
    sectionNum: 'V',
    title: 'Jak często zdarza Ci się odpuścić zaplanowany trening?',
    subtitle: 'Tarcie wykonawcze pojawia się, gdy plan wymaga za dużo motywacji.',
    type: 'single',
    domain: 'training',
    upstreamWeight: 0.70,
    crossDomainImpact: 0.65,
    options: [
      { id: 'gm_never', label: 'Rzadko, dowożę 90%+ planu', value: 0 },
      { id: 'gm_sometimes', label: 'Odpuszczam 1 trening w tygodniu, gdy jestem zmęczony', value: 40 },
      { id: 'gm_frequent', label: 'Wypadam z rytmu po 2-3 tygodniach prób', value: 80 },
      { id: 'gm_no_plan', label: 'Nie mam stałego planu, trenuję zrywami', value: 100 },
    ],
  },

  // SEKCJA 6: ODPORNOŚĆ NA CHAOS I OBJAWY
  {
    id: 'symptoms_chips',
    section: 'Odporność i sygnały',
    sectionNum: 'VI',
    title: 'Zaznacz sygnały, które zauważasz u siebie w ostatnich 3 miesiącach:',
    subtitle: 'Wybierz wszystkie, które opisują stan Twojego ciała i głowy.',
    type: 'multi',
    domain: 'chaos',
    upstreamWeight: 0.60,
    crossDomainImpact: 0.80,
    options: [
      { id: 'fatigue', label: 'Chroniczne zmęczenie po południu', value: 20 },
      { id: 'belly', label: 'Brzuch nie schodzi mimo treningów', value: 20 },
      { id: 'cravings', label: 'Mocny apetyt na słodkie po 20:00', value: 15 },
      { id: 'brain', label: 'Mgła mózgowa i spadek skupienia', value: 20 },
      { id: 'recovery', label: 'Długie zakwasy i wolna regeneracja', value: 15 },
      { id: 'procrastination', label: 'Odkładanie trudnych zadań na później', value: 15 },
    ],
  },

  // SEKCJA 7: FRUSTRACJA I SŁOWA USERA (INPUT DO LLM REFRAME)
  {
    id: 'user_pain',
    section: 'Główna przeszkoda',
    sectionNum: 'VII',
    title: 'Opisz w 1–2 zdaniach: co najbardziej frustruje Cię dzisiaj w Twojej formie?',
    subtitle: 'Twoje własne słowa pozwolą odrzucić szablon i pokazać dokładnie Twój wyciek.',
    type: 'text',
    domain: 'chaos',
    upstreamWeight: 0.90,
    crossDomainImpact: 0.90,
  },
];

// PROFILE WYNIKÓW (PROFILES A - F)
export interface ProfileDef {
  id: string;
  code: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  title: string;
  tagline: string;
  coreInsight: string;
  mirrorText: string;
  primaryDomain: DomainKey;
}

export const PROFILES: Record<string, ProfileDef> = {
  profile_a: {
    id: 'profile_a',
    code: 'A',
    title: 'Zaczynasz dzień na minusie',
    tagline: 'Twój dzień nie sypie się po południu. Sypie się rano przez brak regeneracji NREM.',
    coreInsight: 'Większość ludzi szuka motywacji o 15:00. U Ciebie problem tkwi w opóźnionej porannej zwyżce kortyzolu i spłyconym śnie.',
    mirrorText: 'Rano wstajesz spięty i bez kopa. Pierwsze godziny pracy nadrabiasz kawą, a popołudniu organizm wystawia rachunek za brak głębokiego snu.',
    primaryDomain: 'sleep',
  },
  profile_b: {
    id: 'profile_b',
    code: 'B',
    title: 'Wieczór zjada Ci następny dzień',
    tagline: 'Wieczorne odpuszczenie nie kończy dnia. Ustawia gorszy start jutra.',
    coreInsight: 'Utrata kontroli przy lodówce czy ekranie po 21:00 to biologiczny mechanizm szukania dopaminy po całym dniu napięcia psychicznego.',
    mirrorText: 'Przez cały dzień dowożysz obowiązki na silnej woli. Wieczorem kontrola puści, a późny posiłek i ekrany niszczą sen na kolejną dobę.',
    primaryDomain: 'nutrition',
  },
  profile_c: {
    id: 'profile_c',
    code: 'C',
    title: 'Weekend kosztuje Cię trzy dni',
    tagline: 'Największym kosztem weekendu nie jest sobota. Jest poniedziałek i wtorek.',
    coreInsight: 'Rozjazd godzin snu i luźniejsze żywienie w weekend zmuszają zegar biologiczny do ponownej synchronizacji aż do środy.',
    mirrorText: 'W piątek czujesz ulgę, ale w niedzielę w nocy nie możesz zasnąć. Poniedziałek i wtorek przeżywasz na oparach, tracąc 3 dni obrotów.',
    primaryDomain: 'weekend',
  },
  profile_d: {
    id: 'profile_d',
    code: 'D',
    title: 'Twój plan działa tylko w laboratorium',
    tagline: 'Nie masz złego planu. Masz plan, który wymaga życia, którego nie prowadzisz.',
    coreInsight: 'Przeładowany harmonogram bez wersji minimum rozsypuje się przy pierwszym pożarze w pracy lub braku energii.',
    mirrorText: 'Gdy masz idealny tydzień, trenujesz i jesz świetnie. Gdy pojawia się chaos w pracy, plan odpada w 100%, bo brakuje elastycznej struktury.',
    primaryDomain: 'training',
  },
  profile_e: {
    id: 'profile_e',
    code: 'E',
    title: 'Cały tydzień jedziesz na napięciu',
    tagline: 'Dowozisz wynik siłą, ale rachunek pojawia się wtedy, gdy puszcza kontrola.',
    coreInsight: 'Stała aktywacja osi HPA utrzymuje wysoki kortyzol, co blokuje regenerację i obniża sprawność organizmu.',
    mirrorText: 'Pracujesz na wysokich obrotach i dowożysz wszystko. Jednak brak wyłączenia głowy po pracy sprawia, że ciało nie wchodzi w regenerację.',
    primaryDomain: 'energy',
  },
  profile_f: {
    id: 'profile_f',
    code: 'F',
    title: 'Nie brakuje Ci wiedzy. Brakuje Ci punktu powrotu',
    tagline: 'Problemem nie jest odchylenie. Problemem jest to, ile czasu potrzebujesz po nim wrócić.',
    coreInsight: 'Myślenie zero-jedynkowe sprawia, że po jednym gorszym posiłku lub opuszczonym treningu odpuszczasz resztę tygodnia.',
    mirrorText: 'Teorię znasz bardzo dobrze. Ale gdy jeden dzień pójdzie nie tak, czekasz na "czysty poniedziałek", tracąc kolejne dni.',
    primaryDomain: 'chaos',
  },
};
