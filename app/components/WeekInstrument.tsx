'use client';

// ── PRZYRZĄD 168 ──────────────────────────────────────────────────────────────
// Sygnaturowy element wizualny diagnostyki. 7 kolumn x 24 wiersze = 168 komórek,
// czyli dosłownie przedmiot pomiaru. Komórki zapalają się w miarę odpowiadania:
// sekcja quizu mapuje się na realne pory tygodnia, więc siatka pokazuje CO JUŻ
// ZMIERZONO, nie ozdobę. Odczyt "ZMIERZONO n/168 h" zastępuje procent postępu.
//
// Uczciwość: jasność komórki = ile z danej sekcji człowiek już odpowiedział.
// Temperatura = jego własna odpowiedź na skali. Nic tu nie jest zmyślane
// ani nie wyprzedza werdyktu z Karty.
//
// Wariant "panel" = prawa kolumna na desktopie. Wariant "strip" = pasek na mobile.

export type SectionKey = string;

type Slot = { days: number[]; hours: number[] };

// Mapa sekcji quizu na realne godziny tygodnia. Dni: 0=pon ... 6=nd.
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WORK_DAYS = [0, 1, 2, 3, 4];
const WEEKEND = [5, 6];
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const SECTION_SLOTS: Record<SectionKey, Slot> = {
  'Rytm tygodnia': { days: ALL_DAYS, hours: range(7, 9) },
  'Sen': { days: ALL_DAYS, hours: [23, ...range(0, 6)] },
  'Jedzenie': { days: ALL_DAYS, hours: [12, 13, 19, 20] },
  'Trening': { days: WORK_DAYS, hours: range(17, 19) },
  'Weekend': { days: WEEKEND, hours: range(10, 22) },
  'Napęd': { days: WORK_DAYS, hours: range(9, 16) },
  'Głowa': { days: WORK_DAYS, hours: range(14, 16) },
  'Gdzie się sypie': { days: ALL_DAYS, hours: range(21, 22) },
  'Główna przeszkoda': { days: ALL_DAYS, hours: range(10, 11) },
  'Kontekst': { days: ALL_DAYS, hours: [6] },
  'Po co tu jesteś': { days: ALL_DAYS, hours: [] },
  'Co dalej': { days: ALL_DAYS, hours: [] },
  'Kontakt': { days: ALL_DAYS, hours: [] },
};

export type SectionState = { answered: number; total: number; load: number };

type QLike = {
  id: string;
  section?: string;
  type?: string;
  options?: { id: string }[];
  min?: number;
  max?: number;
};

/** Normalizuje odpowiedź do 0..1. Brak odpowiedzi -> null. */
function normalize(q: QLike, value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (q.type === 'single' && q.options?.length) {
    const i = q.options.findIndex(o => o.id === value);
    return i < 0 ? 0.5 : q.options.length < 2 ? 0.5 : i / (q.options.length - 1);
  }
  if (q.type === 'slider' || q.type === 'number') {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0.5;
    const min = q.min ?? 0;
    const max = q.max ?? 10;
    if (max === min) return 0.5;
    return Math.min(1, Math.max(0, (n - min) / (max - min)));
  }
  if (Array.isArray(value)) return value.length ? Math.min(1, value.length / 4) : null;
  return 0.5;
}

/** Buduje stan sekcji z listy widocznych pytań i odpowiedzi. Czysta funkcja. */
export function buildWeekState(
  questions: QLike[],
  answers: Record<string, unknown>,
): Record<SectionKey, SectionState> {
  const out: Record<SectionKey, SectionState> = {};
  for (const q of questions) {
    const s = q.section;
    if (!s) continue;
    if (!out[s]) out[s] = { answered: 0, total: 0, load: 0 };
    out[s].total += 1;
    const n = normalize(q, answers[q.id]);
    if (n !== null) {
      out[s].answered += 1;
      out[s].load += n;
    }
  }
  for (const s of Object.keys(out)) {
    if (out[s].answered > 0) out[s].load /= out[s].answered;
  }
  return out;
}

/** Ile godzin tygodnia jest już pokrytych zmierzonymi sekcjami. */
export function measuredHours(state: Record<SectionKey, SectionState>): number {
  const cells = new Set<string>();
  for (const [section, st] of Object.entries(state)) {
    if (st.answered === 0) continue;
    const slot = SECTION_SLOTS[section];
    if (!slot) continue;
    for (const d of slot.days) for (const h of slot.hours) cells.add(`${d}:${h}`);
  }
  return cells.size;
}

type CellTone = { fill: number; load: number };

function buildCells(state: Record<SectionKey, SectionState>, activeSection?: string | null) {
  // fill 0..1 = ile z sekcji odpowiedziano, load 0..1 = charakter odpowiedzi
  const grid: (CellTone & { active: boolean })[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({ fill: 0, load: 0, active: false })),
  );
  for (const [section, st] of Object.entries(state)) {
    const slot = SECTION_SLOTS[section];
    if (!slot) continue;
    const fill = st.total ? st.answered / st.total : 0;
    const isActive = section === activeSection;
    for (const d of slot.days) {
      for (const h of slot.hours) {
        const cell = grid[d]?.[h];
        if (!cell) continue;
        if (fill > cell.fill) {
          cell.fill = fill;
          cell.load = st.load;
        }
        if (isActive) cell.active = true;
      }
    }
  }
  return grid;
}

