// ── STRONA TYGODNIA: deterministyczny generator prywatnego artefaktu po diagnozie ──
// Zasada: NIC nie zmyślamy modelem. Wszystko liczone z odpowiedzi usera (te same,
// z których strona liczy score, godzinę pęknięcia i koszt). Powtarzalne = ten sam
// input daje ten sam output, więc da się testować i nie zależy od humoru LLM.
//
// Warstwa psychologii (drugie dno, potencjał, zaproszenie) jest wpisana per archetyp,
// mechanizmy są neurofizjologiczne i sprawdzalne (kortyzol/HPA, testosteron, sen NREM,
// dopamina, grelina/leptyna). Reframe z /api/diagnoza wchodzi jako opcjonalna warstwa
// na wierzch, ale strona stoi bez niego (fallback deterministyczny).

export interface WeekPlanInput {
  archetypeKey: string;          // pickArchetype().key
  archetypeLabel: string;        // .label
  archetypeTagline: string;      // .tagline
  mirror?: string;               // .mirror (najmocniejszy głos, render w sekcji I)
  qualified?: boolean;           // lead skwalifikowany na 1:1 (ból + budżet + gotowość) -> most pcha współpracę
  worstCat: string;              // 'Sen'|'Stres'|'Żywienie'|'Weekend'|'Trening'|'Sygnały'|'Głowa'
  breakWindow: number;           // -1..6 (kiedy pęka dzień)
  score: number;                 // 0-100 (ile potencjału blokuje styl życia)
  costTotal: number;             // costs().total, zł / 6 mies (faktyczny wydatek)
  wknd: number;                  // 0-4 jak mocno weekend rusza rytm
  imie?: string;
  trigger?: string;              // czemu ruszyl to dzis (wlasne slowa, do domkniecia mostu), opcjonalne
  potentialPct?: number;         // ile % potencjału user dziś wykorzystuje (100 - score), opcjonalne
  costMonths?: number;           // stagnationMonths z costs(), opcjonalne
  // dodatkowe sygnały do doboru kotwic (opcjonalne, mają sensowne defaulty):
  drinks?: number; screenBed?: number; junk?: number; protein?: number;
  sleep?: number; miss?: number; binge?: number; gym?: number;
  // reframe z /api/diagnoza (opcjonalny):
  reframe?: {
    cytat?: string; falszywe_zalozenie?: string; mechanizm?: string; pulapka?: string; kolejnosc?: string[];
    slaby_punkt?: string; zaproszenie?: string; most_intro?: string;
  };
}

export type DayState = 'good' | 'ok' | 'risk' | 'break';
export interface WeekDay { day: string; label: string; state: DayState; }
export interface PlanAnchor { icon: string; kind: string; text: string; }

export interface WeekPlan {
  problem: { name: string; oneLiner: string; falseAssumption: string; mirror?: string };
  week: WeekDay[];
  deeper: { label: string; body: string; analogy: string };   // drugie dno: mechanizm, którego nie słyszał
  deeperNote: string;          // disclaimer pod drugim dnem (bramka bezpieczeństwa, pro-lekarz)
  hiddenCost: { headline: string; math: string; multiplier: string };
  potential: { usedPct: number; headline: string; body: string; punch: string };
  plan: PlanAnchor[];            // pierwsze kroki: 6 kotwic
  metric: string;
  invitation: string;           // osobista linia "widzę tu potencjał" (sekcja VII, wielki serif)
  bridgeIntro: string;          // akapit pod zaproszeniem (spersonalizowany most albo fallback)
  weakSpot: string;             // slaby punkt leada (rozwiazany: reframe albo deterministyczny) do CTA
  bridge: { tier: string; line: string; kind: 'save' | 'start' | 'ladder' | 'coop' }[];
  saveNote: string;             // pod przyciskiem zapisu
  firstMove: string;            // jeden konkretny ruch na jutro (darmowy win od razu, reciprocity)
}

const DAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'] as const;
type WeekTemplate = { labels: [string, string, string, string, string, string, string]; states: [DayState, DayState, DayState, DayState, DayState, DayState, DayState] };

const WEEK_BY_ARCHETYPE: Record<string, WeekTemplate> = {
  weekend_reset: {
    labels: ['Odzyskiwanie po weekendzie', 'Nadrabianie zaległości', 'Pierwszy normalny dzień', 'Forma wraca, zegar tyka', 'Piątek: „należy mi się”', 'Struktura znika', 'Dryf, brak resetu'],
    states: ['risk', 'ok', 'good', 'ok', 'risk', 'break', 'break'],
  },
  wieczorny_odpad: {
    labels: ['Rano ogar, wieczór spłaca dług', 'To samo, tylko bardziej zmęczony', 'Wieczór wygrywa trzeci raz', 'Kredyt się kumuluje', 'Wieczór plus alkohol', 'Dzień bez ramy', 'Reset na jutro'],
    states: ['risk', 'risk', 'break', 'risk', 'break', 'risk', 'ok'],
  },
  glowa_zajezdza: {
    labels: ['Głowa jeszcze ciągnie', 'Napięcie się kumuluje', 'Po 14:00 spadek mocy', 'Głowa na rezerwie', 'Wieczorem zero paliwa', 'Niby wolne, głowa pracuje', 'Napięcie przed poniedziałkiem'],
    states: ['ok', 'risk', 'risk', 'break', 'break', 'risk', 'risk'],
  },
  wiedza_bez_wdrozenia: {
    labels: ['Plan w głowie idealny', 'Pierwsze odpuszczenie', 'Improwizacja zamiast planu', 'Wiesz co robić, nie robisz', 'Odkładasz na poniedziałek', 'Nowy plan w głowie', 'Start od zera zaplanowany'],
    states: ['ok', 'risk', 'risk', 'break', 'break', 'risk', 'break'],
  },
  silnik_bez_paliwa: {
    labels: ['Pół mocy od rana', 'Nic nie boli, nic nie działa', 'Trening bez kopa', 'Energia płaska', 'Tak samo jak wczoraj', 'Odpoczynek nie regeneruje', 'Poniedziałek bez różnicy'],
    states: ['risk', 'risk', 'risk', 'risk', 'risk', 'risk', 'risk'],
  },
};
const WEEK_FALLBACK: WeekTemplate = WEEK_BY_ARCHETYPE.wieczorny_odpad;

