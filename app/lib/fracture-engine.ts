// ── RESULT PAGE V3 — silnik Beatow 1-4 (Punkt Pekniecia, Petla 168, Dlaczego wraca, Realny koszt) ──
// Zero runtime LLM. Zero nowej psychologii: Petla i "dlaczego wraca" sklejaja ISTNIEJACA, zatwierdzona
// tresc per archetyp (result-content.ts) z realnymi odpowiedziami usera. Koszt = wylacznie jawne fakty.
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

// ── BEAT 1: max 2 evidence receipts, WYLACZNIE z realnych odpowiedzi (truth gate) ──
export function computeEvidenceReceipts(answers: RawAnswers): string[] {
  const out: string[] = [];
  const push = (cond: boolean, line: string) => { if (cond && out.length < 2) out.push(line); };
  const stress = s(answers.stress_level);
  const hp = n(answers.half_power_hours);
  const ee = s(answers.evening_eating);
  const wp = s(answers.weekend_pattern);
  const missed = n(answers.missed_trainings);
  const planned = n(answers.planned_trainings);
  const tried = s(answers.tried_before);

  push(stress === 'st_high' || stress === 'st_max', 'Powiedziałeś, że wieczorem głowa dalej jest w robocie.');
  push(typeof hp === 'number' && hp >= 2, `Do tego oceniłeś, że lecisz około ${hp} h dziennie na pół mocy.`);
  push(ee === 'ee_binge' || ee === 'ee_uncontrolled' || ee === 'ee_chaos', 'Zaznaczyłeś, że wieczorem częściej puszcza kontrola nad jedzeniem.');
  push(wp === 'wp_shifted' || wp === 'wp_reset', 'Powiedziałeś, że weekend regularnie rozjeżdża Ci rytm.');
  push(typeof missed === 'number' && typeof planned === 'number' && planned >= 1 && missed >= 1, `Z ${planned} treningów w tygodniu ${missed} wypada, kiedy robi się ciężej.`);
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
  const planned=n(answers.planned_trainings), missed=n(answers.missed_trainings), hp=n(answers.half_power_hours);
  const ee=s(answers.evening_eating), stress=s(answers.stress_level), wp=s(answers.weekend_pattern);
  if (typeof planned === 'number' && planned > 0 && typeof missed === 'number' && missed > 0) return `W cięższym tygodniu wypada ${missed} z ${planned} treningów.`;
  if (['ee_binge','ee_uncontrolled','ee_chaos'].includes(ee)) return 'Pod koniec dnia jedzenie częściej wychodzi poza plan.';
  if (typeof hp === 'number' && hp >= 2) return `Około ${hp} h dziennie oceniasz jako jazdę na pół mocy.`;
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
export function computeLoop(breakPhrase: string, evidence: string[], answers: RawAnswers, confidence: Confidence): { nodes: LoopNode[]; uncertain: boolean } {
  const gup=s(answers.give_up_point);
  const uncertain=confidence === 'LOW';
  return { uncertain, nodes: [
    { label: 'Pierwszy moment', text: breakPhrase },
    { label: 'Kiedy najłatwiej odpuszczasz', text: GUP_NODE[gup] || 'Nie wskazałeś jednego stałego momentu odpuszczenia.' },
    { label: 'Co widać w tygodniu', text: visibleEffect(answers, evidence) },
    { label: 'Powrót po weekendzie', text: returnSignal(answers) },
    { label: 'Wniosek', text: uncertain ? 'Odpowiedzi pokazują kilka różnych momentów. Nie łączę ich na siłę. Test 72h ma sprawdzić pierwszy z nich.' : 'Te odpowiedzi składają się w jeden roboczy ciąg. Najpierw sprawdzamy pierwszy moment, bo tam najszybciej widać, czy kolejne elementy zmieniają się razem z nim.' },
  ] };
}

// ── BEAT 3: dlaczego to wraca. Sklejone z give_up_point + tried_before + break_window (realne pola). ──
const GUP_LABEL: Record<string, string> = {
  gup_weekend: 'wchodzi weekend',
  gup_wieczor: 'kończy się dzień i wchodzi wieczór',
  gup_stres: 'w robocie albo w głowie zaczyna się palić',
  gup_efekt: 'nie widać jeszcze efektów',
  gup_czas: 'brakuje czasu',
};
const KONKRET_LABEL: Record<string, string> = {
  ee_binge: 'kontrola nad jedzeniem wieczorem',
  ee_uncontrolled: 'kontrola nad jedzeniem wieczorem',
  ee_chaos: 'stały rytm jedzenia',
  st_high: 'spokojne zejście z pracy',
  st_max: 'spokojne zejście z pracy',
  wp_shifted: 'stały rytm weekendu',
  wp_reset: 'stały rytm weekendu',
};
export function computeWhyRepeats(answers: RawAnswers): string {
  const gup = s(answers.give_up_point);
  const trigger = GUP_LABEL[gup] || 'coś nieplanowanego wchodzi w tydzień';
  const eeOrSt = s(answers.evening_eating) || s(answers.stress_level) || s(answers.weekend_pattern);
  const konkret = KONKRET_LABEL[eeOrSt] || 'pierwszy punkt planu';
  const tried = s(answers.tried_before);
  const restart = tried === 'tb_2' || tried === 'tb_3' ? 'zaczynasz od nowa, jakby poprzedni tydzień się nie liczył' : 'próbujesz wrócić tam, gdzie skończyłeś';
  return `Zaczynasz od dobrego punktu i przez kilka dni to trzyma. Potem ${trigger}. Pierwsza rzecz, która wtedy wypada, to ${konkret}. Później ${restart}.`;
}

// ── BEAT 4: realny koszt, WYLACZNIE jawne fakty z odpowiedzi. Max 3. Zero zmyslonych rocznych kwot. ──
export function computeCostFacts(answers: RawAnswers): string[] {
  const out: string[] = [];
  const push = (cond: boolean, line: string) => { if (cond && out.length < 3) out.push(line); };
  const hp = n(answers.half_power_hours);
  const missed = n(answers.missed_trainings);
  const planned = n(answers.planned_trainings);
  const mon = s(answers.monday_recovery);
  const takeout = n(answers.takeout_cost);

  push(typeof hp === 'number' && hp > 0, `${hp} h dziennie lecisz według siebie na pół mocy.`);
  push(typeof missed === 'number' && typeof planned === 'number' && planned >= 1, `${missed} z ${planned} treningów wypada, kiedy tydzień się rozjeżdża.`);
  // szablon nizej ma juz "dopiero" — etykieta nie moze go powtarzac ("wracasz do siebie dopiero dopiero we wtorek")
  const monLabel: Record<string, string> = { mon_1: 'w poniedziałek po południu', mon_2: 'we wtorek', mon_3: 'w środę albo później' };
  push(!!monLabel[mon], `Po weekendzie wracasz do siebie dopiero ${monLabel[mon] || ''}.`);
  push(typeof takeout === 'number' && takeout > 0, `Na dowozy i jedzenie poza domem podałeś około ${takeout} zł miesięcznie.`);
  return out;
}
