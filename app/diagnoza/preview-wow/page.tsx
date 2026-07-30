'use client';

// ── PODGLĄD WOW: flagowy ekran Karty w pełnym premium (dym, ziarno, sygnał, połysk, tilt 3D) ──
// To jest osobny, bezpieczny podgląd na mock-danych. NIE rusza produkcyjnej logiki ani /diagnoza.
// Jak Michał zaakceptuje -> portuję sygnaturę do WeekPage.

import React, { useEffect, useRef, useState } from 'react';

const C = {
  ink: '#08080a', panel: '#141416', panel2: '#1a1a1d', line: '#2a2a30',
  gold: '#c8a84e', goldBright: '#e8cc80', goldDeep: '#8a7535',
  hot: '#e0552e', amber: '#e0812e',
  paper: '#ece7db', mute: '#a49e92', faint: '#8f887c',
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  serif: "'Instrument Serif', Georgia, serif",
  sans: "'Inter', system-ui, -apple-system, sans-serif",
};

// mock „Karta Tygodnia" — realny kształt danych, żeby podgląd był wiarygodny
const WEEK = [
  { day: 'Pon', label: 'Odzyskiwanie po weekendzie', state: 'risk' },
  { day: 'Wt', label: 'Nadrabianie zaległości', state: 'ok' },
  { day: 'Śr', label: 'Pierwszy normalny dzień', state: 'good' },
  { day: 'Czw', label: 'Forma wraca, zegar tyka', state: 'ok' },
  { day: 'Pt', label: '„Należy mi się”', state: 'risk' },
  { day: 'Sob', label: 'Struktura znika', state: 'break' },
  { day: 'Ndz', label: 'Dryf, brak resetu', state: 'break' },
] as const;

