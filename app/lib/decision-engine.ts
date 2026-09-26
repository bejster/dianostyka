// decision-engine.ts: warstwa decyzyjna nad istniejacym silnikiem (flagship 3.0).
// Nic tu nie liczy od nowa. Bierze wybrany eksperyment, jego confidence i dwie nowe odpowiedzi
// (prediction = co czlowiek obstawia, good_day = czym roznil sie jego najlepszy dzien) i sklada
// jeden typowany obiekt wyniku. Zero LLM, zero PII, zero szacowania hormonow.

import type { ExperimentDef, Confidence } from './experiment-bank.ts';

export type Lever = 'sen' | 'wieczor' | 'glowa' | 'trening' | 'weekend' | 'powrot';
export type PredictionGap = 'match' | 'upstream' | 'deeper' | 'miss' | 'none' | 'boundary';
export type ConfidenceState = 'wzorzec' | 'trop' | 'za_malo';
export type RouteCategory = 'self_serve' | 'data_needed' | 'help';
export type ContrastEffect = 'support' | 'counter' | 'neutral' | 'none';

export interface DecisionResult {
  desired_outcome: { id: string; label: string };
  prediction: { id: string; lever: Lever | 'hormony' | null; label: string };
  signals: string[];
  contrast_evidence: { id: string; lever: Lever | null; effect: ContrastEffect };
  failed_solution: { id: string; count: number; line: string | null };
  constraint: string;
  test_scope: string | null;
  test_note: string | null;
  early_signal: string;
  upstream_candidate: { lever: Lever; label: string; moment: string; resolved: boolean };
  counterevidence: string | null;
  confidence: { state: ConfidenceState; label: string };
  prediction_gap: { type: PredictionGap; line: string };
  experiment: { id: string; name: string; action: string };
  observation_variable: string;
  route: RouteCategory;
  medical_boundary: string | null;
}

const GOAL_LABEL: Record<string, string> = {
  goal_forma: 'sylwetkę',
  goal_energia: 'energię na cały dzień',
  goal_sen: 'sen i regenerację',
  goal_glowa: 'spokój w głowie',
  goal_naped: 'napęd i libido',
  goal_inne: 'swój tydzień',
};

export const PREDICTION_LEVER: Record<string, Lever | 'hormony' | null> = {
  pr_sen: 'sen',
  pr_jedzenie: 'wieczor',
  pr_glowa: 'glowa',
  pr_trening: 'trening',
  pr_weekend: 'weekend',
  pr_hormony: 'hormony',
  pr_niewiem: null,
};

export const GOOD_DAY_LEVER: Record<string, Lever | null> = {
  gd_sen: 'sen',
  gd_wieczor: 'wieczor',
  gd_glowa: 'glowa',
  gd_ruch: 'trening',
  gd_weekend: 'weekend',
  gd_niepamietam: null,
};

export const LEVER_LABEL: Record<Lever | 'hormony', string> = {
  sen: 'sen',
  wieczor: 'wieczór i jedzenie',
  glowa: 'głowa i praca',
  trening: 'trening',
  weekend: 'weekend',
  powrot: 'powroty po przerwie',
  hormony: 'hormony',
};

// Biernik do zdan typu "obstawiles X", "wskazuja na X". Mianownik zostaje w etykietach odczytu.
const LEVER_ACC: Record<Lever | 'hormony', string> = {
  sen: 'sen',
  wieczor: 'wieczór i jedzenie',
  glowa: 'głowę i pracę',
  trening: 'trening',
  weekend: 'weekend',
  powrot: 'powroty po przerwie',
  hormony: 'hormony',
};

const EARLY_SIGNAL: Record<string, string> = {
  bw_morning: 'rano, zaraz po przebudzeniu',
  bw_midday: 'przed obiadem',
  bw_afternoon: 'po 14',
  bw_afterwork: 'zaraz po pracy',
  bw_evening: 'wieczorem',
  bw_weekend: 'w weekend',
  bw_varies: 'różnie, bez jednej godziny',
};

// Co w 168 zwykle stoi WCZESNIEJ niz dana dzwignia. Sen rzadko psuje sie sam: ustawia go wieczor,
// glowa i weekend. Trening wypada, bo wczesniej zabraklo glowy albo wieczoru.
const UPSTREAM_OF: Record<Lever, Lever[]> = {
  sen: ['wieczor', 'glowa', 'weekend'],
  wieczor: ['glowa', 'sen'],
  trening: ['glowa', 'wieczor', 'sen'],
  glowa: ['sen'],
  weekend: [],
  powrot: [],
};

function str(v: unknown): string { return typeof v === 'string' ? v : ''; }