// ── DRUGIE DNO: neurofizjologiczny mechanizm wycieku ──
// Wyjaśniamy mechanizm przyczynowo-skutkowy bez sloganów AI i bez fałszywej psychologii.
const DEEPER: Record<string, { label: string; body: string; analogy: string }> = {
  weekend_reset: {
    label: 'Poniedziałkowy zjazd robi Ci ciało, które nie zdążyło odpocząć.',
    body: 'Nieregularny sen w weekend i mniej ruchu rozjeżdżają rytm i spłycają głęboki sen. To miesza poranny rytm kortyzolu i przygasza ten szczyt testosteronu, który organizm i tak buduje dopiero w porządnym śnie. Rytm nie wraca w niedzielę w nocy, ciało potrzebuje dwóch, trzech dni, żeby wejść z powrotem w swoje tory. Dlatego poniedziałek i wtorek schodzą Ci na nadrabianiu, nie na braku chęci, tylko na układzie nerwowym, który wciąż wraca do siebie.',
    analogy: 'Jak jazda autem z rozregulowanym zapłonem: silnik zużywa dwukrotnie więcej paliwa, a auto przyspiesza dwa razy wolniej.',
  },
  wieczorny_odpad: {
    label: 'Wieczorne podjadanie zaczyna się już w ciągu dnia.',
    body: 'Brak kontroli nad jedzeniem po 21:00 to rzadko słaby charakter. Po całym dniu pracy w napięciu i przy niedoborze głębokiego snu poziom greliny (hormonu głodu) rośnie, a leptyna (sygnał sytości) spada. Jednocześnie podwyższony wieczorny kortyzol sprawia, że mózg szuka najszybszego bodźca obniżającego napięcie układu nerwowego. Wieczór w lodówce to czysty biologiczny mechanizm samoregulacji spiętego organizmu.',
    analogy: 'To rachunek za cały dzień pracy na wysokich obrotach. Jeśli nie dasz układowi nerwowemu innego sygnału zejścia z obrotów, sam sięgnie po najszybszy.',
  },
  glowa_zajezdza: {
    label: 'Im dłużej głowa pracuje wieczorem, tym gorzej śpisz.',
    body: 'Głowa, która po pracy dalej myśli o robocie, trzyma układ nerwowy w trybie gotowości. Ciało nie przełącza się wieczorem na tryb przywspółczulny, w którym się regeneruje, więc głęboki sen jest krótszy i płytszy, mimo że leżysz tyle samo godzin. Rano wstajesz z mniejszym bakiem niż wczoraj, bo noc poszła na czuwanie, nie na naprawę.',
    analogy: 'Jak próba zaśnięcia zaraz po ostrej kłótni: leżysz, oczy zamknięte, a w środku wszystko dalej gra na czerwono. Ciało liczy to jako czuwanie, nie sen.',
  },
  wiedza_bez_wdrozenia: {
    label: 'Sama wiedza daje złudzenie postępu, choć nic się nie zmienia.',
    body: 'Samo czytanie o treningu i żywieniu działa jak szybka nagroda. Mózg liczy to jako postęp, chociaż w tygodniu nic się nie ruszyło. Wiesz o tym więcej niż większość ludzi na sali, a i tak tydzień wykłada się na banałach, bo nikt nie pilnuje kolejności i nie rozlicza Cię z wykonania.',
    analogy: 'Wkuwanie mapy bez wyjścia w teren daje poczucie kontroli, a do celu nie zbliża ani o krok.',
  },
  silnik_bez_paliwa: {
    label: 'Dobre wyniki krwi nie znaczą, że masz pełną formę.',
    body: 'Zakresy w wynikach krwi wykluczają chorobę, nie mówią nic o formie. Spłycony sen, nierozładowany stres i nieregularne posiłki robią cichy wyciek: nie jesteś chory, ale chodzisz zauważalnie poniżej swojego pułapu, głową i ciałem.',
    analogy: 'Telefon, który cały dzień łapie zasięg w piwnicy: nic się nie zawiesza, a bateria pada koło południa i wszystko chodzi z opóźnieniem.',
  },
};

