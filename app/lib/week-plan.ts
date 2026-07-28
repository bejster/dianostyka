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
  worstCat: string;              // 'Sen'|'Stres'|'Żywienie'|'Weekend'|'Trening'|'Sygnały'|'Głowa'
  breakWindow: number;           // -1..6 (kiedy pęka dzień)
  score: number;                 // 0-100 (ile potencjału blokuje styl życia)
  costTotal: number;             // costs().total, zł / 6 mies (faktyczny wydatek)
  wknd: number;                  // 0-4 jak mocno weekend rusza rytm
  imie?: string;
  potentialPct?: number;         // ile % potencjału user dziś wykorzystuje (100 - score), opcjonalne
  costMonths?: number;           // stagnationMonths z costs(), opcjonalne
  // dodatkowe sygnały do doboru kotwic (opcjonalne, mają sensowne defaulty):
  drinks?: number; screenBed?: number; junk?: number; protein?: number;
  sleep?: number; miss?: number; binge?: number; gym?: number;
  // reframe z /api/diagnoza (opcjonalny):
  reframe?: { cytat?: string; falszywe_zalozenie?: string; mechanizm?: string; pulapka?: string; kolejnosc?: string[] };
}

export type DayState = 'good' | 'ok' | 'risk' | 'break';
export interface WeekDay { day: string; label: string; state: DayState; }
export interface PlanAnchor { icon: string; kind: string; text: string; }

export interface WeekPlan {
  problem: { name: string; oneLiner: string; falseAssumption: string };
  week: WeekDay[];
  deeper: { label: string; body: string; analogy: string };   // drugie dno: mechanizm, którego nie słyszał
  deeperNote: string;          // disclaimer pod drugim dnem (bramka bezpieczeństwa, pro-lekarz)
  hiddenCost: { headline: string; math: string; multiplier: string };
  potential: { usedPct: number; headline: string; body: string; punch: string };
  plan: PlanAnchor[];            // pierwsze kroki: 6 kotwic
  metric: string;
  invitation: string;           // osobista linia "widzę tu potencjał"
  bridge: { tier: string; line: string; kind: 'save' | 'start' | 'ladder' | 'coop' }[];
  saveNote: string;             // pod przyciskiem zapisu
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
    label: 'Poniedziałkowy dół jest fizjologiczny, nie motywacyjny.',
    body: 'Nieregularny sen w weekend i spadek aktywności zmieniają architekturę snu NREM. Zaburza to naturalny rytm wydzielania kortyzolu rano i obniża nocny pik testosteronu. Efekt nie znika w niedzielę w nocy, organizm potrzebuje 48 do 72 godzin na ponowne zsynchronizowanie zegara biologicznego. Dlatego w poniedziałek i wtorek walczysz nie z brakiem chęci, ale z opóźnioną odpowiedzią stresową układu nerwowego.',
    analogy: 'Jak jazda autem z rozregulowanym zapłonem: silnik zużywa dwukrotnie więcej paliwa, a auto przyspiesza dwa razy wolniej.',
  },
  wieczorny_odpad: {
    label: 'Wieczorne podjadanie ustawia się w ciągu dnia.',
    body: 'Brak kontroli nad jedzeniem po 21:00 to rzadko słaby charakter. Po całym dniu pracy w napięciu i przy niedoborze głębokiego snu poziom greliny (hormonu głodu) rośnie, a leptyna (sygnał sytości) spada. Jednocześnie podwyższony wieczorny kortyzol sprawia, że mózg szuka najszybszego bodźca obniżającego napięcie układu nerwowego. Wieczór w lodówce to czysty biologiczny mechanizm samoregulacji spiętego organizmu.',
    analogy: 'To rachunek za cały dzień pracy na wysokich obrotach. Jeśli nie dasz układowi nerwowemu innego sygnału zejścia z obrotów, sam sięgnie po najszybszy.',
  },
  glowa_zajezdza: {
    label: 'Kortyzol i testosteron działają na przeciwstawnych biegunach.',
    body: 'Ciągłe napięcie psychiczne działa na ciało tak samo jak przewlekły stres fizyczny. Stymulacja osi HPA utrzymuje wysoki kortyzol, co osłabia nocną regenerację i obniża syntezę testosteronu. Gdy wieczorem głowa nadal pracuje na obrotach firmowych, układ nerwowy nie przechodzi w tryb przywspółczulny (odpoczynek), przez co rano wstajesz z mniejszym zasobem energii niż dnia poprzedniego.',
    analogy: 'Silnik pracujący ciągle na wysokich obrotach bez wymiany oleju w końcu traci moc, bez względu na to, jak dobre paliwo do niego wlewasz.',
  },
  wiedza_bez_wdrozenia: {
    label: 'Mózg nagradza Cię za samą analizę problemu.',
    body: 'Samo czytanie o treningu, żywieniu czy suplementacji daje szybki wyrzut dopaminy. Mózg rejestruje to jako postęp, mimo że w realnym tygodniu nic się nie zmieniło. W efekcie dysponujesz wiedzą większą niż 90% ludzi na siłowni, ale Twój tydzień wykłada się na najprostszych powtórzeniach, bo brakuje systemu egzekucji dopasowanego do Twojego trybu pracy.',
    analogy: 'Studiowanie mapy bez wyjścia na szlak dajesz poczucie kontroli, ale nie przybliża do celu ani o jeden kilometr.',
  },
  silnik_bez_paliwa: {
    label: '„Wyniki w normie” to nie to samo co optymalna forma.',
    body: 'Standardowe zakresy laboratoryjne wykluczają choroby, ale nie definiują wysokiej wydajności. Spłycony sen, ukryta oporność na stres i nieregularne posiłki tworzą cichy wyciek, stan w którym nie jesteś chory, ale pracujesz na 60-70% swoich realnych możliwości fizycznych i psychicznych.',
    analogy: 'Komputer z kilkudziesięcioma aplikacjami działającymi w tle: żaden proces go nie zawiesza, ale całe urządzenie działa odczuwalnie wolniej.',
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
      return { headline: 'Brak wyłączenia głowy po pracy zjada regenerację i sen.', math: `Dni w ciągłym napięciu kumulują zmęczenie, przez co wolny czas przeznaczasz na zbieranie sił, a nie na realny odpoczynek.${kasa}${mies}`, multiplier: 'Praca w trybie alarmu niszczy wydajność kolejnego dnia.' };
    case 'wiedza_bez_wdrozenia':
      return { headline: 'Wiedza bez systemu egzekucji to koszt utraconego czasu.', math: `Miesiące prób i błędów bez stałej weryfikacji utrzymują formę w tym samym miejscu mimo dużego nakładu wiedzy.${kasa}${mies}`, multiplier: 'Każdy niedokończony plan zeruje dotychczasowy wkład.' };
    default:
      return { headline: 'Cichy wyciek zabiera kilka procent sprawności każdego dnia.', math: `Praca na pół mocy przez miesiąc daje skumulowaną stratę trudną do odrobienia jednym zrywem.${kasa}${mies}`, multiplier: 'Drobne nieszczelności w tygodniu sumują się w istotny spadek formy.' };
  }
}

