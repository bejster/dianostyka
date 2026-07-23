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
  reframe?: { cytat?: string; falszywe_zalozenie?: string; mechanizm?: string; pulapka?: string };
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

// ── DRUGIE DNO: mechanizm neuro/hormonalny, którego lead nigdy nie usłyszał ──
// Łączy zaznaczone sygnały w jedną pętlę + analogia z życia (reguła Michała: każdy
// mechanizm neuro musi mieć analogię). Neurofizjologia sprawdzalna, bez zmyślonych liczb.
const DEEPER: Record<string, { label: string; body: string; analogy: string }> = {
  weekend_reset: {
    label: 'Twój poniedziałek jest chemiczny, nie moralny.',
    body: 'Alkohol w weekend nie dolicza tylko kalorii. Rozbija sen, spłyca go i wybija fazy, przez które się regenerujesz, więc kortyzol schodzi wolniej, a nocna odbudowa testosteronu nie dochodzi do skutku. Skutki ciągną się dłużej niż jedną noc. W poniedziałek za spadek formy nie odpowiada słaba wola, tylko neurochemia, która dalej siedzi w sobotę.',
    analogy: 'Jak telefon, co pokazuje 100%, a bateria zjechana. Liczba kłamie, a Ty się dziwisz, że gaśnie w południe.',
  },
  wieczorny_odpad: {
    label: 'Twój wieczór ustawia się rano, nie o 22:00.',
    body: 'Najazd na lodówkę nie bierze się ze słabego charakteru. Po krótkim śnie mózg mocniej reaguje na jedzenie jak na nagrodę, a grelina i leptyna przestają mówić Ci prawdę o głodzie. Do tego wieczorny kortyzol, który powinien schodzić do dna, u faceta w ciągłym napięciu dalej stoi w górze i trzyma Cię na obrotach. Wieczorem nie walczysz z sobą, walczysz z trzema hormonami, które niedospana doba rozstroiła.',
    analogy: 'Wieczór to rachunek za cały dzień. Płacisz go w lodówce, a myślisz, że to kwestia silnej woli.',
  },
  glowa_zajezdza: {
    label: 'Kortyzol i testosteron siedzą na jednej huśtawce.',
    body: 'Napięcie nie zostaje w głowie. Oś HPA trzyma kortyzol w górze, ciało migdałowate nie schodzi z alarmu, więc nie zasypiasz, a rano jest gorzej niż wczoraj. Im wyżej kortyzol, tym niżej testosteron, bo działają przeciwko sobie. Humor nie ma z tym nic wspólnego. To pętla, która sama się napędza.',
    analogy: 'Alarm, który nie gaśnie, rozładowuje cały budynek, nie jeden pokój.',
  },
  wiedza_bez_wdrozenia: {
    label: 'Mózg nagradza Cię za oglądanie i olewa robotę.',
    body: 'Kolejny film o treningu daje dopaminę z samego uczenia się. Mózg dostaje sygnał postępu bez postępu, więc nie domaga się już akcji. Dlatego wiesz coraz więcej i zmieniasz coraz mniej. Bez kogoś, kto Cię z tego rozliczy, ta pętla się nie domyka.',
    analogy: 'Czytasz menu i wstajesz od stołu najedzony samą kartą dań.',
  },
  silnik_bez_paliwa: {
    label: '„W normie” to nie to samo, co „na swoim maksie”.',
    body: 'Zaznaczyłeś rzeczy, których pojedynczo nikt by nie ruszył. Razem układają się w cichy wyciek energii: sen bez regeneracji, napęd na niskim biegu, a badania mimo to mogą wyjść „w normie”. Tyle że „w normie” znaczy „jak u większości”, a nie „na Twoim maksie”. Czujesz, że jedziesz poniżej swojego pułapu, nawet jeśli nic nie jest chore.',
    analogy: 'Silnik, który przechodzi przegląd, ale nigdy nie ciągnie na pełnym.',
  },
};