const TENSION: Record<string, number> = { good: 16, ok: 42, risk: 68, break: 94 };
const STATE_COLOR: Record<string, string> = { good: C.faint, ok: C.gold, risk: C.amber, break: C.hot };
const STATE_WORD: Record<string, string> = { good: 'trzyma', ok: 'chwieje', risk: 'ryzyko', break: 'pęka' };

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function TensionCurve() {
  const W = 720, H = 260, padX = 28, padTop = 34, padBot = 48;
  const innerW = W - padX * 2, innerH = H - padTop - padBot;
  const pts = WEEK.map((d, i) => ({
    x: padX + (innerW * i) / (WEEK.length - 1),
    y: padTop + innerH * (1 - TENSION[d.state] / 100),
  }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1].x} ${padTop + innerH} L ${pts[0].x} ${padTop + innerH} Z`;
  let peak = 0;
  for (let i = 0; i < WEEK.length; i++) { if (WEEK[i].state === 'break') { peak = i; break; } if (TENSION[WEEK[i].state] > TENSION[WEEK[peak].state]) peak = i; }
  const peakPt = pts[peak];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Krzywa napięcia tygodnia" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="wparea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.gold} stopOpacity="0.32" />
          <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="wpstroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={C.goldDeep} />
          <stop offset={`${(peak / (WEEK.length - 1)) * 100}%`} stopColor={C.goldBright} />
          <stop offset="100%" stopColor={C.hot} />
        </linearGradient>
        <filter id="wpglow" x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <line x1={padX} x2={W - padX} y1={padTop + innerH * 0.5} y2={padTop + innerH * 0.5} stroke={C.line} strokeWidth="1" strokeDasharray="2 6" />
      <path d={area} fill="url(#wparea)" className="wp-area" />
      <path d={line} fill="none" stroke="url(#wpstroke)" strokeWidth="3" strokeLinecap="round" filter="url(#wpglow)" pathLength={1} className="wp-line" />
      <line x1={peakPt.x} x2={peakPt.x} y1={peakPt.y} y2={padTop + innerH} stroke={C.hot} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" className="wp-dot" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === peak ? 6 : 3.5} fill={i === peak ? C.hot : C.ink}
          stroke={i === peak ? C.hot : STATE_COLOR[WEEK[i].state]} strokeWidth="2.5" className={i === peak ? 'wp-peak' : 'wp-dot'} />
      ))}
      <text x={peakPt.x} y={peakPt.y - 18} textAnchor="middle" fontFamily={C.mono} fontSize="12" letterSpacing="2" fill={C.hot} fontWeight="700" className="wp-dot">TU PĘKA</text>
      {WEEK.map((d, i) => (
        <text key={i} x={pts[i].x} y={H - 16} textAnchor="middle" fontFamily={C.mono} fontSize="12" fill={i === peak ? C.paper : C.faint} fontWeight={i === peak ? 700 : 500}>{d.day}</text>
      ))}
    </svg>
  );
}

// licznik kosztu jak odometr (roll-up)
function Odometer({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now(); const dur = 1600;
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{v.toLocaleString('pl-PL')}</span>;
}

export default function PreviewWow() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const onMove = (e: React.MouseEvent) => {
    const el = cardRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -py * 6, ry: px * 8 });
  };
  const onLeave = () => setTilt({ rx: 0, ry: 0 });

  return (
    <div className="wow" style={{ minHeight: '100vh', background: C.ink, color: C.paper, fontFamily: C.sans, position: 'relative', overflow: 'hidden' }}>
      <style>{css}</style>

      {/* ── DYM / HAZE w tle ── */}
      <div className="smoke smoke-1" aria-hidden />
      <div className="smoke smoke-2" aria-hidden />
      <div className="smoke smoke-3" aria-hidden />
      <div className="vignette" aria-hidden />
      {/* ── ZIARNO / FILM GRAIN ── */}
      <div className="grain" aria-hidden />

      <div className="wrap">
        {/* MASTHEAD */}
        <header className="rise" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 18, borderBottom: `1px solid ${C.line}`, marginBottom: 44, gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: 5, color: C.gold, fontWeight: 700 }}>HANTLE I TALERZ</span>
          <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 3, color: C.faint, textTransform: 'uppercase' }}>Karta tygodnia · wydanie prywatne</span>
        </header>

        {/* I. ROZPOZNANIE — kinetyczny serif + pieczęć archetypu */}
        <section className="rise" style={{ marginBottom: 54 }}>
          <div className="eyebrow"><span>I</span><i /><em>Rozpoznanie</em></div>
          <div className="stamp">Weekend cofa mnie do zera</div>
          <h1 className="kinetic" style={{ fontFamily: C.serif, fontSize: 'clamp(44px, 10vw, 92px)', lineHeight: 0.98, fontWeight: 400, color: '#fff', margin: '0 0 18px', letterSpacing: '-0.015em' }}>
            Pięć dni budujesz.<br /><span className="kinetic-hot">Dwa dni kasujesz.</span>
          </h1>
          <p style={{ fontSize: 17, color: C.paper, lineHeight: 1.7, maxWidth: 560, margin: 0 }}>
            W tygodniu trzymasz się nieźle. Potem przychodzi weekend i w poniedziałek zaczynasz od tego samego miejsca. Nie od zera, od minusa, bo dochodzi kac, gorszy sen i wyrzuty.
          </p>
        </section>

        {/* II. TWÓJ TYDZIEŃ — sygnał w błyszczącej karcie z tiltem 3D */}
        <section className="rise" style={{ marginBottom: 54, perspective: '1400px' }}>
          <div className="eyebrow"><span>II</span><i /><em>Twój tydzień</em></div>
          <div
            ref={cardRef}
            className="glossy signal-card"
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            style={{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
          >
            <div className="shine" aria-hidden />
            <div style={{ padding: '26px 20px 12px' }}>
              <TensionCurve />
            </div>
          </div>
          {/* ledger dni */}
          <div className="ledger">
            {WEEK.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', background: 'rgba(255,255,255,0.015)', borderLeft: `3px solid ${STATE_COLOR[d.state]}` }}>
                <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: d.state === 'break' ? C.paper : C.faint, width: 32 }}>{d.day}</span>
                <span style={{ flex: 1, fontSize: 15, color: d.state === 'break' ? C.paper : C.mute }}>{d.label}</span>
                <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: STATE_COLOR[d.state], fontWeight: 700 }}>{STATE_WORD[d.state]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* III. UKRYTY KOSZT — odometr */}
        <section className="rise" style={{ marginBottom: 54 }}>
          <div className="eyebrow"><span>III</span><i /><em>Jeden ukryty koszt</em></div>
          <div className="glossy cost-card">
            <div className="shine" aria-hidden />
            <div style={{ padding: 'clamp(24px, 5vw, 40px)' }}>
              <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.faint, marginBottom: 14 }}>Rachunek za rok</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: C.serif, fontSize: 'clamp(56px, 14vw, 104px)', lineHeight: 0.9, color: C.goldBright, fontWeight: 400 }}>
                  <Odometer to={8400} /> <span style={{ fontSize: '0.4em', color: C.gold }}>zł</span>
                </span>
              </div>
              <p style={{ fontSize: 16, color: C.mute, lineHeight: 1.65, margin: '18px 0 0', maxWidth: 520 }}>
                Rozbity weekend zabiera wysokie obroty przez trzy kolejne dni. W skali roku to nie kilka luźnych wieczorów, to tygodnie na ponownym wchodzeniu w rytm.
              </p>
            </div>
          </div>
        </section>

        {/* CTA — materializuje się na końcu */}
        <section className="rise" style={{ marginBottom: 30 }}>
          <a className="cta" href="#" onClick={(e) => e.preventDefault()}>
            <span className="cta-shine" aria-hidden />
            Zobacz, jak wygląda współpraca 1:1 <span aria-hidden>→</span>
          </a>
          <p style={{ fontFamily: C.mono, fontSize: 11, color: C.faint, textAlign: 'center', margin: '16px 0 0', letterSpacing: 1 }}>
            PODGLĄD WOW · mock-dane · sygnatura do przeniesienia na /diagnoza
          </p>
        </section>
      </div>
    </div>
  );
}

const css = `
.wow * { box-sizing: border-box; }
.wow .wrap { position: relative; z-index: 2; max-width: 680px; margin: 0 auto; padding: 56px 22px 110px; }

/* ── DYM: warstwy ciepłej mgły, powolny dryf ── */
.wow .smoke { position: fixed; border-radius: 50%; filter: blur(70px); opacity: 0.5; z-index: 0; pointer-events: none; mix-blend-mode: screen; }
.wow .smoke-1 { width: 65vw; height: 65vw; left: -15vw; top: -10vh; background: radial-gradient(circle, rgba(200,168,78,0.22), transparent 62%); animation: drift1 26s ease-in-out infinite; }
.wow .smoke-2 { width: 55vw; height: 55vw; right: -12vw; top: 22vh; background: radial-gradient(circle, rgba(224,85,46,0.16), transparent 60%); animation: drift2 32s ease-in-out infinite; }
.wow .smoke-3 { width: 70vw; height: 70vw; left: 10vw; bottom: -22vh; background: radial-gradient(circle, rgba(138,117,53,0.2), transparent 62%); animation: drift3 38s ease-in-out infinite; }
@keyframes drift1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(8vw,6vh) scale(1.18); } }
@keyframes drift2 { 0%,100% { transform: translate(0,0) scale(1.1); } 50% { transform: translate(-7vw,-5vh) scale(0.92); } }
@keyframes drift3 { 0%,100% { transform: translate(0,0) scale(0.95); } 50% { transform: translate(-6vw,-8vh) scale(1.15); } }