export function leverFromExperiment(experimentId: string, breakId: string): Lever {
  const p = experimentId.charAt(0);
  if (p === 'W') return 'weekend';
  if (p === 'E') return 'wieczor';
  if (p === 'G') return 'glowa';
  if (p === 'T') return 'trening';
  if (experimentId === 'R1') return 'powrot';
  if (experimentId === 'R3') return 'sen';
  if (breakId === 'bw_morning') return 'sen';
  if (breakId === 'bw_evening' || breakId === 'bw_afterwork') return 'wieczor';
  if (breakId === 'bw_weekend') return 'weekend';
  if (breakId === 'bw_midday' || breakId === 'bw_afternoon') return 'glowa';
  return 'sen';
}

export function predictionGap(pred: Lever | 'hormony' | null, upstream: Lever): PredictionGap {
  if (pred === 'hormony') return 'boundary';
  if (!pred) return 'none';
  if (pred === upstream) return 'match';
  if (UPSTREAM_OF[pred].includes(upstream)) return 'upstream';
  // Obstawil cos, co w 168 stoi jeszcze PRZED wskazanym miejscem: to trafniejszy typ, nie pudlo.
  if (UPSTREAM_OF[upstream].includes(pred)) return 'deeper';
  return 'miss';
}

// Wiersz odczytu ma juz etykiete "Obstawiles" i sam typ. Nikt nie slyszy "trafiles" przed testem.
const GAP_LINE: Record<PredictionGap, string> = {
  match: 'Odpowiedzi mówią to samo co Ty. Test 72h pokaże, czy miałeś nosa.',
  upstream: 'Blisko. Odpowiedzi wskazują miejsce o krok wcześniej.',
  deeper: 'Obstawiłeś coś, co może stać jeszcze wcześniej. Odpowiedzi pokazują, gdzie to wychodzi w tygodniu.',
  miss: 'Odpowiedzi wskazują gdzie indziej. Test 72h pokaże, kto ma rację.',
  none: 'Odpowiedzi same wskazują miejsce startu. Sprawdź, czy pasuje do tego, co widzisz u siebie.',
  boundary: 'Hormonów z ankiety nie ocenię. Więcej o tym niżej.',
};
const UNRESOLVED_GAP = 'Odpowiedzi nie wskazują jeszcze jednego miejsca. Test 72h ma to rozstrzygnąć.';

// failed_solution i constraint nie zmieniaja wyboru eksperymentu ani pewnosci (restart jest juz liczony
// w selektorze, drugi raz bylby podwojnym liczeniem). Zmieniaja rozmiar testu i to, jak o nim mowimy.
// Pytanie liczylo plany, ktore nie dozyly czterech tygodni, wiec tak o nich mowimy.
const FAILED_COUNT: Record<string, string> = {
  tb_2: 'Trzy, cztery plany w ostatnich 12 miesiącach nie dożyły czterech tygodni.',
  tb_3: 'Pięć albo więcej planów w ostatnich 12 miesiącach nie dożyło czterech tygodni.',
};
const FAILED_TAIL = 'Ten test jest mniejszy od każdego z nich: jeden ruch, 72 godziny.';

const SCOPE_LINE: Record<string, string> = {
  wl_firefight: 'Przy dniu pełnym cudzych pożarów robisz tylko ten jeden ruch. Nic więcej nie dokładasz.',
  wl_people: 'Ludzie czekają na Ciebie cały dzień, więc robisz tylko ten jeden ruch. Nic więcej nie dokładasz.',
  wl_owner: 'W firmie wszystko wraca do Ciebie, więc dokładasz tylko ten jeden ruch. Reszta dnia zostaje po staremu.',
};
const SCOPE_CLAUSE: Record<string, string> = {
  wl_firefight: 'a dzień masz pełen cudzych pożarów',
  wl_people: 'a ludzie czekają na Ciebie cały dzień',
  wl_owner: 'a w firmie wszystko wraca do Ciebie',
};

// Jedna linia pod testem: rozmiar testu wynika z historii prob i z tego, jak wyglada dzien.
export function testNote(tb: string, wl: string): string | null {
  const f = FAILED_COUNT[tb];
  if (f && SCOPE_CLAUSE[wl]) return `${f.slice(0, -1)}, ${SCOPE_CLAUSE[wl]}. Dlatego tylko ten jeden ruch, nic więcej.`;
  if (f) return `${f} ${FAILED_TAIL}`;
  return SCOPE_LINE[wl] || null;
}