// ── POTENCJAŁ NA STOLE ──
function potentialBlock(input: WeekPlanInput): WeekPlan['potential'] {
  const used = Math.max(20, Math.min(input.potentialPct ?? (100 - input.score), 85));
  const worst = input.worstCat.toLowerCase();
  return {
    usedPct: used,
    headline: 'Z Twoich odpowiedzi wynika jasny rezerwuar możliwości.',
    body: `Twój układ działa obecnie na około ${used}% realnej sprawności. Brakująca część nie zniknęła, jest blokowana przez obszar: ${worst} oraz nieefektywną regenerację wieczorną.`,
    punch: 'Usunięcie głównego punktu oporu w tygodniu uwalnia zasoby bez konieczności rewolucjonizowania całego życia.',
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
  return `Stały próg min. ${floor.toLocaleString('pl-PL')} kroków dziennie jako narzędzie wspierające obniżanie kortyzolu przed snem.`;
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
    { icon: '🍽️', kind: 'Kotwica żywieniowa', text: foodAnchor(i) },
    { icon: '🏋️', kind: 'Kotwica treningowa', text: trainAnchor(i) },
    { icon: '👟', kind: 'Próg aktywności', text: stepsAnchor(i) },
    { icon: '🔁', kind: 'Protokół powrotu', text: returnAnchor() },
    { icon: '➖', kind: 'Jedna rzecz do usunięcia', text: removeAnchor(i) },
    { icon: '📊', kind: 'Główny wskaźnik', text: metric },
  ];
  return { plan, metric };
}

// ── ZAPROSZENIE ──
function invitationLine(input: WeekPlanInput): string {
  const hot = (input.potentialPct ?? (100 - input.score)) <= 45;
  const mies = input.costMonths && input.costMonths >= 2 ? `${input.costMonths} miesięcy już zeszło, a sylwetka stoi w tym samym miejscu. ` : '';
  if (hot) return `Wiedzę masz, plan trzymasz teraz w tej Karcie. ${mies}Więc czemu za rok będziesz dokładnie tu, gdzie jesteś dziś? Bo sam, po trzecim gorszym dniu, wracasz do starego tygodnia i mówisz sobie: od poniedziałku. Ten poniedziałek nie przyszedł ani razu. Parę lat temu czułeś się w swoim ciele lżej. Tamten stan wciąż siedzi pod tym jednym wyciekiem, wystarczy go odetkać.`;
  return `Bazę masz dobrą, teoria siedzi. ${mies}A i tak co tydzień pękasz w tym samym punkcie. Sam tego nie domkniesz, bo osobno każdy z tych błędów wygląda na drobiazg. Pierwszy gorszy dzień kasuje Ci cały tydzień i wracasz na start w poniedziałek. Z kimś, kto to widzi i rozlicza, domykasz to w dwa tygodnie.`;
}