/* ── VIGNETTE ── */
.wow .vignette { position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background: radial-gradient(120% 90% at 50% 12%, transparent 40%, rgba(0,0,0,0.55) 100%); }

/* ── FILM GRAIN ── */
.wow .grain { position: fixed; inset: -50%; z-index: 3; pointer-events: none; opacity: 0.055; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  animation: grainshift 0.5s steps(2) infinite; }
@keyframes grainshift { 0%{transform:translate(0,0)} 50%{transform:translate(-3%,2%)} 100%{transform:translate(2%,-3%)} }

/* ── EYEBROW ── */
.wow .eyebrow { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
.wow .eyebrow span { font-family: ${C.mono}; font-size: 12px; font-weight: 700; color: ${C.gold}; }
.wow .eyebrow i { width: 26px; height: 1px; background: ${C.line}; }
.wow .eyebrow em { font-family: ${C.mono}; font-size: 10.5px; letter-spacing: 3px; text-transform: uppercase; color: ${C.mute}; font-style: normal; }

/* ── PIECZĘĆ ARCHETYPU ── */
.wow .stamp { display: inline-block; font-family: ${C.mono}; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;
  color: ${C.goldBright}; border: 1px solid ${C.goldDeep}; border-radius: 4px; padding: 7px 12px; margin-bottom: 20px;
  background: rgba(200,168,78,0.06); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08); animation: stampin .5s .2s both cubic-bezier(.2,.8,.2,1); }
@keyframes stampin { from { opacity: 0; transform: scale(1.25) rotate(-3deg); } to { opacity: 1; transform: none; } }

/* ── KINETYCZNY SERIF ── */
.wow .kinetic-hot { color: ${C.hot}; }

