// assessment-config.ts, Wersjonowana konfiguracja pytań, domen i profili Diagnostyki Tygodnia V2

export const ASSESSMENT_VERSION = '2.3.0';

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
    label: 'Sen i regeneracja',
    shortLabel: 'Sen',
    description: 'Ile śpisz, jak wstajesz i o której dzień zaczyna się psuć.',
  },
  energy: {
    key: 'energy',
    label: 'Energia i głowa',
    shortLabel: 'Głowa',
    description: 'Kiedy spada energia i ile godzin lecisz na pół mocy.',
  },
  nutrition: {
    key: 'nutrition',
    label: 'Jedzenie i apetyt',
    shortLabel: 'Jedzenie',
    description: 'Wieczorny głód i kontrola nad jedzeniem po 18:00.',
  },
  training: {
    key: 'training',
    label: 'Trening',
    shortLabel: 'Trening',
    description: 'Czy w ogóle trenujesz i czy plan przeżywa gorszy tydzień.',
  },
  weekend: {
    key: 'weekend',
    label: 'Weekend i powrót do formy',
    shortLabel: 'Weekend',
    description: 'Używki, rozbity rytm i ile dni wracasz po weekendzie.',
  },
  chaos: {
    key: 'chaos',
    label: 'Napęd i libido',
    shortLabel: 'Napęd',
    description: 'Libido, pewność siebie i powrót po gorszym dniu.',
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
  optional?: boolean; // gdy true, mozna pominac (Dalej aktywne bez odpowiedzi)
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: QuestionOption[];
  condition?: (answers: Record<string, unknown>) => boolean;
  upstreamWeight: number; // jak bardzo ten problem jest przyrodzoną przyczyną
  crossDomainImpact: number; // ile innych domen pogarsza
}

