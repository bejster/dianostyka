'use client';

// ── Wspólna warstwa atmosfery dla całej /diagnoza (gwiazdy + ziarno + winieta) ──
// Jedno źródło prawdy sygnatury wizualnej. Wpinane w intro, quiz, Kartę, bramkę.
// Wszystkie warstwy z-index:0 + pointer-events:none -> treść musi mieć position:relative; z-index:1.

import { useEffect, useState } from 'react';

export function Atmosphere({ variant = 'stars' }: { variant?: 'stars' | 'smoke' }) {
  const [stars, setStars] = useState<{ x: number; y: number; d: number; s: number }[]>([]);
  useEffect(() => {
    setStars(Array.from({ length: 70 }, () => ({ x: Math.random() * 100, y: Math.random() * 100, d: Math.random() * 4, s: 0.5 + Math.random() * 1.6 })));
  }, []);
  return (
    <div className="dx-atmo" aria-hidden>
      <style>{DX_CSS}</style>
      {variant === 'stars' ? (
        <div className="dx-stars">
          {stars.map((s, i) => <span key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />)}
        </div>
      ) : (
        <><div className="dx-smoke a" /><div className="dx-smoke b" /><div className="dx-smoke c" /></>
      )}
      <div className="dx-vig" />
      <div className="dx-grain" />
    </div>
  );
}

const DX_CSS = `
.dx-atmo, .dx-atmo * { pointer-events: none; }
.dx-stars { position: fixed; inset: 0; z-index: 0; }
.dx-stars span { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.85); box-shadow: 0 0 4px rgba(200,168,78,0.8); animation: dxtw 3.6s ease-in-out infinite; }
@keyframes dxtw { 0%,100% { opacity: 0.12; } 50% { opacity: 0.9; } }
.dx-smoke { position: fixed; border-radius: 50%; z-index: 0; filter: blur(80px); mix-blend-mode: screen; opacity: 0.5; }
.dx-smoke.a { width: 65vw; height: 65vw; left: -15vw; top: -12vh; background: radial-gradient(circle, rgba(200,168,78,0.26), transparent 62%); animation: dxd1 26s ease-in-out infinite; }
.dx-smoke.b { width: 52vw; height: 52vw; right: -12vw; top: 20vh; background: radial-gradient(circle, rgba(224,85,46,0.15), transparent 60%); animation: dxd2 32s ease-in-out infinite; }
.dx-smoke.c { width: 70vw; height: 70vw; left: 8vw; bottom: -24vh; background: radial-gradient(circle, rgba(138,117,53,0.2), transparent 62%); animation: dxd3 38s ease-in-out infinite; }
@keyframes dxd1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(8vw,6vh) scale(1.18); } }
@keyframes dxd2 { 0%,100% { transform: translate(0,0) scale(1.1); } 50% { transform: translate(-7vw,-5vh) scale(0.92); } }
@keyframes dxd3 { 0%,100% { transform: translate(0,0) scale(0.95); } 50% { transform: translate(-6vw,-8vh) scale(1.15); } }
.dx-vig { position: fixed; inset: 0; z-index: 0; background: radial-gradient(120% 90% at 50% 8%, transparent 40%, rgba(0,0,0,0.6) 100%); }
.dx-grain { position: fixed; inset: -50%; z-index: 0; opacity: 0.08; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  animation: dxgr 0.5s steps(2) infinite; }
@keyframes dxgr { 0% { transform: translate(0,0); } 50% { transform: translate(-3%,2%); } 100% { transform: translate(2%,-3%); } }
@media (prefers-reduced-motion: reduce) { .dx-stars span, .dx-smoke, .dx-grain { animation: none !important; } }
`;