function hiddenCost(input: WeekPlanInput): WeekPlan['hiddenCost'] {
  const zl = input.costTotal >= 1000 ? `${Math.round(input.costTotal / 1000)} tys. zł` : `${Math.round(input.costTotal / 100) * 100} zł`;
  const kasa = input.costTotal >= 2000 ? ` Szacowany koszt nieefektywnych wydatków na dowozy i suplementy: około ${zl} w skali pół roku.` : '';
  const mies = input.costMonths && input.costMonths >= 1 ? ` Do tego około ${input.costMonths} miesięcy treningu bez widocznych efektów sylwetkowych.` : '';
  switch (input.archetypeKey) {
    case 'weekend_reset':
      return { headline: 'Jeden rozbity weekend zabiera wysokie obroty przez 3 kolejne dni.', math: `W skali miesiąca to nie 4 luźne dni, ale 8-10 dni roboczych spędzonych na ponownym wchodzeniu w rytm.${kasa}${mies}`, multiplier: 'Rozkojarzony poniedziałek i wtorek to ukryty koszt niespójnego weekendu.' };
    case 'wieczorny_odpad':
      return { headline: 'Wieczorny wyciek energii obniża jakość decyzji następnego dnia.', math: `Niedospana noc i ciężki żołądek rano obniżają koncentrację w kluczowych godzinach pracy.${kasa}${mies}`, multiplier: 'Brak struktury wieczorem spłaca się gorszym skupieniem do południa.' };
    case 'glowa_zajezdza':
      return { headline: 'Brak wyłączenia głowy po pracy zjada regenerację i sen.', math: `Dni w ciągłym napięciu kumulują zmęczenie, przez co wolny czas idzie na zbieranie sił, a nie na odpoczynek.${kasa}${mies}`, multiplier: 'Głowa, która po pracy nie schodzi z obrotów, okrada Cię z jutra, zanim jeszcze wstaniesz.' };
    case 'wiedza_bez_wdrozenia':
      return { headline: 'Wiedza bez egzekucji to najdroższy rodzaj stania w miejscu.', math: `Miesiące prób i błędów bez stałej weryfikacji utrzymują formę w tym samym miejscu mimo dużego nakładu wiedzy.${kasa}${mies}`, multiplier: 'Każdy niedokończony plan zeruje dotychczasowy wkład.' };
    default:
      return { headline: 'Cichy wyciek zabiera kilka procent sprawności każdego dnia.', math: `Praca na pół mocy przez miesiąc daje skumulowaną stratę trudną do odrobienia jednym zrywem.${kasa}${mies}`, multiplier: 'Drobne nieszczelności w tygodniu sumują się w istotny spadek formy.' };
  }
}

// ── POTENCJAŁ NA STOLE ──
function potentialBlock(input: WeekPlanInput): WeekPlan['potential'] {
  const used = Math.max(20, Math.min(input.potentialPct ?? (100 - input.score), 85));
  const spot = input.reframe?.slaby_punkt?.trim() || input.worstCat.toLowerCase();
  return {
    usedPct: used,
    headline: 'Formę masz w środku. Co tydzień sam sobie ją odcinasz.',
    body: `Z tego, co zaznaczyłeś, tydzień przepuszcza Ci dziś jakieś ${100 - used}% tego, na co Cię stać. Ta liczba idzie z Twoich własnych odpowiedzi, nie z żadnego badania. Reszta nigdzie nie poszła, trzyma ją jedno miejsce: ${spot}.`,
    punch: 'Odetkaj ten jeden punkt, a reszta rusza sama. Bez wywracania całego życia do góry nogami.',
  };
}

