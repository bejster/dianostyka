// ── answers-to-fd.ts: most z RawAnswers (flow /diagnoza) do FD (rdzen diagnostyczny) ──
// Mapuje odpowiedzi zebrane przez SingleQuestionFlow na strukture FD, ktorej uzywaja
// score(), costs(), pickArchetype() i buildWeekPlan(). Zestaw pytan jest przeniesiony 1:1
// z zywej strony app/page.tsx, wiec niemal cale FD idzie z realnych odpowiedzi, a nie z INIT.
//
// Kodowanie opcji jest zgodne ze znaczeniem: gorszy wzorzec = wyzsza wartosc pola FD.
// Pola, ktorych zywa strona swiadomie NIE pyta (dietChaos, subs, gym, rate, progress,
// frustration, raise, supps, wakeTime, alarm, meals, cooking), zostaja na INIT.

import { INIT, type FD, type ChipKey } from './diagnostic-core.ts';
import type { RawAnswers } from './scoring-engine.ts';

// pomocnik: liczba z RawAnswers albo INIT (odrzuca NaN/undefined)
function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && !Number.isNaN(v) ? v : fallback;
}

export function answersToFD(a: RawAnswers): FD {
  // wiek -> age (slider 18-50, wartosc wprost)
  const age = num(a.age, INIT.age);

  // jakosc pobudki -> sleepQ 0-3 (sq_wrecked = "prawie nigdy" = najwyzszy dlug snu)
  const sleepQ =
    a.sleep_quality === 'sq_great' ? 0 :
    a.sleep_quality === 'sq_ok' ? 1 :
    a.sleep_quality === 'sq_heavy' ? 2 :
    a.sleep_quality === 'sq_wrecked' ? 3 : INIT.sleepQ;

  // telefon do 30 min przed snem -> screenBed 0-3 (sb_fallasleep = 6-7 wieczorow)
  const screenBed =
    a.screen_bed === 'sb_60min' ? 0 :
    a.screen_bed === 'sb_30min' ? 1 :
    a.screen_bed === 'sb_bed' ? 2 :
    a.screen_bed === 'sb_fallasleep' ? 3 : INIT.screenBed;

  // moment pekniecia dnia -> breakWindow (0 rano, 1 10-14, 2 14-18, 3 18-21, 4 po21, 5 weekend, 6 bez staLej pory)
  const breakWindow =
    a.break_window === 'bw_morning' ? 0 :
    a.break_window === 'bw_midday' ? 1 :
    a.break_window === 'bw_afternoon' ? 2 :
    a.break_window === 'bw_afterwork' ? 3 :
    a.break_window === 'bw_evening' ? 4 :
    a.break_window === 'bw_weekend' ? 5 :
    a.break_window === 'bw_varies' ? 6 : INIT.breakWindow;

  // napiecie wieczorne (glowa dalej w robocie) -> stress 0-3 (st_max = 6-7 wieczorow)
  const stress =
    a.stress_level === 'st_low' ? 0 :
    a.stress_level === 'st_mid' ? 1 :
    a.stress_level === 'st_high' ? 2 :
    a.stress_level === 'st_max' ? 3 : INIT.stress;

  // zmeczenie od rana -> energy 0-3 (en_3 = 5-7 porankow "spalbym jeszcze dwie godziny")
  const energy =
    a.energy_mornings === 'en_0' ? 0 :
    a.energy_mornings === 'en_1' ? 1 :
    a.energy_mornings === 'en_2' ? 2 :
    a.energy_mornings === 'en_3' ? 3 : INIT.energy;

  // ucieczka od trudnego zadania -> dopamine 0-3 (dop_3 = nie wytrzymuje bez bodzca)
  const dopamine =
    a.dopamine_pull === 'dop_0' ? 0 :
    a.dopamine_pull === 'dop_1' ? 1 :
    a.dopamine_pull === 'dop_2' ? 2 :
    a.dopamine_pull === 'dop_3' ? 3 : INIT.dopamine;

  // wieczorne jedzenie -> binge 0-4 (ee_chaos = "kazdy wieczor inaczej")
  const binge =
    a.evening_eating === 'ee_clean' ? 0 :
    a.evening_eating === 'ee_snack' ? 1 :
    a.evening_eating === 'ee_binge' ? 2 :
    a.evening_eating === 'ee_uncontrolled' ? 3 :
    a.evening_eating === 'ee_chaos' ? 4 : INIT.binge;

  // warzywa/owoce -> veggies 0-2 (veg_2 = 0-1 dni = najgorzej)
  const veggies =
    a.veggies_days === 'veg_0' ? 0 :
    a.veggies_days === 'veg_1' ? 1 :
    a.veggies_days === 'veg_2' ? 2 : INIT.veggies;

  // bialko + regularne posilki -> protein 0-2 (pro_2 = 0-1 dni)
  const protein =
    a.protein_days === 'pro_0' ? 0 :
    a.protein_days === 'pro_1' ? 1 :
    a.protein_days === 'pro_2' ? 2 : INIT.protein;

  // weekend rusza rytm -> wknd (0 prawie nigdy, 1 raz/mies, 2 2-3/mies, 4 prawie kazdy)
  const wknd =
    a.weekend_pattern === 'wp_same' ? 0 :
    a.weekend_pattern === 'wp_slight' ? 1 :
    a.weekend_pattern === 'wp_shifted' ? 2 :
    a.weekend_pattern === 'wp_reset' ? 4 : INIT.wknd;

  // porcje alkoholu na jedno wyjscie -> drinks (srodek/prog przedzialu)
  const drinks =
    a.alcohol_intake === 'alc_zero' ? 0 :
    a.alcohol_intake === 'alc_low' ? 2 :
    a.alcohol_intake === 'alc_mid' ? 4 :
    a.alcohol_intake === 'alc_high' ? 7 :
    a.alcohol_intake === 'alc_extreme' ? 10 : INIT.drinks;

  // powrot do normy po weekendzie -> mondayFeel 0-3 + weekendWork 0-2 (jedno pytanie, dwa pola FD)
  const mondayFeel =
    a.monday_recovery === 'mon_0' ? 0 :
    a.monday_recovery === 'mon_1' ? 1 :
    a.monday_recovery === 'mon_2' ? 2 :
    a.monday_recovery === 'mon_3' ? 3 : INIT.mondayFeel;
  const weekendWork =
    a.monday_recovery === 'mon_0' ? 0 :
    a.monday_recovery === 'mon_1' ? 1 :
    a.monday_recovery === 'mon_2' ? 1 :
    a.monday_recovery === 'mon_3' ? 2 : INIT.weekendWork;

  // co sypie sie w weekend -> wkndWhat 0-3 (personalizacja, nie wchodzi do score)
  const wkndWhat =
    a.weekend_break === 'ww_0' ? 0 :
    a.weekend_break === 'ww_1' ? 1 :
    a.weekend_break === 'ww_2' ? 2 :
    a.weekend_break === 'ww_3' ? 3 : INIT.wkndWhat;

  // planowane treningi -> plan; wypadajace -> miss (clamp do plan, nie policzy wiecej niz planuje)
  const plan = Math.round(num(a.planned_trainings, INIT.plan));
  const missRaw = Math.round(num(a.missed_trainings, INIT.miss));
  const miss = Math.max(0, Math.min(missRaw, plan));
  // brak stalego planu = zero zalozonych treningow -> trainPlan 1 (improwizuje)
  const trainPlan = plan >= 1 ? 0 : 1;

  // lata treningu -> trainYears (slider 0-15)
  const trainYears = Math.round(num(a.train_years, INIT.trainYears));

  // "widac po Tobie te lata" -> trainHappy 0-3 (th_3 = dopiero zaczyna, bez kary w score)
  const trainHappy =
    a.train_happy === 'th_0' ? 0 :
    a.train_happy === 'th_1' ? 1 :
    a.train_happy === 'th_2' ? 2 :
    a.train_happy === 'th_3' ? 3 : INIT.trainHappy;

  // poranny wzwod (opcjonalny marker hormonalny) -> morningWood 0-2 (mw_2 = rzadziej)
  const morningWood =
    a.morning_wood === 'mw_0' ? 0 :
    a.morning_wood === 'mw_1' ? 1 :
    a.morning_wood === 'mw_2' ? 2 : INIT.morningWood;

  // proby zmiany krotsze niz 4 tyg -> triedBefore 0-3 (tb_3 = 5+ razy)
  const triedBefore =
    a.tried_before === 'tb_0' ? 0 :
    a.tried_before === 'tb_1' ? 1 :
    a.tried_before === 'tb_2' ? 2 :
    a.tried_before === 'tb_3' ? 3 : INIT.triedBefore;

  // odkladane wazne rzeczy w tygodniu -> defer 0-3 (df_3 = codziennie cos wisi)
  const defer =
    a.defer_count === 'df_0' ? 0 :
    a.defer_count === 'df_1' ? 1 :
    a.defer_count === 'df_2' ? 2 :
    a.defer_count === 'df_3' ? 3 : INIT.defer;

  // odpuszczona wazna rozmowa (pewnosc siebie przez wycofanie) -> retreat 0-3
  const retreat =
    a.retreat_when === 'rt_0' ? 0 :
    a.retreat_when === 'rt_1' ? 1 :
    a.retreat_when === 'rt_2' ? 2 :
    a.retreat_when === 'rt_3' ? 3 : INIT.retreat;

  // objawy -> tags. id chipow (fatigue, focus, cravings, belly, recovery, libido, anxiety,
  // digest, motivation, confidence) sa juz waLidnymi ChipKey
  const tags = new Set<ChipKey>((a.symptoms_chips ?? []) as ChipKey[]);

  return {
    ...INIT,
    age,
    sleep: num(a.sleep_hours, INIT.sleep),      // slider 3-9 h, wartosc wprost
    workHours: num(a.work_hours, INIT.workHours), // slider 4-14 h, wartosc wprost
    lost: num(a.half_power_hours, INIT.lost),   // slider 0-4 h na pol mocy dziennie
    junk: num(a.takeout_cost, INIT.junk),        // miesieczny wydatek na dowozy/jedzenie na miescie (zL/mies)
    cash: num(a.weekend_cash, INIT.cash),        // typowe jedno wyjscie (zL): alkohol/kluby/taksowki/jedzenie
    sleepQ,
    screenBed,
    breakWindow,
    stress,
    energy,
    dopamine,
    binge,
    veggies,
    protein,
    wknd,
    drinks,
    mondayFeel,
    weekendWork,
    wkndWhat,
    plan,
    miss,
    trainPlan,
    trainYears,
    trainHappy,
    morningWood,
    triedBefore,
    defer,
    retreat,
    tags,
  };
}
