// assessment-config.ts, Wersjonowana konfiguracja pytań, domen i profili Diagnostyki Tygodnia V2

export const ASSESSMENT_VERSION = '2.1.0';

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
    label: 'Odporność, gdy tydzień się sypie',
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

// ── ŹRÓDŁO PRAWDY: pełny zestaw pytań przeniesiony 1:1 z żywej strony app/page.tsx (phase === 'form') ──
// Copy w głosie Michała (werbatim). Każde pytanie karmi konkretne pole FD (patrz answers-to-fd.ts),
// żeby diagnoza /diagnoza (score, catScores, archetyp, Karta) stała na pełnych danych, nie na INIT.
//
// UWAGA scoring-engine.ts (calculateScoring): czyta RawAnswers po sztywnych id opcji (sq_*, sb_*, st_*,
// bw_*, ee_*, wp_*, alc_*) oraz bierze upstreamWeight/crossDomainImpact z PIERWSZEGO pytania danej domeny.
// Dlatego te id i wagi pierwszych pytań per domena są zachowane 1:1 z poprzednią wersją config.
export const QUESTIONS: QuestionDef[] = [
  // ── SEKCJA I: KONTEKST ──
  // Pierwsze pytanie domeny 'sleep' -> jego wagi (0.85/0.90) definiują dźwignię snu w calculateScoring.
  {
    id: 'age',
    section: 'Kontekst',
    sectionNum: 'I',
    title: 'Ile masz lat?',
    subtitle: 'Ciało czasem twierdzi, że więcej.',
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
    section: 'Sen',
    sectionNum: 'II',
    title: 'Ile godzin faktycznie śpisz',
    subtitle: 'Leżysz 8h. Ile z tego naprawdę śpisz, a ile przewijasz telefon?',
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
    condition: () => false, // wyciete z krotszej wersji (2026-07-28)
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
    title: 'Jak często budzisz się z poczuciem, że sen faktycznie Cię odnowił?',
    type: 'single',
    domain: 'sleep',
    upstreamWeight: 0.80,
    crossDomainImpact: 0.85,
    options: [
      { id: 'sq_great', label: 'Prawie codziennie', value: 0 },
      { id: 'sq_ok', label: '3-4 razy w tygodniu', value: 30 },
      { id: 'sq_heavy', label: '1-2 razy w tygodniu', value: 70 },
      { id: 'sq_wrecked', label: 'Prawie nigdy', value: 100 },
    ],
  },
  {
    id: 'break_window',
    section: 'Sen',
    sectionNum: 'II',
    title: 'Kiedy zaczyna się pierwszy moment, po którym dzień się sypie?',
    subtitle: 'Chodzi o pierwszy ruch, po którym reszta się rozjeżdża, zanim jeszcze widać skutki.',
    type: 'single',
    domain: 'sleep',
    upstreamWeight: 0.75,
    crossDomainImpact: 0.75,
    options: [
      { id: 'bw_morning', label: 'Zaraz po przebudzeniu. Budzik, telefon, kawa, start na minusie.', value: 60 },
      { id: 'bw_midday', label: 'Między 10:00 a 14:00. Odpływam, odkładam pierwsze ważne rzeczy.', value: 50 },
      { id: 'bw_afternoon', label: 'Między 14:00 a 18:00. Kończy się skupienie, dowożę już tylko minimum.', value: 75 },
      { id: 'bw_afterwork', label: 'Między 18:00 a 21:00. Odpada trening, normalny posiłek albo plan na wieczór.', value: 80 },
      { id: 'bw_evening', label: 'Po 21:00. Telefon, lodówka i przesuwanie snu przejmują stery.', value: 90 },
      { id: 'bw_weekend', label: 'Dopiero weekend. W tygodniu trzymam, piątek albo sobota kasuje rytm.', value: 85 },
      { id: 'bw_varies', label: 'Nie ma jednego momentu. Rozsypuje się różnie.', value: 70 },
    ],
  },

  // ── SEKCJA III: ENERGIA ──
  // Pierwsze pytanie domeny 'energy' -> wagi 0.70/0.75 (zachowane 1:1 dla dźwigni energii w calculateScoring).
  {
    id: 'stress_level',
    section: 'Energia',
    sectionNum: 'III',
    title: 'W ilu z ostatnich 7 wieczorów ciało już siedziało, a głowa dalej była w robocie?',
    type: 'single',
    domain: 'energy',
    upstreamWeight: 0.70,
    crossDomainImpact: 0.75,
    options: [
      { id: 'st_low', label: '0-1, głowa gaśnie razem ze światłem', value: 0 },
      { id: 'st_mid', label: '2-3, czasem mielę jeszcze robotę', value: 40 },
      { id: 'st_high', label: '4-5, leżę i planuję jutro', value: 80 },
      { id: 'st_max', label: '6-7, zasypiam z listą w głowie', value: 100 },
    ],
  },
  {
    id: 'energy_mornings',
    condition: () => false, // wyciete z krotszej wersji (2026-07-28)
    section: 'Energia',
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
  {
    id: 'dopamine_pull',
    condition: () => false, // wyciete z krotszej wersji (2026-07-28)
    section: 'Energia',
    sectionNum: 'III',
    title: 'Co się dzieje, gdy trafiasz na nudne albo trudne zadanie?',
    type: 'single',
    domain: 'energy',
    upstreamWeight: 0.65,
    crossDomainImpact: 0.70,
    options: [
      { id: 'dop_0', label: 'Zostaję przy nim bez sięgania po telefon.', value: 0 },
      { id: 'dop_1', label: 'Po kilku minutach zaczynam szukać przerwy.', value: 33 },
      { id: 'dop_2', label: 'Łapię telefon przy prawie każdym postoju.', value: 66 },
      { id: 'dop_3', label: 'Bez dodatkowego bodźca nie wytrzymuję nawet 15-20 minut.', value: 100 },
    ],
  },
  {
    id: 'work_hours',
    condition: () => false, // wyciete z krotszej wersji (2026-07-28)
    section: 'Energia',
    sectionNum: 'III',
    title: 'Ile godzin dziennie pracujesz?',
    subtitle: 'Dwie liczby. Z nich wychodzi, ile ten stan kosztuje Cię w robocie.',
    type: 'slider',
    domain: 'energy',
    min: 4,
    max: 14,
    step: 1,
    unit: 'h',
    upstreamWeight: 0.70,
    crossDomainImpact: 0.75,
  },
  {
    id: 'half_power_hours',
    condition: () => false, // wyciete z krotszej wersji (2026-07-28)
    section: 'Energia',
    sectionNum: 'III',
    title: 'Ile z nich lecisz na pół mocy?',
    subtitle: 'Siedzisz przy ekranie, klikasz, ale głowy tam nie ma. Policz te godziny.',
    type: 'slider',
    domain: 'energy',
    min: 0,
    max: 4,
    step: 0.5,
    unit: 'h',
    upstreamWeight: 0.60,
    crossDomainImpact: 0.65,
  },

  // ── SEKCJA IV: APETYT ──
  // Pierwsze pytanie domeny 'nutrition' -> wagi 0.85/0.75 (zachowane 1:1 dla dźwigni żywienia).
  {
    id: 'evening_eating',
    section: 'Apetyt',
    sectionNum: 'IV',
    title: 'Co najczęściej dzieje się z jedzeniem między 18:00 a snem?',
    type: 'single',
    domain: 'nutrition',
    upstreamWeight: 0.85,
    crossDomainImpact: 0.75,
    options: [
      { id: 'ee_clean', label: 'Jem zaplanowany posiłek i temat jest zamknięty.', value: 0 },
      { id: 'ee_snack', label: 'Dochodzi jedna nieplanowana przekąska.', value: 45 },
      { id: 'ee_binge', label: '1-2 razy w tygodniu jem znacznie więcej, niż planowałem.', value: 70 },
      { id: 'ee_uncontrolled', label: '3 albo więcej wieczorów kończy się jedzeniem bez kontroli.', value: 90 },
      { id: 'ee_chaos', label: 'Każdy wieczór wygląda inaczej, nie mam żadnego rytmu.', value: 100 },
    ],
  },
  {
    id: 'veggies_days',
    condition: () => false, // wyciete z krotszej wersji (2026-07-28)
    section: 'Apetyt',
    sectionNum: 'IV',
    title: 'W ilu z ostatnich 7 dni jadłeś warzywa lub owoce przynajmniej 3 razy?',
    type: 'single',
    domain: 'nutrition',
    upstreamWeight: 0.45,
    crossDomainImpact: 0.40,
    options: [
      { id: 'veg_0', label: '6-7 dni', value: 0 },
      { id: 'veg_1', label: '2-5 dni', value: 50 },
      { id: 'veg_2', label: '0-1 dni', value: 100 },
    ],
  },
  {
    id: 'protein_days',
    condition: () => false, // wyciete z krotszej wersji (2026-07-28)
    section: 'Apetyt',
    sectionNum: 'IV',
    title: 'W ilu z ostatnich 7 dni miałeś 3 normalne posiłki z konkretnym białkiem?',
    subtitle: 'Mięso, ryby, jajka, nabiał. Nie „coś się zjadło".',
    type: 'single',
    domain: 'nutrition',
    upstreamWeight: 0.50,
    crossDomainImpact: 0.45,
    options: [
      { id: 'pro_0', label: '6-7 dni, prawie zawsze', value: 0 },
      { id: 'pro_1', label: '2-5 dni, jak wyjdzie', value: 50 },
      { id: 'pro_2', label: '0-1 dni, głównie na skróty', value: 100 },
    ],
  },
  {
    id: 'takeout_cost',
    section: 'Apetyt',
    sectionNum: 'IV',
    title: 'Ile miesięcznie idzie na dowóz i jedzenie na mieście?',
    subtitle: 'Glovo, kebab pod blokiem, gotowce z Żabki. To liczba, którą sam podajesz i tylko ona wchodzi do rachunku.',
    type: 'slider',
    domain: 'nutrition',
    min: 0,
    max: 1000,
    step: 50,
    unit: ' zł',
    upstreamWeight: 0.50,
    crossDomainImpact: 0.40,
  },

  // ── SEKCJA V: TRENING ──
  // Pierwsze pytanie domeny 'training' -> wagi 0.70/0.65 (zachowane 1:1 dla dźwigni treningu).
  {
    id: 'planned_trainings',
    section: 'Trening',
    sectionNum: 'V',
    title: 'Ile treningów w tygodniu sobie zakładasz?',
    subtitle: 'Dwie liczby, między którymi mieszka cała prawda o Twojej formie. Zero treningów to też odpowiedź.',
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
    section: 'Trening',
    sectionNum: 'V',
    title: 'Ile z nich zwykle wypada przez zmęczenie, brak czasu, rozsypany tydzień?',
    subtitle: 'Nie policzy się więcej, niż planujesz.',
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
    id: 'train_years',
    condition: () => false, // wyciete z krotszej wersji (2026-07-28)
    section: 'Trening',
    sectionNum: 'V',
    title: 'Od ilu lat trenujesz?',
    type: 'slider',
    domain: 'training',
    min: 0,
    max: 15,
    step: 1,
    unit: ' lat',
    upstreamWeight: 0.40,
    crossDomainImpact: 0.35,
  },
  {
    id: 'train_happy',
    section: 'Trening',
    sectionNum: 'V',
    title: 'Widać po Tobie te lata treningu?',
    subtitle: 'Szczerze. Nikt tego nie widzi poza Tobą.',
    type: 'single',
    domain: 'training',
    upstreamWeight: 0.55,
    crossDomainImpact: 0.50,
    options: [
      { id: 'th_0', label: 'Tak, jestem zadowolony', value: 0 },
      { id: 'th_1', label: 'Częściowo, powinno być lepiej', value: 55 },
      { id: 'th_2', label: 'Nie, wkładam dużo więcej niż widać', value: 100 },
      { id: 'th_3', label: 'Dopiero zaczynam, za wcześnie oceniać', value: 20 },
    ],
  },

  // ── SEKCJA VI: WEEKEND ──
  // Pierwsze pytanie domeny 'weekend' -> wagi 0.85/0.85 (zachowane 1:1 dla dźwigni weekendu).
  {
    id: 'weekend_pattern',
    section: 'Weekend',
    sectionNum: 'VI',
    title: 'Jak często weekend wyraźnie rusza Ci sen, jedzenie albo poziom ruchu?',
    type: 'single',
    domain: 'weekend',
    upstreamWeight: 0.85,
    crossDomainImpact: 0.85,
    options: [
      { id: 'wp_same', label: 'Prawie nigdy', value: 0 },
      { id: 'wp_slight', label: 'Raz w miesiącu', value: 35 },
      { id: 'wp_shifted', label: '2-3 weekendy w miesiącu', value: 75 },
      { id: 'wp_reset', label: 'Prawie każdy weekend', value: 100 },
    ],
  },
  {
    id: 'alcohol_intake',
    section: 'Weekend',
    sectionNum: 'VI',
    title: 'Jeśli pijesz, ile porcji zwykle wypada na jedno wyjście?',
    subtitle: 'Opcjonalne. Piwo, drink, kieliszek, to jedna porcja.',
    type: 'single',
    domain: 'weekend',
    upstreamWeight: 0.80,
    crossDomainImpact: 0.90,
    options: [
      { id: 'alc_zero', label: 'Nie piję', value: 0 },
      { id: 'alc_low', label: '1-2', value: 35 },
      { id: 'alc_mid', label: '3-5', value: 70 },
      { id: 'alc_high', label: '6-8', value: 90 },
      { id: 'alc_extreme', label: '9+', value: 100 },
    ],
  },
  {
    id: 'weekend_cash',
    section: 'Weekend',
    sectionNum: 'VI',
    title: 'Ile schodzi, jak już wyjdziesz?',
    subtitle: 'Alkohol, kluby, taksówki, jedzenie, cokolwiek. Jedno typowe wyjście.',
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
    condition: () => false, // wyciete z krotszej wersji (2026-07-28)
    section: 'Weekend',
    sectionNum: 'VI',
    title: 'Kiedy po weekendzie sen, energia i głowa wracają do normy?',
    subtitle: 'Żeby było jak w środku tygodnia.',
    type: 'single',
    domain: 'weekend',
    upstreamWeight: 0.70,
    crossDomainImpact: 0.75,
    options: [
      { id: 'mon_0', label: 'Od poniedziałkowego rana', value: 0 },
      { id: 'mon_1', label: 'W poniedziałek po południu', value: 40 },
      { id: 'mon_2', label: 'Dopiero we wtorek', value: 70 },
      { id: 'mon_3', label: 'W środę albo później', value: 100 },
    ],
  },
  {
    id: 'weekend_break',
    section: 'Weekend',
    sectionNum: 'VI',
    title: 'Co się sypie w weekend najmocniej?',
    type: 'single',
    domain: 'weekend',
    condition: () => false, // wyciete z krotszej wersji (2026-07-28)
    upstreamWeight: 0.60,
    crossDomainImpact: 0.55,
    options: [
      { id: 'ww_0', label: 'Sen i pobudki, wstaję w południe', value: 60 },
      { id: 'ww_1', label: 'Jedzenie leci luzem', value: 60 },
      { id: 'ww_2', label: 'Zero ruchu, kanapa i telefon', value: 60 },
      { id: 'ww_3', label: 'Alkohol i powrót do siebie', value: 60 },
    ],
  },

  // ── SEKCJA VII: GŁOWA ──
  // Pierwsze pytanie domeny 'chaos' -> wagi 0.60/0.80 (zachowane 1:1 dla dźwigni głowy).
  // morningWood i objawy karmią hormony/tags; user_pain zostaje na końcu (input do LLM reframe).
  {
    id: 'symptoms_chips',
    section: 'Głowa',
    sectionNum: 'VII',
    title: 'Które sygnały przeszkadzały Ci najbardziej w ostatnich tygodniach?',
    subtitle: 'Wybierz maksymalnie 3. Objawy czysto medyczne (bóle głowy, stawy, tętno) omawia się z lekarzem, nie zalicza do wyniku.',
    type: 'multi',
    domain: 'chaos',
    upstreamWeight: 0.60,
    crossDomainImpact: 0.80,
    options: [
      { id: 'fatigue', label: 'Zmęczenie mimo wystarczającej liczby godzin snu.', value: 20 },
      { id: 'focus', label: 'Trudność z utrzymaniem skupienia.', value: 20 },
      { id: 'cravings', label: 'Wieczorne jedzenie bez kontroli, głód na słodkie.', value: 15 },
      { id: 'belly', label: 'Brak efektów sylwetkowych mimo regularnych prób.', value: 20 },
      { id: 'recovery', label: 'Wolniejsza regeneracja po treningu.', value: 15 },
      { id: 'libido', label: 'Spadek libido albo zainteresowania seksem.', value: 20 },
      { id: 'anxiety', label: 'Napięcie i rozdrażnienie, które nie schodzą wieczorem.', value: 20 },
      { id: 'digest', label: 'Problemy z trawieniem albo częste wzdęcia.', value: 15 },
      { id: 'motivation', label: 'Napęd siada, robisz tylko minimum.', value: 15 },
      { id: 'confidence', label: 'Mniej pewny siebie niż rok temu, unikasz luster.', value: 15 },
    ],
  },
  {
    id: 'morning_wood',
    condition: () => false, // wyciete z krotszej wersji (2026-07-28)
    section: 'Głowa',
    sectionNum: 'VII',
    title: 'Jak często w ostatnich 4 tygodniach zdarzał się poranny wzwód?',
    subtitle: 'Jeden z kilku sygnałów snu i zdrowia seksualnego. Sam nie mówi, jaki masz testosteron. Możesz pominąć.',
    type: 'single',
    domain: 'chaos',
    upstreamWeight: 0.55,
    crossDomainImpact: 0.60,
    options: [
      { id: 'mw_0', label: '4+ razy w tygodniu', value: 0 },
      { id: 'mw_1', label: '1-3 razy w tygodniu', value: 50 },
      { id: 'mw_2', label: 'Rzadziej', value: 100 },
    ],
  },
  {
    id: 'tried_before',
    section: 'Głowa',
    sectionNum: 'VII',
    title: 'Ile razy w tym roku odpaliłeś plan, który padł przed miesiącem?',
    subtitle: 'Liczą się te, co nie dożyły czterech tygodni.',
    type: 'single',
    domain: 'chaos',
    upstreamWeight: 0.65,
    crossDomainImpact: 0.60,
    options: [
      { id: 'tb_0', label: 'Ani razu', value: 0 },
      { id: 'tb_1', label: '1-2 razy', value: 33 },
      { id: 'tb_2', label: '3-4 razy', value: 66 },
      { id: 'tb_3', label: '5+ razy', value: 100 },
    ],
  },
  {
    id: 'defer_count',
    condition: () => false, // wyciete z krotszej wersji (2026-07-28)
    section: 'Głowa',
    sectionNum: 'VII',
    title: 'W ostatnim tygodniu: ile ważnych rzeczy odłożyłeś, bo nie miałeś głowy, chociaż czas teoretycznie był?',
    type: 'single',
    domain: 'chaos',
    upstreamWeight: 0.60,
    crossDomainImpact: 0.70,
    options: [
      { id: 'df_0', label: '0', value: 0 },
      { id: 'df_1', label: '1-2', value: 33 },
      { id: 'df_2', label: '3-5', value: 66 },
      { id: 'df_3', label: 'Codziennie coś wisi', value: 100 },
    ],
  },
  {
    id: 'retreat_when',
    condition: () => false, // wyciete z krotszej wersji (2026-07-28)
    section: 'Głowa',
    sectionNum: 'VII',
    title: 'Kiedy ostatnio odpuściłeś ważną rozmowę, na której Ci zależało, bo nie miałeś na nią głowy?',
    type: 'single',
    domain: 'chaos',
    upstreamWeight: 0.55,
    crossDomainImpact: 0.55,
    options: [
      { id: 'rt_0', label: 'W tym tygodniu', value: 100 },
      { id: 'rt_1', label: 'W tym miesiącu', value: 66 },
      { id: 'rt_2', label: 'Dawno, nie pamiętam', value: 20 },
      { id: 'rt_3', label: 'Ciągle tak mam', value: 100 },
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

  // ── SEKCJA VIII: CO DALEJ (kwalifikacja, niewidoczna, nie wchodzi do score) ──
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
      { id: 'in_sam', label: 'Ogarnę sam, daj mi tylko kierunek', value: 0 },
      { id: 'in_zobacz', label: 'Chcę zobaczyć, jak wygląda robota z kimś', value: 0 },
      { id: 'in_prowadz', label: 'Wolę, żeby ktoś mnie poprowadził i rozliczył', value: 0 },
      { id: 'in_niewiem', label: 'Jeszcze nie wiem', value: 0 },
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
      { id: 'sw_7dni', label: 'W tym tygodniu, mam dość', value: 0 },
      { id: 'sw_30dni', label: 'W tym miesiącu', value: 0 },
      { id: 'sw_kwartal', label: 'Za 2-3 miesiące', value: 0 },
      { id: 'sw_sprawdzam', label: 'Na razie tylko sprawdzam', value: 0 },
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
    mirrorText: 'Gdy masz idealny tydzień, trenujesz i jesz jak trzeba. Gdy w pracy się pali, plan pada w całości, bo nie ma wersji minimum na gorszy dzień.',
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
