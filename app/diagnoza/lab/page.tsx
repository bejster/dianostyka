'use client';

/* Hallmark · component: design-lab · genre: atmospheric · token-driven
 * pre-emit critique: P5 H4 E5 S5 R4 V5
 * Konfigurator wizualny Karty: wszystko sterowane zmiennymi CSS (--*), jeden render = dziesiątki kombinacji.
 * Osobny podgląd na mock-danych. NIE rusza produkcyjnej /diagnoza ani logiki. */

import React, { useEffect, useMemo, useRef, useState } from 'react';

// ── PALETY AKCENTU: [base, bright, deep, "r,g,b"] ──
const ACCENT: Record<string, [string, string, string, string]> = {
  gold:    ['#c8a84e', '#e8cc80', '#8a7535', '200,168,78'],
  amber:   ['#e0812e', '#f4b673', '#9c5418', '224,129,46'],
  ice:     ['#5fb3d9', '#a9e0f2', '#2f6f8f', '95,179,217'],
  emerald: ['#3fae7a', '#86dcb0', '#1f6e4a', '63,174,122'],
  violet:  ['#9a7ae0', '#c7b0f5', '#4f3a8f', '154,122,224'],
  mono:    ['#cfc9bc', '#ece7db', '#7a766c', '207,201,188'],
};
const SHADOW: Record<string, string> = {
  flat:   '0 2px 10px rgba(0,0,0,0.45)',
  medium: '0 22px 44px -14px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)',
  deep:   '0 42px 84px -26px rgba(0,0,0,0.82), 0 12px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
  float:  '0 64px 120px -32px rgba(0,0,0,0.9), 0 22px 54px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.11)',
};
const RADIUS: Record<string, string> = { sharp: '3px', soft: '20px', pill: '34px' };
const GRAIN_OP: Record<string, string> = { off: '0', light: '0.055', heavy: '0.11' };
const SHINE_OP: Record<string, string> = { off: '0', subtle: '0.1', strong: '0.18' };
const GLOW_STD: Record<string, string> = { off: '0.01', on: '4', intense: '8' };

const CONTROLS: { key: string; label: string; opts: string[] }[] = [
  { key: 'bg', label: 'Tło', opts: ['smoke', 'aurora', 'mesh', 'spotlight', 'stars', 'grain', 'plain'] },
  { key: 'surface', label: 'Karta', opts: ['gloss', 'glass', 'frosted', 'matte', 'neon', 'emboss'] },
  { key: 'accent', label: 'Akcent', opts: ['gold', 'amber', 'ice', 'emerald', 'violet', 'mono'] },
  { key: 'font', label: 'Font', opts: ['Instrument Serif', 'Fraunces', 'Playfair Display', 'Space Grotesk', 'Bodoni Moda'] },
  { key: 'shine', label: 'Połysk', opts: ['off', 'subtle', 'strong'] },
  { key: 'grain', label: 'Ziarno', opts: ['off', 'light', 'heavy'] },
  { key: 'shadow', label: 'Cień', opts: ['flat', 'medium', 'deep', 'float'] },
  { key: 'radius', label: 'Rogi', opts: ['sharp', 'soft', 'pill'] },
  { key: 'glow', label: 'Glow', opts: ['off', 'on', 'intense'] },
  { key: 'tilt', label: 'Tilt 3D', opts: ['off', 'on'] },
];

