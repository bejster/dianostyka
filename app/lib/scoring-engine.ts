// scoring-engine.ts Pure function calculation engine for Diagnostyka Tygodnia V2

import { DOMAINS, type DomainKey, PROFILES, type ProfileDef, QUESTIONS } from './assessment-config.ts';

export interface RawAnswers {
  // kontekst
  age?: number;
  // sen
  sleep_hours?: number;
  sleep_quality?: string;
  screen_bed?: string;
  break_window?: string;
  // energia / obciazenie
  work_hours?: number;
  stress_level?: string;
  energy_mornings?: string;
  dopamine_pull?: string;
  half_power_hours?: number;
  // apetyt / jedzenie
  evening_eating?: string;
  veggies_days?: string;
  protein_days?: string;
  takeout_cost?: number;
  // trening
  planned_trainings?: number;
  missed_trainings?: number;
  train_years?: number;
  train_happy?: string;
  gym_miss?: string; // legacy (czyta calculateScoring); flow /diagnoza go nie zbiera
  // weekend
  weekend_pattern?: string;
  alcohol_intake?: string;
  weekend_cash?: number;
  monday_recovery?: string;
  weekend_break?: string;
  // glowa / sygnaly
  symptoms_chips?: string[];
  morning_wood?: string;
  tried_before?: string;
  defer_count?: string;
  retreat_when?: string;
  user_pain?: string;
  [key: string]: unknown;
}

export interface DomainScore {
  domainKey: DomainKey;
  score: number; // 0 (najgorszy) - 100 (najlepszy/odporny)
  severity: number; // 0-100 nasilenie problemu
  label: string;
  shortLabel: string;
  status: 'w_normie' | 'granica' | 'poza_zakresem';
}

export interface PrimaryLever {
  domainKey: DomainKey;
  score: number;
  headline: string;
  explanation: string;
}

export type LeadFitSegment = 'cold' | 'warm' | 'hot';

export interface ScoringResult {
  overallScore: number; // 0-100 (Odporność Twojego Tygodnia)
  domainScores: Record<DomainKey, DomainScore>;
  sortedDomains: DomainScore[];
  primaryLever: PrimaryLever;
  profile: ProfileDef;
  leadFitSegment: LeadFitSegment;
  breakWindowText: string;
  hardCostYear: number; // realne finanse
}