// Odczyt w pierwszym kadrze stoi przed sekcja, ktora definiuje Punkt Pekniecia, wiec tam mowimy prosto.
const AXIS_LEVER: Record<string, Lever[]> = { 'Sen i regeneracja': ['sen'], 'Głowa i stres': ['glowa'], 'Forma': ['trening', 'wieczor'], 'Weekend i rytm': ['weekend', 'powrot'] };
export function bridgeLine(weakLabel: string | undefined, upLever: Lever, hasRoom = true): string {
  if (!weakLabel) return '';
  // Libido ma tez przyczyny zdrowotne: zadnej tezy przyczynowej o tym jednym facecie.
  if (weakLabel === 'Napęd i libido') return 'Napęd i libido mają wiele przyczyn, także zdrowotnych. Tu sprawdzasz tylko tę część, która zależy od Twojego tygodnia.';
  if (!hasRoom) return 'To najniższy z pięciu obszarów, choć nic tu nie leży. Test sprawdzi, czy jeden ruch go podniesie.';
  if ((AXIS_LEVER[weakLabel] || []).includes(upLever)) return 'Start i objaw leżą tu w tym samym miejscu, więc test idzie prosto w nie.';
  return `${weakLabel} wygląda tu na objaw. Test sprawdza, czy przyczyna siedzi tutaj.`;
}

// Bank eksperymentow jest zamrozony. W wyniku nazywamy spadek dnia spadkiem, bez zargonu Punktu Pekniecia.
export function plainText(t: string): string {
  return t
    .replace('przed zwykłym Punktem Pęknięcia', 'przed swoim zwykłym spadkiem')
    .replace('przesuń przed przewidywany Punkt Pęknięcia', 'zrób przed nim')
    .replace('przed pęknięciem niż po nim', 'przed spadkiem niż po nim')
    .replace('PRZED PĘKNIĘCIEM', 'PRZED SPADKIEM')
    .replace('DZIENNIK PĘKNIĘCIA WEEKENDU', 'DZIENNIK WEEKENDU')
    .replace('pierwszego pęknięcia', 'pierwszego odstępstwa')
    .replace('sytuacja pęknięcia', 'sytuacja, w której dzień zbacza')
    .replace('robisz Minimum', 'robisz minimum');
}
export const plainAction = plainText;

export function sentenceCase(name: string): string {
  return name.charAt(0) + name.slice(1).toLocaleLowerCase('pl-PL');
}

export const MEDICAL_BOUNDARY = 'Poziom hormonów pokazuje badanie krwi. Ankieta go nie zmierzy, więc nie znajdziesz tu żadnego szacunku testosteronu. Sprawdzamy to, co widać w Twoim tygodniu.';

const CONF_LABEL: Record<ConfidenceState, string> = {
  wzorzec: 'Wyraźny wzorzec',
  trop: 'Trop do sprawdzenia',
  za_malo: 'Za mało danych',
};

// Narzednik z jego wlasnej odpowiedzi o najlepszym dniu.
const GD_SCENE: Record<string, string> = {
  gd_sen: 'tym, że się wyspałeś',
  gd_wieczor: 'spokojnym wieczorem dzień wcześniej',
  gd_glowa: 'tym, że w robocie było mniej presji',
  gd_ruch: 'treningiem albo większą dawką ruchu',
  gd_weekend: 'tym, że wypadł po spokojnym weekendzie',
};

export function confidenceState(base: Confidence, effect: ContrastEffect): ConfidenceState {
  const pts = (base === 'HIGH' ? 2 : base === 'MEDIUM' ? 1 : 0) + (effect === 'support' ? 1 : 0) - (effect === 'counter' ? 1 : 0);
  return pts >= 2 ? 'wzorzec' : pts === 1 ? 'trop' : 'za_malo';
}

export function routeCategory(routePrimary: string, conf: ConfidenceState): RouteCategory {
  if (routePrimary === 'nabor') return 'help';
  if (conf === 'za_malo') return 'data_needed';
  return 'self_serve';
}

export interface DecisionInput {
  answers: Record<string, unknown>;
  experiment: ExperimentDef;
  confidence: Confidence;
  routePrimary: string;
}