type S = Record<string, string>;
const PRESETS: { name: string; state: S }[] = [
  { name: 'Michał',          state: { bg: 'stars',     surface: 'neon',    accent: 'gold',    font: 'Instrument Serif', shine: 'off',    grain: 'heavy', shadow: 'deep',   radius: 'pill',  glow: 'intense', tilt: 'on' } },
  { name: 'Złoty Dym',       state: { bg: 'smoke',     surface: 'gloss',   accent: 'gold',    font: 'Instrument Serif', shine: 'strong', grain: 'light', shadow: 'float',  radius: 'soft',  glow: 'intense', tilt: 'on' } },
  { name: 'Aurora Glass',    state: { bg: 'aurora',    surface: 'glass',   accent: 'ice',     font: 'Fraunces',         shine: 'subtle', grain: 'light', shadow: 'deep',   radius: 'soft',  glow: 'on',      tilt: 'on' } },
  { name: 'Midnight Emboss', state: { bg: 'mesh',      surface: 'emboss',  accent: 'violet',  font: 'Playfair Display', shine: 'off',    grain: 'heavy', shadow: 'deep',   radius: 'soft',  glow: 'off',     tilt: 'off' } },
  { name: 'Neon Brutal',     state: { bg: 'grain',     surface: 'neon',    accent: 'amber',   font: 'Space Grotesk',    shine: 'off',    grain: 'heavy', shadow: 'flat',   radius: 'sharp', glow: 'intense', tilt: 'off' } },
  { name: 'Spotlight Frost', state: { bg: 'spotlight', surface: 'frosted', accent: 'emerald', font: 'Fraunces',         shine: 'subtle', grain: 'light', shadow: 'float',  radius: 'pill',  glow: 'on',      tilt: 'on' } },
  { name: 'Editorial Mono',  state: { bg: 'plain',     surface: 'matte',   accent: 'mono',    font: 'Bodoni Moda',      shine: 'off',    grain: 'heavy', shadow: 'medium', radius: 'sharp', glow: 'off',     tilt: 'off' } },
];