export function calculateScoring(answers: RawAnswers): ScoringResult {
  // 1. OBLICZANIE WYNIKÓW DLA POSZCZEGÓLNYCH DOMEN (0 - 100)
  // Domena: SEN
  let sleepVal = 20;
  if (answers.sleep_hours !== undefined) {
    const h = answers.sleep_hours;
    sleepVal = h >= 7.5 ? 0 : h >= 6.5 ? 30 : h >= 5.5 ? 65 : 100;
  }
  const sqVal = answers.sleep_quality === 'sq_great' ? 0 : answers.sleep_quality === 'sq_ok' ? 30 : answers.sleep_quality === 'sq_heavy' ? 70 : 100;
  // screen_bed jest wyciety z flow; brak odpowiedzi = neutralne 30, a nie 100 (nie zawyzaj dlugu snu)
  const sbVal = answers.screen_bed === undefined ? 30 : answers.screen_bed === 'sb_60min' ? 0 : answers.screen_bed === 'sb_30min' ? 30 : answers.screen_bed === 'sb_bed' ? 75 : 100;
  const sleepSeverity = Math.round((sleepVal * 0.4) + (sqVal * 0.35) + (sbVal * 0.25));

  // Domena: ENERGIA / STRES
  let workVal = 20;
  if (answers.work_hours !== undefined) {
    const w = answers.work_hours;
    workVal = w <= 8 ? 0 : w <= 10 ? 40 : w <= 12 ? 75 : 100;
  }
  const stressVal = answers.stress_level === 'st_low' ? 0 : answers.stress_level === 'st_mid' ? 40 : answers.stress_level === 'st_high' ? 80 : 100;
  const bwVal = answers.break_window === 'bw_morning' ? 60 : answers.break_window === 'bw_midday' ? 50 : answers.break_window === 'bw_afternoon' ? 75 : answers.break_window === 'bw_evening' ? 90 : 70;
  const energySeverity = Math.round((stressVal * 0.45) + (workVal * 0.30) + (bwVal * 0.25));

  // Domena: ŻYWIENIE / APETYT
  const eeVal = answers.evening_eating === 'ee_clean' ? 0 : answers.evening_eating === 'ee_snack' ? 45 : answers.evening_eating === 'ee_binge' ? 85 : 100;
  const takeoutVal = answers.takeout_cost !== undefined ? Math.min(Math.round((answers.takeout_cost / 1500) * 100), 100) : 30;
  const nutritionSeverity = Math.round((eeVal * 0.70) + (takeoutVal * 0.30));

  // Domena: WEEKEND
  const wpVal = answers.weekend_pattern === 'wp_same' ? 0 : answers.weekend_pattern === 'wp_slight' ? 35 : answers.weekend_pattern === 'wp_shifted' ? 75 : 100;
  const alcVal = answers.alcohol_intake === 'alc_zero' ? 0 : answers.alcohol_intake === 'alc_low' ? 35 : answers.alcohol_intake === 'alc_mid' ? 70 : 100;
  const weekendSeverity = Math.round((wpVal * 0.60) + (alcVal * 0.40));

  // Domena: TRENING (z realnie zbieranych planned/missed; nietrenujacy = plan 0 = to NIE jest jego os awarii)
  // Wczesniej liczylo sie z gym_miss, ktorego flow nigdy nie zbieral -> severity zawsze 100 -> trening
  // zawsze wychodzil jako glowne domino (profil D). To bylo zrodlo "za duzo o treningu".
  let trainingSeverity = 30;
  if (answers.planned_trainings !== undefined) {
    const plan = answers.planned_trainings;
    if (plan === 0) {
      trainingSeverity = 20; // nie trenuje, nie karzemy, to nie ta os
    } else {
      const missRaw = typeof answers.missed_trainings === 'number' ? answers.missed_trainings : 0;
      const miss = Math.max(0, Math.min(missRaw, plan));
      const missRate = miss / plan; // 0..1, ile planu realnie wypada
      trainingSeverity = Math.round(missRate * 90); // max 90, zeby trening nie dominowal dzwigni sam z siebie
    }
  }

  // Domena: CHAOS / GŁOWA
  const chips = Array.isArray(answers.symptoms_chips) ? answers.symptoms_chips.length : 0;
  const chipsVal = Math.min(chips * 20, 100);
  const textVal = answers.user_pain && answers.user_pain.trim().length > 10 ? 60 : 30;
  const chaosSeverity = Math.round((chipsVal * 0.60) + (textVal * 0.40));

  // Zbieranie i normalizacja ocen domenowych (100 = świetnie, 0 = awaria)
  const buildDomainScore = (key: DomainKey, severity: number): DomainScore => {
    const score = Math.max(0, Math.min(100, 100 - severity));
    const status = score >= 72 ? 'w_normie' : score >= 48 ? 'granica' : 'poza_zakresem';
    return {
      domainKey: key,
      score,
      severity,
      label: DOMAINS[key].label,
      shortLabel: DOMAINS[key].shortLabel,
      status,
    };
  };

  const domainScores: Record<DomainKey, DomainScore> = {
    sleep: buildDomainScore('sleep', sleepSeverity),
    energy: buildDomainScore('energy', energySeverity),
    nutrition: buildDomainScore('nutrition', nutritionSeverity),
    weekend: buildDomainScore('weekend', weekendSeverity),
    training: buildDomainScore('training', trainingSeverity),
    chaos: buildDomainScore('chaos', chaosSeverity),
  };

  const sortedDomains = Object.values(domainScores).sort((a, b) => a.score - b.score);

  // 2. WYNIK GŁÓWNY (ODPORNOŚĆ TYGODNIA 0-100)
  // 50% weighted avg z 6 domen + 30% 2 najgorsze domeny + 20% resilience
  const avgAll = sortedDomains.reduce((acc, d) => acc + d.score, 0) / 6;
  const worstTwoAvg = (sortedDomains[0].score + sortedDomains[1].score) / 2;
  const resilienceScore = sortedDomains[5].score; // najlepsza domena wspiera powrót
  const overallScore = Math.round((avgAll * 0.50) + (worstTwoAvg * 0.30) + (resilienceScore * 0.20));

  // 3. WYZNACZENIE GŁÓWNEGO DOMINO / DŹWIGNI
  // primary_lever_score = severity * 0.45 + upstream_weight * 0.35 + cross_domain_impact * 0.20
  const leverScores = sortedDomains.map(d => {
    const qDef = QUESTIONS.find(q => q.domain === d.domainKey);
    const upstream = qDef ? qDef.upstreamWeight : 0.70;
    const cross = qDef ? qDef.crossDomainImpact : 0.70;
    const leverScore = (d.severity * 0.45) + (upstream * 100 * 0.35) + (cross * 100 * 0.20);
    return { domainScore: d, leverScore };
  }).sort((a, b) => b.leverScore - a.leverScore);

  const topLeverDomain = leverScores[0].domainScore.domainKey;

  const primaryLever: PrimaryLever = {
    domainKey: topLeverDomain,
    score: leverScores[0].domainScore.score,
    headline: `Główne domino: ${DOMAINS[topLeverDomain].label}`,
    explanation: `To w tym obszarze powstaje pierwszy wyciek energii, który pociąga za sobą kolejne dni.`,
  };

  // 4. WYBÓR PROFILU (A - F)
  let selectedProfileKey = 'profile_a';
  if (topLeverDomain === 'sleep') selectedProfileKey = 'profile_a';
  else if (topLeverDomain === 'nutrition') selectedProfileKey = 'profile_b';
  else if (topLeverDomain === 'weekend') selectedProfileKey = 'profile_c';
  else if (topLeverDomain === 'training') selectedProfileKey = 'profile_d';
  else if (topLeverDomain === 'energy') selectedProfileKey = 'profile_e';
  else selectedProfileKey = 'profile_f';

  const profile = PROFILES[selectedProfileKey] || PROFILES.profile_a;

  // 5. SEGMENTACJA LEAD FIT (COLD / WARM / HOT)
  let leadFitSegment: LeadFitSegment = 'warm';
  if (overallScore >= 70) leadFitSegment = 'cold';
  else if (overallScore <= 45 || chips >= 3 || answers.stress_level === 'st_high' || answers.stress_level === 'st_max') leadFitSegment = 'hot';

  // 6. GODZINA PĘKNIĘCIA (TEKST)
  let breakWindowText = 'po 21:00';
  if (answers.break_window === 'bw_morning') breakWindowText = 'rano po przebudzeniu';
  else if (answers.break_window === 'bw_midday') breakWindowText = 'między 10:00 a 14:00';
  else if (answers.break_window === 'bw_afternoon') breakWindowText = 'między 14:00 a 18:00';
  else if (answers.break_window === 'bw_weekend') breakWindowText = 'w weekend';

  // 7. REALNY HARD COST
  const takeoutAnnual = (answers.takeout_cost || 0) * 12;
  const hardCostYear = takeoutAnnual;

  return {
    overallScore,
    domainScores,
    sortedDomains,
    primaryLever,
    profile,
    leadFitSegment,
    breakWindowText,
    hardCostYear,
  };
}
