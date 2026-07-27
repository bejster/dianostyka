// ── answers-to-fd.ts: most z RawAnswers (flow /diagnoza) do FD (rdzen diagnostyczny) ──
// Mapuje odpowiedzi zebrane przez SingleQuestionFlow na strukture FD, ktorej uzywaja
// score(), costs(), pickArchetype() i buildWeekPlan(). Pola bez odpowiednika w RawAnswers
// biora wartosc z INIT (spread), wiec wynik jest zawsze kompletny i deterministyczny.

import { INIT, type FD, type ChipKey } from './diagnostic-core.ts';
import type { RawAnswers } from './scoring-engine.ts';

export function answersToFD(a: RawAnswers): FD {
  // sen, jakosc pobudki -> sleepQ 0-3 (sq_wrecked = najwyzszy dlug snu)
  const sleepQ =
    a.sleep_quality === 'sq_great' ? 0 :
    a.sleep_quality === 'sq_ok' ? 1 :
    a.sleep_quality === 'sq_heavy' ? 2 :
    a.sleep_quality === 'sq_wrecked' ? 3 : INIT.sleepQ;

  // ekran przed snem -> screenBed 0-3 (sb_fallasleep = ekran do zasniecia)
  const screenBed =
    a.screen_bed === 'sb_60min' ? 0 :
    a.screen_bed === 'sb_30min' ? 1 :
    a.screen_bed === 'sb_bed' ? 2 :
    a.screen_bed === 'sb_fallasleep' ? 3 : INIT.screenBed;

  // stres dobowy -> stress 0-3 (st_max = ciagly alarm)
  const stress =
    a.stress_level === 'st_low' ? 0 :
    a.stress_level === 'st_mid' ? 1 :
    a.stress_level === 'st_high' ? 2 :
    a.stress_level === 'st_max' ? 3 : INIT.stress;

  // moment pekniecia dnia -> breakWindow (kod FD: 0 rano, 1 10-14, 2 14-18, 4 po21, 5 weekend, 6 bez staLej pory)
  // uwaga: assessment nie ma opcji 18-21 (kod 3), dlatego bw_evening = po 21:00 mapuje na 4
  const breakWindow =
    a.break_window === 'bw_morning' ? 0 :
    a.break_window === 'bw_midday' ? 1 :
    a.break_window === 'bw_afternoon' ? 2 :
    a.break_window === 'bw_evening' ? 4 :
    a.break_window === 'bw_weekend' ? 5 :
    a.break_window === 'bw_varies' ? 6 : INIT.breakWindow;

  // wieczorne jedzenie -> binge 0-4 (ee_uncontrolled = jedzenie przejmuje kontrole)
  const binge =
    a.evening_eating === 'ee_clean' ? 0 :
    a.evening_eating === 'ee_snack' ? 1 :
    a.evening_eating === 'ee_binge' ? 3 :
    a.evening_eating === 'ee_uncontrolled' ? 4 : INIT.binge;

  // weekend rusza rytm -> wknd 0-4 (wp_reset = pelny reset z alkoholem)
  const wknd =
    a.weekend_pattern === 'wp_same' ? 0 :
    a.weekend_pattern === 'wp_slight' ? 1 :
    a.weekend_pattern === 'wp_shifted' ? 3 :
    a.weekend_pattern === 'wp_reset' ? 4 : INIT.wknd;

  // alkohol na tydzien -> drinks (liczba porcji, srodek przedzialu z opcji)
  const drinks =
    a.alcohol_intake === 'alc_zero' ? 0 :
    a.alcohol_intake === 'alc_low' ? 2 :
    a.alcohol_intake === 'alc_mid' ? 6 :
    a.alcohol_intake === 'alc_high' ? 10 : INIT.drinks;

  // opuszczone treningi -> miss 0-3 (gm_no_plan = trening zrywami)
  const miss =
    a.gym_miss === 'gm_never' ? 0 :
    a.gym_miss === 'gm_sometimes' ? 1 :
    a.gym_miss === 'gm_frequent' ? 2 :
    a.gym_miss === 'gm_no_plan' ? 3 : INIT.miss;

  // brak stalego planu wynika tylko z gm_no_plan, w innych przypadkach domyslka INIT
  const trainPlan = a.gym_miss === 'gm_no_plan' ? 1 : INIT.trainPlan;

  // objawy -> tags. id chipow w assessment (fatigue, belly, cravings, brain, recovery, procrastination) sa juz waLidnymi ChipKey
  const tags = new Set<ChipKey>((a.symptoms_chips ?? []) as ChipKey[]);

  return {
    ...INIT,
    sleep: a.sleep_hours ?? INIT.sleep,          // slider 4-9.5 h, wartosc wprost
    workHours: a.work_hours ?? INIT.workHours,   // slider 6-14 h, wartosc wprost
    junk: a.takeout_cost ?? INIT.junk,           // takeout_cost = miesieczny wydatek na dowozy/jedzenie na miescie (zL/mies)
    sleepQ,
    screenBed,
    stress,
    breakWindow,
    binge,
    wknd,
    drinks,
    miss,
    trainPlan,
    tags,
  };
}
