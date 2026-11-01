// ── RESULT PAGE V3 — silnik Beatow 1-4 (Punkt Pekniecia, Petla 168, Dlaczego wraca, Realny koszt) ──
// Zero runtime LLM. Oddzielamy fakty zadeklarowane przez uzytkownika od hipotezy.
// Poniedzialkowy powrot nie oznacza automatycznie straconej soboty i niedzieli.
import type { RawAnswers } from './scoring-engine';
import type { Confidence } from './experiment-bank';

// uczciwa rozdzielczość pęknięcia — WYLACZNIE bucket, który user podał (zero zmyślonej godziny)
export const BREAK_PHRASE: Record<string, string> = {
  bw_morning: 'Najwcześniej zaczyna się już rano, zaraz po przebudzeniu.',
  bw_midday: 'Najwcześniejszy moment to przedpołudnie, jeszcze przed obiadem.',
  bw_afternoon: 'Najwcześniejszy moment to popołudnie, gdzieś po czternastej.',
  bw_afterwork: 'Najwięcej dzieje się w przejściu z pracy do reszty dnia.',
  bw_evening: 'Najbardziej podejrzane jest okno wieczorem.',
  bw_weekend: 'Najwięcej zaczyna się sypać dopiero przy wejściu w weekend.',
  bw_varies: 'Nie widać u Ciebie jednego ostrego momentu. Wzorzec rozkłada się po całym tygodniu.',
};