const WEEK = [
  { day: 'Pon', label: 'Odzyskiwanie po weekendzie', state: 'risk' },
  { day: 'Wt', label: 'Nadrabianie zaległości', state: 'ok' },
  { day: 'Śr', label: 'Pierwszy normalny dzień', state: 'good' },
  { day: 'Czw', label: 'Forma wraca, zegar tyka', state: 'ok' },
  { day: 'Pt', label: '„Należy mi się”', state: 'risk' },
  { day: 'Sob', label: 'Struktura znika', state: 'break' },
  { day: 'Ndz', label: 'Dryf, brak resetu', state: 'break' },
];
const TENSION: Record<string, number> = { good: 16, ok: 42, risk: 68, break: 94 };
const SW: Record<string, string> = { good: 'trzyma', ok: 'chwieje', risk: 'ryzyko', break: 'pęka' };

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C ${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)}, ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function Curve({ glowStd }: { glowStd: string }) {
  const W = 720, H = 250, padX = 28, padTop = 30, padBot = 44;
  const iw = W - padX * 2, ih = H - padTop - padBot;
  const pts = WEEK.map((d, i) => ({ x: padX + (iw * i) / (WEEK.length - 1), y: padTop + ih * (1 - TENSION[d.state] / 100) }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1].x} ${padTop + ih} L ${pts[0].x} ${padTop + ih} Z`;
  let peak = 0;
  for (let i = 0; i < WEEK.length; i++) { if (WEEK[i].state === 'break') { peak = i; break; } if (TENSION[WEEK[i].state] > TENSION[WEEK[peak].state]) peak = i; }
  const pk = pts[peak];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Krzywa napięcia tygodnia" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="lab-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--acc)" stopOpacity="0.32" /><stop offset="100%" stopColor="var(--acc)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lab-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--acc-deep)" /><stop offset={`${(peak / 6) * 100}%`} stopColor="var(--acc-bright)" /><stop offset="100%" stopColor="#e0552e" />
        </linearGradient>
        <filter id="lab-glow" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation={glowStd} result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <line x1={padX} x2={W - padX} y1={padTop + ih * 0.5} y2={padTop + ih * 0.5} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="2 6" />
      <path d={area} fill="url(#lab-area)" className="wp-area" />
      <path d={line} fill="none" stroke="url(#lab-stroke)" strokeWidth="3" strokeLinecap="round" filter="url(#lab-glow)" pathLength={1} className="wp-line" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === peak ? 6 : 3.5} fill={i === peak ? '#e0552e' : '#08080a'} stroke={i === peak ? '#e0552e' : 'var(--acc)'} strokeWidth="2.5" className={i === peak ? 'wp-peak' : 'wp-dot'} />
      ))}
      <text x={pk.x} y={pk.y - 18} textAnchor="middle" fontSize="12" letterSpacing="2" fill="#e0552e" fontWeight="700" style={{ fontFamily: 'var(--mono)' }} className="wp-dot">TU PĘKA</text>
      {WEEK.map((d, i) => (<text key={i} x={pts[i].x} y={H - 14} textAnchor="middle" fontSize="12" fill={i === peak ? '#ece7db' : '#8f887c'} style={{ fontFamily: 'var(--mono)' }} fontWeight={i === peak ? 700 : 500}>{d.day}</text>))}
    </svg>
  );
}

function Odometer({ to, k }: { to: number; k: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now(), dur = 1500;
    const tick = (now: number) => { const t = Math.min((now - start) / dur, 1); setV(Math.round(to * (1 - Math.pow(1 - t, 3)))); if (t < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [to, k]);
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{v.toLocaleString('pl-PL')}</span>;
}

export default function Lab() {
  const [st, setSt] = useState<S>(PRESETS[0].state);
  const [open, setOpen] = useState(true);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [stars, setStars] = useState<{ x: number; y: number; d: number; s: number }[]>([]);
  const [mouse, setMouse] = useState({ x: 50, y: 30 });
  const cardRef = useRef<HTMLDivElement>(null);

  const set = (k: string, v: string) => setSt((p) => ({ ...p, [k]: v }));
  const randomize = () => setSt(() => { const n: S = {}; for (const c of CONTROLS) n[c.key] = c.opts[Math.floor(Math.random() * c.opts.length)]; return n; });

  useEffect(() => {
    const id = 'lab-fonts';
    if (!document.getElementById(id)) {
      const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Playfair+Display:wght@400;700&family=Space+Grotesk:wght@400;600;700&family=Bodoni+Moda:opsz,wght@6..96,400;6..96,600&display=swap';
      document.head.appendChild(l);
    }
    setStars(Array.from({ length: 70 }, () => ({ x: Math.random() * 100, y: Math.random() * 100, d: Math.random() * 4, s: 0.5 + Math.random() * 1.6 })));
  }, []);

  const acc = ACCENT[st.accent] || ACCENT.gold;
  const rootStyle = useMemo(() => ({
    '--acc': acc[0], '--acc-bright': acc[1], '--acc-deep': acc[2], '--acc-rgb': acc[3],
    '--shadow': SHADOW[st.shadow], '--radius': RADIUS[st.radius], '--grain-op': GRAIN_OP[st.grain],
    '--shine-op': SHINE_OP[st.shine], '--display': `'${st.font}', Georgia, serif`,
    '--mono': "'JetBrains Mono', ui-monospace, monospace", '--mx': `${mouse.x}%`, '--my': `${mouse.y}%`,
  } as React.CSSProperties), [acc, st.shadow, st.radius, st.grain, st.shine, st.font, mouse]);

  const onMove = (e: React.MouseEvent) => {
    if (st.bg === 'spotlight') setMouse({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 });
    if (st.tilt === 'on' && cardRef.current) {
      const r = cardRef.current.getBoundingClientRect();
      setTilt({ rx: -((e.clientY - r.top) / r.height - 0.5) * 6, ry: ((e.clientX - r.left) / r.width - 0.5) * 8 });
    }
  };

  return (
    <div className="lab" data-surface={st.surface} data-shine={st.shine !== 'off'} style={rootStyle} onMouseMove={onMove}>
      <style>{css}</style>

      {/* ── TŁA ── */}
      {st.bg === 'smoke' && (<><div className="bl smoke a" /><div className="bl smoke b" /><div className="bl smoke c" /></>)}
      {st.bg === 'aurora' && (<><div className="bl au a" /><div className="bl au b" /><div className="bl au c" /><div className="bl au d" /></>)}
      {st.bg === 'mesh' && <div className="mesh" />}
      {st.bg === 'spotlight' && <div className="spot" />}
      {st.bg === 'stars' && <div className="stars">{stars.map((s, i) => <span key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />)}</div>}
      <div className="vig" aria-hidden />
      <div className="grain" aria-hidden />

      <div className="wrap" onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}>
        <header className="rise" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 40, gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 5, color: 'var(--acc)', fontWeight: 700 }}>HANTLE I TALERZ</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 3, color: '#8f887c', textTransform: 'uppercase' }}>Karta tygodnia · wydanie prywatne</span>
        </header>

        <section className="rise" style={{ marginBottom: 46 }}>
          <div className="eb"><span>I</span><i /><em>Rozpoznanie</em></div>
          <div className="stamp">Weekend cofa mnie do zera</div>
          <h1 style={{ fontFamily: 'var(--display)', fontStyle: 'normal', fontSize: 'clamp(42px, 9.5vw, 88px)', lineHeight: 0.99, fontWeight: 400, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.015em' }}>
            Pięć dni budujesz.<br /><span style={{ color: '#e0552e' }}>Dwa dni kasujesz.</span>
          </h1>
          <p style={{ fontSize: 17, color: '#ece7db', lineHeight: 1.7, maxWidth: 560, margin: 0 }}>
            W tygodniu trzymasz się nieźle. Potem przychodzi weekend i w poniedziałek zaczynasz od tego samego miejsca. Nie od zera, od minusa, bo dochodzi kac, gorszy sen i wyrzuty.
          </p>
        </section>

        <section className="rise" style={{ marginBottom: 46, perspective: '1400px' }}>
          <div className="eb"><span>II</span><i /><em>Twój tydzień</em></div>
          <div ref={cardRef} className="card sig" style={{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}>
            <div className="shine" aria-hidden />
            <div style={{ padding: '24px 18px 10px', position: 'relative', zIndex: 2 }}><Curve glowStd={GLOW_STD[st.glow]} /></div>
          </div>
          <div className="ledger">
            {WEEK.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 15px', background: 'rgba(255,255,255,0.015)', borderLeft: `3px solid ${d.state === 'break' ? '#e0552e' : d.state === 'risk' ? '#e0812e' : d.state === 'ok' ? 'var(--acc)' : '#8f887c'}` }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: d.state === 'break' ? '#ece7db' : '#8f887c', width: 30 }}>{d.day}</span>
                <span style={{ flex: 1, fontSize: 14.5, color: d.state === 'break' ? '#ece7db' : '#a49e92' }}>{d.label}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: d.state === 'break' ? '#e0552e' : d.state === 'risk' ? '#e0812e' : 'var(--acc)', fontWeight: 700 }}>{SW[d.state]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rise" style={{ marginBottom: 46 }}>
          <div className="eb"><span>III</span><i /><em>Jeden ukryty koszt</em></div>
          <div className="card">
            <div className="shine" aria-hidden />
            <div style={{ padding: 'clamp(22px, 5vw, 38px)', position: 'relative', zIndex: 2 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#8f887c', marginBottom: 12 }}>Rachunek za rok</div>
              <div style={{ fontFamily: 'var(--display)', fontStyle: 'normal', fontSize: 'clamp(54px, 13vw, 100px)', lineHeight: 0.9, color: 'var(--acc-bright)', fontWeight: 400 }}>
                <Odometer to={8400} k={st.accent} /> <span style={{ fontSize: '0.4em', color: 'var(--acc)' }}>zł</span>
              </div>
              <p style={{ fontSize: 16, color: '#a49e92', lineHeight: 1.65, margin: '16px 0 0', maxWidth: 520 }}>
                Rozbity weekend zabiera wysokie obroty przez trzy kolejne dni. W skali roku to tygodnie na ponownym wchodzeniu w rytm.
              </p>
            </div>
          </div>
        </section>

        <section className="rise" style={{ marginBottom: 20 }}>
          <a className="cta" href="#" onClick={(e) => e.preventDefault()}><span className="cta-shine" aria-hidden />Zobacz, jak wygląda współpraca 1:1 <span aria-hidden>→</span></a>
        </section>
      </div>

      {/* ── KONFIGURATOR ── */}
      <button className="toggle" onClick={() => setOpen((o) => !o)} aria-label="Konfigurator">{open ? '▾ ukryj' : '▴ konfigurator'}</button>
      {open && (
        <div className="panel">
          <div className="presets">
            {PRESETS.map((p) => (<button key={p.name} className="preset" onClick={() => setSt(p.state)}>{p.name}</button>))}
            <button className="preset rnd" onClick={randomize}>🎲 losuj</button>
          </div>
          <div className="rows">
            {CONTROLS.map((c) => (
              <div key={c.key} className="row">
                <span className="rl">{c.label}</span>
                <div className="segs">
                  {c.opts.map((o) => (<button key={o} className={`seg ${st[c.key] === o ? 'on' : ''}`} onClick={() => set(c.key, o)}>{o}</button>))}
                </div>
              </div>
            ))}
          </div>
          <div className="hint">PODGLĄD · mock-dane · wybierz wygląd → powiem „bierz" i przenoszę na /diagnoza</div>
        </div>
      )}
    </div>
  );
}

const css = `
.lab { min-height: 100vh; background: #08080a; color: #ece7db; font-family: 'Inter', system-ui, sans-serif; position: relative; overflow: hidden; }
.lab * { box-sizing: border-box; }
.lab .wrap { position: relative; z-index: 5; max-width: 680px; margin: 0 auto; padding: 52px 22px 160px; }

/* blobs */
.lab .bl { position: fixed; border-radius: 50%; z-index: 0; pointer-events: none; mix-blend-mode: screen; filter: blur(80px); }
.lab .smoke { opacity: 0.55; }
.lab .smoke.a { width: 65vw; height: 65vw; left: -15vw; top: -12vh; background: radial-gradient(circle, rgba(var(--acc-rgb),0.28), transparent 62%); animation: d1 26s ease-in-out infinite; }
.lab .smoke.b { width: 52vw; height: 52vw; right: -12vw; top: 20vh; background: radial-gradient(circle, rgba(224,85,46,0.16), transparent 60%); animation: d2 32s ease-in-out infinite; }
.lab .smoke.c { width: 70vw; height: 70vw; left: 8vw; bottom: -24vh; background: radial-gradient(circle, rgba(var(--acc-rgb),0.2), transparent 62%); animation: d3 38s ease-in-out infinite; }
.lab .au { opacity: 0.6; filter: blur(90px); }
.lab .au.a { width: 55vw; height: 55vw; left: -10vw; top: -10vh; background: radial-gradient(circle, rgba(95,179,217,0.4), transparent 60%); animation: d1 24s ease-in-out infinite; }
.lab .au.b { width: 50vw; height: 50vw; right: -8vw; top: 5vh; background: radial-gradient(circle, rgba(154,122,224,0.36), transparent 60%); animation: d2 30s ease-in-out infinite; }
.lab .au.c { width: 58vw; height: 58vw; left: 20vw; bottom: -20vh; background: radial-gradient(circle, rgba(63,174,122,0.32), transparent 60%); animation: d3 34s ease-in-out infinite; }
.lab .au.d { width: 46vw; height: 46vw; right: 10vw; bottom: 0; background: radial-gradient(circle, rgba(224,105,138,0.3), transparent 60%); animation: d1 40s ease-in-out infinite reverse; }
@keyframes d1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(8vw,6vh) scale(1.18)} }
@keyframes d2 { 0%,100%{transform:translate(0,0) scale(1.1)} 50%{transform:translate(-7vw,-5vh) scale(0.92)} }
@keyframes d3 { 0%,100%{transform:translate(0,0) scale(0.95)} 50%{transform:translate(-6vw,-8vh) scale(1.15)} }

