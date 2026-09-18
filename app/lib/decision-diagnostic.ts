// Communication Decision Compiler: an answer must change a decision, never a sales score.
// Legacy assessments remain readable through their existing modules. This is a new schema.
export const DECISION_VERSION = '3.0.0';
export const DECISION_STORAGE_KEY = 'diagnostyka_168_decision_v3';
export const NABOR_URL = 'https://nabor.talerzihantle.com/?from=diagnostyka&utm_source=diagnostyka&utm_medium=lead_magnet&utm_campaign=decision_v3';
export type Answers = Record<string, string | number>;
export interface Option { id: string; label: string }
export interface Question {
  id: string;
  title: string;
  hint: string;
  job: string;
  downstream: string;
  type?: 'number';
  max?: number;
  options?: Option[];
}
const options = (rows: [string, string][]): Option[] => rows.map(([id, label]) => ({ id, label }));
const GOAL: Question = {
  id: 'goal', title: 'Co chcesz poprawić w pierwszej kolejności?', hint: 'Wybierz jedną rzecz, na której najbardziej Ci teraz zależy.',
  job: 'Ustalić wynik, na którym zależy odbiorcy.', downstream: 'Wybiera kryterium obserwacji i kierunek przy braku sceny.',
  options: options([['form', 'Sylwetkę. Chcę widzieć, że to idzie do przodu.'], ['energy', 'Energię. Chcę mieć siłę też po pracy.'], ['sleep', 'Sen. Chcę wstawać bardziej wypoczęty.'], ['head', 'Głowę. Chcę móc skończyć pracę także w myślach.'], ['other', 'Jeszcze nie umiem wybrać jednej rzeczy.']]),
};
const SCENE: Question = {
  id: 'scene', title: 'Przypomnij sobie ostatni tydzień. Która sytuacja najbardziej Ci przeszkodziła?', hint: 'Jedna konkretna sytuacja wystarczy. Możesz też zaznaczyć, że tydzień poszedł dobrze.',
  job: 'Zakotwiczyć wynik w zaobserwowanej scenie.', downstream: 'Wybiera pytanie o wcześniejsze ogniwo i rodzinę eksperymentu; dopuszcza brak problemu.',
  options: options([['training', 'Miał być trening, ale dzień się przeciągnął.'], ['food', 'Wieczorem zjadłem więcej, niż chciałem.'], ['sleep', 'Położyłem się później, niż planowałem.'], ['energy', 'W ciągu dnia trudno mi było utrzymać skupienie.'], ['weekend', 'Po weekendzie trudno było wrócić do zwykłego rytmu.'], ['steady', 'Tydzień poszedł w porządku.'], ['unknown', 'Nie potrafię wskazać jednej sytuacji.']]),
};
const BEFORE: Record<string, [string, string][]> = {
  training: [['work', 'Praca weszła w czas, który miał być na trening.'], ['family', 'Wypadła sprawa rodzinna albo opieka nad kimś.'], ['no_short', 'Nie miałem czasu na cały trening, a krótszej wersji nie ustaliłem.'], ['tired', 'Już wcześniej byłem zmęczony.'], ['unknown', 'Nie wiem albo było to coś innego.']],
  food: [['meal', 'Wcześniejszy posiłek wypadł albo mocno się przesunął.'], ['no_food', 'Skończyłem pracę i nie miałem przygotowanego jedzenia.'], ['tension', 'Dzień był napięty. Jedzenie było chwilą przerwy.'], ['social', 'Byłem z ludźmi i jedzenie było częścią spotkania.'], ['unknown', 'Nie wiem albo było to coś innego.']],
  sleep: [['work', 'Dokańczałem pracę.'], ['screen', 'Zostałem przy telefonie albo serialu.'], ['family', 'Miałem obowiązki w domu albo przy dziecku.'], ['thoughts', 'Położyłem się, ale długo myślałem o sprawach z dnia.'], ['unknown', 'Nie wiem albo było to coś innego.']],
  energy: [['short_sleep', 'Spałem krócej, niż planowałem.'], ['meal', 'Przesunąłem posiłek, bo nie było kiedy zjeść.'], ['no_break', 'Pracowałem długo bez przerwy.'], ['many_tasks', 'Co chwilę przeskakiwałem między sprawami.'], ['unknown', 'Nie wiem albo było to coś innego.']],
  weekend: [['late', 'Przesunęły mi się godziny snu i pobudki.'], ['no_return', 'Nie ustaliłem, kiedy wracam do jedzenia i treningu.'], ['compensate', 'Próbowałem nadrabiać jedzeniem mniej albo dodatkowym treningiem.'], ['work', 'Jeszcze w weekend nadrabiałem pracę.'], ['unknown', 'Nie wiem albo było to coś innego.']],
};
const PREVIOUS: Question = {
  id: 'previous', title: 'Co ostatnio próbowałeś zmienić, żeby było lepiej?', hint: 'Wybierz ostatnią próbę. Nie musisz opisywać całej historii.',
  job: 'Poznać previous attempts bez liczenia porażek.', downstream: 'Uruchamia pytanie o wynik próby; chroni przed powtórzeniem niedopasowanej rady.',
  options: options([['plan', 'Wziąłem nowy plan treningu albo jedzenia.'], ['calendar', 'Rozpisałem godziny i próbowałem się ich trzymać.'], ['small', 'Zmniejszyłem wymagania i wybrałem jedną rzecz.'], ['support', 'Korzystałem z czyjejś pomocy.'], ['none', 'Jeszcze nic konkretnego.'], ['unknown', 'Nie pamiętam jednej konkretnej próby.']]),
};
const ATTEMPT: Question = {
  id: 'attempt', title: 'Co się stało z tą próbą?', hint: 'Jeśli działa do dziś, zaznacz to.',
  job: 'Ustalić, co zachować lub zmienić po poprzedniej próbie.', downstream: 'Działającą próbę zachowuje; brak efektu kieruje do obserwacji; brak korekty do przeglądu wykonania.',
  options: options([['works', 'Działa. Chcę ją utrzymać.'], ['schedule', 'Przyszły nadgodziny albo zmiana planów i przestała pasować.'], ['too_much', 'Było za dużo do pilnowania naraz.'], ['no_change', 'Robiłem swoje, ale nie widziałem zmiany.'], ['no_feedback', 'Nie wiedziałem, co poprawić, kiedy coś nie szło.'], ['unknown', 'Trudno mi powiedzieć.']]),
};
const CONSTRAINT: Question = {
  id: 'protect', title: 'Na co ma zostać miejsce, kiedy zaczniesz to poprawiać?', hint: 'Co chcesz zachować w swoim tygodniu?',
  job: 'Rozpoznać konflikt między celem a tym, co odbiorca chce zachować.', downstream: 'Zmienia wykonanie zadania: czas rodzinny, spotkania, elastyczność lub odpoczynek.',
  options: options([['family', 'Na czas z bliskimi.'], ['social', 'Na spotkania i wyjścia.'], ['flexible', 'Na elastyczność. Nie ustawię każdego dnia co do godziny.'], ['rest', 'Na odpoczynek. Już mam dużo na głowie.'], ['none', 'Nie mam jednego takiego warunku.']]),
};
const IMPACT: Question = {
  id: 'impact', title: 'Co przez to faktycznie ucierpiało w ostatnim tygodniu?', hint: 'Zaznacz największy koszt. Brak wyraźnego kosztu też jest odpowiedzią.',
  job: 'Ustalić zaobserwowany koszt bez produkowania strat.', downstream: 'Wybiera dodatkowy sygnał obserwacji; mały koszt usuwa presję i obietnicę wielkiej naprawy.',
  options: options([['training', 'Wypadł trening albo ruch, który chciałem zrobić.'], ['food', 'Jedzenie było bardziej przypadkowe, niż chciałem.'], ['work', 'Przeciągałem pracę, bo trudno było się skupić.'], ['home', 'Miałem mniej cierpliwości albo siły dla bliskich.'], ['rest', 'Miałem mniej czasu na odpoczynek.'], ['none', 'Nie widzę wyraźnego kosztu.']]),
};
const WHY: Question = {
  id: 'why', title: 'Co sprawiło, że sprawdzasz to właśnie teraz?', hint: 'Zwykła ciekawość też wystarczy.',
  job: 'Odróżnić realne WHY NOW od ciekawości.', downstream: 'Zmienia moment uruchomienia zadania i ton zaproszenia; nie wnioskuje chęci zakupu.',
  options: options([['repeat', 'Znowu powtórzyła się ta sama sytuacja.'], ['change', 'Zmieniła się praca albo rytm dnia.'], ['event', 'Mam przed sobą konkretny termin albo wydarzenie.'], ['ready', 'Mam teraz miejsce, żeby się tym zająć.'], ['curious', 'Na razie z ciekawości.']]),
};
function question(id: string, title: string, hint: string, job: string, downstream: string, extra: Partial<Question>): Question {
  return { id, title, hint, job, downstream, ...extra };
}
export function getQuestions(a: Answers): Question[] {
  const q = [GOAL, SCENE];
  const scene = String(a.scene || '');
  if (BEFORE[scene]) {
    q.push(question('before', 'Co działo się wcześniej?', 'Wróć do tej konkretnej sytuacji.', 'Znaleźć wcześniejsze ogniwo.', 'Wybiera konkretną hipotezę i eksperyment lub uczciwą obserwację, gdy brak danych.', { options: options(BEFORE[scene]) }));
    if (scene === 'training') {
      q.push(question('planned', 'Ile treningów zaplanowałeś na ten tydzień?', 'Chodzi o ostatni zakończony tydzień.', 'Ustalić mianownik wykonania.', 'Ustala górny limit opuszczonych treningów i dokładny fakt w wyniku.', { type: 'number', max: 7 }));
      if (Number(a.planned) > 0) q.push(question('missed', 'Ile z tych treningów się nie odbyło?', 'Krótki trening też liczy się jako wykonany, jeśli tak go zaplanowałeś.', 'Ustalić rzeczywiste wykonanie.', 'Rozróżnia trudny moment od opuszczonego treningu; zero nie staje się porażką.', { type: 'number', max: Number(a.planned) }));
    } else {
      q.push(question('frequency', scene === 'weekend' ? 'Po ilu z ostatnich czterech weekendów było podobnie?' : 'W ilu dniach ostatniego tygodnia było podobnie?', 'Jeśli nie pamiętasz dokładnie, możesz zaznaczyć „Nie pamiętam”.', 'Odróżnić pojedynczy epizod od powtarzalnej sytuacji.', 'Zero lub brak pamięci daje obserwację bez rozpoznania wzorca; liczby pozostają w swoim okresie.', { options: options([...(scene === 'weekend' ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5, 6, 7]).map(n => [String(n), String(n)] as [string, string]), ['unknown', 'Nie pamiętam']]) }));
    }
  }
  q.push(PREVIOUS);
  if (a.previous && !['none', 'unknown'].includes(String(a.previous))) q.push(ATTEMPT);
  q.push(CONSTRAINT);
  if (!['steady', ''].includes(scene)) q.push(IMPACT);
  q.push(WHY);
  return q;
}