function s(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
function n(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

// ── Formatowanie liczb, ktore user widzi na wyniku ──
// Suwak godzin ma krok 0.5, wiec surowe wstawienie daje "0.5 h" — zapis angielski w polskim zdaniu.
function hoursPl(h: number): string {
  return String(h).replace('.', ',');
}
// Suwak "ile wypada" nie jest zwiazany z suwakiem "ile planuje", wiec user moze zostawic 5 wypadajacych
// przy 3 planowanych. Scoring to clampuje (answers-to-fd), copy nie clampowalo i pokazywalo liczbe,
// ktorej sam wynik nie uzywa. Jedno zrodlo prawdy: te same dwie liczby w tekscie i w scoringu.
function trainingPair(answers: RawAnswers): { planned: number; missed: number } | undefined {
  const planned = n(answers.planned_trainings);
  const missedRaw = n(answers.missed_trainings);
  if (typeof planned !== 'number' || planned < 1 || typeof missedRaw !== 'number') return undefined;
  return { planned, missed: Math.max(0, Math.min(missedRaw, planned)) };
}
// "1 z 1 treningow" czyta sie jak blad danych, nie jak zdanie. Przy komplecie mowimy to wprost.
function missedPhrase(planned: number, missed: number): string {
  if (missed >= planned) return planned === 1 ? 'wypada ten jeden trening, który planujesz' : `wypadają wszystkie ${planned} zaplanowane treningi`;
  return `wypada ${missed} z ${planned} treningów`;
}

// ── BEAT 1: max 2 evidence receipts, WYLACZNIE z realnych odpowiedzi (truth gate) ──
export function computeEvidenceReceipts(answers: RawAnswers): string[] {
  const out: string[] = [];
  const push = (cond: boolean, line: string) => { if (cond && out.length < 2) out.push(line); };
  const stress = s(answers.stress_level);
  const hp = n(answers.half_power_hours);
  const ee = s(answers.evening_eating);
  const wp = s(answers.weekend_pattern);
  const pair = trainingPair(answers);
  const tried = s(answers.tried_before);

  push(stress === 'st_high' || stress === 'st_max', 'Powiedziałeś, że wieczorem głowa dalej jest w robocie.');
  push(typeof hp === 'number' && hp >= 2, `Do tego oceniłeś, że lecisz około ${hoursPl(hp as number)} h dziennie na pół mocy.`);
  push(ee === 'ee_binge' || ee === 'ee_uncontrolled' || ee === 'ee_chaos', 'Zaznaczyłeś, że wieczorem częściej puszcza kontrola nad jedzeniem.');
  push(wp === 'wp_shifted' || wp === 'wp_reset', 'Powiedziałeś, że weekend regularnie rozjeżdża Ci rytm.');
  push(Boolean(pair && pair.missed >= 1), pair ? `W cięższym tygodniu ${missedPhrase(pair.planned, pair.missed)}.` : '');
  push(tried === 'tb_2' || tried === 'tb_3', 'Sam napisałeś, że kilka planów w tym roku nie dożyło miesiąca.');
  return out;
}

// ── BEAT 2: Pętla 168. Wyłącznie fakty z odpowiedzi tej osoby. Zero archetypowego dopowiadania. ──
export interface LoopNode { label: string; text: string; }
const GUP_NODE: Record<string, string> = {
  gup_weekend: 'Najłatwiej odpuszczasz, kiedy wchodzi weekend.',
  gup_wieczor: 'Najłatwiej odpuszczasz wieczorem, po całym dniu.',
  gup_stres: 'Najłatwiej odpuszczasz, kiedy rośnie presja w pracy albo w głowie.',
  gup_efekt: 'Najłatwiej odpuszczasz, kiedy przez jakiś czas nie widzisz efektu.',
  gup_czas: 'Najłatwiej odpuszczasz, kiedy dzień robi się za ciasny.',
};
function visibleEffect(answers: RawAnswers, evidence: string[]): string {
  const pair = trainingPair(answers), hp=n(answers.half_power_hours);
  const ee=s(answers.evening_eating), stress=s(answers.stress_level), wp=s(answers.weekend_pattern);
  if (pair && pair.missed > 0) return `W cięższym tygodniu ${missedPhrase(pair.planned, pair.missed)}.`;
  if (['ee_binge','ee_uncontrolled','ee_chaos'].includes(ee)) return 'Pod koniec dnia jedzenie częściej wychodzi poza plan.';
  if (typeof hp === 'number' && hp >= 2) return `Około ${hoursPl(hp)} h dziennie oceniasz jako jazdę na pół mocy.`;
  if (['st_high','st_max'].includes(stress)) return 'Wieczorem głowa nadal zostaje w pracy.';
  if (['wp_shifted','wp_reset'].includes(wp)) return 'Weekend wyraźnie zmienia Twój zwykły rytm.';
  return evidence[0] || 'Nie widać jeszcze jednego mocnego skutku, który powtarza się co tydzień.';
}
function returnSignal(answers: RawAnswers): string {
  const mon=s(answers.monday_recovery), tried=s(answers.tried_before);
  const monday: Record<string,string>={mon_0:'Po weekendzie wracasz na swój zwykły poziom już w poniedziałek rano.',mon_1:'Po weekendzie potrzebujesz do południa, żeby wrócić do zwykłego poziomu.',mon_2:'Po weekendzie swój normalny poziom czujesz dopiero we wtorek.',mon_3:'Po weekendzie swój normalny poziom czujesz dopiero w środę albo później.'};
  if (monday[mon]) return monday[mon];
  if (tried === 'tb_3') return 'W ostatnim roku wiele razy kończyło się to całkiem nowym startem.';
  if (tried === 'tb_2') return 'W ostatnim roku kilka razy wracałeś właściwie od początku.';
  if (tried === 'tb_1') return 'Zdarza Ci się wrócić szybko, ale nie zawsze.';
  return 'Nie widać jeszcze stałego problemu z powrotem.';
}
// Wniosek ma nazwac, ktory wezel jest przyczyna, a ktory skutkiem. Wczesniej mowil tylko
// "te odpowiedzi skladaja sie w jeden ciag", czyli opisywal sam siebie i nie dawal zadnej decyzji.
const GUP_CAUSE: Record<string, string> = {
  gup_weekend: 'wejście w weekend',
  gup_wieczor: 'wieczór po pracy',
  gup_stres: 'moment, w którym rośnie presja',
  gup_efekt: 'kilka tygodni bez widocznego efektu',
  gup_czas: 'dzień, który robi się za ciasny',
};
export function computeLoop(breakPhrase: string, evidence: string[], answers: RawAnswers, confidence: Confidence): { nodes: LoopNode[]; uncertain: boolean } {
  const gup=s(answers.give_up_point);
  const uncertain=confidence === 'LOW';
  const cause = GUP_CAUSE[gup] || 'pierwszy moment z tej listy';
  return { uncertain, nodes: [
    { label: 'Pierwszy moment', text: breakPhrase },
    { label: 'Kiedy najłatwiej odpuszczasz', text: GUP_NODE[gup] || 'Nie wskazałeś jednego stałego momentu odpuszczenia.' },
    { label: 'Co widać w tygodniu', text: visibleEffect(answers, evidence) },
    { label: 'Powrót po weekendzie', text: returnSignal(answers) },
    { label: 'Wniosek', text: uncertain
      ? `Odpowiedzi pokazują kilka różnych momentów. Roboczo bierzemy ${cause} jako jeden trop. Trzy dni obserwacji pomogą ustalić, czy warto go dalej sprawdzać.`
      : `Roboczo biorę ${cause} jako najwcześniejszy trop. To może uruchamiać część rzeczy, które widzisz później, ale same odpowiedzi jeszcze tego nie dowodzą. Dlatego test 72h ma sprawdzić, czy zmiana w tym miejscu rusza coś dalej. Jeśli nie, szukamy gdzie indziej.` },
  ] };
}

// ── BEAT 3: dlaczego to wraca.
// Zdanie stoi na trzech realnych polach: work_load (co trzyma tydzien z zewnatrz), give_up_point
// (kiedy to trzymanie znika) i monday_recovery (ile kosztuje powrot).
//
// REGULA ANTY-TAUTOLOGIA: konsekwencja MUSI pochodzic z innej domeny niz trigger.
// Poprzednia wersja robila dokladnie odwrotnie — dobierala konkret pasujacy do triggera — wiec
// zdanie zjadalo samo siebie: "wchodzi weekend, wiec wypada staly rytm weekendu". Tautologia
// zamiast mechanizmu. Kolejnosc kandydatow idzie od najcichszego sygnalu, bo sen i trening sa tym,
// czego czlowiek sam nie laczy z momentem odpuszczenia, wiec niosa najwiecej informacji.
const WORK_ANCHOR: Record<string, string> = {
  wl_clock: 'grafik, który zwykle kończy się o stałej porze',
  wl_deadline: 'termin, po którym od razu widać, czy dowiozłeś',
  wl_firefight: 'gaszenie cudzych pilnych spraw, a swoją pracę po godzinach',
  wl_people: 'odpowiedzialność za decyzje, na które czekają inni',
  wl_owner: 'prowadzenie firmy, w której niedokończone sprawy i tak wracają do Ciebie',
};
const GIVE_UP_MOMENT: Record<string, string> = {
  gup_weekend: 'kiedy zaczyna się weekend',
  gup_wieczor: 'wieczorem po pracy',
  gup_stres: 'kiedy rośnie presja w robocie albo w głowie',
  gup_czas: 'kiedy nie mieścisz wszystkiego w dniu',
  gup_efekt: 'kiedy przez jakiś czas nie widzisz efektu',
};
const TRIGGER_DOMAIN: Record<string, string> = {
  gup_weekend: 'weekend',
  gup_wieczor: 'wieczor',
  gup_stres: 'praca',
  gup_czas: 'praca',
};
const EE_CONSEQUENCE: Record<string, string> = {
  ee_snack: 'przekąskę poza planem',
  ee_binge: 'wieczory, kiedy jesz więcej, niż chciałeś',
  ee_uncontrolled: 'wieczory z jedzeniem bez kontroli',
  ee_chaos: 'nierówny rytm jedzenia pod koniec dnia',
};
function crossDomainConsequence(answers: RawAnswers, triggerDomain: string): string | null {
  // Wybieramy sygnal z innego obszaru niz deklarowany moment odpuszczenia.
  // Zadna linia nie dopowiada godziny spania ani skutku, o ktory nie pytalismy.
  const sq = s(answers.sleep_quality);
  const pair = trainingPair(answers);
  const st = s(answers.stress_level), wp = s(answers.weekend_pattern);
  const candidates: Array<{ domain: string; text?: string }> = [
    { domain: 'sen', text: sq === 'sq_heavy' || sq === 'sq_wrecked' ? 'poranki, kiedy budzisz się bez gotowości na dzień' : undefined },
    { domain: 'trening', text: pair && pair.missed >= 1 ? 'trening, który miałeś wpisany w tydzień, a który wypada' : undefined },
    { domain: 'wieczor', text: EE_CONSEQUENCE[s(answers.evening_eating)] },
    { domain: 'praca', text: st === 'st_high' || st === 'st_max' ? 'wieczory, kiedy głowa nadal jest w robocie' : undefined },
    { domain: 'weekend', text: wp === 'wp_shifted' || wp === 'wp_reset' ? 'weekend, który wyraźnie odbiega od dni roboczych' : undefined },
  ];
  return candidates.find((c) => c.text && c.domain !== triggerDomain)?.text || null;
}
const MONDAY_FACT: Record<string, string> = {
  mon_1: 'W poniedziałek potrzebujesz do południa, żeby wrócić do swojego zwykłego poziomu.',
  mon_2: 'Zwykły poziom czujesz dopiero we wtorek.',
  mon_3: 'Zwykły poziom czujesz dopiero w środę albo później.',
};
export function computeWhyRepeats(answers: RawAnswers): string {
  const work = WORK_ANCHOR[s(answers.work_load)];
  const gup = s(answers.give_up_point);
  const moment = GIVE_UP_MOMENT[gup];
  const otherSignal = crossDomainConsequence(answers, TRIGGER_DOMAIN[gup] || '');
  const tried = s(answers.tried_before);
  const restart = tried === 'tb_2'
    ? 'W ostatnim roku trzy albo cztery plany nie dożyły miesiąca.'
    : tried === 'tb_3'
      ? 'W ostatnim roku co najmniej pięć planów nie dożyło miesiąca.'
      : '';
  const facts = [
    work ? `W pracy wskazałeś: ${work}.` : '',
    moment ? `Najłatwiej odpuszczasz ${moment}.` : '',
    otherSignal ? `Osobno zaznaczyłeś też: ${otherSignal}.` : '',
    MONDAY_FACT[s(answers.monday_recovery)] || '',
    restart,
  ].filter(Boolean);
  // Roznica miedzy danymi i interpretacja: te odpowiedzi nie mierza kierunku przyczynowosci.
  const hypothesis = gup === 'gup_efekt'
    ? 'Możliwy trop: oceniasz cały plan po końcowym efekcie, zanim sprawdzisz postęp w jednym zachowaniu.'
    : work && moment
      ? 'Możliwy trop: sprawy z jasnym terminem mają swoje miejsce w dniu, a Twoje własne mogą go nie mieć.'
      : 'Te sygnały mogą się łączyć, ale z samych odpowiedzi nie wiemy jeszcze, w jakiej kolejności.';
  return [...facts, hypothesis, 'To jest hipoteza do przetestowania, nie gotowa diagnoza.'].join(' ');
}

// ── BEAT 4: realny koszt, WYLACZNIE jawne fakty z odpowiedzi. Max 3. Zero zmyslonych rocznych kwot. ──
export function computeCostFacts(answers: RawAnswers): string[] {
  const out: string[] = [];
  const push = (cond: boolean, line: string) => { if (cond && out.length < 3) out.push(line); };
  const hp = n(answers.half_power_hours);
  const pair = trainingPair(answers);
  const mon = s(answers.monday_recovery);

  push(typeof hp === 'number' && hp > 0, `${hoursPl(hp as number)} h dziennie lecisz według siebie na pół mocy.`);
  // zero wypadajacych treningow nie jest kosztem — bez tego warunku blok "co to juz kosztuje" otwieral sie zdaniem "0 z 3 treningow wypada"
  push(Boolean(pair && pair.missed >= 1), pair ? `Kiedy tydzień się rozjeżdża, ${missedPhrase(pair.planned, pair.missed)}.` : '');
  // szablon nizej ma juz "dopiero" — etykieta nie moze go powtarzac ("wracasz do siebie dopiero dopiero we wtorek")
  const monLabel: Record<string, string> = { mon_1: 'w poniedziałek po południu', mon_2: 'we wtorek', mon_3: 'w środę albo później' };
  push(!!monLabel[mon], `Po weekendzie wracasz do siebie dopiero ${monLabel[mon] || ''}.`);
  // takeout_cost jest wyciety z flow na stale, wiec linia o kwocie za dowozy nie mogla sie nigdy pokazac.
  // Lepiej nie trzymac w silniku faktu, ktory udaje, ze dziala.
  return out;
}