const DAY_LABELS = ['PN', 'WT', 'ŚR', 'CZ', 'PT', 'SO', 'ND'];

export function WeekInstrument({
  state,
  activeSection,
  variant = 'panel',
}: {
  state: Record<SectionKey, SectionState>;
  activeSection?: string | null;
  variant?: 'panel' | 'strip';
}) {
  const grid = buildCells(state, activeSection);
  const measured = measuredHours(state);

  if (variant === 'strip') {
    // Mobile: jeden rząd 168 kresek. Tani render, ta sama informacja.
    const flat: (CellTone & { active: boolean })[] = [];
    for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) flat.push(grid[d][h]);
    return (
      <div className="wi-strip" aria-hidden>
        <svg viewBox="0 0 336 12" preserveAspectRatio="none" className="wi-strip-svg">
          {flat.map((c, i) => (
            <rect
              key={i}
              x={i * 2}
              y={c.fill > 0 ? 0 : 4}
              width={1.2}
              height={c.fill > 0 ? 12 : 4}
              fill={cellFill(c, Math.floor(i / 24), i % 24)}
              opacity={cellOpacity(c, Math.floor(i / 24), i % 24)}
            />
          ))}
        </svg>
        <div className="wi-readout wi-readout-strip">
          <span className="wi-num">{measured}</span>
          <span className="wi-unit">/168</span>
          <span className="wi-caption wi-caption-strip">GODZIN ZMIERZONYCH</span>
        </div>
      </div>
    );
  }

  // Desktop: pełny przyrząd 7 x 24.
  const CW = 14; // szerokość kolumny
  const CH = 7; // wysokość komórki
  const GAP = 2;
  const PAD_L = 22;
  const PAD_T = 16;
  const w = PAD_L + 7 * (CW + GAP);
  const h = PAD_T + 24 * (CH + GAP);

  return (
    <div className="wi-panel" aria-hidden>
      <div className="wi-label">PRZYRZĄD 168</div>
      <svg viewBox={`0 0 ${w} ${h}`} className="wi-svg">
        {DAY_LABELS.map((d, i) => (
          <text key={d} x={PAD_L + i * (CW + GAP) + CW / 2} y={10} className="wi-daylabel" textAnchor="middle">
            {d}
          </text>
        ))}
        {[0, 6, 12, 18].map(hr => (
          <text key={hr} x={0} y={PAD_T + hr * (CH + GAP) + CH} className="wi-hourlabel">
            {String(hr).padStart(2, '0')}
          </text>
        ))}
        {grid.map((col, d) =>
          col.map((c, hr) => (
            <rect
              key={`${d}-${hr}`}
              x={PAD_L + d * (CW + GAP)}
              y={PAD_T + hr * (CH + GAP)}
              width={CW}
              height={CH}
              rx={1.5}
              fill={cellFill(c, d, hr)}
              opacity={cellOpacity(c, d, hr)}
              className={c.active ? 'wi-cell wi-cell-active' : 'wi-cell'}
            />
          )),
        )}
      </svg>
      <div className="wi-readout">
        <span className="wi-num">{measured}</span>
        <span className="wi-unit">/168</span>
      </div>
      <div className="wi-caption">GODZIN TYGODNIA ZMIERZONYCH</div>
    </div>
  );
}

// Zimny błękit = godziny jeszcze nieznane. Złoto = zmierzone.
// Im wyżej na skali odpowiedział, tym cieplej, bez sugerowania werdyktu.
//
// Szum: deterministyczne rozchwianie jasności per komórka. Bez niego zapalona
// sekcja jest jednolitą plamą i czyta się jak pasek postępu, a nie jak odczyt.
// Ziarno jest stałe dla danej pary (dzień, godzina), więc nic nie miga.
function jitter(d: number, hr: number): number {
  const n = Math.sin(d * 12.9898 + hr * 78.233) * 43758.5453;
  return n - Math.floor(n); // 0..1
}

function cellFill(c: CellTone, d: number, hr: number): string {
  if (c.fill <= 0) return '#2a323e';
  const warm = c.load;
  const j = 0.88 + 0.24 * jitter(d, hr);
  const r = Math.round(Math.min(255, (148 + 78 * warm) * j));
  const g = Math.round(Math.min(255, (126 + 38 * warm) * j));
  const b = Math.round(Math.max(0, (94 - 32 * warm) * j));
  return `rgb(${r},${g},${b})`;
}

function cellOpacity(c: CellTone, d: number, hr: number): number {
  if (c.fill <= 0) return 0.5 + 0.22 * jitter(d, hr);
  return (0.32 + 0.6 * c.fill) * (0.86 + 0.28 * jitter(hr, d));
}
