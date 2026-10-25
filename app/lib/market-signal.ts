import type { RawAnswers } from './scoring-engine';

// Sygnał badawczy z jednej ankiety. Bez udawania, że potrzeba = skłonność do płacenia.
// Wyłącznie prywatny handoff CRM. Nie emitować do PostHog ani publicznych linków.
export interface MarketSignalV1 {
  schema: 'market-168-v1';
  evidence: 'self_report';
  wanted_change: string | null;
  first_friction: string | null;
  failure_trigger: string | null;
  previous_attempts: string | null;
  paid_solution_history: string | null;
  impact_outside_gym: string[];
  work_context: string | null;
  declared_interest: string | null;
  stated_start_window: string | null;
  has_verbatim_pain: boolean;
}

const ids = {
  primary_goal: new Set(['goal_forma','goal_energia','goal_sen','goal_glowa','goal_naped','goal_inne']),
  break_window: new Set(['bw_morning','bw_midday','bw_afternoon','bw_afterwork','bw_evening','bw_weekend','bw_varies']),
  give_up_point: new Set(['gup_weekend','gup_wieczor','gup_stres','gup_efekt','gup_czas']),
  tried_before: new Set(['tb_0','tb_1','tb_2','tb_3']),
  past_paid_attempt: new Set(['pay_none','pay_plan','pay_person','pay_both','pay_other']),
  work_load: new Set(['wl_clock','wl_deadline','wl_firefight','wl_people','wl_owner']),
  intent: new Set(['in_sam','in_zobacz','in_prowadz','in_niewiem']),
  start_when: new Set(['sw_7dni','sw_30dni','sw_kwartal','sw_sprawdzam']),
} as const;

function known(input: unknown, values: ReadonlySet<string>): string | null {
  return typeof input === 'string' && values.has(input) ? input : null;
}

export function buildMarketSignal(answers: RawAnswers): MarketSignalV1 {
  // Bez domen zdrowotnych, PII i losowo parsowanych słów. Oryginały odpowiedzi w prywatnym briefie.
  const allowedImpact = new Set(['sp_night','sp_slow','sp_home','sp_ceiling','sp_none']);
  const impact = Array.isArray(answers.spillover) ? (answers.spillover as unknown[]).filter((v): v is string => typeof v === 'string' && allowedImpact.has(v)).slice(0,2) : [];
  return {
    schema: 'market-168-v1',
    evidence: 'self_report',
    wanted_change: known(answers.primary_goal, ids.primary_goal),
    first_friction: known(answers.break_window, ids.break_window),
    failure_trigger: known(answers.give_up_point, ids.give_up_point),
    previous_attempts: known(answers.tried_before, ids.tried_before),
    paid_solution_history: known(answers.past_paid_attempt, ids.past_paid_attempt),
    impact_outside_gym: impact,
    work_context: known(answers.work_load, ids.work_load),
    declared_interest: known(answers.intent, ids.intent),
    stated_start_window: known(answers.start_when, ids.start_when),
    has_verbatim_pain: typeof answers.user_pain === 'string' && answers.user_pain.trim().length >= 15,
  };
}
