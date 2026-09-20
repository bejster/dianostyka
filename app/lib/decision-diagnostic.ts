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
  id: 'goal', title: 'Co najbardziej chcesz ogarnąć w swoim tygodniu?', hint: 'Wybierz jedną rzecz, na której teraz najbardziej Ci zależy.',
  job: 'Ustalić wynik, na którym zależy odbiorcy.', downstream: 'Wybiera kryterium obserwacji i kierunek przy braku sceny.',
  options: options([['form', 'Sylwetkę i trening.'], ['energy', 'Siłę na coś jeszcze po pracy.'], ['sleep', 'Wstawanie bez ciągłego zmęczenia.'], ['head', 'Wolną głowę po pracy.'], ['other', 'Jeszcze nie umiem wybrać jednej rzeczy.']]),
};
const SCENE: Question = {
  id: 'scene', title: 'Która z tych sytuacji wydarzyła się u Ciebie w ostatnim tygodniu?', hint: 'Wybierz jeden konkretny przykład.',
  job: 'Zakotwiczyć wynik w zaobserwowanej scenie.', downstream: 'Wybiera pytanie o wcześniejsze ogniwo i rodzinę eksperymentu; dopuszcza brak problemu.',
  options: options([['training', 'Miał być trening, ale trudno było mi go zrobić.'], ['food', 'Wieczorem zjadłem więcej, niż chciałem.'], ['sleep', 'Zasnąłem później, niż chciałem.'], ['energy', 'Trudno mi było skupić się na pracy.'], ['weekend', 'Po weekendzie długo wracałem do swojego rytmu.'], ['steady', 'Tydzień poszedł w porządku.'], ['unknown', 'Nie przypominam sobie konkretnej sytuacji.']]),
};
const BEFORE: Record<string, [string, string][]> = {
  training: [['work', 'Praca zajęła mi czas na trening.'], ['family', 'Wypadła sprawa rodzinna albo opieka nad kimś.'], ['no_short', 'Na cały trening nie było czasu. Krótszej wersji nie miałem.'], ['tired', 'Już wcześniej byłem zmęczony.'], ['unknown', 'Nie wiem albo było to coś innego.']],
  food: [['meal', 'Wcześniejszy posiłek wypadł albo mocno się przesunął.'], ['no_food', 'Skończyłem pracę i nie miałem przygotowanego jedzenia.'], ['tension', 'Po napiętym dniu odpoczywałem przy jedzeniu.'], ['social', 'Byłem z ludźmi i jedzenie było częścią spotkania.'], ['unknown', 'Nie wiem albo było to coś innego.']],
  sleep: [['work', 'Dokańczałem pracę.'], ['screen', 'Zostałem przy telefonie albo serialu.'], ['family', 'Miałem obowiązki w domu albo przy dziecku.'], ['thoughts', 'Położyłem się, ale długo myślałem o sprawach z dnia.'], ['unknown', 'Nie wiem albo było to coś innego.']],
  energy: [['short_sleep', 'Spałem krócej, niż planowałem.'], ['meal', 'Przesunąłem posiłek, bo nie było kiedy zjeść.'], ['no_break', 'Pracowałem długo bez przerwy.'], ['many_tasks', 'Co chwilę przeskakiwałem między sprawami.'], ['unknown', 'Nie wiem albo było to coś innego.']],
  weekend: [['late', 'Przesunęły mi się godziny snu i pobudki.'], ['no_return', 'Nie miałem ustalone, od czego wracam do swojego rytmu.'], ['compensate', 'Jadłem mniej albo trenowałem więcej, żeby nadrobić.'], ['work', 'Jeszcze w weekend nadrabiałem pracę.'], ['unknown', 'Nie wiem albo było to coś innego.']],
};
const PREVIOUS: Question = {
  id: 'previous', title: 'Co już próbowałeś z tym zrobić?', hint: 'Wybierz ostatnią rzecz, którą faktycznie sprawdzałeś.',
  job: 'Poznać previous attempts bez liczenia porażek.', downstream: 'Uruchamia pytanie o wynik próby; chroni przed powtórzeniem niedopasowanej rady.',
  options: options([['plan', 'Zacząłem nowy plan treningu albo jedzenia.'], ['calendar', 'Rozpisałem godziny i próbowałem się ich trzymać.'], ['small', 'Wybrałem jedną mniejszą zmianę.'], ['support', 'Korzystałem z czyjejś pomocy.'], ['none', 'Jeszcze nic konkretnego.'], ['unknown', 'Nie pamiętam jednej konkretnej próby.']]),
};
const ATTEMPT: Question = {
  id: 'attempt', title: 'I co się stało po tej próbie?', hint: 'Pomyśl o tej jednej próbie, nie o całej historii.',
  job: 'Ustalić, co zachować lub zmienić po poprzedniej próbie.', downstream: 'Działającą próbę zachowuje; brak efektu kieruje do obserwacji; brak korekty do przeglądu wykonania.',
  options: options([['works', 'Działa do dziś.'], ['schedule', 'Po zmianie godzin pracy albo planów trudno było to utrzymać.'], ['too_much', 'Było za dużo do pilnowania naraz.'], ['no_change', 'Robiłem to, ale nie widziałem efektu.'], ['no_feedback', 'Nie wiedziałem, co poprawić, kiedy coś nie szło.'], ['unknown', 'Trudno mi powiedzieć.']]),
};
const CONSTRAINT: Question = {
  id: 'protect', title: 'Czego nie chcesz poświęcić, żeby to ogarnąć?', hint: 'Ten wybór zmieni krok, który dostaniesz.',
  job: 'Rozpoznać konflikt między celem a tym, co odbiorca chce zachować.', downstream: 'Zmienia wykonanie zadania: czas rodzinny, spotkania, elastyczność lub odpoczynek.',
  options: options([['family', 'Na czas z bliskimi.'], ['social', 'Na spotkania i wyjścia.'], ['flexible', 'Na swobodę. Każdy dzień wygląda u mnie inaczej.'], ['rest', 'Na odpoczynek. Już mam dużo na głowie.'], ['none', 'Nie mam jednego takiego warunku.']]),
};
const IMPACT: Question = {
  id: 'impact', title: 'Co ta sytuacja zabrała Ci później?', hint: 'Zaznacz tylko to, co faktycznie zauważyłeś.',
  job: 'Ustalić zaobserwowany koszt bez produkowania strat.', downstream: 'Wybiera dodatkowy sygnał obserwacji; mały koszt usuwa presję i obietnicę wielkiej naprawy.',
  options: options([['training', 'Wypadł trening albo ruch, który chciałem zrobić.'], ['food', 'Jadłem bardziej przypadkowo, niż chciałem.'], ['work', 'Przeciągałem pracę, bo trudno było się skupić.'], ['home', 'Miałem mniej cierpliwości albo siły dla bliskich.'], ['rest', 'Miałem mniej czasu na odpoczynek.'], ['none', 'Nic wyraźnego.']]),
};
const WHY: Question = {
  id: 'why', title: 'Dlaczego sprawdzasz to akurat teraz?', hint: 'Wybierz powód najbliższy temu, co dzieje się u Ciebie.',
  job: 'Odróżnić realne WHY NOW od ciekawości.', downstream: 'Zmienia moment uruchomienia zadania i ton zaproszenia; nie wnioskuje chęci zakupu.',
  options: options([['repeat', 'Znowu powtórzyła się ta sama sytuacja.'], ['change', 'Zmieniła się praca albo rytm dnia.'], ['event', 'Mam przed sobą konkretny termin albo wydarzenie.'], ['ready', 'Mam teraz czas, żeby się tym zająć.'], ['curious', 'Na razie z ciekawości.']]),
};
function question(id: string, title: string, hint: string, job: string, downstream: string, extra: Partial<Question>): Question {
  return { id, title, hint, job, downstream, ...extra };
}
export function getQuestions(a: Answers): Question[] {
  const q = [WHY, GOAL, SCENE, PREVIOUS];
  if (a.previous && !['none', 'unknown'].includes(String(a.previous))) q.push(ATTEMPT);
  const scene = String(a.scene || '');
  if (BEFORE[scene] && !['works', 'no_change'].includes(String(a.attempt))) {
    q.push(question('before', 'Co wydarzyło się wcześniej tego dnia?', 'Wróć do ostatniej takiej sytuacji.', 'Znaleźć wcześniejsze ogniwo.', 'Wybiera konkretną hipotezę i eksperyment lub uczciwą obserwację, gdy brak danych.', { options: options(BEFORE[scene]) }));
    const context = getContextQuestion(scene, String(a.before || ''));
    if (context) q.push(context);
    if (scene === 'training') {
      q.push(question('planned', 'Ile treningów planowałeś w ostatnim tygodniu?', 'Policz ostatnie siedem dni.', 'Ustalić mianownik wykonania.', 'Ustala górny limit opuszczonych treningów i dokładny fakt w wyniku.', { type: 'number', max: 7 }));
      if (Number(a.planned) > 0) q.push(question('missed', 'Ile z tych treningów się nie odbyło?', 'Jeśli zrobiłeś zaplanowaną krótszą wersję, trening się liczy.', 'Ustalić rzeczywiste wykonanie.', 'Rozróżnia trudny moment od opuszczonego treningu; zero nie staje się porażką.', { type: 'number', max: Number(a.planned) }));
    } else {
      q.push(question('frequency', scene === 'weekend' ? 'Po ilu z ostatnich czterech weekendów było podobnie?' : 'W ilu dniach ostatniego tygodnia było podobnie?', 'Nie musisz zgadywać.', 'Odróżnić pojedynczy epizod od powtarzalnej sytuacji.', 'Zero lub brak pamięci daje obserwację bez rozpoznania wzorca; liczby pozostają w swoim okresie.', { options: options([...(scene === 'weekend' ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5, 6, 7]).map(n => [String(n), String(n)] as [string, string]), ['unknown', 'Nie pamiętam']]) }));
    }
  }
  if (scene === 'steady') q.push(question('anchor', 'Co było inne w tygodniu, który poszedł dobrze?', 'Wybierz rzecz, która faktycznie miała miejsce.', 'Ustalić warunek udanego tygodnia.', 'Wybiera konkretny warunek do ochrony zamiast wymyślać problem.', { options: options([['space', 'Miałem mniej pracy albo więcej wolnego czasu.'], ['prepared', 'Jedzenie i trening były ustalone wcześniej.'], ['flex', 'Dopasowywałem plan, kiedy dzień się zmieniał.'], ['help', 'Ktoś pomógł mi ogarnąć obowiązki.'], ['unknown', 'Nie wiem. Po prostu poszło dobrze.']]) }));
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
  form: 'Po tej próbie patrz najpierw na wykonanie planu. Kilka dni nie mówi jeszcze nic pewnego o zmianie sylwetki.',
  energy: 'Porównaj podobne dni i zobacz, ile siły zostaje Ci po pracy.',
  sleep: 'Zapisz porę położenia się oraz to, jak czułeś się rano.',
  head: 'Po pracy sprawdź, czy te same sprawy nadal wracają Ci do głowy.',
  other: 'Zapisz jedną rzecz, która po próbie wyglądała inaczej.',
};
const CONSTRAINT_ACTION: Record<string, string> = {
  family: 'Czas z bliskimi zostaje. Sprawdź ten krok przy okazji, która się z nim nie zderza.',
  social: 'Nie ruszaj zaplanowanych spotkań. Sprawdź ten krok w zwykłym dniu poza nimi.',
  flexible: 'Nie przywiązuj kroku do sztywnej godziny. Podepnij go pod moment dnia, który faktycznie się powtarza.',
  rest: 'Nie zabieraj na tę próbę czasu na odpoczynek. Jeśli się z nim zderza, wybierz inną okazję.',
  none: 'Wybierz najbliższą okazję, przy której da się to sprawdzić.',
};
const IMPACT_METRIC: Record<string, string> = {
  training: 'Po próbie zobacz też, czy odbył się zaplanowany trening albo ruch.', food: 'Zobacz też, czy wieczorne jedzenie wyglądało tak, jak chciałeś.',
  work: 'Sprawdź też, czy praca skończyła się bliżej planowanej pory.', home: 'Zauważ też, ile siły i cierpliwości zostało Ci dla bliskich.',
  rest: 'Sprawdź też, czy został Ci czas na odpoczynek.', none: 'Nie zauważyłeś wyraźnego kosztu. Jeśli nic Ci to nie zabiera, nie ma sensu na siłę szukać problemu.',
};
const ATTEMPT_LESSON: Record<string, string> = {
  works: 'Skoro działa, nie dokładaj kolejnej zmiany. Zapisz, co pozwala Ci ten sposób utrzymać.',
  schedule: 'Poprzednia próba rozsypała się po zmianie planu. Sprawdź, co zrobisz z tym krokiem, gdy dzień znowu się przesunie.',
  too_much: 'Ostatnio było za dużo do pilnowania. Tym razem testujesz jedną rzecz.',
  no_change: 'Robiłeś to bez widocznego efektu. Do oceny brakuje jeszcze czasu trwania próby i zapisu tego, co robiłeś.',
  no_feedback: 'Gdy coś nie szło, nie wiedziałeś, co poprawić. Po tej próbie wróć do wyniku i oceń dokładnie ten jeden krok.',
  unknown: 'Tym razem zapisz, co pomogło zrobić krok albo co go zatrzymało.',
};
const WHY_COPY: Record<string, string> = {
  repeat: 'Sprawdź krok przy następnej sytuacji, która wygląda podobnie.',
  change: 'Wybierz okazję pasującą do obecnych godzin pracy i obowiązków.',
  event: 'Masz konkretny termin. Ta próba pokaże, co da się wykonać do tego czasu, ale nie przewidzi efektu.',
  ready: 'Wybierz pierwszą pasującą okazję w najbliższych 3 dniach.',
  curious: 'Zachowaj wynik. Możesz wrócić, kiedy pojawi się sytuacja, którą chcesz sprawdzić.',
};
const PREVIOUS_ADAPTATION: Record<string, string> = {
  plan: 'Wykorzystaj znane elementy poprzedniego planu, żeby móc porównać wykonanie.',
  calendar: 'Jeśli godziny znów się przesuną, sprawdź, po której czynności możesz zrobić ten krok.',
  small: 'Już zmniejszałeś zakres. Sprawdź także, czego potrzebujesz, żeby go wykonać.',
  support: 'Porównaj ten krok z wcześniejszymi ustaleniami. Czy dotyczą tej samej sytuacji?',
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
    title: 'Próbowałeś, ale nie zobaczyłeś różnicy.',
    explanation: `Wybrałeś: „${answerLabel(a, 'previous')}”. Zanim zmienisz kolejną rzecz, trzeba wiedzieć, jak długo trwała próba i po czym oceniałeś efekt.`,
    trap: 'Bez tego łatwo odrzucić sposób, którego nie da się jeszcze uczciwie ocenić.',
    action: `Zapisz, jak długo próbowałeś, co robiłeś i po czym oceniałeś efekt. Uwzględnij też opisaną sytuację: „${answerLabel(a, 'scene')}”.`,
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
    title: insight.actionTitle || (maintain ? 'Sprawdź, co pomaga Ci to utrzymać.' : review ? 'Wróć do ostatniej próby.' : 'Przy następnej okazji'),
    action: insight.action, observe: insight.observe,
    when: review ? 'Zacznij od zapisu ostatniej próby.' : scene === 'weekend' ? 'Przy najbliższym weekendzie i powrocie do tygodnia.' : a.why === 'curious' ? 'Gdy pojawi się podobna sytuacja i zechcesz się jej przyjrzeć.' : 'Przy najbliższej podobnej sytuacji. Porównuj dni o zbliżonym obciążeniu.',
  };
  const evidence = getQuestions(a).filter(q => a[q.id] !== undefined).map(q => ({ id: q.id, label: q.title, value: answerLabel(a, q.id) }));
  return {
    title, hypothesis, evidence, experiment, insight, goalMetric: target,
    constraint: CONSTRAINT_ACTION[String(a.protect)] || '', impact: IMPACT_METRIC[String(a.impact)] || '',
    previous: a.previous === 'none' ? 'Zaznaczyłeś, że jeszcze tego nie próbowałeś. Zacznij od tego jednego kroku.' : a.previous === 'unknown' ? 'Zapisz tę próbę, żeby następnym razem mieć porównanie.' : [ATTEMPT_LESSON[String(a.attempt)], a.attempt !== 'works' ? PREVIOUS_ADAPTATION[String(a.previous)] : 'Porównuj z tym, co już Ci pomaga.'].filter(Boolean).join(' '),
    timing: WHY_COPY[String(a.why)] || '', certainty: maintain ? 'maintain' : experiment.id === 'observe' || experiment.id === 'review' ? 'observation' : 'hypothesis',
  };
}