function foodAnchor(i: WeekPlanInput): string {
  if ((i.protein ?? 0) >= 2) return 'Stała porcja 30-40 g białka w pierwszym posiłku. Stabilizuje poziom glukozy i sytość na resztę dnia.';
  if (i.worstCat === 'Żywienie') return 'Główny posiłek zjedzony zanim wejdziesz w stan zmęczenia po pracy. Odcina wieczorne skoki apetytu.';
  return 'Jeden stały posiłek-kotwica o tej samej porze codziennie.';
}
function trainAnchor(i: WeekPlanInput): string {
  if ((i.miss ?? 0) >= 2) return 'Trening w wersji skróconej (30-40 min), wpisany w kalendarz na sztywno jak spotkanie biznesowe.';
  return 'Minimalna wersja treningu wykonana w 100% bije przeładowany plan, z którego odpuszczasz połowę.';
}
function stepsAnchor(i: WeekPlanInput): string {
  const floor = (i.worstCat === 'Trening' || (i.miss ?? 0) >= 2) ? 8000 : 7000;
  return `Stały próg min. ${floor.toLocaleString('pl-PL')} kroków dziennie. Regularny ruch wspiera rytm kortyzolu i głębszy sen.`;
}
function returnAnchor(): string {
  return 'Zasada braku karnego treningu po gorszym dniu. Wracasz do normalnej rutyny (spacer, sen, nawodnienie) bez dokładania stresu układowi nerwowemu.';
}
function removeAnchor(i: WeekPlanInput): string {
  if ((i.drinks ?? 0) > 5) return 'Eliminacja alkoholu na 14 dni w celu zmierzenia bazowego poziomu energii i jakości snu.';
  if ((i.screenBed ?? 0) >= 2) return 'Telefon poza sypialnią na 60 minut przed pójściem spać.';
  if ((i.junk ?? 0) > 300) return 'Usunięcie wysoko przetworzonych przekąsek z przestrzeni domowej.';
  if ((i.binge ?? 0) >= 2) return 'Odcięcie jedzenia na 2 godziny przed snem.';
  return 'Eliminacja jednego bodźca, który najsilniej rozprasza Twój wieczór.';
}
function metricLine(i: WeekPlanInput): string {
  switch (i.worstCat) {
    case 'Sen': return 'Czas przebywania w łóżku i stała godzina pobudki (monitorowane przez 7 dni).';
    case 'Weekend': return 'Liczba poniedziałków rozpoczętych w pełnej sprawności (cel: 4/4).';
    case 'Żywienie': return 'Liczba wieczorów domkniętych zgodnie z założeniem (cel: 5/7).';
    case 'Stres':
    case 'Głowa': return 'Wykonanie rytuału zamknięcia dnia pracy (tak/nie).';
    case 'Trening': return 'Stosunek treningów zrealizowanych do zaplanowanych (cel: 100%).';
    default: return 'Liczba dni ze zrealizowaną główną kotwicą (cel: 5/7).';
  }
}
function buildPlan(i: WeekPlanInput): { plan: PlanAnchor[]; metric: string } {
  const metric = metricLine(i);
  const plan: PlanAnchor[] = [
    { icon: '🍽️', kind: 'Jedzenie', text: foodAnchor(i) },
    { icon: '🏋️', kind: 'Trening', text: trainAnchor(i) },
    { icon: '👟', kind: 'Ruch w ciągu dnia', text: stepsAnchor(i) },
    { icon: '🔁', kind: 'Gorszy dzień', text: returnAnchor() },
    { icon: '➖', kind: 'Co wycinasz', text: removeAnchor(i) },
    { icon: '📊', kind: 'Po czym poznasz', text: metric },
  ];
  return { plan, metric };
}

// Slaby punkt w jezyku usera, do wplecenia w zaproszenie (personalizacja punktu wyciekowego).
const WEAK_SPOT: Record<string, string> = {
  'Sen': 'sen, który nie regeneruje',
  'Stres': 'głowa, która wieczorem nie schodzi z obrotów',
  'Żywienie': 'wieczór, w którym cały dzień się na Tobie mści',
  'Weekend': 'weekend, który kasuje pięć dni roboty',
  'Trening': 'wykonanie, nie wiedza',
  'Głowa': 'głowa, która zajeżdża ciało',
};
function weakSpot(worst: string): string { return WEAK_SPOT[worst] || WEAK_SPOT['Żywienie']; }

// ── ZAPROSZENIE ── (LLM-owe z realnych slow leada, gdy jest; inaczej deterministyczne z jego slabym punktem)
function invitationLine(input: WeekPlanInput): string {
  if (input.reframe?.zaproszenie?.trim()) return input.reframe.zaproszenie.trim();
  const hot = input.qualified || (input.potentialPct ?? (100 - input.score)) <= 45;
  const mies = input.costMonths && input.costMonths >= 2 ? `${input.costMonths} miesięcy już zeszło, a sylwetka stoi w tym samym miejscu. ` : '';
  const spot = input.reframe?.slaby_punkt?.trim() || weakSpot(input.worstCat);
  if (hot) return `Wiedzę masz, plan trzymasz teraz w tej Karcie. ${mies}Więc czemu za rok będziesz dokładnie tu, gdzie jesteś dziś? Bo sam, po trzecim gorszym dniu, wracasz do starego tygodnia i mówisz sobie: od poniedziałku. Ten poniedziałek nie przyszedł ani razu. Parę lat temu czułeś się w swoim ciele lżej. Ten stan trzyma dziś jedno zatkane miejsce. U Ciebie to ${spot}. Odetkać je i wraca.`;
  return `Bazę masz dobrą, teoria siedzi. ${mies}A i tak co tydzień pękasz w tym samym punkcie. U Ciebie to ${spot}. Sam tego nie domkniesz, bo osobno każdy z tych błędów wygląda na drobiazg. Pierwszy gorszy dzień kasuje Ci cały tydzień i wracasz na start w poniedziałek. Z kimś, kto to widzi i rozlicza, domykasz to w dwa tygodnie.`;
}

