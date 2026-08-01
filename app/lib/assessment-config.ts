// assessment-config.ts, Wersjonowana konfiguracja pytań, domen i profili Diagnostyki Tygodnia V2

export const ASSESSMENT_VERSION = '2.2.0';

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
    shortLabel: 'Głowa',
    description: 'Moment pierwszego spadku energii, aktywacja osi HPA i ile godzin lecisz na pół mocy.',
  },
  nutrition: {
    key: 'nutrition',
    label: 'Apetyt i kontrola jedzenia',
    shortLabel: 'Żarcie',
    description: 'Wieczorny napad głodu, kontrola po 18:00 i stabilność glikemiczna.',
  },
  training: {
    key: 'training',
    label: 'Trening i tarcie wykonawcze',
    shortLabel: 'Trening',
    description: 'Czy w ogóle trenujesz i czy plan przeżywa gorszy tydzień.',
  },
  weekend: {
    key: 'weekend',
    label: 'Weekend i koszt powrotu',
    shortLabel: 'Weekend',
    description: 'Rozjazd rytmu, używki, rozbity poniedziałek i koszt regeneracji po weekendzie.',
  },
  chaos: {
    key: 'chaos',
    label: 'Napęd, głowa i libido',
    shortLabel: 'Napęd',
    description: 'Libido, pewność siebie, powrót po odchyleniu i to, co siada najmocniej.',
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

// ── ŹRÓDŁO PRAWDY: pytania w głosie Michała. Oś przesunięta ze sylwetki/treningu na
// energię, głowę, używki i libido. Trening zredukowany do 1 pytania z bramką dla nietrenujących.
//
// TWARDE OGRANICZENIA SILNIKA (scoring-engine.ts + answers-to-fd.ts):
// - id opcji scoringowych (sleep_quality sq_*, break_window bw_*, stress_level st_*,
//   evening_eating ee_*, weekend_pattern wp_*, alcohol_intake alc_*) i ich value MUSZA zostac 1:1.
// - upstreamWeight/crossDomainImpact PIERWSZEGO pytania danej domeny (w kolejnosci tablicy)
//   definiuja dzwignie tej domeny w calculateScoring. Kotwice per domena zachowane.
export const QUESTIONS: QuestionDef[] = [
  // ── SEKCJA I: KONTEKST (kotwica domeny 'sleep' -> wagi 0.85/0.90) ──
  {
    id: 'age',
    section: 'Kontekst',
    sectionNum: 'I',
    title: 'Ile masz lat?',
    subtitle: 'Pytam nie dla metryczki. Po trzydziestce regeneracja i testosteron nie wybaczają tego, co po dwudziestce schodziło na luzie.',
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
    subtitle: 'Odejmij scrollowanie, wybudzenia i zasypianie. Zostaje sama jazda.',
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
    title: 'Jak często wstajesz i czujesz, że sen w ogóle zadziałał?',
    subtitle: 'Chodzi o to, czy rano faktycznie jest z czego brać.',
    type: 'single',
    domain: 'sleep',
    upstreamWeight: 0.80,
    crossDomainImpact: 0.85,
    options: [
      { id: 'sq_great', label: 'Prawie codziennie wstaję z bakiem.', value: 0 },
      { id: 'sq_ok', label: '3-4 razy w tygodniu.', value: 30 },
      { id: 'sq_heavy', label: '1-2 razy. Resztę dni wstaję na siłę.', value: 70 },
      { id: 'sq_wrecked', label: 'Prawie nigdy. Budzik to codzienny cios.', value: 100 },
    ],
  },
  {
    id: 'break_window',
    section: 'Sen',
    sectionNum: 'II',
    title: 'O której godzinie dzień zaczyna Ci się sypać?',
    subtitle: 'Nie kiedy to widać. Kiedy to się zaczyna. Ten pierwszy moment, po którym reszta leci z górki.',
    type: 'single',
    domain: 'sleep',
    upstreamWeight: 0.75,
    crossDomainImpact: 0.75,
    options: [
      { id: 'bw_morning', label: 'Od rana. Budzik, telefon, kawa i już jadę pod kreską.', value: 60 },
      { id: 'bw_midday', label: 'Przed obiadem. Odpływam, najważniejsze odkładam na potem.', value: 50 },
      { id: 'bw_afternoon', label: 'Po 14. Skupienie siada, dowożę tylko to, co muszę.', value: 75 },
      { id: 'bw_afterwork', label: 'Po robocie. Na trening i normalne jedzenie nie zostaje już nic.', value: 80 },
      { id: 'bw_evening', label: 'Wieczorem. Telefon, lodówka i przesuwanie snu przejmują stery.', value: 90 },
      { id: 'bw_weekend', label: 'Dopiero weekend. W tygodniu trzymam, piątek albo sobota kasuje wszystko.', value: 85 },
      { id: 'bw_varies', label: 'Nie ma jednej godziny. Każdego dnia sypie się inaczej.', value: 70 },
    ],
  },

  // ── SEKCJA III: GŁOWA I ENERGIA (kotwica domeny 'energy' -> wagi 0.70/0.75) ──
  {
    id: 'stress_level',
    section: 'Głowa',
    sectionNum: 'III',
    title: 'Wieczorem ciało już leży, a głowa dalej miele robotę?',
    subtitle: 'Ile z ostatnich 7 wieczorów tak wyglądało.',
    type: 'single',
    domain: 'energy',
    upstreamWeight: 0.70,
    crossDomainImpact: 0.75,
    options: [
      { id: 'st_low', label: 'Prawie nigdy. Gasnę razem ze światłem.', value: 0 },
      { id: 'st_mid', label: 'Czasem. 2-3 wieczory jeszcze przeżuwam jutro.', value: 40 },
      { id: 'st_high', label: 'Często. 4-5 wieczorów leżę i planuję.', value: 80 },
      { id: 'st_max', label: 'Codziennie. Zasypiam z listą w głowie.', value: 100 },
    ],
  },
  {
    id: 'half_power_hours',
    section: 'Głowa',
    sectionNum: 'III',
    title: 'Ile godzin dziennie lecisz na pół mocy?',
    subtitle: 'Siedzisz, klikasz, niby robisz. Ale głowy tam nie ma i sam o tym wiesz. Policz te godziny.',
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

  // ── SEKCJA IV: ŻARCIE (kotwica domeny 'nutrition' -> wagi 0.85/0.75) ──
  {
    id: 'evening_eating',
    section: 'Żarcie',
    sectionNum: 'IV',
    title: 'Co się dzieje z żarciem między 18:00 a snem?',
    subtitle: 'Wieczorem hamulce puszczają pierwsze. Powiedz, jak jest u Ciebie.',
    type: 'single',
    domain: 'nutrition',
    upstreamWeight: 0.85,
    crossDomainImpact: 0.75,
    options: [
      { id: 'ee_clean', label: 'Jem to, co miałem zjeść, i temat zamknięty.', value: 0 },
      { id: 'ee_snack', label: 'Dochodzi jedna nieplanowana przekąska.', value: 45 },
      { id: 'ee_binge', label: '1-2 razy w tygodniu leci dużo więcej, niż zakładałem.', value: 70 },
      { id: 'ee_uncontrolled', label: '3 wieczory albo więcej kończą się żarciem bez hamulca.', value: 90 },
      { id: 'ee_chaos', label: 'Każdy wieczór inny, żadnego rytmu.', value: 100 },
    ],
  },
  {
    id: 'takeout_cost',
    section: 'Żarcie',
    sectionNum: 'IV',
    title: 'Ile miesięcznie schodzi na dowozy i jedzenie na mieście?',
    subtitle: 'Glovo, kebab pod blokiem, gotowce z Żabki. Rzuć kwotą z głowy, nikt tego nie sprawdza.',
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
    title: 'Ile razy w tygodniu zakładasz, że trenujesz?',
    subtitle: 'Zero to też odpowiedź. Nie każdy musi żyć na siłowni i nie o to tu chodzi.',
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
    title: 'Ile z nich zwykle wypada, jak tydzień się rozjedzie?',
    subtitle: 'Zmęczenie, brak czasu, rozwalony rytm. Więcej, niż w ogóle zaplanowałeś, i tak nie wypadnie.',
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
    title: 'Jak często weekend wywala Ci sen, żarcie albo ruch?',
    subtitle: 'Weekend rozwala rytm, który budujesz przez cały tydzień?',
    type: 'single',
    domain: 'weekend',
    upstreamWeight: 0.85,
    crossDomainImpact: 0.85,
    options: [
      { id: 'wp_same', label: 'Prawie nigdy. Weekend wygląda jak reszta tygodnia.', value: 0 },
      { id: 'wp_slight', label: 'Raz na miesiąc coś się rozjedzie.', value: 35 },
      { id: 'wp_shifted', label: '2-3 weekendy w miesiącu.', value: 75 },
      { id: 'wp_reset', label: 'Prawie każdy weekend kasuje rytm.', value: 100 },
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
    title: 'Ile schodzi, jak już wyjdziesz?',
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
    subtitle: 'Żeby głowa, energia i sen były znowu takie jak w środku tygodnia.',
    type: 'single',
    domain: 'weekend',
    upstreamWeight: 0.70,
    crossDomainImpact: 0.75,
    options: [
      { id: 'mon_0', label: 'Zero. W poniedziałek rano jestem gotowy.', value: 0 },
      { id: 'mon_1', label: 'Poniedziałek po południu odbijam.', value: 40 },
      { id: 'mon_2', label: 'Dopiero wtorek.', value: 70 },
      { id: 'mon_3', label: 'Środa albo później. Pół tygodnia zdycham.', value: 100 },
    ],
  },

  // ── SEKCJA VII: NAPĘD, GŁOWA I LIBIDO (kotwica domeny 'chaos' -> wagi 0.60/0.80) ──
  {
    id: 'symptoms_chips',
    section: 'Napęd',
    sectionNum: 'VII',
    title: 'Co ostatnio najbardziej Ci siadało?',
    subtitle: 'Zaznacz maksymalnie 3, te które czujesz najmocniej. Czysto medyczne rzeczy (bóle, stawy, tętno) zostaw lekarzowi, tu ich nie liczę.',
    type: 'multi',
    domain: 'chaos',
    upstreamWeight: 0.60,
    crossDomainImpact: 0.80,
    options: [
      { id: 'fatigue', label: 'Zmęczenie, mimo że przesypiam swoje godziny.', value: 20 },
      { id: 'focus', label: 'Nie utrzymam skupienia dłużej niż chwilę.', value: 20 },
      { id: 'cravings', label: 'Wieczorne żarcie i głód na słodkie bez hamulca.', value: 15 },
      { id: 'belly', label: 'Zero efektów na sylwetce, mimo że coś tam próbuję.', value: 20 },
      { id: 'recovery', label: 'Wolno wracam po treningu albo po cięższym dniu.', value: 15 },
      { id: 'libido', label: 'Libido i ochota na seks poszły w dół.', value: 20 },
      { id: 'anxiety', label: 'Napięcie i rozdrażnienie, które wieczorem nie schodzi.', value: 20 },
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
    subtitle: 'Nie żeby oceniać. To jeden z najczystszych sygnałów snu i testosteronu. Chcesz, pomijasz.',
    type: 'single',
    domain: 'chaos',
    optional: true,
    upstreamWeight: 0.55,
    crossDomainImpact: 0.60,
    options: [
      { id: 'mw_0', label: 'Większość poranków, standard.', value: 0 },
      { id: 'mw_1', label: 'Czasem, kilka razy w tygodniu.', value: 50 },
      { id: 'mw_2', label: 'Rzadko. Zauważam, że to już nie to.', value: 100 },
    ],
  },
  {
    id: 'tried_before',
    section: 'Napęd',
    sectionNum: 'VII',
    title: 'Ile razy w tym roku odpaliłeś plan, który padł przed miesiącem?',
    subtitle: 'Liczą się te, co nie dożyły czterech tygodni.',
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
    title: 'Gdybyś miał to w końcu ruszyć, jak wolisz?',
    subtitle: 'Bez zobowiązań. Ciekawi mnie tylko, jak wolisz to ograć.',
    type: 'single',
    domain: 'chaos',
    upstreamWeight: 0,
    crossDomainImpact: 0,
    options: [
      { id: 'in_sam', label: 'Ogarnę sam, daj mi tylko kierunek.', value: 0 },
      { id: 'in_zobacz', label: 'Chcę zobaczyć, jak wygląda robota z kimś.', value: 0 },
      { id: 'in_prowadz', label: 'Wolę, żeby ktoś mnie poprowadził i rozliczył.', value: 0 },
      { id: 'in_niewiem', label: 'Jeszcze nie wiem.', value: 0 },
    ],
  },
  {
    id: 'start_when',
    section: 'Co dalej',
    sectionNum: 'VIII',
    title: 'Kiedy chcesz to ruszyć?',
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
    mirrorText: 'Przez cały dzień dowozisz obowiązki na silnej woli. Wieczorem kontrola puści, a późny posiłek i ekrany niszczą sen na kolejną dobę.',
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
    mirrorText: 'Gdy masz idealny tydzień, trenujesz i jesz jak trzeba. Gdy w pracy się pali, plan pada w całości, bo nie ma wersji minimum na gorszy dzień.',
    primaryDomain: 'training',
  },
  profile_e: {
    id: 'profile_e',
    code: 'E',
    title: 'Cały tydzień jedziesz na napięciu',
    tagline: 'Dowozisz wynik siłą, ale rachunek pojawia się wtedy, gdy puszcza kontrola.',
    coreInsight: 'Stała aktywacja osi HPA utrzymuje wysoki kortyzol, co blokuje regenerację i obniża sprawność organizmu.',
    mirrorText: 'Pracujesz na wysokich obrotach i dowozisz wszystko. Jednak brak wyłączenia głowy po pracy sprawia, że ciało nie wchodzi w regenerację.',
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