export const FIT_OPTIONS = options([['self', 'Na razie sprawdzę ten krok sam.'], ['coaching', 'Chcę pomocy w wyborze kolejnych kroków i korekt po drodze.'], ['plan', 'Szukam głównie gotowej rozpiski.'], ['medical', 'Szukam diagnozy lub leczenia dolegliwości.']]);
export const OBJECTION_OPTIONS = options([['process', 'Jak wygląda praca tydzień po tygodniu?'], ['repeat', 'Boję się, że zapłacę i znowu odpuszczę.'], ['time', 'Nie wiem, ile czasu wymaga to ode mnie.'], ['price', 'Chcę znać pełny koszt.'], ['none', 'Chcę zobaczyć szczegóły.']]);
export function invitation(fit: string, objection: string, why: string, reaction = ''): { text: string; cta: string; showNabor: boolean } {
  if (fit === 'medical') return { text: 'Diagnozę i leczenie dolegliwości omów z lekarzem. Ten quiz pomaga przyjrzeć się codziennym sytuacjom, ale nie zastępuje konsultacji.', cta: '', showNabor: false };
  if (['off', 'obvious'].includes(reaction) && (!fit || fit === 'self')) return { text: 'Najpierw doprecyzuj wynik. Nie ma sensu iść dalej na podstawie opisu, który nie pasuje do Twojej sytuacji.', cta: '', showNabor: false };
  if (fit === 'self') return { text: 'Zachowaj wynik i sprawdź krok. Po próbie wróć tu z tym, co faktycznie się wydarzyło.', cta: '', showNabor: false };
  if (fit === 'plan') return { text: 'Jeśli szukasz samej rozpiski, najpierw zobacz zakres. Prowadzenie obejmuje plan oraz pracę na tym, co właśnie wyszło z Twojego tygodnia.', cta: 'Sprawdź zakres', showNabor: true };
  const copy: Record<string, string> = {
    process: 'Na stronie zobaczysz, co ustalamy na starcie, jak wygląda kontakt i co robimy, kiedy tydzień idzie inaczej niż plan.',
    repeat: 'Sprawdź przede wszystkim, co dzieje się po słabszym tygodniu. To powie Ci więcej niż opis tygodnia, w którym wszystko poszło zgodnie z planem.',
    time: 'Zobacz, co jest po Twojej stronie w zwykłym tygodniu i sam oceń, czy ten zakres Ci pasuje.',
    price: 'Pełny koszt i zakres są na stronie przed zgłoszeniem.',
    none: 'Zobacz, jak wygląda prowadzenie od pierwszego tygodnia po korekty po drodze.',
  };
  return { text: copy[objection] || (why === 'curious' ? 'Możesz najpierw sprawdzić ten krok sam. Jeśli chcesz zobaczyć, jak wygląda praca ze mną, szczegóły są tutaj.' : 'To, co zrobiłeś tutaj raz, w prowadzeniu robimy dalej po każdej próbie: patrzymy, co zadziałało, gdzie tydzień się rozjechał i wybieramy następną korektę.'), cta: objection === 'price' ? 'Sprawdź zakres i koszt' : 'Zobacz prowadzenie', showNabor: true };
}
export function resultAsText(a: Answers): string {
  const r = buildDecisionResult(a);
  return ['DIAGNOSTYKA 168', r.title, '', r.hypothesis, '', r.insight.trap, '', 'TWÓJ PIERWSZY KROK', r.experiment.action, r.experiment.when, 'Zapisz: ' + r.experiment.observe, '', 'JEŚLI SIĘ UDA: ' + r.insight.yes, 'JEŚLI NIE: ' + r.insight.no, '', r.constraint, r.goalMetric, r.impact, r.previous, r.timing, '', 'TWOJE ODPOWIEDZI', ...r.evidence.map(e => `${e.label}\n${e.value}`), '', 'Wynik opiera się na Twoich odpowiedziach. Nie rozstrzyga przyczyn dolegliwości.', 'Prowadzenie: https://nabor.talerzihantle.com/'].filter(Boolean).join('\n\n');
}