export function buildDecision({ answers, experiment, confidence, routePrimary }: DecisionInput): DecisionResult {
  const goalId = str(answers.primary_goal);
  const predId = str(answers.prediction);
  const gdId = str(answers.good_day);
  const breakId = str(answers.break_window);
  const predLever = predId in PREDICTION_LEVER ? PREDICTION_LEVER[predId] : null;
  const upstream = leverFromExperiment(experiment.id, breakId);
  const upLabel = LEVER_LABEL[upstream];

  const gdLever = gdId in GOOD_DAY_LEVER ? GOOD_DAY_LEVER[gdId] : null;
  // R2/R4 bez godziny spadku: selektor nie ma miejsca, 'sen' bylby tylko domyslna wartoscia, nie wnioskiem.
  const unresolved = ['R2', 'R4'].includes(experiment.id) && (!breakId || breakId === 'bw_varies');
  // Kontrast liczy w obie strony lancucha 168: dzien lepszy przez cos, co stoi przed albo za startem, jest z nim spojny.
  const related = !!gdLever && (UPSTREAM_OF[upstream].includes(gdLever) || UPSTREAM_OF[gdLever].includes(upstream));
  const effect: ContrastEffect = !gdId || gdId === 'gd_niepamietam' || upstream === 'powrot' || unresolved ? 'none'
    : gdLever === upstream ? 'support'
    : related ? 'neutral'
    : 'counter';
  const scene = GD_SCENE[gdId] || '';
  const samePred = !!gdLever && gdLever === predLever;
  const counter = !scene ? null
    : effect === 'support' ? `Twój najlepszy dzień z ostatnich dwóch tygodni różnił się właśnie ${scene}. To podnosi pewność tego tropu.`
    : effect === 'neutral' && samePred ? `Twój najlepszy dzień różnił się ${scene}, czyli tym, co sam obstawiłeś. To się łączy z miejscem, od którego zaczynasz, a test pokaże, co rusza pierwsze.`
    : effect === 'counter' && samePred ? `Twój najlepszy dzień różnił się ${scene}, czyli tym, co sam obstawiłeś. Odpowiedzi wskazują inne miejsce, więc test rozstrzygnie, które z nich rusza resztę.`
    : effect === 'counter' ? `Twój najlepszy dzień różnił się czymś innym: ${scene}. Dlatego pewność jest niższa, a test ma ten trop potwierdzić albo odrzucić.`
    : null;

  const state = confidenceState(confidence, effect);
  const gap: PredictionGap = unresolved && predLever !== 'hormony' ? 'none' : predictionGap(predLever, upstream);
  const predLabel = predLever ? LEVER_LABEL[predLever] : '„nie mam pojęcia”';
  const tb = str(answers.tried_before);
  const wl = str(answers.work_load);
  const signals = [breakId, str(answers.give_up_point), str(answers.evening_eating), str(answers.stress_level), str(answers.weekend_pattern), str(answers.monday_recovery)].filter(Boolean);

  return {
    desired_outcome: { id: goalId || 'unknown', label: GOAL_LABEL[goalId] || 'swój tydzień' },
    prediction: { id: predId || 'unknown', lever: predLever, label: predLabel },
    signals,
    contrast_evidence: { id: gdId || 'unknown', lever: gdLever, effect },
    failed_solution: { id: tb || 'unknown', count: tb ? Number(tb.replace('tb_', '')) || 0 : 0, line: FAILED_COUNT[tb] || null },
    constraint: wl || 'unknown',
    test_scope: SCOPE_LINE[wl] || null,
    test_note: testNote(tb, wl),
    early_signal: EARLY_SIGNAL[breakId] || 'różnie, bez jednej godziny',
    upstream_candidate: { lever: upstream, label: unresolved ? 'jeszcze nie wiadomo' : upLabel, moment: experiment.moment, resolved: !unresolved },
    counterevidence: counter,
    confidence: { state, label: state === 'za_malo' && effect === 'counter' ? 'Dwa tropy naraz' : CONF_LABEL[state] },
    prediction_gap: { type: gap, line: unresolved && gap === 'none' ? UNRESOLVED_GAP : GAP_LINE[gap] },
    experiment: { id: experiment.id, name: plainText(experiment.name), action: plainText(experiment.action) },
    observation_variable: plainText(experiment.observe),
    route: routeCategory(routePrimary, state),
    medical_boundary: predLever === 'hormony' || goalId === 'goal_naped' ? MEDICAL_BOUNDARY : null,
  };
}

// ── 7-DNIOWA PETLA POWROTU: localStorage, zero PII. Tylko dzwignia, eksperyment i obstawienie. ──
export const RETURN_KEY = 'diagnostyka_v3_return';
export type ReturnOutcome = 'pomoglo' | 'czesciowo' | 'nic';
export type HypothesisState = 'wzmocniona' | 'oslabiona' | 'nierozstrzygnieta';

export interface ReturnRecord { v: string; at: number; upstream: Lever; experimentId: string; prediction: string }

export function hypothesisFrom(outcome: ReturnOutcome): HypothesisState {
  return outcome === 'pomoglo' ? 'wzmocniona' : outcome === 'nic' ? 'oslabiona' : 'nierozstrzygnieta';
}

export function daysSince(at: number, now: number): number {
  return Math.floor((now - at) / 86400000);
}