// Walk in dependency order: changing an earlier answer discards now-hidden / invalid descendants.
export function cleanAnswers(input: unknown): Answers {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const raw = input as Record<string, unknown>;
  const clean: Answers = {};
  for (let i = 0; i < 20; i++) {
    const q = getQuestions(clean)[i];
    if (!q) break;
    const v = raw[q.id];
    if (q.type === 'number') {
      if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= (q.max ?? 7)) clean[q.id] = v;
    } else if (typeof v === 'string' && q.options?.some(o => o.id === v)) clean[q.id] = v;
  }
  return clean;
}
export function updateAnswer(a: Answers, id: string, value: string | number): Answers {
  const path = getQuestions(a);
  const index = path.findIndex(q => q.id === id);
  // Retain independent answers, but reset material dependencies even if both branches reuse an ID.
  const next = { ...a, [id]: value };
  if (a[id] !== value) {
    if (id === 'scene') for (const key of ['before', 'planned', 'missed', 'frequency', 'impact']) delete next[key];
    if (id === 'previous') delete next.attempt;
    if (id === 'planned' && (Number(next.missed) > Number(value) || Number(value) === 0)) delete next.missed;
  }
  return index < 0 ? a : cleanAnswers(next);
}
export function isComplete(a: Answers): boolean {
  const clean = cleanAnswers(a);
  return getQuestions(clean).every(q => clean[q.id] !== undefined);
}
export function answerLabel(a: Answers, id: string): string {
  const q = getQuestions(a).find(x => x.id === id);
  return q?.options?.find(o => o.id === a[id])?.label ?? (typeof a[id] === 'number' ? String(a[id]) : 'Brak odpowiedzi');
}
export interface Experiment { id: string; title: string; action: string; observe: string; when: string }
const EXPERIMENTS: Record<string, Omit<Experiment, 'id' | 'when'>> = {
  'training:work': { title: 'Ustal krótszy trening przed rozpoczęciem pracy.', action: 'Przy najbliższym zaplanowanym treningu zapisz rano godzinę startu i krótszą wersję z ćwiczeń, które już znasz. Jeśli praca się przeciągnie, masz gotową decyzję.', observe: 'Czy trening się odbył? Jeśli nie, co dokładnie go zatrzymało?' },
  'training:no_short': { title: 'Wybierz z obecnego treningu wersję na krótszy dzień.', action: 'Przed kolejnym treningiem wybierz ćwiczenia, które wykonasz, jeśli zabraknie czasu na całość. Zapisz je przy pełnym planie.', observe: 'Czy krótsza wersja pozwoliła wykonać trening, który inaczej by wypadł?' },
  'training:family': { title: 'Sprawdź termin treningu z obowiązkami w domu.', action: 'Przed najbliższym treningiem sprawdź, czy jego termin nie pokrywa się z opieką albo sprawami domowymi. Ustal jedno dostępne okno oraz krótszy wariant na zmianę planów.', observe: 'Czy termin był realny? Co zmieniło się między ustaleniem a wykonaniem?' },
  'food:meal': { title: 'Przygotuj posiłek, który ostatnio wypadł.', action: 'Przed kolejnym podobnym dniem wybierz zwykły posiłek, który da się zjeść w pracy. Przygotuj go lub ustal, gdzie go kupisz, zanim zacznie się dzień.', observe: 'Czy zjadłeś ten posiłek i jak wyglądał głód wieczorem? Zapisz oba fakty.' },
  'food:no_food': { title: 'Zdecyduj o jedzeniu przed końcem pracy.', action: 'Przed kolejnym wyjściem z pracy ustal jeden dostępny posiłek na powrót. Sprawdź, czy masz składniki albo gdzie go kupisz.', observe: 'Czy gotowa decyzja zmieniła to, co zjadłeś po pracy?' },
  'food:tension': { title: 'Sprawdź, co dawała Ci ta przerwa na jedzenie.', action: 'Przy kolejnej takiej chwili zanotuj głód i to, czego potrzebowałeś po pracy: posiłku, odpoczynku czy chwili bez zadań. Jeśli jesteś głodny, zjedz zwykły posiłek.', observe: 'Czy w tej sytuacji dominował głód, napięcie czy oba naraz? Nie oceniaj ilości jedzenia jako testu charakteru.' },
  'food:social': { title: 'Ustal posiłek po spotkaniu.', action: 'Zostaw zaplanowane spotkanie. Przed nim ustal, kiedy zjesz kolejny zwykły posiłek. Nie dopisuj głodówki ani dodatkowego treningu za to wyjście.', observe: 'Czy po spotkaniu wróciłeś do zwykłego jedzenia przy następnej okazji?' },
  'sleep:work': { title: 'Zapisz, gdzie kończy się dzisiejsza praca.', action: 'Przed końcem najbliższego dnia wybierz zadanie, na którym zamykasz pracę. Niedokończoną rzecz zapisz wraz z pierwszym krokiem na jutro.', observe: 'O której faktycznie skończyłeś pracę i położyłeś się do łóżka?' },
  'sleep:screen': { title: 'Ustal koniec oglądania przed włączeniem ekranu.', action: 'Wieczorem wybierz konkretny moment zakończenia: koniec odcinka albo ustaloną godzinę. Po nim odłóż telefon poza łóżko.', observe: 'Czy skończyłeś w ustalonym momencie? O której położyłeś się do łóżka?' },
  'sleep:thoughts': { title: 'Zostaw jutrzejszą robotę na kartce.', action: 'Przy kończeniu pracy zapisz niedokończone sprawy i jeden następny krok do każdej. Wieczorem sprawdź, czy wracasz do tych samych myśli.', observe: 'Czy zapisanie spraw coś zmieniło w tym wieczorze? Może nie zmienić niczego.' },
  'energy:meal': { title: 'Sprawdź dzień z posiłkiem o ustalonej porze.', action: 'Przed podobnym dniem przygotuj zwykły posiłek i wybierz moment, w którym możesz go zjeść. Zapisz, czy faktycznie się udało.', observe: 'Kiedy pojawiła się trudność ze skupieniem? Porównaj to z godziną posiłku, bez przypisywania mu całego efektu.' },
  'energy:no_break': { title: 'Wstaw jedną przerwę przed znanym zjazdem.', action: 'Przed najbliższym blokiem pracy ustal miejsce na krótką przerwę od ekranu. Wybierz moment przed porą, o której ostatnio trudno było Ci się skupić.', observe: 'Czy zrobiłeś przerwę? Czy po niej łatwiej było wrócić do jednego zadania?' },
  'energy:many_tasks': { title: 'Sprawdź jeden blok bez przeskakiwania między sprawami.', action: 'Wybierz jedno zadanie i krótki blok, w którym zajmujesz się tylko nim. Zapisz sprawy, które próbują wejść w środek.', observe: 'Co przerwało blok i ile z wybranego zadania udało się zrobić?' },
  'weekend:no_return': { title: 'Ustal pierwszy zwykły posiłek po weekendzie.', action: 'Jeszcze przed weekendem wybierz pierwszy zwykły posiłek po wyjściu i zadbaj o jego dostępność. Od niego wracasz do planu.', observe: 'Czy powrót nastąpił przy ustalonej okazji? Co go ułatwiło albo opóźniło?' },
  'weekend:compensate': { title: 'Po weekendzie wróć przy najbliższej zwykłej okazji.', action: 'Zaplanuj zwykły posiłek i kolejny trening zgodnie z dotychczasowym planem. Nie dodawaj kary za weekend.', observe: 'Czy udało się wrócić bez nadrabiania? Która decyzja była najtrudniejsza?' },
  'weekend:work': { title: 'Wybierz granicę nadrabiania pracy w weekend.', action: 'Przed najbliższym weekendem wybierz jedno zadanie, które rzeczywiście musi być zrobione. Reszcie przypisz termin w tygodniu.', observe: 'Ile z zaplanowanej pracy weszło w weekend i czy po nim łatwiej było wrócić do rytmu?' },
};
const GOAL_METRIC: Record<string, string> = {
  form: 'Na tym etapie sprawdź wykonanie jedzenia lub treningu. Trzy dni nie rozstrzygają zmiany sylwetki.',
  energy: 'Zapisz, ile siły zostało Ci po pracy. Sam lepszy dzień nie wskazuje jeszcze jego przyczyny.',
  sleep: 'Zapisz porę położenia się i to, jak czułeś się po przebudzeniu.',
  head: 'Zapisz, czy po pracy udało Ci się zostawić niedokończone sprawy do jutra.',
  other: 'Po próbie wybierz jedną rzecz, której zmianę rzeczywiście zauważyłeś.',
};
const CONSTRAINT_ACTION: Record<string, string> = {
  family: 'Ustal tę małą zmianę poza czasem z bliskimi, który chcesz zachować. Jeśli się nie mieści, zmniejsz jej zakres.',
  social: 'Zostaw zaplanowane spotkanie. Umieść zadanie przed nim albo przy pierwszej zwykłej okazji po nim.',
  flexible: 'Przypnij zadanie do zdarzenia, np. końca pracy. Dzięki temu może przesuwać się razem z dniem.',
  rest: 'Na tę próbę wybierz najkrótszą wersję zadania. Nie zabieraj na nie czasu przeznaczonego na sen.',
  none: 'Wybierz najbliższą realną okazję do wykonania tego jednego zadania.',
};
const IMPACT_METRIC: Record<string, string> = {
  training: 'Dodatkowo zaznacz, czy zaplanowany ruch się odbył.', food: 'Dodatkowo zaznacz, czy miałeś pod ręką ustalony posiłek.',
  work: 'Dodatkowo zapisz, czy praca skończyła się o planowanej porze.', home: 'Dodatkowo zapisz, ile siły zostało na czas z bliskimi.',
  rest: 'Dodatkowo zaznacz, czy został zaplanowany czas na odpoczynek.', none: 'Nie wskazałeś wyraźnego kosztu. Oceń, czy zmiana w ogóle jest Ci potrzebna.',
};
const ATTEMPT_LESSON: Record<string, string> = {
  works: 'To, co już działa, zostaje. Najpierw zapisz, co pomaga Ci to utrzymać. Nie dokładam drugiego zadania.',
  schedule: 'Poprzednia próba przestała pasować po zmianie planów. Tym razem ustal też, co zrobisz, gdy dzień się przesunie.',
  too_much: 'Poprzednio było za dużo rzeczy naraz. Przez tę próbę zmieniaj tylko jeden element.',
  no_change: 'Próbowałeś, ale nie widziałeś zmiany. Najpierw zapisz wykonanie i sposób oceniania efektu. Bez czasu trwania oraz tych danych nie wiadomo jeszcze, co poprawić.',
  no_feedback: 'W poprzedniej próbie zabrakło decyzji, co poprawić. Po tej zapisz wynik zadania i jedną przeszkodę. To materiał do następnej korekty.',
  unknown: 'Nie wiemy jeszcze, co przesądziło o poprzedniej próbie. Tym razem zapisz moment, w którym zadanie weszło albo wypadło.',
};
const WHY_COPY: Record<string, string> = {
  repeat: 'Wracasz do tematu po kolejnej podobnej sytuacji. Najbliższe jej wystąpienie będzie okazją do sprawdzenia jednej zmiany.',
  change: 'Zmienił się rytm Twojego dnia. Dopasuj okazję do obecnych godzin, nawet jeśli wcześniej działało coś innego.',
  event: 'Masz konkretny termin. Ta krótka próba sprawdzi wykonanie, ale nie pozwala obiecać efektu na ten termin.',
  ready: 'Masz teraz miejsce na działanie. Wybierz pierwszą okazję w najbliższych trzech dniach.',
  curious: 'Na razie sprawdzasz. Możesz zapisać ten wynik i wrócić, gdy zechcesz wykonać próbę.',
};
const PREVIOUS_ADAPTATION: Record<string, string> = {
  plan: 'Do tej próby wykorzystaj znane elementy poprzedniego planu. Kolejna nowa rozpiska utrudniłaby porównanie.',
  calendar: 'Sprawdź, czy zadanie lepiej przypiąć do końca konkretnej czynności niż do sztywnej godziny.',
  small: 'Skoro już zmniejszałeś zakres, zapisz też warunki wykonania. Samo dalsze skracanie zadania może nie wystarczyć.',
  support: 'Wróć do ustaleń z poprzedniej pomocy. Sprawdź, czy dotyczą tej samej sytuacji i czy nadal da się je wykonać.',
};
export interface DecisionResult {
  title: string; hypothesis: string; evidence: { id: string; label: string; value: string }[];
  experiment: Experiment; goalMetric: string; constraint: string; impact: string; previous: string; timing: string;
  certainty: 'observation' | 'hypothesis' | 'maintain';
}
export function buildDecisionResult(input: Answers): DecisionResult {
  const a = cleanAnswers(input);
  const scene = String(a.scene || 'unknown');
  const key = `${scene}:${a.before || 'unknown'}`;
  const observation = !BEFORE[scene] || a.before === 'unknown' || a.frequency === '0' || a.frequency === 'unknown'
    || (scene === 'training' && (a.planned === 0 || a.missed === 0));
  const maintain = a.attempt === 'works' || (scene === 'steady' && a.attempt !== 'no_change');
  const target = GOAL_METRIC[String(a.goal)] || GOAL_METRIC.other;
  let experiment: Experiment = {
    id: 'observe', title: 'Zapisz jedną sytuację, zanim zaczniesz zmieniać plan.',
    action: `${scene === 'weekend' ? 'Przy najbliższym weekendzie i powrocie do tygodnia' : 'Przez najbliższe trzy dni'} zanotuj jedną trudną sytuację, to, co działo się wcześniej oraz Twój następny ruch. Jeśli nic takiego się nie wydarzy, też to zapisz.`,
    observe: target, when: scene === 'weekend' ? 'Przy najbliższym weekendzie i powrocie do tygodnia.' : 'Przez najbliższe trzy dni, kiedy pojawi się podobna sytuacja.',
  };
  let title = 'Najpierw potrzebujemy jednego konkretnego przykładu.';
  let hypothesis = 'Z tych odpowiedzi nie wynika jeszcze, co uruchamia problem. Krótki zapis pomoże wybrać miejsce do sprawdzenia.';
  if (!observation) {
    const candidate = EXPERIMENTS[key];
    if (candidate) {
      experiment = { ...candidate, id: key, when: experiment.when };
      title = candidate.title;
      hypothesis = 'Zacznijmy od wcześniejszego momentu, który wskazałeś. Sprawdzisz, czy jedna zmiana w tym miejscu ułatwi Ci resztę dnia. To hipoteza. Same odpowiedzi jeszcze nie rozstrzygają przyczyny.';
      if (a.frequency === '1' || a.missed === 1) hypothesis += ' Opisujesz pojedynczy przypadek w tym okresie. Nie rozciągamy go na każdy tydzień.';
    } else {
      title = 'Sprawdź wcześniejszy moment, który wskazałeś.';
      hypothesis = 'Mamy kolejność zdarzeń, ale za mało informacji, żeby wybrać dobrą korektę. Najpierw sprawdźmy, czy ten sam ciąg się powtarza.';
    }
  }
  if (maintain) {
    title = 'Zachowaj to, co już Ci działa.';
    hypothesis = scene === 'steady' ? 'Ostatni tydzień oceniasz jako udany. Te odpowiedzi nie dają podstaw, żeby dorabiać Ci awarię.' : 'Wskazałeś, że poprzednia zmiana działa. Najpierw sprawdź, co pomaga Ci ją utrzymać przy obecnym rytmie dnia.';
    experiment = { id: 'maintain', title, action: 'Przez trzy dni zachowaj to, co sprawdziło się w ostatnim tygodniu. Zapisz jedną rzecz, która pomogła oraz ewentualną przeszkodę.', observe: target, when: 'W trzech najbliższych zwykłych dniach.' };
  } else if (a.attempt === 'no_change') {
    title = 'Najpierw sprawdź, co było wykonane i jak oceniałeś efekt.';
    hypothesis = ATTEMPT_LESSON.no_change;
    experiment = { id: 'review', title, action: 'Zapisz, jak długo stosowałeś poprzednią zmianę, co faktycznie wykonywałeś i po czym oceniałeś rezultat. Przez trzy dni dopisz wykonanie bez dokładania kolejnego wymagania.', observe: 'Czy masz zapis wykonania oraz porównywalny sposób oceny? Jeśli brakuje któregoś z nich, jeszcze nie rozstrzygamy skuteczności.', when: 'Zacznij od ostatniej próby i dopisz trzy kolejne dni.' };
  }
  const evidence = getQuestions(a).filter(q => a[q.id] !== undefined).map(q => ({ id: q.id, label: q.title, value: answerLabel(a, q.id) }));
  return {
    title, hypothesis, evidence, experiment, goalMetric: target,
    constraint: CONSTRAINT_ACTION[String(a.protect)] || '', impact: IMPACT_METRIC[String(a.impact)] || '',
    previous: a.previous === 'none' ? 'To Twoja pierwsza konkretna próba w tym podejściu. Zacznij od jednego zadania i zapisu wykonania.' : a.previous === 'unknown' ? 'Nie odtwarzamy historii na siłę. Zapisz tę próbę, żeby było do czego wrócić.' : [ATTEMPT_LESSON[String(a.attempt)], a.attempt !== 'works' ? PREVIOUS_ADAPTATION[String(a.previous)] : 'Zachowaj właśnie tę próbę jako punkt odniesienia.'].filter(Boolean).join(' '),
    timing: WHY_COPY[String(a.why)] || '', certainty: maintain ? 'maintain' : experiment.id === 'observe' || experiment.id === 'review' ? 'observation' : 'hypothesis',
  };
}