.lab .mesh { position: fixed; inset: -20%; z-index: 0; pointer-events: none; filter: blur(60px); opacity: 0.7; background:
  radial-gradient(40% 40% at 20% 25%, rgba(var(--acc-rgb),0.4), transparent 70%),
  radial-gradient(45% 45% at 80% 20%, rgba(var(--acc-rgb),0.24), transparent 70%),
  radial-gradient(50% 50% at 60% 80%, rgba(var(--acc-rgb),0.3), transparent 70%),
  radial-gradient(40% 40% at 15% 85%, rgba(224,85,46,0.16), transparent 70%);
  background-size: 200% 200%; animation: meshflow 30s ease-in-out infinite; }
@keyframes meshflow { 0%,100%{background-position:0% 0%} 50%{background-position:100% 100%} }

.lab .spot { position: fixed; inset: 0; z-index: 0; pointer-events: none; background: radial-gradient(600px circle at var(--mx) var(--my), rgba(var(--acc-rgb),0.22), transparent 45%); transition: background 0.1s linear; }

.lab .stars { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
.lab .stars span { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.85); box-shadow: 0 0 4px rgba(var(--acc-rgb),0.8); animation: tw 3.5s ease-in-out infinite; }
@keyframes tw { 0%,100%{opacity:0.15} 50%{opacity:0.95} }

