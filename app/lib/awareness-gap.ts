// ── awareness-gap.ts: luka miedzy samoocena a wlasnymi odpowiedziami ──
//
// PO CO TO ISTNIEJE (v2.9, Michal 2026-09-16):
// Caly poprzedni flow pytal wylacznie o ZACHOWANIE: ile razy, jak czesto, co sie dzieje wieczorem.
// Czlowiek, ktory uwaza, ze u niego wszystko gra, przechodzil przez to spokojnie, bo na kazde
// pytanie mial uczciwa odpowiedz i nigdzie nie widzial samego siebie. Nie bylo go z czym skonfrontowac.
// 'self_energy' (ekran 2, PRZED jakimkolwiek pytaniem o zachowanie, zeby sie nie skalibrowal) daje
// druga liczbe. Roznica miedzy nia a energia policzona z jego wlasnych klikniec jest mechanizmem
// uswiadomienia. Zero oceny z naszej strony, sam rachunek.
//
// TWARDE ZASADY:
// - §6 uczciwosc liczbowa: kazdy odjety punkt ma zdanie wskazujace konkretna odpowiedz. Zero fikcji.
// - To NIE jest wynik medyczny, procent potencjalu ani teza hormonalna. Skala porownuje czlowieka
//   wylacznie z jego wlasna samoocena.
// - Wartosc 0 wplywu na severity, archetyp i trase sprzedazowa (§10). To warstwa narracyjna.

import type { RawAnswers } from './scoring-engine.ts';

export type GapVerdict = 'ABOVE' | 'ALIGNED' | 'BELOW' | 'NONE';

export interface AwarenessGap {
  verdict: GapVerdict;
  selfEnergy?: number;
  measuredEnergy?: number;
  gap?: number;
  headline: string;
  body: string;
  drivers: string[];
  stagnationLine?: string;
  selfDrive?: number;
  driveLine?: string;
}

interface Component {
  cost: number;
  line: string;
}

const s = (v: unknown): string => (typeof v === 'string' ? v : '');
const n = (v: unknown): number | undefined => (typeof v === 'number' && !Number.isNaN(v) ? v : undefined);

// Kazda skladowa: ile punktow schodzi z dziesiatki + zdanie, ktore wskazuje ODPOWIEDZ, nie diagnoze.
const SLEEP: Record<string, Component> = {
  sq_wrecked: { cost: 3.5, line: 'Gotowy na dzień nie budzisz się prawie nigdy.' },
  sq_heavy: { cost: 2.5, line: 'Gotowy na dzień budzisz się 1-2 razy w tygodniu.' },
  sq_ok: { cost: 1, line: 'Gotowy na dzień budzisz się 3-4 razy w tygodniu.' },
  sq_great: { cost: 0, line: 'Prawie codziennie budzisz się z energią.' },
};

const STRESS: Record<string, Component> = {
  st_max: { cost: 2, line: 'Codziennie zasypiasz z listą w głowie.' },
  st_high: { cost: 1.5, line: 'Cztery albo pięć wieczorów w tygodniu leżysz w łóżku i planujesz.' },
  st_mid: { cost: 0.5, line: 'Dwa albo trzy wieczory w tygodniu głowa dalej pracuje.' },
  st_low: { cost: 0, line: 'Kładziesz się i zasypiasz.' },
};

const MONDAY: Record<string, Component> = {
  mon_3: { cost: 2, line: 'Po weekendzie wracasz na swój poziom dopiero w środę albo później.' },
  mon_2: { cost: 1.5, line: 'Po weekendzie wracasz na swój poziom dopiero we wtorek.' },
  mon_1: { cost: 0.5, line: 'W poniedziałek potrzebujesz do południa, żeby się rozkręcić.' },
  mon_0: { cost: 0, line: 'W poniedziałek startujesz na swoim zwykłym poziomie.' },
};

const EVENING: Record<string, Component> = {
  ee_chaos: { cost: 1.5, line: 'Każdy wieczór z jedzeniem wygląda u Ciebie inaczej.' },
  ee_uncontrolled: { cost: 1.25, line: 'Trzy wieczory albo więcej kończą się jedzeniem bez kontroli.' },
  ee_binge: { cost: 0.75, line: 'Raz albo dwa razy w tygodniu jesz dużo więcej, niż chciałeś.' },
  ee_snack: { cost: 0.25, line: 'Dochodzi jedna przekąska poza planem.' },
  ee_clean: { cost: 0, line: 'Jesz tyle, ile zaplanowałeś.' },
};