// ── MOST_INTRO ── akapit pod zaproszeniem. LLM-owy z jego historii, inaczej deterministyczny fallback.
function bridgeIntroLine(input: WeekPlanInput): string {
  if (input.reframe?.most_intro?.trim()) return input.reframe.most_intro.trim();
  const spot = input.reframe?.slaby_punkt?.trim() || weakSpot(input.worstCat);
  return `Pewnie nieraz wywaliłeś kasę na dietę z neta albo plan, który po dwóch tygodniach się rozsypał. Dlatego tu nie dostajesz kolejnego szablonu. Widzę, gdzie dokładnie pęka Twój tydzień, u Ciebie to ${spot}, i wiem, co zdjąć najpierw. Nie każdego biorę, a jak nie widzę, że da się ruszyć, powiem wprost. Napisz do mnie z tym wynikiem, odpiszę ja, nie zespół.`;
}

// ── MOST DO KOLEJNEGO KROKU ──
// Dwa stopnie, nie menu. Bez "Robisz to sam" (off-ramp nad CTA) i bez Save (ten zszedl do stopki).
// Prosty jezyk, zero korpo/coacha. Primary akcja (DM) jest niżej, w przyciskach.
function buildBridge(input: WeekPlanInput): WeekPlan['bridge'] {
  const hot = input.qualified || (input.potentialPct ?? (100 - input.score)) <= 45;
  const ladder = { tier: 'Siadamy nad tym raz', line: 'Przechodzimy Twój wynik na spokojnie i wychodzisz z jednym planem na najbliższy miesiąc.', kind: 'ladder' as const };
  const coopHot = { tier: 'Prowadzę Cię 1:1', line: 'Układam Ci tydzień pod grafik i co tydzień rozliczam z wykonania, aż to zacznie siedzieć samo.', kind: 'coop' as const };
  const coopCold = { tier: 'Prowadzę Cię 1:1', line: 'Jak zobaczysz, jak pracuję z innymi, i uznasz, że chcesz to robić ze mną, a nie sam, odezwij się.', kind: 'coop' as const };
  return hot ? [ladder, coopHot] : [ladder, coopCold];
}

// ── JEDEN RUCH NA JUTRO: darmowy win od razu, zanim user wejdzie w 6 kotwic ──
const FIRST_MOVE_BY_CAT: Record<string, string> = {
  'Sen': 'Dziś wieczorem telefon ląduje poza sypialnią na godzinę przed snem. Jeden ruch, największy zwrot, bo sen ciągnie za sobą resztę.',
  'Stres': 'Jutro po pracy 10 minut na zejście z obrotów, zanim wejdziesz w wieczór. Spacer bez telefonu albo prysznic w ciszy.',
  'Żywienie': 'Jutro rano 30 do 40 g białka w pierwszym posiłku. Wieczorny głód zaczyna się od niedojedzonego poranka.',
  'Weekend': 'W ten weekend trzymaj pobudkę w granicy godziny wobec dni roboczych. To ratuje poniedziałek i wtorek.',
  'Trening': 'Wpisz na jutro wersję minimum treningu: 20 minut, które zrobisz nawet w najgorszy dzień.',
  'Głowa': 'Zapisz jedną procedurę powrotu: co dokładnie robisz następnego dnia po gorszym, bez czekania na poniedziałek.',
};
function firstMoveFor(worst: string): string { return FIRST_MOVE_BY_CAT[worst] || FIRST_MOVE_BY_CAT['Sen']; }

