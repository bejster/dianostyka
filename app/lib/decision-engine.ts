// decision-engine.ts: warstwa decyzyjna nad istniejacym silnikiem (flagship 3.0).
// Nic tu nie liczy od nowa. Bierze wybrany eksperyment, jego confidence i dwie nowe odpowiedzi
// (prediction = co czlowiek obstawia, good_day = czym roznil sie jego najlepszy dzien) i sklada
// jeden typowany obiekt wyniku. Zero LLM, zero PII, zero szacowania hormonow.

import type { ExperimentDef, Confidence } from './experiment-bank.ts';

export type Lever = 'sen' | 'wieczor' | 'glowa' | 'trening' | 'weekend' | 'powrot';
export type PredictionGap = 'match' | 'upstream' | 'miss' | 'none' | 'boundary';
export type ConfidenceState = 'wzorzec' | 'trop' | 'za_malo';
export type RouteCategory = 'self_serve' | 'data_needed' | 'help';
export type ContrastEffect = 'support' | 'counter' | 'neutral' | 'none';

export interface DecisionResult {
  desired_outcome: { id: string; label: string };
  prediction: { id: string; lever: Lever | 'hormony' | null; label: string };
  signals: string[];
  contrast_evidence: { id: string; lever: Lever | null; effect: ContrastEffect };
  failed_solution: { id: string; count: number };
  constraint: string;
  early_signal: string;
  upstream_candidate: { lever: Lever; label: string; moment: string };
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
  return 'miss';
}

const GAP_LINE: Record<PredictionGap, (pred: string, up: string) => string> = {
  match: (_p, up) => `Trafiłeś. Twoje odpowiedzi też wskazują na ${up}.`,
  upstream: (p, up) => `Obstawiłeś ${p}. Odpowiedzi wskazują wcześniejsze ogniwo: ${up}. ${cap(p)} często tylko pokazuje to, co zaczęło się wcześniej.`,
  miss: (p, up) => `Obstawiłeś ${p}. Odpowiedzi mocniej wskazują ${up}. Warto sprawdzić to, zanim dołożysz więcej pracy tam, gdzie celowałeś.`,
  none: (_p, up) => `Nie obstawiałeś. Odpowiedzi najmocniej wskazują ${up}.`,
  boundary: (_p, up) => `Obstawiłeś hormony. Tego z kliknięć nie ocenię. Z tygodnia widać za to ${up}.`,
};

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

export const MEDICAL_BOUNDARY = 'Poziom hormonów pokazuje badanie krwi. Ankieta go nie zmierzy, więc nie znajdziesz tu żadnego szacunku testosteronu. Sprawdzamy to, co widać w Twoim tygodniu.';

const CONF_LABEL: Record<ConfidenceState, string> = {
  wzorzec: 'Wyraźny wzorzec',
  trop: 'Trop do sprawdzenia',
  za_malo: 'Za mało danych',
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
  const effect: ContrastEffect = !gdId || gdId === 'gd_niepamietam' ? 'none'
    : gdLever === upstream ? 'support'
    : gdLever && UPSTREAM_OF[upstream].includes(gdLever) ? 'neutral'
    : 'counter';
  const counter = effect === 'counter' && gdLever
    ? `Twój najlepszy dzień różnił się czymś innym: ${LEVER_LABEL[gdLever]}. Dlatego traktuj to jako trop do sprawdzenia.`
    : null;

  const state = confidenceState(confidence, effect);
  const gap = predictionGap(predLever, upstream);
  const predLabel = predLever ? LEVER_LABEL[predLever] : 'nie obstawiałeś';
  const tb = str(answers.tried_before);
  const signals = [breakId, str(answers.give_up_point), str(answers.evening_eating), str(answers.stress_level), str(answers.weekend_pattern), str(answers.monday_recovery)].filter(Boolean);

  return {
    desired_outcome: { id: goalId || 'unknown', label: GOAL_LABEL[goalId] || 'swój tydzień' },
    prediction: { id: predId || 'unknown', lever: predLever, label: predLabel },
    signals,
    contrast_evidence: { id: gdId || 'unknown', lever: gdLever, effect },
    failed_solution: { id: tb || 'unknown', count: tb ? Number(tb.replace('tb_', '')) || 0 : 0 },
    constraint: str(answers.work_load) || 'unknown',
    early_signal: EARLY_SIGNAL[breakId] || 'różnie, bez jednej godziny',
    upstream_candidate: { lever: upstream, label: upLabel, moment: experiment.moment },
    counterevidence: counter,
    confidence: { state, label: CONF_LABEL[state] },
    prediction_gap: { type: gap, line: GAP_LINE[gap](predLabel, upLabel) },
    experiment: { id: experiment.id, name: experiment.name, action: experiment.action },
    observation_variable: experiment.observe,
    route: routeCategory(routePrimary, state),
    medical_boundary: predLever === 'hormony' ? MEDICAL_BOUNDARY : null,
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