const STAGNATION: Record<string, string> = {
  st12_forward: 'Do tego forma przez dwanaście miesięcy poszła do przodu. Ten kawałek zostaje w mocy.',
  st12_flat: 'Do tego dwanaście miesięcy i forma stoi w tym samym miejscu.',
  st12_back: 'Do tego przez dwanaście miesięcy forma się cofnęła.',
  st12_unknown: 'Przez dwanaście miesięcy tego nie sprawdzałeś, więc nie wiesz, czy cokolwiek ruszyło.',
};

// Liczba godzin na pol mocy to jedyna skladowa ciagla. 0,75 pkt za godzine, wiec pelne cztery
// godziny kosztuja 3 punkty i nie sa w stanie samodzielnie zjechac czlowieka na dno skali.
function halfPowerComponent(hours: number): Component {
  const pretty = Number.isInteger(hours) ? String(hours) : String(hours).replace('.', ',');
  return { cost: hours * 0.75, line: `Na pół mocy lecisz ${pretty} h dziennie.` };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const pl = (v: number) => String(round1(v)).replace('.', ',');

const EMPTY: AwarenessGap = { verdict: 'NONE', headline: '', body: '', drivers: [] };

export function computeAwarenessGap(answers: RawAnswers): AwarenessGap {
  const selfEnergy = n(answers.self_energy);
  const selfDrive = n(answers.self_drive);
  const stagnationLine = STAGNATION[s(answers.stagnation_12m)];

  const comps: Component[] = [];
  const sleep = SLEEP[s(answers.sleep_quality)];
  if (sleep) comps.push(sleep);
  const stress = STRESS[s(answers.stress_level)];
  if (stress) comps.push(stress);
  const monday = MONDAY[s(answers.monday_recovery)];
  if (monday) comps.push(monday);
  const evening = EVENING[s(answers.evening_eating)];
  if (evening) comps.push(evening);
  const hours = n(answers.half_power_hours);
  if (hours !== undefined) comps.push(halfPowerComponent(hours));

  // Ponizej trzech skladowych rachunek jest za cienki, zeby komukolwiek pokazywac liczbe.
  // Wtedy sekcja po prostu sie nie renderuje. Lepszy brak niz liczba zbudowana na domysle.
  if (selfEnergy === undefined || comps.length < 3) {
    return { ...EMPTY, selfEnergy, selfDrive, stagnationLine, driveLine: driveLineFor(selfDrive) };
  }

  const measuredEnergy = round1(clamp(10 - comps.reduce((acc, c) => acc + c.cost, 0), 1, 10));
  const gap = round1(selfEnergy - measuredEnergy);

  const drivers = comps
    .filter((c) => c.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 3)
    .map((c) => c.line);

  const verdict: GapVerdict = gap >= 1.5 ? 'ABOVE' : gap <= -1.5 ? 'BELOW' : 'ALIGNED';
  const pair = `Dałeś sobie ${pl(selfEnergy)}/10. Z Twoich własnych odpowiedzi wychodzi ${pl(measuredEnergy)}/10.`;

  const body =
    verdict === 'ABOVE'
      ? 'Ta różnica bierze się z godzin, których przy ocenianiu własnej energii nikt sobie nie liczy. Poniżej masz je wypisane.'
      : verdict === 'BELOW'
        ? 'Jesteś dla siebie ostrzejszy niż Twój własny tydzień. Poniżej masz to, co Twoje odpowiedzi mówią naprawdę.'
        : 'Widzisz swój tydzień trzeźwo. Poniżej masz odpowiedzi, które złożyły się na tę liczbę.';

  const headline =
    verdict === 'ABOVE'
      ? `${pair} Różnica to ${pl(gap)} punktu.`
      : pair;

  return {
    verdict,
    selfEnergy,
    measuredEnergy,
    gap,
    headline,
    body,
    drivers,
    stagnationLine,
    selfDrive,
    driveLine: driveLineFor(selfDrive),
  };
}

// Napęd: zbieramy liczbe, nie stawiamy zadnej tezy hormonalnej. Nawet przy najnizszej ocenie
// jedyne, co wolno nam powiedziec, to zaproszenie do lekarza. Zero slowa o testosteronie.
function driveLineFor(selfDrive?: number): string | undefined {
  if (selfDrive === undefined || selfDrive > 4) return undefined;
  return `Napęd i libido oceniasz na ${pl(selfDrive)}/10. Jeśli trzyma się tak dłużej niż kilka tygodni, warto zrobić badania i omówić je z lekarzem. Ta diagnostyka stoi na Twoich odpowiedziach i tego nie zastąpi.`;
}
