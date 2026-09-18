import { getContextQuestion, getInsight, getMaintenance, getObservation, type Insight } from './decision-insights.ts';
// Communication Decision Compiler: an answer must change a decision, never a sales score.
// Legacy assessments remain readable through their existing modules. This is a new schema.
export const DECISION_VERSION = '3.1.0';
export const DECISION_STORAGE_KEY = 'diagnostyka_168_decision_v31';
export const NABOR_URL = 'https://nabor.talerzihantle.com/?from=diagnostyka&utm_source=diagnostyka&utm_medium=lead_magnet&utm_campaign=decision_v31';
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
  id: 'goal', title: 'Na czym najbardziej Ci zależy w zwykłym tygodniu?', hint: 'Nie musisz chcieć niczego naprawiać. Wybierz to, co jest dla Ciebie ważne.',
  job: 'Ustalić wynik, na którym zależy odbiorcy.', downstream: 'Wybiera kryterium obserwacji i kierunek przy braku sceny.',
  options: options([['form', 'Na sylwetce i treningu.'], ['energy', 'Na sile do życia też po pracy.'], ['sleep', 'Na tym, żeby wstawać wypoczętym.'], ['head', 'Na tym, żeby po pracy mieć już wolną głowę.'], ['other', 'Jeszcze nie umiem wybrać jednej rzeczy.']]),
};
const SCENE: Question = {
  id: 'scene', title: 'Która scena wydarzyła się w Twoim ostatnim tygodniu?', hint: 'Wybierz tę, której chcesz się przyjrzeć. Sam fakt, że się zdarzyła, nie oznacza problemu.',
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
  id: 'previous', title: 'Co już robiłeś w tym temacie?', hint: 'Wróć do ostatniej konkretnej próby dotyczącej wybranej sytuacji. Jeśli takiej nie było, też dobrze.',
  job: 'Poznać previous attempts bez liczenia porażek.', downstream: 'Uruchamia pytanie o wynik próby; chroni przed powtórzeniem niedopasowanej rady.',
  options: options([['plan', 'Wziąłem nowy plan treningu albo jedzenia.'], ['calendar', 'Rozpisałem godziny i próbowałem się ich trzymać.'], ['small', 'Zmniejszyłem wymagania i wybrałem jedną rzecz.'], ['support', 'Korzystałem z czyjejś pomocy.'], ['none', 'Jeszcze nic konkretnego.'], ['unknown', 'Nie pamiętam jednej konkretnej próby.']]),
};
const ATTEMPT: Question = {
  id: 'attempt', title: 'Co się stało z tą próbą?', hint: 'Jeśli działa do dziś, zaznacz to.',
  job: 'Ustalić, co zachować lub zmienić po poprzedniej próbie.', downstream: 'Działającą próbę zachowuje; brak efektu kieruje do obserwacji; brak korekty do przeglądu wykonania.',
  options: options([['works', 'Działa. Chcę ją utrzymać.'], ['schedule', 'Przyszły nadgodziny albo zmiana planów i przestała pasować.'], ['too_much', 'Było za dużo do pilnowania naraz.'], ['no_change', 'Robiłem swoje, ale nie widziałem zmiany.'], ['no_feedback', 'Nie wiedziałem, co poprawić, kiedy coś nie szło.'], ['unknown', 'Trudno mi powiedzieć.']]),
};
const CONSTRAINT: Question = {
  id: 'protect', title: 'Czego nie chcesz poświęcać na zmianę?', hint: 'Co chcesz zachować w swoim tygodniu?',
  job: 'Rozpoznać konflikt między celem a tym, co odbiorca chce zachować.', downstream: 'Zmienia wykonanie zadania: czas rodzinny, spotkania, elastyczność lub odpoczynek.',
  options: options([['family', 'Na czas z bliskimi.'], ['social', 'Na spotkania i wyjścia.'], ['flexible', 'Na elastyczność. Nie ustawię każdego dnia co do godziny.'], ['rest', 'Na odpoczynek. Już mam dużo na głowie.'], ['none', 'Nie mam jednego takiego warunku.']]),
};
const IMPACT: Question = {
  id: 'impact', title: 'Co ta sytuacja zmieniła w dalszej części dnia?', hint: 'Tylko to, co faktycznie zauważyłeś. „Nic wyraźnego” też się liczy.',
  job: 'Ustalić zaobserwowany koszt bez produkowania strat.', downstream: 'Wybiera dodatkowy sygnał obserwacji; mały koszt usuwa presję i obietnicę wielkiej naprawy.',
  options: options([['training', 'Wypadł trening albo ruch, który chciałem zrobić.'], ['food', 'Jedzenie było bardziej przypadkowe, niż chciałem.'], ['work', 'Przeciągałem pracę, bo trudno było się skupić.'], ['home', 'Miałem mniej cierpliwości albo siły dla bliskich.'], ['rest', 'Miałem mniej czasu na odpoczynek.'], ['none', 'Nie widzę wyraźnego kosztu.']]),
};
const WHY: Question = {
  id: 'why', title: 'Z czym tu wpadasz?', hint: 'Dopasuję do tego, co warto sprawdzić. Ciekawość w zupełności wystarczy.',
  job: 'Odróżnić realne WHY NOW od ciekawości.', downstream: 'Zmienia moment uruchomienia zadania i ton zaproszenia; nie wnioskuje chęci zakupu.',
  options: options([['repeat', 'Znowu powtórzyła się ta sama sytuacja.'], ['change', 'Zmieniła się praca albo rytm dnia.'], ['event', 'Mam przed sobą konkretny termin albo wydarzenie.'], ['ready', 'Mam teraz miejsce, żeby się tym zająć.'], ['curious', 'Na razie z ciekawości.']]),
};
function question(id: string, title: string, hint: string, job: string, downstream: string, extra: Partial<Question>): Question {
  return { id, title, hint, job, downstream, ...extra };
}
export function getQuestions(a: Answers): Question[] {
  const q = [WHY, GOAL, SCENE, PREVIOUS];
  if (a.previous && !['none', 'unknown'].includes(String(a.previous))) q.push(ATTEMPT);
  const scene = String(a.scene || '');
  if (BEFORE[scene] && !['works', 'no_change'].includes(String(a.attempt))) {
    q.push(question('before', 'Co działo się wcześniej?', 'Wróć do tej konkretnej sytuacji.', 'Znaleźć wcześniejsze ogniwo.', 'Wybiera konkretną hipotezę i eksperyment lub uczciwą obserwację, gdy brak danych.', { options: options(BEFORE[scene]) }));
    const context = getContextQuestion(scene, String(a.before || ''));
    if (context) q.push(context);
    if (scene === 'training') {
      q.push(question('planned', 'Ile treningów zaplanowałeś na ten tydzień?', 'Chodzi o ostatni zakończony tydzień.', 'Ustalić mianownik wykonania.', 'Ustala górny limit opuszczonych treningów i dokładny fakt w wyniku.', { type: 'number', max: 7 }));
      if (Number(a.planned) > 0) q.push(question('missed', 'Ile z tych treningów się nie odbyło?', 'Krótki trening też liczy się jako wykonany, jeśli tak go zaplanowałeś.', 'Ustalić rzeczywiste wykonanie.', 'Rozróżnia trudny moment od opuszczonego treningu; zero nie staje się porażką.', { type: 'number', max: Number(a.planned) }));
    } else {
      q.push(question('frequency', scene === 'weekend' ? 'Po ilu z ostatnich czterech weekendów było podobnie?' : 'W ilu dniach ostatniego tygodnia było podobnie?', 'Jeśli nie pamiętasz dokładnie, możesz zaznaczyć „Nie pamiętam”.', 'Odróżnić pojedynczy epizod od powtarzalnej sytuacji.', 'Zero lub brak pamięci daje obserwację bez rozpoznania wzorca; liczby pozostają w swoim okresie.', { options: options([...(scene === 'weekend' ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5, 6, 7]).map(n => [String(n), String(n)] as [string, string]), ['unknown', 'Nie pamiętam']]) }));
    }
  }
  if (scene === 'steady') q.push(question('anchor', 'Co najbardziej pomogło Ci utrzymać ten tydzień?', 'Wybierz coś, co faktycznie było obecne.', 'Ustalić warunek udanego tygodnia.', 'Wybiera konkretny warunek do ochrony zamiast wymyślać problem.', { options: options([['space', 'Miałem mniej pracy albo więcej wolnego czasu.'], ['prepared', 'Jedzenie i trening były ustalone wcześniej.'], ['flex', 'Dopasowywałem plan, kiedy dzień się zmieniał.'], ['help', 'Ktoś pomógł mi ogarnąć obowiązki.'], ['unknown', 'Nie wiem. Po prostu poszło dobrze.']]) }));
  q.push(CONSTRAINT);
  if (!['steady', ''].includes(scene)) q.push(IMPACT);
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
    if (id === 'scene') for (const key of ['before', 'context', 'anchor', 'planned', 'missed', 'frequency', 'impact']) delete next[key];
    if (id === 'before') delete next.context;
    if (id === 'previous') delete next.attempt;
    if (id === 'attempt' && a[id] !== value) for (const key of ['before', 'context', 'planned', 'missed', 'frequency']) delete next[key];
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
  insight: Insight;
  certainty: 'observation' | 'hypothesis' | 'maintain';
}
export function buildDecisionResult(input: Answers): DecisionResult {
  const a = cleanAnswers(input);
  const scene = String(a.scene || 'unknown');
  const key = `${scene}:${a.before || 'unknown'}`;
  const candidate = getInsight(a);
  const observation = !BEFORE[scene] || a.before === 'unknown' || a.frequency === '0' || a.frequency === 'unknown'
    || !candidate || (scene === 'training' && (a.planned === 0 || a.missed === 0));
  const maintain = a.attempt === 'works' || (scene === 'steady' && a.attempt !== 'no_change');
  const review = !maintain && a.attempt === 'no_change';
  const target = GOAL_METRIC[String(a.goal)] || GOAL_METRIC.other;
  let insight: Insight = candidate || getObservation(a);
  if (maintain) insight = getMaintenance(a);
  else if (review) insight = {
    title: 'Wykonanie było. Brakuje jeszcze sposobu porównania efektu.',
    explanation: `Wskazałeś: „${answerLabel(a, 'previous')}” oraz brak zauważonej zmiany. Nie podałeś czasu trwania ani tego, jak porównywałeś efekt. Nowa rada pominęłaby właśnie tę niewiadomą.`,
    trap: 'Zmiana planu w tym momencie skasuje punkt odniesienia. Najpierw odtwórz ostatnią próbę.',
    action: `Przy ostatniej próbie zapisz trzy rzeczy: jak długo trwała, co faktycznie wykonywałeś i po czym oceniałeś efekt. Do tego dołącz wybraną tutaj scenę: „${answerLabel(a, 'scene')}”.`,
    observe: 'Czy oceniałeś ten sam efekt, w porównywalnych warunkach? Czy plan dało się wykonać także w dniu z opisanej sceny?',
    yes: 'Jeśli masz porównywalny zapis, można oceniać samą próbę i dobrać korektę do celu.',
    no: 'Jeśli zapisu brakuje, zbierz go przy obecnym planie. Nie ma jeszcze podstaw, żeby przypisywać brak efektu metodzie.',
  };
  else if (observation) insight = getObservation(a);
  const title = insight.title;
  let hypothesis = insight.explanation;
  if (!maintain && !review && !observation && (a.frequency === '1' || a.missed === 1)) hypothesis += ' To pojedynczy przypadek w podanym okresie, nie opis każdego Twojego tygodnia.';
  const experiment: Experiment = {
    id: maintain ? 'maintain' : review ? 'review' : observation ? 'observe' : `${key}${a.context ? ':' + a.context : ''}`,
    title: insight.actionTitle || (maintain ? 'Zachowaj warunek, który pomógł.' : review ? 'Odtwórz ostatnią próbę.' : 'Sprawdź to przy kolejnej podobnej okazji.'),
    action: insight.action, observe: insight.observe,
    when: review ? 'Zacznij od zapisu ostatniej próby.' : scene === 'weekend' ? 'Przy najbliższym weekendzie i powrocie do tygodnia.' : a.why === 'curious' ? 'Gdy pojawi się podobna sytuacja i zechcesz się jej przyjrzeć.' : 'Przy najbliższej podobnej sytuacji. Porównuj dni o zbliżonym obciążeniu.',
  };
  const evidence = getQuestions(a).filter(q => a[q.id] !== undefined).map(q => ({ id: q.id, label: q.title, value: answerLabel(a, q.id) }));
  return {
    title, hypothesis, evidence, experiment, insight, goalMetric: target,
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
  return ['DIAGNOSTYKA 168', r.title, '', r.hypothesis, '', r.insight.trap, '', 'TWÓJ PIERWSZY KROK', r.experiment.action, r.experiment.when, 'Zapisz: ' + r.experiment.observe, '', 'JEŚLI SIĘ UDA: ' + r.insight.yes, 'JEŚLI NIE: ' + r.insight.no, '', r.constraint, r.goalMetric, r.impact, r.previous, r.timing, '', 'TWOJE ODPOWIEDZI', ...r.evidence.map(e => `${e.label}\n${e.value}`), '', 'Wynik opiera się na Twoich odpowiedziach. Nie rozstrzyga przyczyn dolegliwości.', 'Prowadzenie: https://nabor.talerzihantle.com/'].filter(Boolean).join('\n\n');
}