function hiddenCost(input: WeekPlanInput): WeekPlan['hiddenCost'] {
  const zl = input.costTotal >= 1000 ? `${Math.round(input.costTotal / 1000)} tys zł` : `${Math.round(input.costTotal / 100) * 100} zł`;
  const kasa = input.costTotal >= 2000 ? ` Do tego ${zl} w pół roku na konsekwencje, nie na sam nawyk.` : '';
  const mies = input.costMonths && input.costMonths >= 1 ? ` I około ${input.costMonths} miesięcy treningu, które nie ruszyły formy, bo fundament pod spodem nie gra.` : '';
  switch (input.archetypeKey) {
    case 'weekend_reset':
      return { headline: 'Jeden weekend nie kosztuje Cię dwóch dni. Kosztuje pięciu.', math: `W miesiącu nie tracisz czterech weekendów. Tracisz cztery poniedziałki, cztery wtorki i połowę śród na doganianie.${kasa}${mies}`, multiplier: '1 luźniejszy weekend potrafi kosztować 3 dni zdolności do działania.' };
    case 'wieczorny_odpad':
      return { headline: 'Jeden wieczór nie kończy się o północy. Zabiera Ci następny poranek, trening i decyzje do 14:00.', math: `Pięć przekręconych wieczorów to pięć poranków na kawie i dwa, trzy przepuszczone treningi w tygodniu.${kasa}${mies}`, multiplier: '1 wieczór na kredycie i następny dzień jedzie na obniżonych obrotach.' };
    case 'glowa_zajezdza':
      return { headline: 'Napięcie nie znika, gdy zamykasz laptopa. Zjada Ci sen, apetyt i cały wieczór.', math: `Pięć dni w trybie alarmu i weekend schodzi na schodzenie z napięcia, nie na życiu.${kasa}${mies}`, multiplier: '1 dzień na kortyzolu = wieczór i noc pod jego dyktando.' };
    case 'wiedza_bez_wdrozenia':
      return { headline: 'Nie tracisz wiedzy. Tracisz miesiące, bo wiedza bez rozliczenia leży odłogiem.', math: `Rok prób w kółko to rok formy, której nie widać, mimo że wiesz więcej niż większość ludzi na siłowni.${kasa}${mies}`, multiplier: 'Każdy „poniedziałek od nowa” kasuje poprzedni tydzień.' };
    default:
      return { headline: 'Nie tracisz jednego dnia. Tracisz kilka procent z każdego.', math: `Pół mocy przez trzydzieści dni sumuje się w cały miesiąc na 70%, nie w jedną głośną wpadkę.${kasa}${mies}`, multiplier: 'Cichy wyciek zabiera więcej niż jedna wtopa, którą widać.' };
  }
}

// ── POTENCJAŁ NA STOLE: widzimy więcej, niż dziś z siebie wyciąga ──
function potentialBlock(input: WeekPlanInput): WeekPlan['potential'] {
  const used = Math.max(15, Math.min(input.potentialPct ?? (100 - input.score), 90));
  const worst = input.worstCat.toLowerCase();
  return {
    usedPct: used,
    headline: 'Na podstawie tego, co zaznaczyłeś, sporo zostaje na stole.',
    body: `Działasz teraz na jakieś ${used}% tego, co masz pod maską. Reszta nie zniknęła. Siedzi zablokowana przez ${worst} i wieczory, i nie widać jej z jednego dnia, dlatego tak łatwo ją olać.`,
    punch: 'Nie marnujesz czasu. Marnujesz różnicę między tym, kim jesteś, a kim byłbyś bez tego wycieku.',
  };
}

