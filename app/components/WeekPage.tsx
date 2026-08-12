import type { WeekPlan, DayState } from '../lib/week-plan';
import SaveCardButton from './SaveCardButton';
import { PROOF } from '../lib/proof';
import { CASES } from '../lib/cases';
import { Atmosphere } from '../diagnoza/atmosphere';
import { track } from '../lib/analytics';

// ── KARTA TYGODNIA ──
// Sygnatura: krzywa napięcia tygodnia (linia jak z odczytu kortyzolu/tętna),
// która narasta do piku w dniu, w którym jego tydzień pęka. Deterministyczna,
// liczona ze stanów dni. Reszta strony trzyma się cicho wokół tej jednej rzeczy.

const C = {
  ink: '#08080a', panel: '#141416', panel2: '#1a1a1d', line: '#26262b', line2: '#33333a',
  gold: '#c8a84e', goldBright: '#e8cc80', goldDeep: '#8a7535', goldGlow: 'rgba(200,168,78,0.18)', numGold: '#ab9147',
  amber: '#e0812e', hot: '#e0552e',
  paper: '#ece7db', mute: '#a49e92', faint: '#8f887c',
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  serif: "'Instrument Serif', Georgia, serif",
  sans: "'Inter', system-ui, -apple-system, sans-serif",
};

// napięcie 0-100 per stan dnia -> wysokość piku na krzywej
const TENSION: Record<DayState, number> = { good: 16, ok: 42, risk: 68, break: 94 };
const STATE_WORD: Record<DayState, string> = { good: 'trzyma', ok: 'chwieje', risk: 'ryzyko', break: 'pęka' };
const STATE_COLOR: Record<DayState, string> = { good: C.faint, ok: C.gold, risk: C.amber, break: C.hot };

