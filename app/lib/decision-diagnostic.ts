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
  id: 'goal', title: 'Co najbardziej chciałbyś mieć ogarnięte?', hint: 'Wybierz to, co jest teraz dla Ciebie ważne.',
  job: 'Ustalić wynik, na którym zależy odbiorcy.', downstream: 'Wybiera kryterium obserwacji i kierunek przy braku sceny.',
  options: options([['form', 'Sylwetkę i trening.'], ['energy', 'Siłę na coś jeszcze po pracy.'], ['sleep', 'Wstawanie bez ciągłego zmęczenia.'], ['head', 'Wolną głowę po pracy.'], ['other', 'Jeszcze nie umiem wybrać jednej rzeczy.']]),
};
const SCENE: Question = {
  id: 'scene', title: 'Co z tego zdarzyło Ci się w ostatnim tygodniu?', hint: 'Wybierz jedną sytuację, której chcesz się przyjrzeć.',
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
  id: 'previous', title: 'Próbowałeś już coś z tym zrobić?', hint: 'Wybierz ostatnią próbę dotyczącą tej sytuacji.',
  job: 'Poznać previous attempts bez liczenia porażek.', downstream: 'Uruchamia pytanie o wynik próby; chroni przed powtórzeniem niedopasowanej rady.',
  options: options([['plan', 'Zacząłem nowy plan treningu albo jedzenia.'], ['calendar', 'Rozpisałem godziny i próbowałem się ich trzymać.'], ['small', 'Wybrałem jedną mniejszą zmianę.'], ['support', 'Korzystałem z czyjejś pomocy.'], ['none', 'Jeszcze nic konkretnego.'], ['unknown', 'Nie pamiętam jednej konkretnej próby.']]),
};
const ATTEMPT: Question = {
  id: 'attempt', title: 'Jak Ci z tym poszło?', hint: 'Pomyśl o tej konkretnej próbie.',
  job: 'Ustalić, co zachować lub zmienić po poprzedniej próbie.', downstream: 'Działającą próbę zachowuje; brak efektu kieruje do obserwacji; brak korekty do przeglądu wykonania.',
  options: options([['works', 'Działa do dziś.'], ['schedule', 'Po zmianie godzin pracy albo planów trudno było to utrzymać.'], ['too_much', 'Było za dużo do pilnowania naraz.'], ['no_change', 'Robiłem to, ale nie widziałem efektu.'], ['no_feedback', 'Nie wiedziałem, co poprawić, kiedy coś nie szło.'], ['unknown', 'Trudno mi powiedzieć.']]),
};
const CONSTRAINT: Question = {
  id: 'protect', title: 'Na co nadal chcesz mieć miejsce?', hint: 'Uwzględnię to przy proponowanym kroku.',
  job: 'Rozpoznać konflikt między celem a tym, co odbiorca chce zachować.', downstream: 'Zmienia wykonanie zadania: czas rodzinny, spotkania, elastyczność lub odpoczynek.',
  options: options([['family', 'Na czas z bliskimi.'], ['social', 'Na spotkania i wyjścia.'], ['flexible', 'Na swobodę. Każdy dzień wygląda u mnie inaczej.'], ['rest', 'Na odpoczynek. Już mam dużo na głowie.'], ['none', 'Nie mam jednego takiego warunku.']]),
};
const IMPACT: Question = {
  id: 'impact', title: 'Co odczułeś później?', hint: 'Zaznacz to, co zauważyłeś po tej sytuacji.',
  job: 'Ustalić zaobserwowany koszt bez produkowania strat.', downstream: 'Wybiera dodatkowy sygnał obserwacji; mały koszt usuwa presję i obietnicę wielkiej naprawy.',
  options: options([['training', 'Wypadł trening albo ruch, który chciałem zrobić.'], ['food', 'Jadłem bardziej przypadkowo, niż chciałem.'], ['work', 'Przeciągałem pracę, bo trudno było się skupić.'], ['home', 'Miałem mniej cierpliwości albo siły dla bliskich.'], ['rest', 'Miałem mniej czasu na odpoczynek.'], ['none', 'Nic wyraźnego.']]),
};
const WHY: Question = {
  id: 'why', title: 'Z czym tu wpadasz?', hint: 'Co sprawiło, że sprawdzasz to właśnie teraz?',
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
    q.push(question('before', 'Co działo się przed tą sytuacją?', 'Pomyśl o ostatnim takim dniu.', 'Znaleźć wcześniejsze ogniwo.', 'Wybiera konkretną hipotezę i eksperyment lub uczciwą obserwację, gdy brak danych.', { options: options(BEFORE[scene]) }));
    const context = getContextQuestion(scene, String(a.before || ''));
    if (context) q.push(context);
    if (scene === 'training') {
      q.push(question('planned', 'Ile treningów planowałeś w ostatnim tygodniu?', 'Policz ostatnie siedem dni.', 'Ustalić mianownik wykonania.', 'Ustala górny limit opuszczonych treningów i dokładny fakt w wyniku.', { type: 'number', max: 7 }));
      if (Number(a.planned) > 0) q.push(question('missed', 'Ile z tych treningów się nie odbyło?', 'Jeśli zrobiłeś zaplanowaną krótszą wersję, trening się liczy.', 'Ustalić rzeczywiste wykonanie.', 'Rozróżnia trudny moment od opuszczonego treningu; zero nie staje się porażką.', { type: 'number', max: Number(a.planned) }));
    } else {
      q.push(question('frequency', scene === 'weekend' ? 'Po ilu z ostatnich czterech weekendów było podobnie?' : 'W ilu dniach ostatniego tygodnia było podobnie?', 'Nie musisz zgadywać.', 'Odróżnić pojedynczy epizod od powtarzalnej sytuacji.', 'Zero lub brak pamięci daje obserwację bez rozpoznania wzorca; liczby pozostają w swoim okresie.', { options: options([...(scene === 'weekend' ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5, 6, 7]).map(n => [String(n), String(n)] as [string, string]), ['unknown', 'Nie pamiętam']]) }));
    }
  }
  if (scene === 'steady') q.push(question('anchor', 'Co pomogło, że ten tydzień poszedł dobrze?', 'Co z tego miało miejsce?', 'Ustalić warunek udanego tygodnia.', 'Wybiera konkretny warunek do ochrony zamiast wymyślać problem.', { options: options([['space', 'Miałem mniej pracy albo więcej wolnego czasu.'], ['prepared', 'Jedzenie i trening były ustalone wcześniej.'], ['flex', 'Dopasowywałem plan, kiedy dzień się zmieniał.'], ['help', 'Ktoś pomógł mi ogarnąć obowiązki.'], ['unknown', 'Nie wiem. Po prostu poszło dobrze.']]) }));
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
  form: 'Sprawdzasz teraz, czy udało się zrobić to, co zaplanowałeś. Kilka dni nie wystarczy do oceny zmiany sylwetki.',
  energy: 'Zauważ, ile siły zostało Ci po pracy. Porównaj podobne dni.',
  sleep: 'Zapisz, kiedy się położyłeś i jak czułeś się rano.',
  head: 'Sprawdź, czy po pracy nadal wracałeś myślami do zadań.',
  other: 'Zapisz jedną zmianę, którą zauważyłeś po próbie.',
};
const CONSTRAINT_ACTION: Record<string, string> = {
  family: 'Zostaw czas z bliskimi. Jeśli ten krok się z nim zderza, wybierz inną okazję.',
  social: 'Zachowaj zaplanowane spotkania. Sprawdź ten krok przy najbliższej okazji poza nimi.',
  flexible: 'Wybierz moment w przebiegu dnia, na przykład po pracy, jeśli pasuje do tego kroku.',
  rest: 'Zostaw czas na odpoczynek. Jeśli ten krok go zabiera, poszukaj innej okazji.',
  none: 'Wybierz najbliższą okazję, przy której możesz to sprawdzić.',
};
const IMPACT_METRIC: Record<string, string> = {
  training: 'Sprawdź też, czy odbył się zaplanowany trening lub ruch.', food: 'Sprawdź też, czy jadłeś tak, jak zamierzałeś.',
  work: 'Sprawdź też, czy udało się skończyć pracę o planowanej porze.', home: 'Zauważ też, ile siły zostało Ci dla bliskich.',
  rest: 'Zobacz też, czy został czas na odpoczynek.', none: 'Nie zauważyłeś wyraźnego kosztu. Sam oceń, czy chcesz coś zmieniać.',
};
const ATTEMPT_LESSON: Record<string, string> = {
  works: 'Skoro to działa, zapisz, co pomaga Ci to utrzymać.',
  schedule: 'Poprzednio przeszkodziła zmiana planów. Sprawdź też, co zrobisz z tym krokiem, jeśli dzień się przesunie.',
  too_much: 'Poprzednio było za dużo do pilnowania. Tym razem zostań przy jednej zmianie.',
  no_change: 'Nie widziałeś efektu. Do oceny przyda się czas trwania próby i zapis tego, co robiłeś.',
  no_feedback: 'Poprzednio brakowało Ci pomysłu, co poprawić. Po próbie zajrzyj do dalszych kroków pod wynikiem.',
  unknown: 'Tym razem zapisz, co pomogło zrobić ten krok albo go zatrzymało.',
};
const WHY_COPY: Record<string, string> = {
  repeat: 'Sprawdź ten krok, gdy znów pojawi się sytuacja, przez którą tu wróciłeś.',
  change: 'Wybierz okazję pasującą do obecnych godzin pracy i obowiązków.',
  event: 'Masz konkretny termin. Ta próba pokaże, co możesz wykonać. Nie przewiduje efektu na ten dzień.',
  ready: 'Wybierz pierwszą okazję w najbliższych trzech dniach.',
  curious: 'Możesz zachować wynik i wrócić, gdy zechcesz to sprawdzić.',
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
    title: 'Robiłeś to, ale nie widziałeś efektu.',
    explanation: `Wskazałeś: „${answerLabel(a, 'previous')}”. Do oceny braku efektu potrzebny jest jeszcze czas trwania próby i sposób porównania wyników.`,
    trap: 'Przed kolejną zmianą warto wiedzieć, co dokładnie sprawdziłeś.',
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

export const FIT_OPTIONS = options([['self', 'Na razie sprawdzę to sam.'], ['coaching', 'Chcę pomocy w tym, co robić i co później poprawiać.'], ['plan', 'Szukam głównie gotowego planu.'], ['medical', 'Szukam diagnozy lub leczenia dolegliwości.']]);
export const OBJECTION_OPTIONS = options([['process', 'Jak konkretnie wygląda prowadzenie?'], ['repeat', 'Boję się, że zapłacę i znowu odpuszczę.'], ['time', 'Nie wiem, czy znajdę na to czas.'], ['price', 'Ile kosztuje całość?'], ['none', 'Chcę już zobaczyć szczegóły.']]);
export function invitation(fit: string, objection: string, why: string, reaction = ''): { text: string; cta: string; showNabor: boolean } {
  if (fit === 'medical') return { text: 'Diagnozę i leczenie dolegliwości omów z lekarzem. Ten quiz pomaga przyjrzeć się codziennym sytuacjom, ale nie zastępuje konsultacji.', cta: '', showNabor: false };
  if (['off', 'obvious'].includes(reaction) && (!fit || fit === 'self')) return { text: 'Najpierw wróć do odpowiedzi, która wymaga doprecyzowania. Jeśli chcesz przyjrzeć się temu ze mną, możesz sprawdzić, jak wygląda prowadzenie.', cta: 'Zobacz prowadzenie', showNabor: true };
  if (fit === 'self') return { text: 'Zachowaj wynik. Możesz tu wrócić po próbie i zapisać, co wyszło.', cta: '', showNabor: false };
  if (fit === 'plan') return { text: 'Plan jest częścią mojego prowadzenia. Wracamy do tego, co zrobiłeś i co wymaga zmiany. Sprawdź zakres, jeśli zależy Ci głównie na samej rozpisce.', cta: 'Sprawdź zakres', showNabor: true };
  const copy: Record<string, string> = {
    process: 'Zobacz, co robisz Ty, co sprawdzam ja i jak ustalamy dalsze kroki.',
    repeat: 'Sprawdź, jak wygląda prowadzenie również wtedy, gdy coś Ci nie wyjdzie. Warto wiedzieć to przed decyzją.',
    time: 'Przyjrzyj się temu, co trzeba robić po Twojej stronie. Oceń, czy zmieści się to w Twoim tygodniu.',
    price: 'Sprawdź pełny koszt i zakres prowadzenia przed zgłoszeniem.',
    none: 'Zobacz, jak pracujemy i co obejmuje prowadzenie.',
  };
  return { text: copy[objection] || (why === 'curious' ? 'Możesz sprawdzić ten krok sam. Jeśli chcesz zobaczyć, jak pracuję z podopiecznymi, tutaj znajdziesz szczegóły.' : 'W prowadzeniu wracamy do tego, co wyszło z próby i wybieramy dalszy krok. Jeśli chcesz tak pracować ze mną, zobacz szczegóły.'), cta: objection === 'price' ? 'Sprawdź zakres i koszt' : 'Zobacz prowadzenie', showNabor: true };
}
export function resultAsText(a: Answers): string {
  const r = buildDecisionResult(a);
  return ['DIAGNOSTYKA 168', r.title, '', r.hypothesis, '', r.insight.trap, '', 'TWÓJ PIERWSZY KROK', r.experiment.action, r.experiment.when, 'Zapisz: ' + r.experiment.observe, '', 'JEŚLI SIĘ UDA: ' + r.insight.yes, 'JEŚLI NIE: ' + r.insight.no, '', r.constraint, r.goalMetric, r.impact, r.previous, r.timing, '', 'TWOJE ODPOWIEDZI', ...r.evidence.map(e => `${e.label}\n${e.value}`), '', 'Wynik opiera się na Twoich odpowiedziach. Nie rozstrzyga przyczyn dolegliwości.', 'Prowadzenie: https://nabor.talerzihantle.com/'].filter(Boolean).join('\n\n');
}
