// assessment-config.ts, Wersjonowana konfiguracja pytań, domen i profili Diagnostyki Tygodnia V2

export const ASSESSMENT_VERSION = '2.8.1';

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

export type QuestionType = 'single' | 'slider' | 'number' | 'multi' | 'text' | 'contact';

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
  placeholder?: string; // podpowiedź w polu tekstowym (per pytanie, nie jeden generyk)
  options?: QuestionOption[];
  maxSelect?: number; // tylko dla 'multi': ile chipow wolno zaznaczyc. Domyslnie 3.
  condition?: (answers: Record<string, unknown>) => boolean;
  upstreamWeight: number; // jak bardzo ten problem jest przyrodzoną przyczyną
  crossDomainImpact: number; // ile innych domen pogarsza
}

// ── ŹRÓDŁO PRAWDY: pytania w głosie Michała, JĘZYK MAKSYMALNIE PROSTY (poziom "5-latek zrozumie").
// Zero metafor, zero slangu, który zaciemnia. Front: forma/sylwetka jako widoczny cel; weekend/sen/stres/jedzenie jako mechanizmy do odkrycia.
//
// TWARDE OGRANICZENIA SILNIKA (scoring-engine.ts + answers-to-fd.ts):
// - id opcji scoringowych (sleep_quality sq_*, break_window bw_*, stress_level st_*,
//   evening_eating ee_*, weekend_pattern wp_*, alcohol_intake alc_*) i ich value MUSZA zostac 1:1.
// - upstreamWeight/crossDomainImpact PIERWSZEGO pytania danej domeny definiuja dzwignie tej domeny.
export const QUESTIONS: QuestionDef[] = [
  // ── SEKCJA I: KONTEKST (kotwica domeny 'sleep' -> wagi 0.85/0.90) ──
  {
    id: 'age',
    condition: () => false, // wyciete 2026-08-26: niski sygnal diagnostyczny, chroni completion (age -> INIT.age)
    section: 'Kontekst',
    sectionNum: 'I',
    title: 'Ile masz lat?',
    subtitle: 'Po trzydziestce ciało wybacza mniej niż kiedyś. Dlatego pytam.',
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
  // ── PYTANIE-DANE (opener): mierzy PRAGNIENIE, nie objaw. Nie wchodzi do score (value 0). ──
  {
    id: 'primary_goal',
    section: 'Po co tu jesteś',
    sectionNum: 'I',
    title: 'Co najbardziej chcesz poprawić w najbliższych miesiącach?',
    subtitle: 'Wybierz rzecz, po której najbardziej zauważysz, że to działa.',
    type: 'single',
    domain: 'chaos',
    upstreamWeight: 0,
    crossDomainImpact: 0,
    options: [
      { id: 'goal_forma', label: 'Sylwetkę i wygląd. Chcę wreszcie widzieć różnicę.', value: 0 },
      { id: 'goal_energia', label: 'Moc na cały dzień, bez zjazdów.', value: 0 },
      { id: 'goal_sen', label: 'Sen i regeneracja, budzić się wyspanym.', value: 0 },
      { id: 'goal_glowa', label: 'Spokój w głowie, mniej napięcia.', value: 0 },
      { id: 'goal_naped', label: 'Napęd i libido, wrócić do siebie.', value: 0 },
      { id: 'goal_inne', label: 'Coś innego.', value: 0 },
    ],
  },
  // ── PREMIUM ICP PATCH V1 §3A: ODPOWIEDZIALNOSC. Wartosc 0, zero wplywu na severity.
  //    To jest router calej galezi kwalifikacyjnej: odpowiedz inna niz wl_clock odblokowuje 'spillover'.
  //    Pytamy o CZYJE sprawy zjadaja dzien, nie o godziny (§2: dlugie godziny NIE sa sygnalem premium). ──
  {
    id: 'work_load',
    section: 'Rytm tygodnia',
    sectionNum: 'I',
    title: 'Czyje sprawy zjadają Ci dzień?',
    subtitle: 'Weź zwykły dzień roboczy, nie ten najgorszy w miesiącu.',
    type: 'single',
    domain: 'chaos',
    upstreamWeight: 0,
    crossDomainImpact: 0,
    options: [
      { id: 'wl_clock', label: 'Swoje. Robię, co mam zrobić, i o 17 zamykam laptopa.', value: 0 },
      { id: 'wl_deadline', label: 'Swoje, ale termin wisi nade mną. Jak nie dowiozę, widać to od razu.', value: 0 },
      { id: 'wl_firefight', label: 'Cudze. Cały dzień gaszę pożary, a swoją robotę odrabiam po nocy.', value: 0 },
      { id: 'wl_people', label: 'Ludzie czekają, aż coś powiem. Jak ja stoję, stoi kilka osób.', value: 0 },
      { id: 'wl_owner', label: 'Wszystko. To moja firma, więc każda niezrobiona rzecz i tak wraca do mnie.', value: 0 },
    ],
  },
  {
    id: 'break_window',
    section: 'Sen',
    sectionNum: 'II',
    title: 'Kiedy pojawia się pierwszy moment, po którym reszta dnia zaczyna lecieć gorzej?',
    subtitle: 'Zaznacz najwcześniejszy moment, który rozpoznajesz u siebie.',
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
  {
    id: 'sleep_quality',
    section: 'Sen',
    sectionNum: 'II',
    title: 'Ile poranków w tygodniu budzisz się naprawdę gotowy na dzień?',
    subtitle: 'Pomyśl o pierwszych 30 minutach po przebudzeniu.',
    type: 'single',
    domain: 'sleep',
    upstreamWeight: 0.80,
    crossDomainImpact: 0.85,
    options: [
      { id: 'sq_great', label: 'Prawie codziennie budzę się z energią.', value: 0 },
      { id: 'sq_ok', label: '3-4 razy w tygodniu.', value: 30 },
      { id: 'sq_heavy', label: '1-2 razy. Resztę dni wstaję zmęczony.', value: 70 },
      { id: 'sq_wrecked', label: 'Prawie nigdy. Rano jestem rozbity.', value: 100 },
    ],
  },

  // ── SEKCJA III: GŁOWA I ENERGIA (kotwica domeny 'energy' -> wagi 0.70/0.75) ──
  {
    id: 'stress_level',
    section: 'Głowa',
    sectionNum: 'III',
    title: 'Leżysz już w łóżku, a głowa dalej w robocie?',
    subtitle: 'Policz ostatnie 7 wieczorów.',
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
    subtitle: 'Te godziny, kiedy siedzisz przy robocie, ale wszystko idzie ciężej. Na oko.',
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
    title: 'Co się dzieje z jedzeniem pod koniec dnia?',
    subtitle: 'Pomyśl o ostatnich 7 wieczorach.',
    type: 'single',
    domain: 'nutrition',
    upstreamWeight: 0.85,
    crossDomainImpact: 0.75,
    options: [
      { id: 'ee_clean', label: 'Jem tyle, ile planowałem.', value: 0 },
      { id: 'ee_snack', label: 'Dochodzi jedna przekąska poza planem.', value: 45 },
      { id: 'ee_binge', label: '1-2 razy w tygodniu jem dużo więcej, niż chciałem.', value: 70 },
      { id: 'ee_uncontrolled', label: '3 wieczory albo więcej kończą się jedzeniem bez kontroli.', value: 90 },
      { id: 'ee_chaos', label: 'Każdy wieczór wygląda inaczej.', value: 100 },
    ],
  },
  {
    id: 'takeout_cost',
    condition: () => false, // 2.5.0: usuniete z main flow (nie proxy severity ani budzetu), zostaje disabled
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
    title: 'Ile treningów planujesz w zwykłym tygodniu?',
    subtitle: 'Wpisz swój zwykły plan. Za chwilę sprawdzimy, ile z niego zostaje przy gorszym tygodniu.',
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
    title: 'Kiedy tydzień robi się cięższy, ile z tych treningów wypada?',
    subtitle: 'Weź zwykły gorszy tydzień: więcej roboty, słabszy sen albo wyjazd.',
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
    // Te dwa pytania sa w cold flow ekranem 1 i 2. Etykieta "WEEKEND" nad pierwszym ekranem kasowala
    // obietnice z hero i robila z calosci diagnostyke weekendu. Pytanie zostaje, naglowek sekcji sie poszerza.
    section: 'Rytm tygodnia',
    sectionNum: 'VI',
    title: 'Jak bardzo Twój weekend różni się od zwykłego dnia w tygodniu?',
    subtitle: 'Pomyśl o ostatnich czterech weekendach.',
    type: 'single',
    domain: 'weekend',
    upstreamWeight: 0.85,
    crossDomainImpact: 0.85,
    options: [
      { id: 'wp_same', label: 'Prawie wcale. Godziny, jedzenie i ruch są podobne.', value: 0 },
      { id: 'wp_slight', label: 'Trochę luźniej, ale rytm zwykle zostaje.', value: 35 },
      { id: 'wp_shifted', label: 'Wyraźnie inaczej. Później śpię, jem albo ruszam się inaczej.', value: 75 },
      { id: 'wp_reset', label: 'Weekend rządzi się własnymi prawami.', value: 100 },
    ],
  },
  {
    id: 'monday_recovery',
    section: 'Rytm tygodnia',
    sectionNum: 'VI',
    title: 'W poniedziałek rano jesteś zwykle…',
    subtitle: 'Zaznacz tylko, jak szybko wracasz do swojego zwykłego poziomu.',
    type: 'single',
    domain: 'weekend',
    upstreamWeight: 0.70,
    crossDomainImpact: 0.75,
    options: [
      { id: 'mon_0', label: 'Na swoim zwykłym poziomie.', value: 0 },
      { id: 'mon_1', label: 'Do południa potrzebuję się rozkręcić.', value: 40 },
      { id: 'mon_2', label: 'Dopiero we wtorek czuję swój normalny poziom.', value: 70 },
      { id: 'mon_3', label: 'W środę albo później.', value: 100 },
    ],
  },
  {
    id: 'alcohol_intake',
    section: 'Weekend',
    sectionNum: 'VI',
    title: 'Jak zwykle wygląda u Ciebie weekend pod kątem alkoholu albo innych używek?',
    subtitle: 'Pytam o to, bo wynik bierze pod uwagę, jak długo wracasz po weekendzie.',
    type: 'single',
    domain: 'weekend',
    upstreamWeight: 0.80,
    crossDomainImpact: 0.90,
    options: [
      { id: 'alc_zero', label: 'Nie piję ani nie biorę.', value: 0 },
      { id: 'alc_low', label: 'Kilka piw albo drinków.', value: 35 },
      { id: 'alc_mid', label: 'Solidnie, czasem urywa mi się film.', value: 70 },
      { id: 'alc_high', label: 'Alkohol plus coś jeszcze, zioło albo prochy.', value: 90 },
      { id: 'alc_extreme', label: 'Mocno. Zdarza się też w tygodniu.', value: 100 },
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
    condition: () => false, // wyciete 2026-08-26: drugi proxy budzetu, takeout_cost wystarcza (cash -> INIT.cash)
    upstreamWeight: 0.40,
    crossDomainImpact: 0.40,
  },

  // ── SEKCJA VII: NAPĘD I LIBIDO (kotwica domeny 'chaos' -> wagi 0.60/0.80) ──
  {
    id: 'symptoms_chips',
    section: 'Napęd',
    sectionNum: 'VII',
    title: 'Co ostatnio najbardziej Ci siadało?',
    subtitle: 'Zaznacz maksymalnie 3, które najmocniej czujesz w ostatnich tygodniach. Ból, problemy ze stawami albo niepokojące tętno konsultuj z lekarzem.',
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
  // ── PREMIUM ICP PATCH V1 §3B/3E: SPILLOVER I STAWKA. Wartosc 0, zero wplywu na severity.
  //    Widoczne tylko dla kogos, kto niesie realna odpowiedzialnosc (work_load != wl_clock),
  //    wiec lead bez stakes nie ogląda tego ekranu i nie placi za niego dlugoscia quizu. ──
  {
    id: 'spillover',
    section: 'Rytm tygodnia',
    sectionNum: 'I',
    title: 'Po czym poznajesz, że forma zaczyna Ci mieszać poza siłownią?',
    subtitle: 'Zaznacz maksymalnie 2. Jeśli nic takiego nie widzisz, zaznacz ostatnią odpowiedź.',
    type: 'multi',
    maxSelect: 2,
    domain: 'chaos',
    upstreamWeight: 0,
    crossDomainImpact: 0,
    condition: (a) => a.work_load !== 'wl_clock',
    options: [
      { id: 'sp_night', label: 'Zadanie, które rano zajęłoby 20 minut, robię o północy.', value: 0 },
      { id: 'sp_slow', label: 'Na spotkaniu jestem obecny, a głowa mieli wolniej niż rok temu.', value: 0 },
      { id: 'sp_home', label: 'Wieczorem nie zostaje mi już nic dla ludzi w domu.', value: 0 },
      { id: 'sp_ceiling', label: 'Wiem, że stać mnie na więcej, a od dwóch lat stoję w tym samym miejscu.', value: 0 },
      { id: 'sp_none', label: 'Nie mieszało. Chodzi mi po prostu o sylwetkę.', value: 0 },
    ],
  },
  {
    id: 'morning_wood',
    condition: () => false, // 2.5.0: usuniete z main flow (nie wplywa na severity), zostaje disabled
    section: 'Napęd',
    sectionNum: 'VII',
    title: 'Poranne wzwody, szczerze, jak często?',
    // Zadnej tezy hormonalnej. Pytanie jest wylaczone, ale nawet wylaczone nie moze niesc claimu,
    // ktorego nie wolno nam postawic bez badan. Zostaje obserwacja regeneracji i zaproszenie do lekarza.
    subtitle: 'Bez oceniania. To sygnał regeneracji, który sam u siebie widzisz, dlatego pytam wprost. Jeśli coś się zmieniło na dłużej, warto to sprawdzić u lekarza.',
    type: 'single',
    domain: 'chaos',
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
    title: 'Ile planów w ostatnich 12 miesiącach nie dożyło czterech tygodni?',
    subtitle: 'Liczą się trening, jedzenie oraz cały reset od poniedziałku.',
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
  // ── PYTANIE-DANE: "gdzie odpuszczają". Nie wchodzi do score (value 0). ──
  {
    id: 'give_up_point',
    section: 'Gdzie się sypie',
    sectionNum: 'VII',
    title: 'Co najczęściej uruchamia u Ciebie odpuszczenie?',
    subtitle: 'Ten moment, po którym łatwo powiedzieć sobie: dobra, wrócę jutro.',
    type: 'single',
    domain: 'chaos',
    upstreamWeight: 0,
    crossDomainImpact: 0,
    options: [
      { id: 'gup_weekend', label: 'Na weekendzie.', value: 0 },
      { id: 'gup_wieczor', label: 'Wieczorem, po całym dniu.', value: 0 },
      { id: 'gup_stres', label: 'Gdy w robocie albo w głowie się pali.', value: 0 },
      { id: 'gup_efekt', label: 'Gdy nie widać efektów.', value: 0 },
      { id: 'gup_czas', label: 'Gdy braknie czasu.', value: 0 },
    ],
  },
  {
    id: 'user_pain',
    optional: true, // P1-4 (rc-002): opcjonalne w diagnostic mode — cold lead nie jest karany za brak VOC; skip pod polem
    section: 'Główna przeszkoda',
    sectionNum: 'VII',
    title: 'Co Cię w tym wszystkim najbardziej wkurwia?',
    subtitle: 'Jedno prawdziwe zdanie. To często mówi mi więcej niż kilka kliknięć wyżej. Możesz pominąć.',
    type: 'text',
    domain: 'chaos',
    placeholder: 'napisz po swojemu, tak jak powiedziałbyś to komuś znajomemu...',
    upstreamWeight: 0.90,
    crossDomainImpact: 0.90,
  },
  {
    id: 'user_trigger',
    optional: true, // 2026-08-26: kto wypelni mimo opcjonalnosci = goracy lead (self-select); zimny nie odbija sie o 3. pole tekstowe
    section: 'Główna przeszkoda',
    sectionNum: 'VII',
    title: 'Co wydarzyło się ostatnio, że wszedłeś w ten test właśnie dziś?',
    subtitle: 'Jedno zdanie wystarczy. Możesz pominąć.',
    type: 'text',
    domain: 'chaos',
    placeholder: 'co konkretnie wydarzyło się ostatnio?',
    upstreamWeight: 0.85,
    crossDomainImpact: 0.80,
  },
  {
    id: 'user_selfdx',
    condition: () => false, // wyciete 2026-08-26: trzeci esej = najwieksze tarcie, pokrywa sie z user_pain
    section: 'Główna przeszkoda',
    sectionNum: 'VII',
    title: 'Co Twoim zdaniem trzyma Cię w miejscu?',
    subtitle: 'Nie musisz mieć racji. Chcę usłyszeć, jak Ty to sobie tłumaczysz.',
    type: 'text',
    domain: 'chaos',
    placeholder: 'np. Myślę, że to brak czasu i silnej woli. Zaczynam mocno, po dwóch tygodniach coś wybija mnie z rytmu i odpuszczam całość...',
    upstreamWeight: 0.85,
    crossDomainImpact: 0.80,
  },

  // ── SEKCJA VIII: CO DALEJ (kwalifikacja fit, niewidoczna, nie wchodzi do score) ──
  {
    id: 'intent',
    section: 'Co dalej',
    sectionNum: 'VIII',
    title: 'Gdy zobaczysz swój wynik, jaki kolejny ruch będzie dla Ciebie najbardziej użyteczny?',
    subtitle: 'Wybierz odpowiedź, która jest najbliżej prawdy dzisiaj.',
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
  // ── PREMIUM ICP PATCH V1 §3D/§4: AGENCY x CONTROL NEED. Wartosc 0, zero wplywu na severity.
  //    'intent' pyta, CZEGO chcesz po wyniku. To pyta, JAK sie zachowujesz po dostaniu kierunku.
  //    Kto wybral in_sam juz na to odpowiedzial, wiec tego ekranu nie oglada. ──
  {
    id: 'agency_mode',
    section: 'Co dalej',
    sectionNum: 'VIII',
    title: 'Powiedzmy, że dostajesz jasny kierunek na najbliższe tygodnie. Co się dzieje dalej?',
    subtitle: 'Bez ściemy. Po tym poznaję, czy prowadzenie w ogóle ma u Ciebie sens.',
    type: 'single',
    domain: 'chaos',
    upstreamWeight: 0,
    crossDomainImpact: 0,
    condition: (a) => a.intent !== 'in_sam',
    options: [
      { id: 'ag_solo', label: 'Zrobię. Jak coś się posypie, sam się odezwę.', value: 0 },
      { id: 'ag_data', label: 'Zrobię, tylko chcę, żeby ktoś patrzył w dane i mówił, co poprawić.', value: 0 },
      { id: 'ag_return', label: 'Ruszę mocno, a przy pierwszym gorszym tygodniu siadam i sam nie wracam.', value: 0 },
      { id: 'ag_handoff', label: 'Wolałbym dostać wszystko podane i nie musieć o tym myśleć.', value: 0 },
    ],
  },
  {
    id: 'start_when',
    section: 'Co dalej',
    sectionNum: 'VIII',
    title: 'Jeśli wynik trafi, kiedy realnie chcesz coś z tym zrobić?',
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

  // ── SEKCJA IX: KONTAKT (ostatni ekran; P0-1: OPCJONALNY, NIE bramkuje wyniku; nie wchodzi do score) ──
  // IG opcjonalne — bez niego lead jest anonimowy, ale wynik i tak sie pokazuje. Imie opcjonalne.
  {
    id: 'instagram',
    section: 'Kontakt',
    sectionNum: 'IX',
    title: 'Chcesz, żebym mógł wrócić do Ciebie z tym wynikiem?',
    subtitle: 'Zostaw @ z Instagrama. Jeśli wybrałeś prowadzenie albo chcesz zobaczyć, jak pracuję, potrzebuję go tylko po to, żeby wiedzieć, do kogo należy wynik.',
    type: 'contact',
    domain: 'chaos',
    upstreamWeight: 0,
    crossDomainImpact: 0,
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
    // Bez tezy o kortyzolu. Opisujemy zachowanie i jego skutek, nie stan hormonalny, ktorego nie badamy.
    coreInsight: 'Dzień kończy się na tych samych obrotach, na których się zaczął, więc wieczór nie jest regeneracją, tylko ciszą przy tym samym napięciu.',
    mirrorText: 'Pracujesz na wysokich obrotach i wszystko dowozisz. Ale po pracy nie umiesz wyłączyć głowy, więc ciało się nie regeneruje.',
    primaryDomain: 'energy',
  },
  profile_f: {
    id: 'profile_f',
    code: 'F',
    title: 'Nie brakuje Ci wiedzy. Brakuje Ci punktu powrotu',
    tagline: 'Jeden gorszy dzień robi się kosztowny wtedy, gdy powrót do rytmu zajmuje Ci kolejne dni.',
    coreInsight: 'Myślisz zero-jedynkowo: po jednym gorszym posiłku albo opuszczonym treningu odpuszczasz resztę tygodnia.',
    mirrorText: 'Teorię znasz świetnie. Ale gdy jeden dzień pójdzie nie tak, czekasz na "czysty poniedziałek" i tracisz kolejne dni.',
    primaryDomain: 'chaos',
  },
};
