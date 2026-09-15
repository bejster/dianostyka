// ── PREMIUM FIT: klasyfikacja leada wg PREMIUM ICP / VOC CANON — PATCH V1 (§3, §4, §12) ──
//
// CO TO JEST: czysta funkcja czytajaca TRZY pytania kwalifikacyjne o wartosci 0
// (work_load, spillover, agency_mode). Zero wplywu na severity, zero wplywu na pieciooosiowa
// Mape 168, zero wplywu na archetyp, punkt pekniecia, bank eksperymentow i routing CTA.
//
// CZEGO TO NIE JEST: to NIE jest werdykt o czlowieku ani druga diagnoza. Patch §12 mowi wprost,
// ze premium segment to na dzis HIPOTEZA KIERUNKOWA. Ta flaga jedzie wylacznie na prywatny kanal
// (Telegram + n8n -> Notion), zeby Michal mogl ja zwalidowac na close rate, retencji i LTV.
// Dopoki walidacja nie przejdzie, nic w produkcie nie ma prawa sie od niej zmieniac.
//
// §2: dlugie godziny, stres, praca siedzaca i brak czasu NIE sa sygnalem premium, wiec nie wchodza
// do tego rachunku. Liczy sie odpowiedzialnosc, spillover, agency i control need.

export type Agency = 'wysoka' | 'srednia' | 'niska';
export type ControlNeed = 'wysoki' | 'niski';
export type PremiumFit = 'PRO' | 'KIERUNEK' | 'RYZYKO' | 'PODSTAWA';

export interface PremiumSignals {
  responsibility: boolean; // §3A: niesie realna odpowiedzialnosc za wynik albo za ludzi
  stakes: boolean;         // §3E: koszt siega poza lustro
  agency: Agency;          // §3D
  controlNeed: ControlNeed;// §3C
  fit: PremiumFit;         // §4: macierz AGENCY x CONTROL NEED x STAKES
}

// work_load: kazda odpowiedz poza "o 17 zamykam laptopa" oznacza realna odpowiedzialnosc.
const NO_RESPONSIBILITY = 'wl_clock';
// spillover: sp_none to jawna deklaracja braku stawki poza sylwetka.
const NO_STAKES = 'sp_none';

export function classifyPremiumFit(raw: Record<string, unknown>): PremiumSignals {
  const workLoad = typeof raw.work_load === 'string' ? raw.work_load : '';
  const spill = Array.isArray(raw.spillover) ? (raw.spillover as string[]) : [];
  const agencyMode = typeof raw.agency_mode === 'string' ? raw.agency_mode : '';
  const intent = typeof raw.intent === 'string' ? raw.intent : '';

  const responsibility = Boolean(workLoad) && workLoad !== NO_RESPONSIBILITY;
  // stakes tylko wtedy, gdy zaznaczyl cokolwiek POZA sp_none. Brak odpowiedzi to brak dowodu,
  // nie dowod braku: pytanie jest ukryte dla wl_clock, wiec nie karzemy za nieobejrzany ekran.
  const stakes = spill.some((id) => id !== NO_STAKES);

  // agency_mode jest ukryty dla intent === 'in_sam'. Kto deklaruje "ogarne sam", juz odpowiedzial:
  // wysoka agency, niski control need. To nie domysl, tylko ta sama informacja z wczesniejszego ekranu.
  if (!agencyMode && intent === 'in_sam') {
    return { responsibility, stakes, agency: 'wysoka', controlNeed: 'niski', fit: responsibility && stakes ? 'KIERUNEK' : 'PODSTAWA' };
  }

  const agency: Agency =
    agencyMode === 'ag_solo' || agencyMode === 'ag_data' ? 'wysoka'
    : agencyMode === 'ag_return' ? 'srednia'
    : agencyMode === 'ag_handoff' ? 'niska'
    : 'srednia'; // brak odpowiedzi: nie zgadujemy w zadna strone

  const controlNeed: ControlNeed =
    agencyMode === 'ag_solo' ? 'niski'
    : agencyMode === 'ag_data' || agencyMode === 'ag_return' || agencyMode === 'ag_handoff' ? 'wysoki'
    : intent === 'in_prowadz' ? 'wysoki'
    : 'niski';

  // §4: niska agency przy wysokim control need to klient ryzykowny. Patch mowi wprost, zeby nie mylic
  // "potrzebuje pomocy" z "chce, zeby ktos zrobil to za mnie", wiec ta galaz idzie pierwsza.
  if (agency === 'niska' && controlNeed === 'wysoki') {
    return { responsibility, stakes, agency, controlNeed, fit: 'RYZYKO' };
  }
  if (!responsibility || !stakes) {
    return { responsibility, stakes, agency, controlNeed, fit: 'PODSTAWA' };
  }
  if (agency === 'wysoka' && controlNeed === 'wysoki') {
    return { responsibility, stakes, agency, controlNeed, fit: 'PRO' };
  }
  if (agency === 'wysoka') {
    return { responsibility, stakes, agency, controlNeed, fit: 'KIERUNEK' };
  }
  return { responsibility, stakes, agency, controlNeed, fit: 'KIERUNEK' };
}

// Jedna linia do wiadomosci na Telegramie. Czytelna na telefonie, bez zargonu z patcha.
const FIT_LABEL: Record<PremiumFit, string> = {
  PRO: 'PRO — dowozi i chce kontroli, najlepszy kandydat na 1:1',
  KIERUNEK: 'KIERUNEK — dowozi sam, wystarczy mu kierunek',
  RYZYKO: 'RYZYKO — chce, zeby ktos zrobil to za niego',
  PODSTAWA: 'PODSTAWA — brak odpowiedzialnosci albo stawki poza sylwetka',
};

export function premiumFitLine(s: PremiumSignals): string {
  return `Fit: ${FIT_LABEL[s.fit]} · agency ${s.agency} · potrzeba kontroli ${s.controlNeed}`;
}