function foodAnchor(i: WeekPlanInput): string {
  if ((i.protein ?? 0) >= 2) return 'Białko w pierwszym posiłku dnia, o tej samej porze. Ustawia cukier i napęd na resztę dnia, żeby wieczór nie odbijał głodem.';
  if (i.worstCat === 'Żywienie') return 'Pełny posiłek, zanim wejdziesz wieczorem w telefon. Najedzony mózg nie szuka nagrody w lodówce.';
  return 'Jeden stały posiłek-kotwica o tej samej porze, reszta dnia może się sypać.';
}
function trainAnchor(i: WeekPlanInput): string {
  if ((i.miss ?? 0) >= 2) return 'Jeden trening w wersji minimum, wpisany w kalendarz jak spotkanie, nie „jak znajdę czas”.';
  return 'Jeden krótszy trening zrobiony bije idealny plan od poniedziałku.';
}
function stepsAnchor(i: WeekPlanInput): string {
  const floor = (i.worstCat === 'Trening' || (i.miss ?? 0) >= 2) ? 8000 : 7000;
  return `Minimum ${floor.toLocaleString('pl-PL')} kroków dziennie, też w gorszy dzień. Nie na kalorie, na zejście z kortyzolu i lepszy sen wieczorem.`;
}
function returnAnchor(): string {
  return 'Po gorszym dniu żadnego karnego treningu. Karny trening po zarwanej nocy tylko dokłada kortyzolu do już rozregulowanego układu. Spacer, woda, normalny posiłek, sen o stałej porze. Wracasz, nie odrabiasz.';
}
function removeAnchor(i: WeekPlanInput): string {
  if ((i.drinks ?? 0) > 5) return 'Jeden weekend bez alkoholu, żeby zobaczyć, ile z tego zmęczenia to nie Ty.';
  if ((i.screenBed ?? 0) >= 2) return 'Telefon poza sypialnią przez najbliższe trzy wieczory.';
  if ((i.junk ?? 0) > 300) return 'Wieczorne podjadanie: jedna rzecz mniej dziennie, nie zero od razu.';
  if ((i.binge ?? 0) >= 2) return 'Jeden wieczór w tygodniu bez skoku do lodówki po 21:00.';
  return 'Jedna rzecz, która co wieczór zjada Ci dzień, znika na siedem dni.';
}
function metricLine(i: WeekPlanInput): string {
  switch (i.worstCat) {
    case 'Sen': return 'Godzina zaśnięcia. Zapisuj przez siedem dni, nic więcej.';
    case 'Weekend': return 'Ile poniedziałków ruszyło z normalnego miejsca. Cel: 4 na 4.';
    case 'Żywienie': return 'Wieczory pod kontrolą. Cel: 5 na 7.';
    case 'Stres':
    case 'Głowa': return 'Czy wieczorem zszedłeś z obrotów. Tak albo nie, codziennie.';
    case 'Trening': return 'Treningi zrobione kontra zaplanowane. Cel: 3 na 3.';
    default: return 'Jeden wieczór pod kontrolą. Licz do 5 na 7.';
  }
}
function buildPlan(i: WeekPlanInput): { plan: PlanAnchor[]; metric: string } {
  const metric = metricLine(i);
  const plan: PlanAnchor[] = [
    { icon: '🍽️', kind: 'Kotwica jedzenia', text: foodAnchor(i) },
    { icon: '🏋️', kind: 'Kotwica treningu', text: trainAnchor(i) },
    { icon: '👟', kind: 'Próg kroków', text: stepsAnchor(i) },
    { icon: '🔁', kind: 'Powrót po gorszym dniu', text: returnAnchor() },
    { icon: '➖', kind: 'Jedna rzecz do usunięcia', text: removeAnchor(i) },
    { icon: '📊', kind: 'Jeden wskaźnik', text: metric },
  ];
  return { plan, metric };
}

// ── ZAPROSZENIE: osobista linia, identity + oferta pomocy, bez gwarancji wyniku ──
function invitationLine(input: WeekPlanInput): string {
  const hot = (input.potentialPct ?? (100 - input.score)) <= 45; // dużo zablokowanego = duży upside
  if (hot) return 'Zablokowanego masz sporo i to akurat dobra wiadomość, bo znaczy, że jest co odzyskać, a nie że jesteś na maksie i tyle. Jak zechcesz to poukładać, wiem od czego zacząć i doprowadzam do końca, nie do połowy.';
  return 'Masz niezłą bazę i widać, że myślisz. Reszta to wyciśnięcie różnicy, którą inni zostawiają na stole. Jak zechcesz po nią sięgnąć, wiem od czego zacząć i idę z Tobą do końca.';
}