// ── ŹRÓDŁO PRAWDY: pytania w głosie Michała, JĘZYK MAKSYMALNIE PROSTY (poziom "5-latek zrozumie").
// Zero metafor, zero slangu, ktory zaciemnia. Os: energia, glowa, uzywki, libido, nie sylwetka.
//
// TWARDE OGRANICZENIA SILNIKA (scoring-engine.ts + answers-to-fd.ts):
// - id opcji scoringowych (sleep_quality sq_*, break_window bw_*, stress_level st_*,
//   evening_eating ee_*, weekend_pattern wp_*, alcohol_intake alc_*) i ich value MUSZA zostac 1:1.
// - upstreamWeight/crossDomainImpact PIERWSZEGO pytania danej domeny definiuja dzwignie tej domeny.
export const QUESTIONS: QuestionDef[] = [
  // ── SEKCJA I: KONTEKST (kotwica domeny 'sleep' -> wagi 0.85/0.90) ──
  {
    id: 'age',
    section: 'Kontekst',
    sectionNum: 'I',
    title: 'Ile masz lat?',
    subtitle: 'Po trzydziestce organizm wolniej się odbudowuje, a testosteron spada. Dlatego wiek zmienia wynik.',
    type: 'slider',
    domain: 'sleep',
    min: 18,
    max: 50,
    step: 1,
    unit: ' lat',
    upstreamWeight: 0.85,
    crossDomainImpact: 0.90,
  },

  // ── SEKCJA II: SEN ──
  {
    id: 'sleep_hours',
    condition: () => false, // wyciete (2026-08-01), sleep_quality niesie warstwe snu
    section: 'Sen',
    sectionNum: 'II',
    title: 'Ile realnie śpisz, a nie ile leżysz?',
    subtitle: 'Odejmij scrollowanie i wybudzenia. Zostaje sam sen.',
    type: 'slider',
    domain: 'sleep',
    min: 3,
    max: 9,
    step: 0.5,
    unit: 'h',
    upstreamWeight: 0.85,
    crossDomainImpact: 0.90,
  },
  {
    id: 'screen_bed',
    condition: () => false, // wyciete
    section: 'Sen',
    sectionNum: 'II',
    title: 'W ilu z ostatnich 7 wieczorów telefon był z Tobą do ostatnich 30 minut przed snem?',
    type: 'single',
    domain: 'sleep',
    upstreamWeight: 0.75,
    crossDomainImpact: 0.70,
    options: [
      { id: 'sb_60min', label: '0-1, telefon zostaje poza łóżkiem', value: 0 },
      { id: 'sb_30min', label: '2-3, czasem mnie wciągnie', value: 30 },
      { id: 'sb_bed', label: '4-5, scroll to rytuał przed snem', value: 70 },
      { id: 'sb_fallasleep', label: '6-7, zasypiam z nim w ręce', value: 100 },
    ],
  },
  {
    id: 'sleep_quality',
    section: 'Sen',
    sectionNum: 'II',
    title: 'Jak często budzisz się wyspany?',
    subtitle: 'Chodzi o to, czy rano masz siłę.',
    type: 'single',
    domain: 'sleep',
    upstreamWeight: 0.80,
    crossDomainImpact: 0.85,
    options: [
      { id: 'sq_great', label: 'Prawie codziennie budzę się z energią.', value: 0 },
      { id: 'sq_ok', label: '3-4 razy w tygodniu.', value: 30 },
      { id: 'sq_heavy', label: '1-2 razy. Resztę dni wstaję zmęczony.', value: 70 },
      { id: 'sq_wrecked', label: 'Prawie nigdy. Rano zawsze jestem zmęczony.', value: 100 },
    ],
  },
  {
    id: 'break_window',
    section: 'Sen',
    sectionNum: 'II',
    title: 'O której godzinie dzień zaczyna Ci się psuć?',
    subtitle: 'Ten pierwszy moment, po którym reszta dnia leci w dół.',
    type: 'single',
    domain: 'sleep',
    upstreamWeight: 0.75,
    crossDomainImpact: 0.75,
    options: [
      { id: 'bw_morning', label: 'Od rana. Budzik, telefon, kawa i już jestem zmęczony.', value: 60 },
      { id: 'bw_midday', label: 'Przed obiadem. Tracę skupienie, ważne rzeczy odkładam.', value: 50 },
      { id: 'bw_afternoon', label: 'Po 14. Skupienie znika, robię tylko to, co konieczne.', value: 75 },
      { id: 'bw_afterwork', label: 'Po pracy. Na trening i normalny posiłek nie mam już siły.', value: 80 },
      { id: 'bw_evening', label: 'Wieczorem. Telefon, lodówka i późne chodzenie spać biorą górę.', value: 90 },
      { id: 'bw_weekend', label: 'Dopiero weekend. W tygodniu daję radę, piątek albo sobota psuje wszystko.', value: 85 },
      { id: 'bw_varies', label: 'Nie ma jednej godziny. Każdy dzień jest inny.', value: 70 },
    ],
  },

  // ── SEKCJA III: GŁOWA I ENERGIA (kotwica domeny 'energy' -> wagi 0.70/0.75) ──
  {
    id: 'stress_level',
    section: 'Głowa',
    sectionNum: 'III',
    title: 'Wieczorem leżysz, a głowa dalej myśli o pracy?',
    subtitle: 'Ile z ostatnich 7 wieczorów tak wyglądało.',
    type: 'single',
    domain: 'energy',
    upstreamWeight: 0.70,
    crossDomainImpact: 0.75,
    options: [
      { id: 'st_low', label: 'Prawie nigdy. Kładę się i zasypiam.', value: 0 },
      { id: 'st_mid', label: 'Czasem. 2-3 wieczory myślę o jutrze.', value: 40 },
      { id: 'st_high', label: 'Często. 4-5 wieczorów leżę i planuję.', value: 80 },
      { id: 'st_max', label: 'Codziennie. Zasypiam z listą w głowie.', value: 100 },
    ],
  },
  {
    id: 'half_power_hours',
    section: 'Głowa',
    sectionNum: 'III',
    title: 'Ile godzin dziennie lecisz na pół mocy?',
    subtitle: 'Niby coś robisz, ale głowa nie pracuje na pełnych obrotach. Policz te godziny.',
    type: 'slider',
    domain: 'energy',
    min: 0,
    max: 4,
    step: 0.5,
    unit: 'h',
    upstreamWeight: 0.65,
    crossDomainImpact: 0.65,
  },
  {
    id: 'energy_mornings',
    condition: () => false, // wyciete
    section: 'Głowa',
    sectionNum: 'III',
    title: 'Jak często budzisz się z poczuciem, że spałbyś od razu jeszcze dwie godziny?',
    type: 'single',
    domain: 'energy',
    upstreamWeight: 0.80,
    crossDomainImpact: 0.80,
    options: [
      { id: 'en_0', label: 'Prawie nigdy', value: 0 },
      { id: 'en_1', label: '1-2 poranki w tygodniu', value: 33 },
      { id: 'en_2', label: '3-4 poranki', value: 66 },
      { id: 'en_3', label: '5-7 poranków', value: 100 },
    ],
  },

  // ── SEKCJA IV: JEDZENIE (kotwica domeny 'nutrition' -> wagi 0.85/0.75) ──
  {
    id: 'evening_eating',
    section: 'Jedzenie',
    sectionNum: 'IV',
    title: 'Co się dzieje z jedzeniem wieczorem, między 18:00 a snem?',
    subtitle: 'Wieczorem najłatwiej stracić kontrolę nad jedzeniem. Jak jest u Ciebie?',
    type: 'single',
    domain: 'nutrition',
    upstreamWeight: 0.85,
    crossDomainImpact: 0.75,
    options: [
      { id: 'ee_clean', label: 'Jem to, co zaplanowałem, i koniec.', value: 0 },
      { id: 'ee_snack', label: 'Dochodzi jedna przekąska poza planem.', value: 45 },
      { id: 'ee_binge', label: '1-2 razy w tygodniu jem dużo więcej, niż chciałem.', value: 70 },
      { id: 'ee_uncontrolled', label: '3 wieczory albo więcej kończą się jedzeniem bez kontroli.', value: 90 },
      { id: 'ee_chaos', label: 'Każdy wieczór wygląda inaczej.', value: 100 },
    ],
  },
  {
    id: 'takeout_cost',
    section: 'Jedzenie',
    sectionNum: 'IV',
    title: 'Ile miesięcznie wydajesz na dowozy i jedzenie na mieście?',
    subtitle: 'Glovo, kebab, gotowce z Żabki. Podaj kwotę na oko, nikt tego nie sprawdza.',
    type: 'slider',
    domain: 'nutrition',
    min: 0,
    max: 1000,
    step: 50,
    unit: ' zł',
    upstreamWeight: 0.50,
    crossDomainImpact: 0.40,
  },

  // ── SEKCJA V: TRENING (kotwica domeny 'training' -> wagi 0.70/0.65; nietrenujacy = plan 0) ──
  {
    id: 'planned_trainings',
    section: 'Trening',
    sectionNum: 'V',
    title: 'Ile razy w tygodniu planujesz trening?',
    subtitle: 'Zero to też odpowiedź. Nie musisz trenować, żeby zrobić ten test.',
    type: 'slider',
    domain: 'training',
    min: 0,
    max: 7,
    step: 1,
    unit: '',
    upstreamWeight: 0.70,
    crossDomainImpact: 0.65,
  },
  {
    id: 'missed_trainings',
    condition: (a) => typeof a.planned_trainings === 'number' && a.planned_trainings >= 1, // bramka: pytaj tylko trenujacych
    section: 'Trening',
    sectionNum: 'V',
    title: 'Ile z nich zwykle wypada, gdy tydzień się psuje?',
    subtitle: 'Przez zmęczenie, brak czasu albo rozwalony tydzień.',
    type: 'slider',
    domain: 'training',
    min: 0,
    max: 7,
    step: 1,
    unit: '',
    upstreamWeight: 0.70,
    crossDomainImpact: 0.65,
  },

  // ── SEKCJA VI: WEEKEND (kotwica domeny 'weekend' -> wagi 0.85/0.85) ──
  {
    id: 'weekend_pattern',
    section: 'Weekend',
    sectionNum: 'VI',
    title: 'Jak często weekend psuje Ci sen, jedzenie albo ruch?',
    subtitle: 'Czy weekend niszczy to, co ułożyłeś przez tydzień.',
    type: 'single',
    domain: 'weekend',
    upstreamWeight: 0.85,
    crossDomainImpact: 0.85,
    options: [
      { id: 'wp_same', label: 'Prawie nigdy. Weekend wygląda jak reszta tygodnia.', value: 0 },
      { id: 'wp_slight', label: 'Raz na miesiąc coś się psuje.', value: 35 },
      { id: 'wp_shifted', label: '2-3 weekendy w miesiącu.', value: 75 },
      { id: 'wp_reset', label: 'Prawie każdy weekend psuje rytm.', value: 100 },
    ],
  },
  {
    id: 'alcohol_intake',
    section: 'Weekend',
    sectionNum: 'VI',
    title: 'Weekend. Jak mocno się urywasz?',
    subtitle: 'Alkohol, zioło, coś mocniejszego. Zero moralizowania, liczę tylko co to robi z Twoją głową i regeneracją.',
    type: 'single',
    domain: 'weekend',
    upstreamWeight: 0.80,
    crossDomainImpact: 0.90,
    options: [
      { id: 'alc_zero', label: 'Czysto, nie ruszam.', value: 0 },
      { id: 'alc_low', label: 'Kilka piw, nic dzikiego.', value: 35 },
      { id: 'alc_mid', label: 'Solidnie, czasem urywa mi się film.', value: 70 },
      { id: 'alc_high', label: 'Alkohol plus coś jeszcze, zioło albo prochy.', value: 90 },
      { id: 'alc_extreme', label: 'Mocno i nie tylko w weekend.', value: 100 },
    ],
  },
  {
    id: 'weekend_cash',
    section: 'Weekend',
    sectionNum: 'VI',
    title: 'Ile wydajesz, jak już wyjdziesz?',
    subtitle: 'Alkohol, kluby, taxi, jedzenie, cokolwiek. Jedno typowe wyjście.',
    type: 'slider',
    domain: 'weekend',
    min: 0,
    max: 800,
    step: 50,
    unit: ' zł',
    condition: (a) => a.weekend_pattern !== undefined && a.weekend_pattern !== 'wp_same',
    upstreamWeight: 0.40,
    crossDomainImpact: 0.40,
  },
  {
    id: 'monday_recovery',
    section: 'Weekend',
    sectionNum: 'VI',
    title: 'Ile dni po weekendzie zdychasz, zanim wrócisz do formy?',
    subtitle: 'Zanim sen, energia i głowa wrócą do normy.',
    type: 'single',
    domain: 'weekend',
    upstreamWeight: 0.70,
    crossDomainImpact: 0.75,
    options: [
      { id: 'mon_0', label: 'Zero. W poniedziałek rano jestem gotowy.', value: 0 },
      { id: 'mon_1', label: 'W poniedziałek po południu wracam do formy.', value: 40 },
      { id: 'mon_2', label: 'Dopiero we wtorek.', value: 70 },
      { id: 'mon_3', label: 'W środę albo później. Pół tygodnia zdycham.', value: 100 },
    ],
  },

  // ── SEKCJA VII: NAPĘD I LIBIDO (kotwica domeny 'chaos' -> wagi 0.60/0.80) ──
  {
    id: 'symptoms_chips',
    section: 'Napęd',
    sectionNum: 'VII',
    title: 'Co ostatnio najbardziej Ci siadało?',
    subtitle: 'Zaznacz maksymalnie 3, te najmocniejsze. Bóle, stawy i tętno zostaw lekarzowi, tu ich nie liczę.',
    type: 'multi',
    domain: 'chaos',
    upstreamWeight: 0.60,
    crossDomainImpact: 0.80,
    options: [
      { id: 'fatigue', label: 'Zmęczenie, choć śpię swoje godziny.', value: 20 },
      { id: 'focus', label: 'Trudno mi się skupić dłużej niż chwilę.', value: 20 },
      { id: 'cravings', label: 'Wieczorny głód i ochota na słodkie bez kontroli.', value: 15 },
      { id: 'belly', label: 'Brak efektów na sylwetce, choć próbuję.', value: 20 },
      { id: 'recovery', label: 'Wolno wracam do sił po treningu albo ciężkim dniu.', value: 15 },
      { id: 'libido', label: 'Libido i ochota na seks poszły w dół.', value: 20 },
      { id: 'anxiety', label: 'Napięcie i rozdrażnienie, które nie mija wieczorem.', value: 20 },
      { id: 'digest', label: 'Brzuch, wzdęcia, ciężkość po jedzeniu.', value: 15 },
      { id: 'motivation', label: 'Napęd siadł, robię już tylko minimum.', value: 15 },
      { id: 'confidence', label: 'Mniej pewny siebie niż rok temu, omijam lustra.', value: 15 },
    ],
  },
  {
    id: 'morning_wood',
    section: 'Napęd',
    sectionNum: 'VII',
    title: 'Poranne wzwody, szczerze, jak często?',
    subtitle: 'Bez oceniania. To dobry sygnał snu i testosteronu. Możesz pominąć.',
    type: 'single',
    domain: 'chaos',
    optional: true,
    upstreamWeight: 0.55,
    crossDomainImpact: 0.60,
    options: [
      { id: 'mw_0', label: 'Większość poranków, normalnie.', value: 0 },
      { id: 'mw_1', label: 'Czasem, kilka razy w tygodniu.', value: 50 },
      { id: 'mw_2', label: 'Rzadko. Widzę, że to już nie to.', value: 100 },
    ],
  },
  {
    id: 'tried_before',
    section: 'Napęd',
    sectionNum: 'VII',
    title: 'Ile razy w tym roku zacząłeś plan, który padł w niecały miesiąc?',
    subtitle: 'Chodzi o te, które nie przetrwały czterech tygodni.',
    type: 'single',
    domain: 'chaos',
    upstreamWeight: 0.65,
    crossDomainImpact: 0.60,
    options: [
      { id: 'tb_0', label: 'Ani razu.', value: 0 },
      { id: 'tb_1', label: '1-2 razy.', value: 33 },
      { id: 'tb_2', label: '3-4 razy.', value: 66 },
      { id: 'tb_3', label: '5 albo więcej. Zaczynam mieć tego dość.', value: 100 },
    ],
  },
  {
    id: 'user_pain',
    section: 'Główna przeszkoda',
    sectionNum: 'VII',
    title: 'Co Cię w tym wszystkim najbardziej wkurwia?',
    subtitle: 'Jedno zdanie, własnymi słowami. Bez ładnego pisania.',
    type: 'text',
    domain: 'chaos',
    upstreamWeight: 0.90,
    crossDomainImpact: 0.90,
  },

  // ── SEKCJA VIII: CO DALEJ (kwalifikacja fit, niewidoczna, nie wchodzi do score) ──
  {
    id: 'intent',
    section: 'Co dalej',
    sectionNum: 'VIII',
    title: 'Gdybyś miał to w końcu zmienić, jak wolisz działać?',
    subtitle: 'Bez zobowiązań. Chcę tylko wiedzieć, jak wolisz to ograć.',
    type: 'single',
    domain: 'chaos',
    upstreamWeight: 0,
    crossDomainImpact: 0,
    options: [
      { id: 'in_sam', label: 'Ogarnę sam, daj mi tylko kierunek.', value: 0 },
      { id: 'in_zobacz', label: 'Chcę zobaczyć, jak wygląda praca z kimś.', value: 0 },
      { id: 'in_prowadz', label: 'Wolę, żeby ktoś mnie poprowadził i rozliczył.', value: 0 },
      { id: 'in_niewiem', label: 'Jeszcze nie wiem.', value: 0 },
    ],
  },
  {
    id: 'start_when',
    section: 'Co dalej',
    sectionNum: 'VIII',
    title: 'Kiedy chcesz zacząć?',
    type: 'single',
    domain: 'chaos',
    upstreamWeight: 0,
    crossDomainImpact: 0,
    options: [
      { id: 'sw_7dni', label: 'W tym tygodniu, mam dość.', value: 0 },
      { id: 'sw_30dni', label: 'W tym miesiącu.', value: 0 },
      { id: 'sw_kwartal', label: 'Za 2-3 miesiące.', value: 0 },
      { id: 'sw_sprawdzam', label: 'Na razie tylko sprawdzam.', value: 0 },
    ],
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
    tagline: 'Twój dzień nie psuje się po południu. Psuje się rano, bo nie regenerujesz się w nocy.',
    coreInsight: 'Większość ludzi szuka motywacji o 15:00. U Ciebie problem jest rano: budzisz się bez energii, bo sen był za płytki.',
    mirrorText: 'Rano wstajesz spięty i bez siły. Pierwsze godziny ratujesz kawą, a po południu organizm wystawia rachunek za słaby sen.',
    primaryDomain: 'sleep',
  },
  profile_b: {
    id: 'profile_b',
    code: 'B',
    title: 'Wieczór zjada Ci następny dzień',
    tagline: 'Wieczorne odpuszczenie nie kończy dnia. Ustawia gorszy start jutra.',
    coreInsight: 'Kiedy po 21:00 tracisz kontrolę przy lodówce albo telefonie, to organizm szuka nagrody po całym dniu napięcia.',
    mirrorText: 'Przez cały dzień trzymasz się silną wolą. Wieczorem kontrola puszcza, a późne jedzenie i ekran psują sen na kolejną dobę.',
    primaryDomain: 'nutrition',
  },
  profile_c: {
    id: 'profile_c',
    code: 'C',
    title: 'Weekend kosztuje Cię trzy dni',
    tagline: 'Najwięcej kosztuje Cię nie sobota. Kosztuje Cię poniedziałek i wtorek.',
    coreInsight: 'Rozjazd godzin snu i luźniejsze jedzenie w weekend rozstrajają Twój zegar biologiczny aż do środy.',
    mirrorText: 'W piątek czujesz ulgę, ale w niedzielę w nocy nie możesz zasnąć. Poniedziałek i wtorek ledwo ciągniesz, tracisz 3 dni.',
    primaryDomain: 'weekend',
  },
  profile_d: {
    id: 'profile_d',
    code: 'D',
    title: 'Twój plan działa tylko w idealnym tygodniu',
    tagline: 'Nie masz złego planu. Masz plan, który wymaga życia, którego nie prowadzisz.',
    coreInsight: 'Plan bez wersji minimum rozpada się przy pierwszym pożarze w pracy albo spadku energii.',
    mirrorText: 'Gdy tydzień jest idealny, trenujesz i jesz jak trzeba. Gdy w pracy się pali, plan pada w całości, bo nie ma wersji na gorszy dzień.',
    primaryDomain: 'training',
  },
  profile_e: {
    id: 'profile_e',
    code: 'E',
    title: 'Cały tydzień jedziesz na napięciu',
    tagline: 'Dowozisz wynik siłą, ale rachunek przychodzi wtedy, gdy puszcza kontrola.',
    coreInsight: 'Ciągłe napięcie trzyma wysoki poziom kortyzolu, a to blokuje regenerację i zbija formę.',
    mirrorText: 'Pracujesz na wysokich obrotach i wszystko dowozisz. Ale po pracy nie umiesz wyłączyć głowy, więc ciało się nie regeneruje.',
    primaryDomain: 'energy',
  },
  profile_f: {
    id: 'profile_f',
    code: 'F',
    title: 'Nie brakuje Ci wiedzy. Brakuje Ci punktu powrotu',
    tagline: 'Problemem nie jest jeden gorszy dzień. Problemem jest to, ile czasu wracasz po nim do rytmu.',
    coreInsight: 'Myślisz zero-jedynkowo: po jednym gorszym posiłku albo opuszczonym treningu odpuszczasz resztę tygodnia.',
    mirrorText: 'Teorię znasz świetnie. Ale gdy jeden dzień pójdzie nie tak, czekasz na "czysty poniedziałek" i tracisz kolejne dni.',
    primaryDomain: 'chaos',
  },
};