export function buildWeekPlan(input: WeekPlanInput): WeekPlan {
  const tpl = WEEK_BY_ARCHETYPE[input.archetypeKey] || WEEK_FALLBACK;
  const week: WeekDay[] = DAYS.map((day, idx) => ({ day, label: tpl.labels[idx], state: tpl.states[idx] }));
  const problem = {
    name: input.archetypeLabel,
    oneLiner: input.reframe?.cytat?.trim() ? `„${input.reframe.cytat.trim()}”` : input.archetypeTagline,
    falseAssumption: input.reframe?.falszywe_zalozenie?.trim() || defaultFalseAssumption(input.archetypeKey),
    mirror: input.mirror,
  };
  const { plan: basePlanArr, metric } = buildPlan(input);
  const plan = [...basePlanArr];
  if (input.reframe?.kolejnosc && Array.isArray(input.reframe.kolejnosc) && input.reframe.kolejnosc.length >= 3) {
    plan[0] = { icon: '🎯', kind: 'Krok 1 (Twój priorytet)', text: input.reframe.kolejnosc[0] };
    plan[1] = { icon: '⚙️', kind: 'Krok 2 (Twój priorytet)', text: input.reframe.kolejnosc[1] };
    plan[2] = { icon: '📈', kind: 'Krok 3 (Twój priorytet)', text: input.reframe.kolejnosc[2] };
  }

  const baseDeeper = DEEPER[input.archetypeKey] || DEEPER.wieczorny_odpad;
  const deeper = {
    label: input.reframe?.mechanizm ? 'Co najpewniej dzieje się w Twoim tygodniu' : baseDeeper.label,
    body: input.reframe?.mechanizm?.trim() || baseDeeper.body,
    analogy: input.reframe?.pulapka?.trim() || baseDeeper.analogy,
  };

  return {
    problem,
    week,
    deeper,
    deeperNote: 'To opis mechanizmu, nie diagnoza. Ten wzór widzę u większości facetów z tym samym rozjazdem tygodnia. Objawy czysto medyczne (bóle, tętno, stawy) omawiaj z lekarzem.',
    hiddenCost: hiddenCost(input),
    potential: potentialBlock(input),
    plan,
    metric,
    invitation: invitationLine(input),
    bridgeIntro: bridgeIntroLine(input),
    weakSpot: input.reframe?.slaby_punkt?.trim() || weakSpot(input.worstCat),
    bridge: buildBridge(input),
    saveNote: 'To trafia tylko do mnie. Bez automatów i bez list mailingowych.',
    firstMove: firstMoveFor(input.worstCat),
  };
}

function defaultFalseAssumption(key: string): string {
  switch (key) {
    case 'weekend_reset': return 'Błędne założenie: myślisz, że weekendowe rozluźnienie kasuje się samo w niedzielę w nocy, podczas gdy organizm spłaca je przez kolejne 2-3 dni.';
    case 'wieczorny_odpad': return 'Błędne założenie: zrzucasz winę na brak silnej woli wieczorem, ignorując fakt, że wieczorny apetyt to czysta odpowiedź na całodniowe napięcie i krótki sen.';
    case 'glowa_zajezdza': return 'Błędne założenie: szukasz przyczyn braku efektów w diecie, podczas gdy głównym hamulcem jest nierozładowany stres i stała aktywacja osi HPA.';
    case 'wiedza_bez_wdrozenia': return 'Błędne założenie: wierzysz, że kolejna przeczytana teoria rozwiąże problem, podczas gdy brakuje Ci tylko kogoś, kto dopilnuje wykonania i rozliczy Cię z niego.';
    default: return 'Błędne założenie: traktujesz spadek energii jako normę wieku, zamiast usunąć konkretny wyciek regeneracyjny w Twoim tygodniu.';
  }
}