// ── MOST DO KOLEJNEGO KROKU ──
function buildBridge(input: WeekPlanInput): WeekPlan['bridge'] {
  const hot = (input.potentialPct ?? (100 - input.score)) <= 45;
  const save = { tier: '1. Zapisz Kartę Tygodnia (PDF)', line: 'Pobierz ten raport jako punkt odniesienia na najbliższe 7 dni.', kind: 'save' as const };
  const start = { tier: '2. Wdrożenie samodzielne', line: 'Zastosuj 6 kotwic z raportu i skup się na stabilizacji głównego punktu pęknięcia.', kind: 'start' as const };
  const ladder = { tier: '3. Konsultacja wyników', line: 'Przeanalizujmy ten raport razem pod kątem Twojego harmonogramu pracy i celów.', kind: 'ladder' as const };
  const coopHot = { tier: '4. Prowadzenie indywidualne 1:1', line: 'Jeśli po Twoim wyniku uznam, że mogę Cię ruszyć, biorę Cię na pokład: układam tydzień pod Twój grafik i prowadzę Cię co tydzień.', kind: 'coop' as const };
  const coopCold = { tier: '4. Współpraca 1:1', line: 'Gdy zobaczysz, jak pracuję z innymi i uznasz, że to Twoja droga, odezwij się do mnie z tym wynikiem.', kind: 'coop' as const };
  return hot ? [save, coopHot, start, ladder] : [save, start, ladder, coopCold];
}

export function buildWeekPlan(input: WeekPlanInput): WeekPlan {
  const tpl = WEEK_BY_ARCHETYPE[input.archetypeKey] || WEEK_FALLBACK;
  const week: WeekDay[] = DAYS.map((day, idx) => ({ day, label: tpl.labels[idx], state: tpl.states[idx] }));
  const problem = {
    name: input.archetypeLabel,
    oneLiner: input.reframe?.cytat?.trim() ? `„${input.reframe.cytat.trim()}”` : input.archetypeTagline,
    falseAssumption: input.reframe?.falszywe_zalozenie?.trim() || defaultFalseAssumption(input.archetypeKey),
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
    label: input.reframe?.mechanizm ? 'Indywidualna analiza neurobiologiczna' : baseDeeper.label,
    body: input.reframe?.mechanizm?.trim() || baseDeeper.body,
    analogy: input.reframe?.pulapka?.trim() || baseDeeper.analogy,
  };

  return {
    problem,
    week,
    deeper,
    deeperNote: 'Analiza wygenerowana na podstawie Twojego unikalnego wzorca odpowiedzi i opisanych objawów. Nie stanowi diagnozy medycznej.',
    hiddenCost: hiddenCost(input),
    potential: potentialBlock(input),
    plan,
    metric,
    invitation: invitationLine(input),
    bridge: buildBridge(input),
    saveNote: 'To trafia tylko do mnie. Bez automatów i bez list mailingowych.',
  };
}

function defaultFalseAssumption(key: string): string {
  switch (key) {
    case 'weekend_reset': return 'Błędne założenie: myślisz, że weekendowe rozluźnienie kasuje się samo w niedzielę w nocy, podczas gdy organizm spłaca je przez kolejne 2-3 dni.';
    case 'wieczorny_odpad': return 'Błędne założenie: zrzucasz winę na brak silnej woli wieczorem, ignorując fakt, że wieczorny apetyt to czysta odpowiedź na całodniowe napięcie i krótki sen.';
    case 'glowa_zajezdza': return 'Błędne założenie: szukasz przyczyn braku efektów w diecie, podczas gdy głównym hamulcem jest nierozładowany stres i stała aktywacja osi HPA.';
    case 'wiedza_bez_wdrozenia': return 'Błędne założenie: wierzysz, że kolejna przeczytana teoria rozwiąże problem, podczas gdy brakuje Ci wyłącznie stałego systemu egzekucji.';
    default: return 'Błędne założenie: traktujesz spadek energii jako normę wieku, zamiast usunąć konkretny wyciek regeneracyjny w Twoim tygodniu.';
  }
}