/* ── KARTY: GLOSSY + WARSTWOWE CIENIE + POŁYSK ── */
.wow .glossy { position: relative; border-radius: 20px; overflow: hidden;
  background: linear-gradient(158deg, #1c1c20 0%, #121215 55%, #0d0d10 100%);
  border: 1px solid rgba(255,255,255,0.06);
  box-shadow: 0 50px 90px -30px rgba(0,0,0,0.85), 0 14px 40px rgba(0,0,0,0.55),
              inset 0 1px 0 rgba(255,255,255,0.09), inset 0 0 60px rgba(200,168,78,0.03);
  transition: transform .18s cubic-bezier(.2,.7,.2,1), box-shadow .3s ease; will-change: transform; }
.wow .signal-card { transform-style: preserve-3d; }
.wow .glossy:hover { box-shadow: 0 60px 110px -30px rgba(0,0,0,0.9), 0 18px 50px rgba(0,0,0,0.6),
              inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 80px rgba(200,168,78,0.05); }
/* gradientowa krawędź u góry */
.wow .glossy::after { content: ''; position: absolute; inset: 0; border-radius: 20px; padding: 1px; pointer-events: none;
  background: linear-gradient(120deg, rgba(232,204,128,0.5), transparent 30%, transparent 70%, rgba(232,204,128,0.25));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
/* POŁYSK: przelot światła */
.wow .shine { position: absolute; inset: 0; z-index: 4; pointer-events: none; border-radius: 20px; overflow: hidden; }
.wow .shine::before { content: ''; position: absolute; top: -60%; left: -80%; width: 60%; height: 220%;
  background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.14) 48%, rgba(255,255,255,0.05) 55%, transparent 70%);
  transform: rotate(8deg); animation: sweep 6.5s ease-in-out infinite; }
@keyframes sweep { 0%,18% { left: -80%; } 40%,100% { left: 140%; } }

.wow .ledger { margin-top: 18px; display: grid; gap: 1px; background: ${C.line}; border: 1px solid ${C.line}; border-radius: 14px; overflow: hidden; }

/* ── CTA z połyskiem ── */
.wow .cta { position: relative; overflow: hidden; display: block; text-align: center; text-decoration: none;
  padding: 19px 24px; border-radius: 14px; font-weight: 800; font-size: 16px; letter-spacing: 0.3px; color: ${C.ink};
  background: linear-gradient(135deg, ${C.goldBright}, ${C.gold} 45%, ${C.goldDeep});
  box-shadow: 0 20px 50px -12px rgba(200,168,78,0.5), inset 0 1px 0 rgba(255,255,255,0.4);
  animation: ctain .6s .4s both cubic-bezier(.2,.8,.2,1); transition: transform .18s ease, box-shadow .18s ease; }
.wow .cta:hover { transform: translateY(-2px); box-shadow: 0 26px 60px -12px rgba(200,168,78,0.6), inset 0 1px 0 rgba(255,255,255,0.5); }
.wow .cta-shine { position: absolute; top: 0; left: -60%; width: 40%; height: 100%;
  background: linear-gradient(105deg, transparent, rgba(255,255,255,0.55), transparent); animation: ctasweep 4s ease-in-out infinite; }
@keyframes ctasweep { 0%,25% { left: -60%; } 55%,100% { left: 140%; } }
@keyframes ctain { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }

/* ── REVEAL ── */
.wow .rise { animation: rise .8s cubic-bezier(.2,.6,.2,1) both; }
.wow .rise:nth-of-type(1){animation-delay:.05s}
.wow .rise:nth-of-type(2){animation-delay:.16s}
.wow .rise:nth-of-type(3){animation-delay:.28s}
.wow .rise:nth-of-type(4){animation-delay:.4s}
.wow .rise:nth-of-type(5){animation-delay:.5s}
@keyframes rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }

/* ── SYGNAŁ rysuje się ── */
.wow .wp-line { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 1.8s .5s cubic-bezier(.4,0,.2,1) forwards; }
.wow .wp-area { opacity: 0; animation: fade .9s 1.7s ease forwards; }
.wow .wp-dot { opacity: 0; animation: fade .5s 1.9s ease forwards; }
.wow .wp-peak { transform-origin: center; animation: fade .5s 1.9s ease forwards, pulse 2.6s 2.4s ease-in-out infinite; }
@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes fade { to { opacity: 1; } }
@keyframes pulse { 0%,100%{ r:6; opacity:1 } 50%{ r:8; opacity:.7 } }

@media (max-width: 520px) {
  .wow .smoke { filter: blur(50px); opacity: 0.4; }
}
@media (prefers-reduced-motion: reduce) {
  .wow .smoke, .wow .shine::before, .wow .cta-shine, .wow .grain { animation: none !important; }
  .wow .rise, .wow .stamp, .wow .cta { animation: none !important; opacity: 1 !important; transform: none !important; }
  .wow .wp-line { animation: none !important; stroke-dashoffset: 0; }
  .wow .wp-area, .wow .wp-dot, .wow .wp-peak { animation: none !important; opacity: 1 !important; }
}
`;