// gładka ścieżka przez punkty (Catmull-Rom -> Bezier), determinstyczna
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function TensionCurve({ week }: { week: WeekPlan['week'] }) {
  const W = 700, H = 240, padX = 26, padTop = 30, padBot = 46;
  const innerW = W - padX * 2, innerH = H - padTop - padBot;
  const pts = week.map((d, i) => ({
    x: padX + (innerW * i) / (week.length - 1),
    y: padTop + innerH * (1 - TENSION[d.state] / 100),
  }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1].x} ${padTop + innerH} L ${pts[0].x} ${padTop + innerH} Z`;
  // pik: pierwszy 'break'. Brak break = płaski tydzień (stały wyciek), nie ma jednego dnia
  const hasBreak = week.some((d) => d.state === 'break');
  let peak = 0;
  for (let i = 0; i < week.length; i++) { if (week[i].state === 'break') { peak = i; break; } if (TENSION[week[i].state] > TENSION[week[peak].state]) peak = i; }
  const peakPt = pts[peak];
  const midPt = pts[Math.floor(week.length / 2)];
  // zabezpieczenie przed obcięciem etykiety "TU PĘKA" na skrajnych dniach
  const peakAnchor = peakPt.x < padX + 44 ? 'start' : peakPt.x > W - padX - 44 ? 'end' : 'middle';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Krzywa napięcia Twojego tygodnia" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="wpArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.gold} stopOpacity="0.30" />
          <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="wpStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={C.goldDeep} />
          <stop offset={`${(peak / (week.length - 1)) * 100}%`} stopColor={C.goldBright} />
          <stop offset="100%" stopColor={C.amber} />
        </linearGradient>
        <filter id="wpGlow" x="-30%" y="-70%" width="160%" height="240%">
          <feGaussianBlur stdDeviation="7" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* siatka odniesienia */}
      {[0.5].map((f) => (
        <line key={f} x1={padX} x2={W - padX} y1={padTop + innerH * f} y2={padTop + innerH * f} stroke={C.line} strokeWidth="1" strokeDasharray="2 5" />
      ))}
      <path d={area} fill="url(#wpArea)" className="wp-area" />
      <path d={line} fill="none" stroke="url(#wpStroke)" strokeWidth="3" strokeLinecap="round" filter="url(#wpGlow)" pathLength={1} className="wp-line" />
      {/* pionowa prowadnica piku (tylko gdy jest realne pęknięcie) */}
      {hasBreak && (
        <line x1={peakPt.x} x2={peakPt.x} y1={peakPt.y} y2={padTop + innerH} stroke={C.hot} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
      )}
      {/* punkty */}
      {pts.map((p, i) => {
        const isPeak = hasBreak && i === peak;
        return (
          <circle key={i} cx={p.x} cy={p.y} r={isPeak ? 5.5 : 3} fill={isPeak ? C.hot : C.ink} stroke={isPeak ? C.hot : STATE_COLOR[week[i].state]} strokeWidth="2" className={isPeak ? 'wp-peak' : 'wp-dot'} />
        );
      })}
      {/* etykieta: pęknięcie albo stały wyciek */}
      {hasBreak ? (
        <text x={peakPt.x} y={peakPt.y - 14} textAnchor={peakAnchor} fontFamily={C.mono} fontSize="11" letterSpacing="1.5" fill={C.hot} fontWeight="700">TU PĘKA</text>
      ) : (
        <text x={midPt.x} y={padTop - 8} textAnchor="middle" fontFamily={C.mono} fontSize="11" letterSpacing="1.5" fill={C.amber} fontWeight="700">STAŁY WYCIEK</text>
      )}
      {/* dni na osi */}
      {week.map((d, i) => {
        const dayPeak = hasBreak && i === peak;
        return (
          <text key={i} x={pts[i].x} y={H - 18} textAnchor="middle" fontFamily={C.mono} fontSize="12" fill={dayPeak ? C.paper : C.faint} fontWeight={dayPeak ? 700 : 500}>{d.day}</text>
        );
      })}
    </svg>
  );
}

function Eyebrow({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: 1 }}>{n}</span>
      <span style={{ width: 26, height: 1, background: C.line2 }} />
      <span style={{ fontFamily: C.mono, fontSize: 10.5, letterSpacing: 3, textTransform: 'uppercase', color: C.mute }}>{children}</span>
    </div>
  );
}

export default function WeekPage({ plan, imie, instagram, naborHref = 'https://nabor.talerzihantle.com/', qualified = false }: { plan: WeekPlan; imie?: string; instagram?: string; naborHref?: string; qualified?: boolean }) {
  const hi = imie?.trim() ? `${imie.trim()}, ` : '';
  return (
    <div className="wp" style={{ background: C.ink, color: C.paper, fontFamily: C.sans, minHeight: '100vh' }}>
      <style>{css}</style>
      <Atmosphere />
      <div className="wp-gutter wp-gutter-l" aria-hidden />
      <div className="wp-gutter wp-gutter-r" aria-hidden>
        <span className="wp-gutter-tag">HANTLE I TALERZ · KARTA TYGODNIA</span>
      </div>
      <div className="wp-wrap">

        {/* MASTHEAD */}
        <header className="wp-rise" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 18, borderBottom: `1px solid ${C.line}`, marginBottom: 52, gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: 5, color: C.gold, fontWeight: 700 }}>HANTLE I TALERZ</span>
          <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 3, color: C.faint, textTransform: 'uppercase' }}>Karta tygodnia · wydanie prywatne</span>
        </header>

        {/* #3: potwierdzenie zapisu + oczekiwanie kontaktu. Telegram-notify z @IG poszedl juz do Michala,
            wiec „odezwe sie" jest prawdziwe; „napisz pierwszy" zostaje pewna sciezka dla niecierpliwych. */}
        {instagram && (
          <div className="wp-noprint" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: C.panel2, border: `1px solid ${C.line2}`, borderRadius: 12, padding: '13px 16px', marginBottom: 44 }}>
            <span aria-hidden style={{ color: C.gold, fontSize: 17, lineHeight: 1.3, flexShrink: 0 }}>✓</span>
            <p style={{ margin: 0, fontSize: 13.5, color: C.mute, lineHeight: 1.55 }}>
              Twój wynik jest już u mnie, pod <b style={{ color: C.paper }}>@{instagram}</b>. Najszybciej ruszymy, jak sam napiszesz do mnie pierwszy, tam na dole. Odpisuję Ci osobiście, nie automat.
            </p>
          </div>
        )}

        {/* I. ROZPOZNANIE */}
        <section className="wp-rise" style={{ marginBottom: 72 }}>
          <Eyebrow n="I">Rozpoznanie</Eyebrow>
          <h1 style={{ fontFamily: C.serif, fontSize: 'clamp(42px, 9vw, 68px)', lineHeight: 1.02, color: C.paper, margin: '0 0 20px', fontWeight: 400, letterSpacing: '-0.01em' }}>
            {plan.problem.name}
          </h1>
          <p style={{ fontFamily: C.serif, fontSize: 'clamp(20px, 4vw, 26px)', fontStyle: 'italic', color: C.gold, margin: '0 0 26px', lineHeight: 1.3 }}>
            {plan.problem.oneLiner}
          </p>
          {plan.problem.mirror && (
            <p style={{ fontSize: 17, color: C.paper, lineHeight: 1.7, maxWidth: 540, margin: '0 0 26px' }}>
              {plan.problem.mirror}
            </p>
          )}
          <p style={{ fontSize: 16.5, color: C.mute, lineHeight: 1.65, maxWidth: 540, margin: 0, paddingLeft: 18, borderLeft: `2px solid ${C.goldDeep}` }}>
            {plan.problem.falseAssumption}
          </p>
        </section>

        {/* II. TWOJ TYDZIEN: sygnatura */}
        <section className="wp-rise" style={{ marginBottom: 72 }}>
          <Eyebrow n="II">Twój tydzień</Eyebrow>
          <div className="wp-signal" style={{ background: `linear-gradient(180deg, ${C.panel}, ${C.ink})`, border: `1px solid ${C.goldDeep}`, borderRadius: 24, padding: '20px 14px 8px', boxShadow: `0 0 0 1px rgba(200,168,78,0.22), 0 0 46px rgba(200,168,78,0.18), 0 42px 84px -30px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.06)` }}>
            <TensionCurve week={plan.week} />
          </div>
          {/* ledger dni */}
          <div style={{ marginTop: 22, display: 'grid', gap: 1, background: C.line, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
            {plan.week.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px 13px 13px', background: C.ink, borderLeft: `3px solid ${STATE_COLOR[d.state]}` }}>
                <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: d.state === 'break' ? C.paper : C.faint, width: 32, flexShrink: 0 }}>{d.day}</span>
                <span style={{ flex: 1, fontSize: 15, color: d.state === 'break' ? C.paper : C.mute, lineHeight: 1.35 }}>{d.label}</span>
                <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: STATE_COLOR[d.state], fontWeight: 700, flexShrink: 0 }}>{STATE_WORD[d.state]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* III. DRUGIE DNO — mechanizm: najostrzejsza, spersonalizowana warstwa (z wlasnych slow usera przez reframe LLM albo deterministyczna). Wczesniej renderowal sie sam naglowek; body+analogy+note byly liczone i niewidoczne. */}
        <section className="wp-rise" style={{ marginBottom: 72 }}>
          <Eyebrow n="III">Drugie dno</Eyebrow>
          <div style={{ background: `linear-gradient(180deg, ${C.panel2}, ${C.ink})`, border: `1px solid ${C.line2}`, borderRadius: 18, padding: 'clamp(22px, 5vw, 34px)' }}>
            <h2 style={{ fontFamily: C.serif, fontSize: 'clamp(24px, 4.6vw, 34px)', lineHeight: 1.2, color: C.paper, margin: `0 0 ${plan.deeper.body ? 20 : 0}px`, fontWeight: 400 }}>
              {plan.deeper.label}
            </h2>
            {plan.deeper.body && (
              <p style={{ fontSize: 16.5, color: C.mute, lineHeight: 1.75, margin: 0 }}>
                {plan.deeper.body}
              </p>
            )}
            {plan.deeper.analogy && (
              <p style={{ fontFamily: C.serif, fontSize: 'clamp(18px, 3.6vw, 22px)', fontStyle: 'italic', color: C.gold, lineHeight: 1.42, margin: '20px 0 0', paddingLeft: 18, borderLeft: `2px solid ${C.goldDeep}` }}>
                {plan.deeper.analogy}
              </p>
            )}
          </div>
          {plan.deeperNote && (
            <p style={{ fontSize: 12.5, color: C.faint, lineHeight: 1.55, margin: '14px 2px 0', maxWidth: 540 }}>
              {plan.deeperNote}
            </p>
          )}
        </section>

        {/* IV. UKRYTY KOSZT */}
        <section className="wp-rise" style={{ marginBottom: 72 }}>
          <Eyebrow n="IV">Jeden ukryty koszt</Eyebrow>
          <blockquote style={{ margin: 0 }}>
            <p style={{ fontFamily: C.serif, fontSize: 'clamp(26px, 5vw, 38px)', lineHeight: 1.22, color: C.paper, margin: '0 0 22px', fontWeight: 400 }}>
              {plan.hiddenCost.headline}
            </p>
            <p style={{ display: 'inline-block', fontFamily: C.mono, fontSize: 13.5, color: C.ink, background: `linear-gradient(135deg, ${C.gold}, ${C.goldBright})`, padding: '10px 16px', borderRadius: 8, letterSpacing: 0.2, fontWeight: 700, margin: 0 }}>
              {plan.hiddenCost.multiplier}
            </p>
          </blockquote>
        </section>

        {/* V. POTENCJAŁ NA STOLE */}
        <section className="wp-rise" style={{ marginBottom: 72 }}>
          <Eyebrow n="V">Zapas na stole</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: C.serif, fontSize: 'clamp(64px, 16vw, 108px)', lineHeight: 0.9, color: C.gold, fontWeight: 400 }}>{plan.potential.usedPct}%</span>
            <span style={{ fontFamily: C.mono, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: C.faint, maxWidth: 190, lineHeight: 1.5 }}>tyle z siebie dziś wyciągasz</span>
          </div>
          {/* pasek: wykorzystane vs zablokowane */}
          <div style={{ height: 10, borderRadius: 6, background: C.panel, overflow: 'hidden', display: 'flex', marginBottom: 22, border: `1px solid ${C.line}` }}>
            <div style={{ width: `${plan.potential.usedPct}%`, background: `linear-gradient(90deg, ${C.goldDeep}, ${C.gold})` }} />
            <div style={{ flex: 1, background: `repeating-linear-gradient(45deg, ${C.panel2}, ${C.panel2} 6px, ${C.ink} 6px, ${C.ink} 12px)` }} />
          </div>
          <h2 style={{ fontFamily: C.serif, fontSize: 'clamp(24px, 4.6vw, 34px)', lineHeight: 1.22, color: C.paper, margin: 0, fontWeight: 400, maxWidth: 540 }}>
            {plan.potential.headline}
          </h2>
        </section>

        {/* VI. PIERWSZE KROKI */}
        <section className="wp-rise" style={{ marginBottom: 72 }}>
          <Eyebrow n="VI">Pierwsze kroki</Eyebrow>
          <div style={{ background: `linear-gradient(180deg, ${C.goldGlow}, transparent)`, border: `1px solid ${C.line2}`, borderRadius: 14, padding: '20px 22px', marginBottom: 24 }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: C.gold, fontWeight: 700, marginBottom: 9 }}>Zacznij tu, jutro rano</div>
            <p style={{ fontFamily: C.serif, fontSize: 20, lineHeight: 1.4, color: C.paper, margin: 0 }}>{plan.firstMove}</p>
          </div>
          <p style={{ fontSize: 15, color: C.faint, margin: '0 2px', lineHeight: 1.55, maxWidth: 500 }}>
            {hi}jeden ruch na jutro. Resztę układamy, jak uznasz, że chcesz to zrobić na serio.
          </p>
        </section>

        {/* DOWÓD: before/after klientów (renderuje się tylko gdy są realne wpisy w proof.ts) */}
        {PROOF.length > 0 && (
          <section className="wp-rise" style={{ marginBottom: 72 }}>
            <Eyebrow n="✦">Efekt u innych</Eyebrow>
            <div style={{ display: 'grid', gap: 22 }}>
              {PROOF.map((p, i) => (
                <figure key={i} style={{ margin: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.line}` }}>
                    <img src={p.before} alt="Przed" loading="lazy" style={{ width: '100%', display: 'block', aspectRatio: '3 / 4', objectFit: 'cover' }} />
                    <img src={p.after} alt="Po" loading="lazy" style={{ width: '100%', display: 'block', aspectRatio: '3 / 4', objectFit: 'cover' }} />
                  </div>
                  {p.caption && (
                    <figcaption style={{ fontFamily: C.serif, fontSize: 16.5, fontStyle: 'italic', color: C.mute, marginTop: 12, lineHeight: 1.4 }}>
                      {p.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* DOWÓD TEKSTOWY: przypadki, które zrobiły formę BEZ rzucania życia (nisza) */}
        {CASES.length > 0 && (
          <section className="wp-rise" style={{ marginBottom: 72 }}>
            <Eyebrow n="★">Zrobili to bez rzucania życia</Eyebrow>
            <div style={{ display: 'grid', gap: 16 }}>
              {CASES.map((c, i) => (
                <div key={i} style={{ background: `linear-gradient(180deg, ${C.panel2}, ${C.ink})`, border: `1px solid ${C.line2}`, borderRadius: 16, padding: 'clamp(20px, 5vw, 28px)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: C.gold, fontWeight: 700 }}>{c.kto}</span>
                    <span style={{ fontFamily: C.mono, fontSize: 10.5, letterSpacing: 1, color: C.faint }}>{c.wIle}</span>
                  </div>
                  <p style={{ fontSize: 15, color: C.mute, lineHeight: 1.6, margin: '0 0 12px' }}>{c.punktWyjscia}</p>
                  <p style={{ fontFamily: C.serif, fontSize: 'clamp(18px, 3.4vw, 21px)', fontStyle: 'italic', color: C.gold, lineHeight: 1.4, margin: '0 0 14px', paddingLeft: 16, borderLeft: `2px solid ${C.goldDeep}` }}>{c.coRobilDalej}</p>
                  <p style={{ fontFamily: C.serif, fontSize: 'clamp(22px, 4.4vw, 28px)', color: C.paper, lineHeight: 1.25, margin: 0 }}>{c.wynik}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* VII. MOST */}
        <section className="wp-rise" style={{ marginBottom: 20 }}>
          <Eyebrow n="VII">Krok dalej</Eyebrow>

          {/* zaproszenie osobiste */}
          <div className="wp-noprint" style={{ background: `linear-gradient(180deg, ${C.goldGlow}, transparent)`, border: `1px solid ${C.line2}`, borderRadius: 18, padding: 'clamp(22px, 5vw, 32px)', marginBottom: 34 }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: C.gold, marginBottom: 14 }}>Ode mnie, na koniec</div>
            <p style={{ fontFamily: C.serif, fontSize: 'clamp(22px, 4.4vw, 30px)', lineHeight: 1.32, color: C.paper, margin: 0, fontWeight: 400 }}>
              {plan.invitation}
            </p>
          </div>

          <p style={{ fontSize: 16, color: C.mute, lineHeight: 1.65, margin: '0 0 26px', maxWidth: 540 }}>
            {plan.bridgeIntro}
          </p>

          {/* drabina akcji */}
          <div style={{ display: 'grid', gap: 12, marginBottom: 30 }}>
            {plan.bridge.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: b.kind === 'coop' ? C.panel2 : C.ink, border: `1px solid ${b.kind === 'coop' ? C.line2 : C.line}`, borderRadius: 12, padding: '16px 16px' }}>
                <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: C.numGold, flexShrink: 0, marginTop: 2, width: 20 }}>{String(i + 1).padStart(2, '0')}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.paper, marginBottom: 5 }}>{b.tier}</div>
                  <div style={{ fontSize: 14.5, color: C.mute, lineHeight: 1.55 }}>{b.line}</div>
                </div>
              </div>
            ))}
          </div>

          {/* NISZA: rekompozycja bez rzucania zycia. Oś przekazu, zawsze widoczna (nie zalezy od LLM). */}
          <div style={{ background: C.panel2, border: `1px solid ${C.line2}`, borderLeft: `3px solid ${C.gold}`, borderRadius: 12, padding: '16px 18px', marginBottom: 30 }}>
            <p style={{ fontSize: 15, color: C.paper, lineHeight: 1.65, margin: 0, maxWidth: 560 }}>
              Żebyś wiedział, w co wchodzisz: chłopaki, których prowadzę, dalej wychodzą w weekend, piją wino do kolacji i jadą na wypady z ekipą. Forma rośnie <b style={{ color: C.gold }}>obok tego życia, nie zamiast niego</b>. Wolniej niż obiecują cudotwórcy z reklam, ale w tempie, które utrzymasz przez lata. Ponad 180 chłopa zrobiło rekompozycję właśnie tak, nie żyjąc jak mnich.
            </p>
          </div>

          {/* Jeden oczywisty ruch = DM. Slaby punkt tuz nad przyciskiem, DM zawsze primary
              (sprzedaz wylacznie IG DM), nabor jako drugorzedny link, Save cicho obok. */}
          {(() => {
            // weakSpot w wiadomosci idzie w 1. osobie (od leada do Michala). Jesli LLM wrzuci 2. osobe
            // ("na Tobie", "Ci"), fraza celowalaby w Michala, wiec ja wtedy pomijamy (deterministyczny neutralny).
            const wsSafe = /\b(ci|tobie|twój|twoje|twoim|twoją|cię|ciebie)\b/i.test(plan.weakSpot) ? '' : plan.weakSpot;
            const dmMsg = `Cześć Michał${imie?.trim() ? `, jestem ${imie.trim()}` : ''}. Zrobiłem diagnostykę (${plan.problem.name}).${wsSafe ? ` Najbardziej siedzi mi ${wsSafe}.` : ''} Chcę to z Tobą przegadać.`;
            const dmUrl = `https://ig.me/m/hantleitalerz?text=${encodeURIComponent(dmMsg)}`;
            return (
              <div className="wp-noprint">
                <p style={{ fontSize: 15.5, color: C.paper, lineHeight: 1.6, margin: '0 0 16px', maxWidth: 540 }}>
                  U Ciebie pęka to jedno: <b style={{ color: C.gold }}>{plan.weakSpot}</b>. Z tym do mnie napisz, resztę ułożymy.
                </p>
                <a href={dmUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('diag_dm_click', { qualified })} className="wp-cta" style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldBright})`, color: C.ink, fontWeight: 800 }}>
                  Napisz do mnie na Instagramie <span aria-hidden>&rarr;</span>
                </a>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 18, margin: '18px 0 0' }}>
                  <a href={naborHref} onClick={() => track('diag_nabor_click', { loc: 'result', qualified })} style={{ fontSize: 13.5, color: C.mute, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                    {qualified ? 'albo zobacz, jak wygląda współpraca 1:1' : 'albo zobacz, jak pracuję z innymi'}
                  </a>
                  <SaveCardButton label="Zapisz Kartę (PDF)" />
                </div>
              </div>
            );
          })()}
          <p className="wp-noprint" style={{ fontSize: 12.5, color: C.faint, textAlign: 'center', margin: '18px 0 0', lineHeight: 1.55 }}>
            {plan.saveNote}
          </p>
        </section>

      </div>
    </div>
  );
}

const css = `
.wp-wrap { width: 100%; max-width: 640px; margin: 0 auto; padding: 56px 22px 96px; position: relative; z-index: 1; }
.wp * { box-sizing: border-box; }
.wp-gutter { display: none; }
@media (min-width: 1200px) {
  .wp-gutter { display: block; position: fixed; top: 0; bottom: 0; width: 1px; z-index: 0; background: linear-gradient(180deg, transparent, ${C.line}22%, ${C.line} 78%, transparent); }
  .wp-gutter-l { left: calc(50% - 320px - 64px); }
  .wp-gutter-r { right: calc(50% - 320px - 64px); }
  .wp-gutter-tag { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); writing-mode: vertical-rl; text-orientation: mixed; font-family: ${C.mono}; font-size: 9.5px; letter-spacing: 5px; color: ${C.faint}; white-space: nowrap; background: ${C.ink}; padding: 14px 0; }
}
.wp-cta { display:block; text-align:center; background:linear-gradient(135deg, ${C.gold}, ${C.goldDeep}); color:${C.ink}; text-decoration:none; padding:18px 24px; border-radius:12px; font-weight:800; font-size:15.5px; letter-spacing:0.2px; transition:transform .18s ease, box-shadow .18s ease; box-shadow:0 0 0 rgba(200,168,78,0); }
.wp-cta:hover { transform:translateY(-2px); box-shadow:0 14px 40px rgba(200,168,78,0.22); }
.wp-cta:focus-visible { outline:2px solid ${C.goldBright}; outline-offset:3px; }
.wp-save { display:inline-block; background:transparent; color:${C.gold}; border:1px solid ${C.goldDeep}; border-radius:9px; padding:10px 18px; font-family:${C.sans}; font-weight:700; font-size:13.5px; letter-spacing:.2px; cursor:pointer; transition:background .16s ease, border-color .16s ease; }
.wp-save:hover { background:${C.goldGlow}; border-color:${C.gold}; }
.wp-save:focus-visible { outline:2px solid ${C.goldBright}; outline-offset:3px; }
@media print {
  .wp { background:#fff !important; color:#111 !important; }
  .wp-noprint, .wp-gutter { display:none !important; }
  .wp-wrap { max-width:100% !important; padding:0 !important; }
  .wp-rise { opacity:1 !important; transform:none !important; }
  * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
@media (prefers-reduced-motion: no-preference) {
  .wp-rise { opacity:0; transform:translateY(14px); animation:wpRise .7s cubic-bezier(.2,.6,.2,1) forwards; }
  .wp-rise:nth-of-type(1){animation-delay:.05s}
  .wp-rise:nth-of-type(2){animation-delay:.14s}
  .wp-rise:nth-of-type(3){animation-delay:.22s}
  .wp-rise:nth-of-type(4){animation-delay:.30s}
  .wp-rise:nth-of-type(5){animation-delay:.38s}
  .wp-rise:nth-of-type(6){animation-delay:.46s}
  .wp-rise:nth-of-type(7){animation-delay:.54s}
  header.wp-rise{animation-delay:0s}
  .wp-line { stroke-dasharray:1; stroke-dashoffset:1; animation:wpDraw 1.5s .5s cubic-bezier(.4,0,.2,1) forwards; }
  .wp-area { opacity:0; animation:wpFade .8s 1.4s ease forwards; }
  .wp-dot { opacity:0; animation:wpFade .4s 1.5s ease forwards; }
  .wp-peak { transform-origin:center; animation:wpPulse 2.4s 2s ease-in-out infinite; }
}
@keyframes wpRise { to { opacity:1; transform:none; } }
@keyframes wpDraw { to { stroke-dashoffset:0; } }
@keyframes wpFade { to { opacity:1; } }
@keyframes wpPulse { 0%,100%{ r:5.5; opacity:1 } 50%{ r:7; opacity:.75 } }
.wp-signal { transition: box-shadow .35s ease, transform .35s cubic-bezier(.2,.7,.2,1); }
.wp-signal:hover { transform: translateY(-3px); box-shadow: 0 0 0 1px rgba(200,168,78,0.35), 0 0 64px rgba(200,168,78,0.26), 0 52px 100px -30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.09); }
`;