.lab .vig { position: fixed; inset: 0; z-index: 1; pointer-events: none; background: radial-gradient(120% 90% at 50% 10%, transparent 38%, rgba(0,0,0,0.6) 100%); }
.lab .grain { position: fixed; inset: -50%; z-index: 3; pointer-events: none; opacity: var(--grain-op); mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); animation: gr 0.5s steps(2) infinite; }
@keyframes gr { 0%{transform:translate(0,0)} 50%{transform:translate(-3%,2%)} 100%{transform:translate(2%,-3%)} }

/* eyebrow + stamp */
.lab .eb { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.lab .eb span { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--acc); }
.lab .eb i { width: 26px; height: 1px; background: rgba(255,255,255,0.16); }
.lab .eb em { font-family: var(--mono); font-size: 10.5px; letter-spacing: 3px; text-transform: uppercase; color: #a49e92; font-style: normal; }
.lab .stamp { display: inline-block; font-family: var(--mono); font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; color: var(--acc-bright); border: 1px solid var(--acc-deep); border-radius: 4px; padding: 7px 12px; margin-bottom: 18px; background: rgba(var(--acc-rgb),0.06); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08); }

/* KARTY — sterowane data-surface */
.lab .card { position: relative; z-index: 2; border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); transition: transform .18s cubic-bezier(.2,.7,.2,1), box-shadow .3s ease; will-change: transform; }
.lab .sig { transform-style: preserve-3d; }
.lab .ledger { margin-top: 16px; display: grid; gap: 1px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius); overflow: hidden; }
.lab[data-surface="gloss"] .card { background: linear-gradient(158deg,#1c1c20,#121215 55%,#0d0d10); border: 1px solid rgba(255,255,255,0.06); }
.lab[data-surface="gloss"] .card::after { content:''; position:absolute; inset:0; border-radius:var(--radius); padding:1px; pointer-events:none; background:linear-gradient(120deg, rgba(var(--acc-rgb),0.5), transparent 30%, transparent 70%, rgba(var(--acc-rgb),0.25)); -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; }
.lab[data-surface="glass"] .card { background: rgba(255,255,255,0.05); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border: 1px solid rgba(255,255,255,0.14); }
.lab[data-surface="frosted"] .card { background: rgba(var(--acc-rgb),0.06); backdrop-filter: blur(24px) saturate(1.3); -webkit-backdrop-filter: blur(24px) saturate(1.3); border: 1px solid rgba(255,255,255,0.12); }
.lab[data-surface="matte"] .card { background: #141416; border: 1px solid rgba(255,255,255,0.05); }
.lab[data-surface="neon"] .card { background: #0c0c0e; border: 1px solid var(--acc); box-shadow: 0 0 0 1px rgba(var(--acc-rgb),0.5), 0 0 40px rgba(var(--acc-rgb),0.35), var(--shadow); }
.lab[data-surface="emboss"] .card { background: #101012; border: 1px solid rgba(255,255,255,0.04); box-shadow: inset 0 2px 6px rgba(0,0,0,0.7), inset 0 -1px 0 rgba(255,255,255,0.05), var(--shadow); }

/* POŁYSK */
.lab .shine { position: absolute; inset: 0; z-index: 3; pointer-events: none; border-radius: var(--radius); overflow: hidden; opacity: var(--shine-op); }
.lab[data-shine="false"] .shine { display: none; }
.lab .shine::before { content:''; position:absolute; top:-60%; left:-80%; width:60%; height:220%; background:linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.9) 48%, rgba(255,255,255,0.3) 55%, transparent 70%); transform: rotate(8deg); animation: sweep 6s ease-in-out infinite; }
@keyframes sweep { 0%,20%{left:-80%} 42%,100%{left:140%} }

/* CTA */
.lab .cta { position: relative; overflow: hidden; display: block; text-align: center; text-decoration: none; padding: 18px 24px; border-radius: var(--radius); font-weight: 800; font-size: 16px; color: #08080a; background: linear-gradient(135deg, var(--acc-bright), var(--acc) 45%, var(--acc-deep)); box-shadow: 0 20px 50px -12px rgba(var(--acc-rgb),0.5), inset 0 1px 0 rgba(255,255,255,0.4); transition: transform .18s ease; }
.lab .cta:hover { transform: translateY(-2px); }
.lab .cta-shine { position: absolute; top:0; left:-60%; width:40%; height:100%; background:linear-gradient(105deg, transparent, rgba(255,255,255,0.6), transparent); animation: ctasw 4s ease-in-out infinite; }
@keyframes ctasw { 0%,25%{left:-60%} 55%,100%{left:140%} }

/* reveal + signal */
.lab .rise { animation: rise .8s cubic-bezier(.2,.6,.2,1) both; }
.lab .rise:nth-of-type(2){animation-delay:.1s} .lab .rise:nth-of-type(3){animation-delay:.2s} .lab .rise:nth-of-type(4){animation-delay:.3s} .lab .rise:nth-of-type(5){animation-delay:.4s}
@keyframes rise { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
.lab .wp-line { stroke-dasharray:1; stroke-dashoffset:1; animation: draw 1.7s .4s cubic-bezier(.4,0,.2,1) forwards; }
.lab .wp-area { opacity:0; animation: fade .9s 1.6s ease forwards; }
.lab .wp-dot { opacity:0; animation: fade .5s 1.8s ease forwards; }
.lab .wp-peak { transform-origin:center; animation: fade .5s 1.8s ease forwards, pulse 2.6s 2.3s ease-in-out infinite; }
@keyframes draw { to{stroke-dashoffset:0} } @keyframes fade { to{opacity:1} } @keyframes pulse { 0%,100%{r:6;opacity:1} 50%{r:8;opacity:.7} }

/* KONFIGURATOR */
.lab .toggle { position: fixed; right: 16px; bottom: 16px; z-index: 40; font-family: var(--mono); font-size: 12px; font-weight: 700; letter-spacing: 1px; color: #08080a; background: var(--acc); border: none; border-radius: 10px; padding: 10px 14px; cursor: pointer; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
.lab .panel { position: fixed; left: 0; right: 0; bottom: 0; z-index: 39; background: rgba(10,10,12,0.92); backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.1); padding: 14px 16px 60px; max-height: 62vh; overflow-y: auto; }
.lab .presets { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.lab .preset { font-family: var(--sans); font-size: 12.5px; font-weight: 700; color: #ece7db; background: linear-gradient(135deg, rgba(var(--acc-rgb),0.22), rgba(var(--acc-rgb),0.08)); border: 1px solid rgba(var(--acc-rgb),0.4); border-radius: 999px; padding: 8px 14px; cursor: pointer; transition: transform .12s; }
.lab .preset:hover { transform: translateY(-1px); }
.lab .preset.rnd { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.16); }
.lab .rows { display: grid; gap: 9px; }
.lab .row { display: flex; align-items: center; gap: 12px; }
.lab .rl { font-family: var(--mono); font-size: 10.5px; letter-spacing: 1.5px; text-transform: uppercase; color: #8f887c; width: 66px; flex-shrink: 0; }
.lab .segs { display: flex; flex-wrap: wrap; gap: 6px; }
.lab .seg { font-family: var(--mono); font-size: 11px; color: #a49e92; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 6px 10px; cursor: pointer; text-transform: capitalize; transition: all .12s; }
.lab .seg:hover { color: #ece7db; border-color: rgba(255,255,255,0.2); }
.lab .seg.on { color: #08080a; background: var(--acc); border-color: var(--acc); font-weight: 700; }
.lab .hint { margin-top: 14px; font-family: var(--mono); font-size: 10.5px; letter-spacing: 1px; color: #67635a; }

@media (max-width: 520px) { .lab .bl, .lab .mesh { filter: blur(55px); } .lab .rl { width: 100%; } .lab .row { flex-direction: column; align-items: flex-start; gap: 4px; } }
@media (prefers-reduced-motion: reduce) {
  .lab .bl, .lab .mesh, .lab .stars span, .lab .shine::before, .lab .cta-shine, .lab .grain { animation: none !important; }
  .lab .rise, .lab .wp-line, .lab .wp-area, .lab .wp-dot, .lab .wp-peak { animation: none !important; opacity: 1 !important; transform: none !important; stroke-dashoffset: 0 !important; }
}
`;