export const FIT_OPTIONS = options([['self', 'Na razie chcę sprawdzić ten krok sam.'], ['coaching', 'Chcę, żeby ktoś sprawdzał wykonanie i pomagał mi korygować plan.'], ['plan', 'Szukam głównie gotowego planu.'], ['medical', 'Szukam diagnozy lub leczenia dolegliwości.']]);
export const OBJECTION_OPTIONS = options([['process', 'Chcę zobaczyć, co konkretnie dzieje się w prowadzeniu.'], ['repeat', 'Boję się, że zapłacę i znowu odpuszczę.'], ['time', 'Nie wiem, czy znajdę na to czas.'], ['price', 'Potrzebuję znać pełny koszt.'], ['none', 'Na ten moment nic. Chcę zobaczyć szczegóły.']]);
export function invitation(fit: string, objection: string, why: string): { text: string; cta: string; showNabor: boolean } {
  if (fit === 'medical') return { text: 'Prowadzenie dotyczy treningu, jedzenia i organizacji tygodnia. Diagnostykę oraz leczenie dolegliwości ustal z lekarzem. Ten formularz ich nie rozstrzyga.', cta: '', showNabor: false };
  if (fit === 'self') return { text: 'Masz pierwszy krok. Sprawdź go przy najbliższej okazji i zapisz, co wyszło. Gdy będziesz chciał dołożyć regularne korekty, niżej możesz zobaczyć prowadzenie.', cta: 'Zobacz, jak wygląda prowadzenie', showNabor: true };
  if (fit === 'plan') return { text: 'U mnie plan jest częścią prowadzenia z regularnymi podsumowaniami i korektami. Jeśli szukasz samej rozpiski, sprawdź zakres przed zgłoszeniem.', cta: 'Zobacz zakres prowadzenia', showNabor: true };
  const copy: Record<string, string> = {
    process: 'Na stronie pokazuję, co zapisujesz Ty, co sprawdzam ja i jak z tego powstaje decyzja na kolejny tydzień. Zobacz, czy takiej pomocy szukasz.',
    repeat: 'Obawa przed kolejnym odpuszczeniem ma znaczenie. Na stronie zobacz, jak wygląda praca po słabszym tygodniu. Sam zakup nie gwarantuje wykonania.',
    time: 'Przed decyzją sprawdź, ile czasu wymaga prowadzenie po Twojej stronie. Na stronie opisuję codzienny zapis i podsumowanie tygodnia.',
    price: 'Na stronie znajdziesz zakresy i koszt pełnych sześciu miesięcy. Sprawdź je spokojnie przed zgłoszeniem.',
    none: 'Jeśli chcesz pracować w ten sposób ze mną, zapraszam. Na stronie zobaczysz przebieg prowadzenia, zakresy i koszt. Sprawdź, czy to pasuje do Twojego tygodnia.',
  };
  return { text: copy[objection] || (why === 'curious' ? 'Możesz najpierw sprawdzić ten krok sam. Jeśli chcesz zobaczyć, jak pracuję z podopiecznymi tydzień po tygodniu, zapraszam na stronę prowadzenia.' : 'Masz punkt wyjścia. W prowadzeniu sprawdzam, co z niego wyszło i na tej podstawie koryguję następny tydzień. Jeśli chcesz pracować w ten sposób ze mną, zapraszam do szczegółów.'), cta: objection === 'price' ? 'Zobacz zakresy i pełny koszt' : 'Zobacz, jak wygląda prowadzenie', showNabor: true };
}
export function resultAsText(a: Answers): string {
  const r = buildDecisionResult(a);
  return ['DIAGNOSTYKA 168', r.title, '', r.hypothesis, '', 'TWÓJ PIERWSZY KROK', r.experiment.action, r.experiment.when, 'Zapisz: ' + r.experiment.observe, '', r.constraint, r.goalMetric, r.impact, r.previous, r.timing, '', 'TWOJE ODPOWIEDZI', ...r.evidence.map(e => `${e.label}\n${e.value}`), '', 'Wynik opiera się na Twoich odpowiedziach. Nie rozstrzyga przyczyn dolegliwości.', 'Prowadzenie: https://nabor.talerzihantle.com/'].filter(Boolean).join('\n\n');
}