// ── MOST: zawsze akcja + routing po bólu, nie ślepy cennik ──
// Zapis karty jest ZAWSZE pierwszy (uniwersalna akcja). Kolejność reszty zależy od
// tego, ile user ma zablokowane: dużo bólu -> prowadzenie bliżej; mała baza -> najpierw
// tani pierwszy krok, prowadzenie na końcu i miękko. Nigdy nie wpychamy najdroższego.
function buildBridge(input: WeekPlanInput): WeekPlan['bridge'] {
  const hot = (input.potentialPct ?? (100 - input.score)) <= 45;
  const save = { tier: 'Zapisz swoją Kartę tygodnia', line: 'Zabierz ją ze sobą. To Twój punkt odniesienia na najbliższe siedem dni, wracasz do niego po każdym gorszym dniu.', kind: 'save' as const };
  const start = { tier: 'Pierwszy płatny krok na dziś', line: 'Chcesz od razu zamknąć najsłabsze ogniwo, nie czekając na wielki plan. Jeden konkret do wdrożenia dziś, 49 zł.', kind: 'start' as const };
  const ladder = { tier: 'Spięte w jedno', line: 'Chcesz mieć to poukładane z pomiarem postępu, nie w pięciu miejscach. BAZA, 299 zł.', kind: 'ladder' as const };
  const coopHot = { tier: 'Dopasowanie co tydzień', line: 'Masz sporo do odzyskania, a to najszybciej idzie, gdy ktoś dopasowuje plan co tydzień do tego, jak naprawdę wygląda Twój tydzień. To jest prowadzenie. Aplikacja, nie zakup.', kind: 'coop' as const };
  const coopCold = { tier: 'Gdyby sam plan przestał wystarczać', line: 'Gdy zechcesz, żeby ktoś dopasowywał to co tydzień do tego, co naprawdę się u Ciebie dzieje, jest prowadzenie. Bez pośpiechu, wtedy kiedy będziesz gotowy.', kind: 'coop' as const };
  // hot: prowadzenie tuż po zapisie; cold: najpierw tani krok, prowadzenie na końcu i miękko
  return hot ? [save, coopHot, start, ladder] : [save, start, ladder, coopCold];
}

export function buildWeekPlan(input: WeekPlanInput): WeekPlan {
  const tpl = WEEK_BY_ARCHETYPE[input.archetypeKey] || WEEK_FALLBACK;
  const week: WeekDay[] = DAYS.map((day, idx) => ({ day, label: tpl.labels[idx], state: tpl.states[idx] }));
  const problem = {
    name: input.archetypeLabel,
    oneLiner: input.archetypeTagline,
    falseAssumption: input.reframe?.falszywe_zalozenie?.trim() || defaultFalseAssumption(input.archetypeKey),
  };
  const { plan, metric } = buildPlan(input);
  return {
    problem,
    week,
    deeper: DEEPER[input.archetypeKey] || DEEPER.wieczorny_odpad,
    deeperNote: 'To opis mechanizmu na podstawie tego, co zaznaczyłeś, nie diagnoza. Jeśli coś Cię niepokoi zdrowotnie, potwierdź to u lekarza.',
    hiddenCost: hiddenCost(input),
    potential: potentialBlock(input),
    plan,
    metric,
    invitation: invitationLine(input),
    bridge: buildBridge(input),
    saveNote: 'Zapisujesz stronę do siebie. Nic nie wysyłamy dalej, dopóki sam nie napiszesz.',
  };
}

function defaultFalseAssumption(key: string): string {
  switch (key) {
    case 'weekend_reset': return 'Weekend nie jest problemem. Problem zaczyna się w niedzielę wieczorem, kiedy zakładasz, że w poniedziałek po prostu wrócisz.';
    case 'wieczorny_odpad': return 'Słaba wola dostaje tu całą winę. A wieczorny zjazd to rachunek za całą dobę, który organizm wystawia po 21:00, kiedy jesteś najsłabszy.';
    case 'glowa_zajezdza': return 'Szukasz winy na talerzu, a to zaczyna się wyżej: w głowie, która o 22:00 dalej pracuje, choć Ty już leżysz.';
    case 'wiedza_bez_wdrozenia': return 'Wiesz więcej niż połowa ludzi na siłowni. I dlatego dalej stoisz w miejscu, bo wiedza bez kogoś, kto Cię z niej rozliczy, leży odłogiem.';
    default: return 'Robisz wszystko z listy i dalej lecisz na pół gwizdka. Coś pod spodem cieknie tak wolno, że z jednego dnia tego nie widać, a przez rok robi różnicę.';
  }
}
