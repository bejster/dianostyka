'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

type SevKey = 'sleepQ' | 'screenBed' | 'stress' | 'energy' | 'dopamine' | 'dietChaos' | 'binge';
type ChipKey = 'fatigue' | 'mood' | 'libido' | 'belly' | 'brain' | 'anxiety' | 'joints' | 'skin' | 'motivation' | 'digest' | 'cravings' | 'recovery' | 'focus' | 'headaches' | 'sweating' | 'heartRate';

interface FD {
  sleep: number; sleepQ: number; screenBed: number; stress: number; energy: number;
  dopamine: number; dietChaos: number; junk: number; binge: number; wknd: number;
  drinks: number; cash: number; subs: number; lost: number; plan: number;
  miss: number; gym: number; rate: number; tags: Set<ChipKey>;
}

const INIT: FD = {
  sleep: 7, sleepQ: 0, screenBed: 0, stress: 0, energy: 0, dopamine: 0,
  dietChaos: 0, junk: 0, binge: 0, wknd: 1, drinks: 0, cash: 0,
  subs: 0, lost: 0, plan: 0, miss: 0, gym: 150, rate: 60,
  tags: new Set(),
};

const SECTIONS = ['Sen', 'Stres', 'Żywienie', 'Weekend', 'Trening', 'Sygnały'];

function costs(D: FD) {
  // ── TWARDE KOSZTY — wydajesz wprost, weryfikowalne ──
  const wkndCost = Math.round((D.cash + D.subs) * D.wknd * 6);
  const foodCost = Math.round(D.junk * 6 + (D.binge >= 3 ? 300 : 0));
  const trainCost = D.plan > 0 ? Math.round(D.gym * 6 * Math.min(D.miss / D.plan, 1)) : 0;
  // Sen: kompensacja deficytu — kawa, suplementy, gorsze decyzje zakupowe (Cappuccio 2010)
  const sleepCost = D.sleep < 7 ? Math.round((7.5 - D.sleep) * 140 * 6) : 0;

  // ── UKRYTE KOSZTY — szacunek oparty na badaniach naukowych ──
  // Produktywność: mgła × stawka × 26 tyg. (RAND 2016: <6h snu = -2.4% GDP; Hemp HBR 2004: prezenteizm 3× droższy niż absencja)
  const prodCost = Math.round(D.lost * 26 * D.rate);
  // Stagnacja: treningi bez progresu bo fundamenty nie grają
  // (Parr 2014: alkohol -24-37% synteza białek; Halson 2014: deficyt snu = upośledzona regeneracja;
  //  Schoenfeld 2017: progres wymaga progressive overload + regeneracja + jadłospis jednocześnie)
  const brakes = [
    D.sleepQ >= 2 || D.sleep < 6.5,       // kiepski sen / za mało snu
    D.dietChaos >= 2 || D.binge >= 2,      // chaos w żywieniu
    D.stress >= 3 || D.energy >= 3,        // wysoki stres / wypalenie
    D.drinks > 5 || D.subs > 0,           // alkohol / substancje
    D.dopamine >= 3,                       // rozregulowana dopamina
  ].filter(Boolean).length;
  const wastedPct = Math.min(brakes * 12, 60);
  const wastedSessions = D.plan > 0 ? Math.round(D.plan * 26 * wastedPct / 100) : 0;
  const stagnationMonths = Math.round(brakes * 1.5 * 10) / 10;
  const costPerSession = D.plan > 0 ? D.gym / (D.plan * 4) : 0;
  const stagnationCost = Math.round(wastedSessions * (costPerSession + 1.25 * Math.max(D.rate * 0.2, 10)));
  // Symptomy: suplementy, wizyty, kompensacja sygnałów ciała (350 zł / symptom / 6 mies.)
  const signalCost = Math.round(D.tags.size * 350);

  const totalLostH = Math.round(D.lost * 26);
  const hardTotal = wkndCost + foodCost + trainCost + sleepCost;
  const hiddenTotal = prodCost + stagnationCost + signalCost;
  const total = hardTotal + hiddenTotal;

  return { sleepCost, foodCost, wkndCost, trainCost, prodCost, stagnationCost, signalCost,
           total, hardTotal, hiddenTotal, totalLostH,
           brakes, wastedPct, wastedSessions, stagnationMonths };
}

function score(D: FD) {
  const s = Math.min(((D.sleepQ + D.screenBed) / 8 + (7.5 - Math.min(D.sleep, 7.5)) / 2) * 15, 15)
    + Math.min(((D.stress + D.energy + D.dopamine) / 10) * 20, 20)
    + Math.min(((D.dietChaos + D.binge) / 8) * 12, 12)
    + Math.min((D.drinks / 15) * 12 + (D.subs > 0 ? 8 : 0), 20)
    + Math.min((D.miss / 3) * 15, 15)
    + Math.min((D.tags.size / 8) * 18, 18);
  return Math.min(Math.round(s), 100);
}

// Paleta: złoto + czerń, minimalizm
const M = {
  bg: '#0a0a0a',
  s1: '#131313',
  s2: '#1c1c1c',
  s3: '#252525',
  brd: '#222222',
  brd2: '#2e2e2e',
  gold: '#c8a84e',
  goldMuted: '#a08a3e',
  goldDim: '#8a7535',
  goldGlow: 'rgba(200,168,78,0.18)',
  red: '#dc4444',
  org: '#e8923a',
  yel: '#d4a82a',
  grn: '#3cba5e',
  t1: '#ffffff',
  t2: '#e0ddd6',
  t3: '#b8b3a8',
  t4: '#8a857a',
  mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
  sans: "'Inter', system-ui, -apple-system, sans-serif",
};

// ── HOOK: scroll progress bar ──
function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return progress;
}

// ── HOOK: scroll reveal dla sekcji wyników ──
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ── HOOK: animowany licznik ──
function useCounter(target: number, duration = 1200, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    // Pomijamy animację przy prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setVal(target); return; }
    const start = performance.now();
    const from = 0;
    const raf = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      // easeOutExpo
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setVal(Math.round(from + (target - from) * eased));
      if (p < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [target, duration, active]);
  return val;
}

// ── KOMPONENT: Reveal wrapper z animacją wejścia ──
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(18px)',
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
}

// ── KOMPONENT: Wave divider między sekcjami ──
function WaveDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div style={{
      width: 'calc(100% + 32px)',
      overflow: 'hidden',
      lineHeight: 0,
      transform: flip ? 'scaleY(-1)' : 'none',
      margin: '0 -16px',
    }}>
      <svg
        viewBox="0 0 440 28"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: 28 }}
      >
        <path
          d="M0,14 C55,28 110,0 165,14 C220,28 275,0 330,14 C385,28 440,7 440,14 L440,28 L0,28 Z"
          fill="rgba(200,168,78,0.04)"
        />
        <path
          d="M0,18 C70,8 140,24 220,16 C300,8 370,22 440,16 L440,28 L0,28 Z"
          fill="rgba(200,168,78,0.025)"
        />
      </svg>
    </div>
  );
}

// ── KOMPONENT: Gold particles canvas ──
function GoldParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    // Sprawdź prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = window.devicePixelRatio || 1;
    const N = 35; // liczba cząstek
    const LINK_DIST_SQ = 120 * 120; // kwadrat dystansu dla linii
    const MOUSE_DIST_SQ = 90 * 90;

    // Rozmiar canvas z uwzględnieniem DPR
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Inicjalizacja cząstek
    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      r: number; a: number;
    }
    const pts: Particle[] = Array.from({ length: N }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.6,
      a: Math.random() * 0.55 + 0.15,
    }));

    // Główna pętla animacji
    const loop = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;

      // Reset transformacji przez setTransform (szybciej niż resetTransform)
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Aktualizacja pozycji
      for (const p of pts) {
        // Delikatna repulsja od myszy
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < MOUSE_DIST_SQ && distSq > 0.01) {
          const force = (1 - distSq / MOUSE_DIST_SQ) * 0.4;
          p.vx += (dx / Math.sqrt(distSq)) * force * 0.04;
          p.vy += (dy / Math.sqrt(distSq)) * force * 0.04;
        }
        // Tłumienie prędkości
        p.vx *= 0.995;
        p.vy *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        // Odbijanie od krawędzi z płynnym zawijaniem
        if (p.x < 0) { p.x = W; }
        if (p.x > W) { p.x = 0; }
        if (p.y < 0) { p.y = H; }
        if (p.y > H) { p.y = 0; }
      }

      // Grupowanie linii wg opacity (4 kubełki)
      const buckets: [number, number, number, number][][] = [[], [], [], []];
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dSq = dx * dx + dy * dy;
          if (dSq < LINK_DIST_SQ) {
            const alpha = (1 - dSq / LINK_DIST_SQ) * 0.18;
            const bucket = Math.floor(alpha / 0.045);
            const b = Math.min(bucket, 3);
            buckets[b].push([pts[i].x, pts[i].y, pts[j].x, pts[j].y]);
          }
        }
      }
      // Renderowanie linii grupowo
      const bucketAlpha = [0.04, 0.08, 0.13, 0.18];
      for (let b = 0; b < 4; b++) {
        if (buckets[b].length === 0) continue;
        ctx.strokeStyle = `rgba(200,168,78,${bucketAlpha[b]})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (const [x1, y1, x2, y2] of buckets[b]) {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.stroke();
      }

      // Rysowanie cząstek
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,168,78,${p.a})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    // Obsługa myszy (pasywny listener dla wydajności)
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}

// ── KOMPONENT: Scroll progress bar ──
function ScrollProgress() {
  const progress = useScrollProgress();
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Postęp przewijania strony"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 200,
        background: 'transparent',
      }}
    >
      <div style={{
        height: '100%',
        width: `${progress}%`,
        background: `linear-gradient(90deg, ${M.goldDim}, ${M.gold})`,
        transition: 'width 0.1s linear',
        boxShadow: `0 0 6px ${M.gold}50`,
      }} />
    </div>
  );
}

export default function Page() {
  const [D, setD] = useState<FD>(INIT);
  const [sec, setSec] = useState(0);
  const [phase, setPhase] = useState<'form' | 'gate' | 'results'>('form');
  const [igHandle, setIgHandle] = useState('');
  const [email, setEmail] = useState('');
  const [imie, setImie] = useState('');
  const [igErr, setIgErr] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [salaryInput, setSalaryInput] = useState(10000);
  const [loaded, setLoaded] = useState(false); // efekt wejścia hero
  const [copied, setCopied] = useState(false); // przycisk share
  const [countersActive, setCountersActive] = useState(false); // uruchom liczniki po wejściu w wyniki
  const topRef = useRef<HTMLDivElement>(null);

  // Efekt wejścia hero
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Uruchom liczniki animowane przy przejściu do wyników
  useEffect(() => {
    if (phase === 'results') {
      const t = setTimeout(() => setCountersActive(true), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase]);

  const upd = (k: keyof FD, v: number) => setD(p => ({ ...p, [k]: v }));
  const sev = (k: SevKey, v: number) => setD(p => ({ ...p, [k]: v }));
  const tog = (t: ChipKey) => setD(p => {
    const tags = new Set(p.tags); tags.has(t) ? tags.delete(t) : tags.add(t);
    return { ...p, tags };
  });

  const go = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (sec < SECTIONS.length - 1) setSec(s => s + 1);
    else setPhase('gate');
  };
  const back = () => { setSec(s => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const submit = async () => {
    // Walidacja IG handle
    const handle = igHandle.trim().replace(/^@/, '');
    if (!handle) { setIgErr('Podaj nick na Instagramie'); return; }
    // Walidacja email
    if (!email.includes('@') || !email.includes('.')) { setEmailErr('Podaj poprawny email'); return; }
    setLoading(true);
    const c = costs(D); const sc = score(D);
    const finalHandle = '@' + handle;
    const odpowiedzi = {
      sleep: D.sleep, sleepQ: D.sleepQ, screenBed: D.screenBed,
      stress: D.stress, energy: D.energy, dopamine: D.dopamine,
      dietChaos: D.dietChaos, junk: D.junk, binge: D.binge,
      wknd: D.wknd, drinks: D.drinks, cash: D.cash, subs: D.subs,
      lost: D.lost, plan: D.plan, miss: D.miss, gym: D.gym,
      rate: D.rate, tags: Array.from(D.tags),
    };
    const biggest = catData.reduce((a, b) => a.v > b.v ? a : b, catData[0]);
    const payload = {
      instagram_handle: finalHandle,
      email,
      imie: imie.trim() || null,
      wynik_kwota: String(c.total),
      wynik_score: String(sc),
      biggest_category: biggest?.l || '',
      timestamp: new Date().toISOString(),
      source: 'diagnostyka_hit',
      odpowiedzi,
    };
    // Wysyłka do API (MailerLite + webhook n8n)
    try {
      await fetch('/api/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Fallback: zapisz w sessionStorage na retry
      try { sessionStorage.setItem('diag_lead_retry', JSON.stringify(payload)); } catch {}
    }
    setPhase('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const C = costs(D); const SC = score(D);
  const pct = Math.round((sec / SECTIONS.length) * 100);
  const scoreColor = SC >= 75 ? M.red : SC >= 50 ? M.org : SC >= 25 ? M.yel : M.grn;

  const catData = [
    { ic: '🍺', v: C.wkndCost, l: 'Weekendy', c: M.gold, type: 'hard' },
    { ic: '🍔', v: C.foodCost, l: 'Żywienie', c: M.org, type: 'hard' },
    { ic: '🏋️', v: C.trainCost, l: 'Trening', c: M.grn, type: 'hard' },
    { ic: '😴', v: C.sleepCost, l: 'Sen', c: '#a08ae0', type: 'hard' },
    { ic: '⏰', v: C.prodCost, l: 'Produktywność', c: '#4abace', type: 'hidden' },
    { ic: '📉', v: C.stagnationCost, l: 'Stagnacja', c: '#e05a7a', type: 'hidden' },
    { ic: '⚡', v: C.signalCost, l: 'Symptomy', c: M.red, type: 'hidden' },
  ].filter(x => x.v > 0);
  const maxC = Math.max(...catData.map(x => x.v), 1);

  const hormones: { n: string; a: string; i: string; c: string }[] = [];
  if (D.sleep < 6.5 || D.sleepQ >= 3) hormones.push({ n: 'HGH', a: '↓', i: 'Obniżona regeneracja', c: M.org });
  if (D.drinks > 5 || D.subs > 0 || D.tags.has('libido')) hormones.push({ n: 'Testosteron', a: '↓', i: D.drinks > 10 || D.subs > 0 ? 'Mocny spadek' : 'Spadek', c: D.drinks > 10 || D.subs > 0 ? M.red : M.org });
  if (D.stress >= 3 || D.sleepQ >= 3) hormones.push({ n: 'Kortyzol', a: '↑', i: 'Chronicznie wysoki', c: M.red });
  if (D.dopamine >= 3 || D.tags.has('motivation')) hormones.push({ n: 'Dopamina', a: '⚡', i: 'Desensytyzacja', c: M.red });
  if (D.tags.has('mood') || D.subs > 0) hormones.push({ n: 'Serotonina', a: '↓', i: D.subs > 0 ? 'Deplecja' : 'Spadek', c: D.subs > 0 ? M.red : M.org });
  if (D.tags.has('belly') || D.binge >= 3) hormones.push({ n: 'Insulina', a: '↑', i: 'Insulinooporność', c: M.org });
  if (D.sleepQ >= 3 || D.screenBed >= 3) hormones.push({ n: 'Melatonina', a: '↓', i: 'Zaburzony cykl', c: M.org });
  if (D.tags.has('heartRate') || (D.stress >= 3 && D.subs > 0)) hormones.push({ n: 'Adrenalina', a: '↑', i: 'Układ sympatyczny non-stop', c: M.red });

  const insights: string[] = [];
  if (D.tags.size >= 6) insights.push(`Zaznaczyłeś <b>${D.tags.size} z 16 sygnałów</b>. To wzorzec który się pogłębia z każdym tygodniem.`);
  else if (D.tags.size >= 3) insights.push(`<b>${D.tags.size} sygnały</b> kręcą spiralę. Zmęczenie, gorsze żywienie, gorszy trening. I tak w kółko.`);
  if (D.dopamine >= 3 && D.binge >= 2) insights.push(`Głód dopaminowy + objadanie = <b>rozregulowany układ nagrody</b>. To biochemia, nie słaba wola.`);
  if (D.tags.has('libido') && (D.stress >= 3 || D.sleep < 6.5)) insights.push(`Niższe libido + ${D.stress >= 3 ? 'chroniczny stres' : 'kiepski sen'} = <b>klasyka spadku testosteronu</b>. Badania 10 199 mężczyzn: to styl życia, nie wiek.`);
  if (D.tags.has('belly') && (D.binge >= 2 || D.dietChaos >= 3)) insights.push(`Brzuch nie schodzi + objadanie = <b>insulinooporność w budowie</b>. Sam trening tego nie przebije.`);
  if (D.drinks > 10 && D.tags.has('libido')) insights.push(`${D.drinks} drinków regularnie + niższe libido. 14+ drinków tygodniowo = <b>~6.8% chroniczny spadek T</b>. Alkohol zamienia testosteron w estrogen.`);
  if (D.tags.has('sweating') && D.drinks > 5) insights.push(`Nocne poty + alkohol = <b>kortyzol nocą nie schodzi</b>. Ciało próbuje się detoksyfikować zamiast regenerować.`);
  if (D.tags.has('heartRate') && (D.stress >= 2 || D.subs > 0)) insights.push(`Podwyższone tętno spoczynkowe = <b>układ sympatyczny na stałym gazie</b>. ${D.subs > 0 ? 'Substancje to potęgują.' : 'Stres chroniczny tego nie odpuści sam.'}`);
  if (D.tags.has('headaches') && D.sleep < 6.5) insights.push(`Bóle głowy + deficyt snu = <b>przewlekły stan zapalny</b>. Ibuprofen to plaster, nie rozwiązanie.`);
  if (C.total > 8000) insights.push(`<b>${C.total.toLocaleString('pl-PL')} zł w pół roku</b>. Na konsekwencje, nie na sam weekend.`);

  // Potencjal - ile % wykorzystujesz (odwrotnosc score)
  const potential = Math.max(100 - SC, 15);
  const potentialUsed = 100 - potential;

  // 3 personalne tipy na podstawie odpowiedzi
  const tips: { icon: string; title: string; desc: string; boost: string }[] = [];

  // Tip 1 - zawsze najwazniejszy problem
  if (D.sleep < 6.5 || D.sleepQ >= 2) {
    tips.push({
      icon: '🛏',
      title: 'Napraw sen',
      desc: D.sleep < 6 ? `${D.sleep}h to za malo. Docel 7h - sam ten ruch zmieni poziom kortyzolu, testosteronu i regeneracji.`
        : `Jakosc snu jest wazniejsza niz dlugosc. Ekran 60 min przed snem zamien na ksiazke lub stretching.`,
      boost: '+3-5%',
    });
  }

  if (D.drinks > 5 || D.subs > 0) {
    tips.push({
      icon: '🍺',
      title: D.subs > 0 ? 'Zredukuj substancje' : 'Ogranicz alkohol',
      desc: D.subs > 0 ? `Kazde uzycie resetuje serotonine na 2-4 tyg. Jeden wolny miesiac i zobaczysz roznice w energii, libido i motywacji.`
        : `${D.drinks} drinkow to ~${Math.round(D.drinks * 3.4)}% spadek T w 12h. Zmniejsz o polowe - cialo odczuje to w ciagu 2 tyg.`,
      boost: D.subs > 0 ? '+5-8%' : '+3-5%',
    });
  }

  if (D.stress >= 2 || D.energy >= 2) {
    tips.push({
      icon: '🧠',
      title: 'Zarządzaj stresem',
      desc: `Chroniczny stres podnosi kortyzol non-stop. 10 min dziennie: spacer bez telefonu, oddech 4-7-8, cold exposure. Maly nawyk, duzy efekt.`,
      boost: '+2-4%',
    });
  }

  if (D.miss > 0 && tips.length < 3) {
    tips.push({
      icon: '🏋',
      title: 'Przestań tracić treningi',
      desc: `${D.miss} opuszczone treningi/tyg to ${D.miss * 4 * 6} straconych sesji w pol roku. Planuj trening na poniedzialek rano - najmniejsze ryzyko odwolania.`,
      boost: '+2-3%',
    });
  }

  if (D.dietChaos >= 2 && tips.length < 3) {
    tips.push({
      icon: '🍽',
      title: 'Ogarnij bazowe zywienie',
      desc: `Nie potrzebujesz diety. Potrzebujesz 3 posilki dziennie z bialkiem. Meal prep w niedziele = caly tydzien ogarnienty.`,
      boost: '+2-4%',
    });
  }

  if (D.dopamine >= 2 && tips.length < 3) {
    tips.push({
      icon: '📱',
      title: 'Reset dopaminy',
      desc: `Ciagla stymulacja (scrolling, jedzenie, substancje) obniza baseline dopaminy. 1 dzien w tyg. bez telefonu zmienia perspektywe.`,
      boost: '+2-3%',
    });
  }

  // Fallback jesli mniej niz 3 tipy
  if (tips.length < 3) {
    tips.push({
      icon: '💧',
      title: 'Nawodnienie + elektrolity',
      desc: `2% odwodnienia = 10% spadek wydolnosci kognitywnej. Zacznij dzien od 500ml wody z solą i cytryną.`,
      boost: '+1-2%',
    });
  }

  const totalBoostMin = tips.reduce((s, t) => s + parseInt(t.boost.replace('+','').split('-')[0]), 0);
  const totalBoostMax = tips.reduce((s, t) => s + parseInt(t.boost.replace('+','').split('-')[1] || t.boost.replace('+','').split('-')[0]), 0);

  const comparisons: string[] = [];
  if (C.total > 5000) comparisons.push('pół roku współpracy 1:1');
  if (C.total > 8000) comparisons.push('wakacje all-inclusive');
  if (C.total > 15000) comparisons.push('używany samochód');
  if (C.total > 30000) comparisons.push('wkład własny na mieszkanie');

  const normMax = Math.max(C.total, 20000);
  const normData = [
    { label: 'Ty', value: C.total, color: M.gold, pct: (C.total / normMax) * 100 },
    { label: 'Średnia', value: 9500, color: M.t4, pct: (9500 / normMax) * 100 },
    { label: 'Świadomy', value: 2800, color: M.grn, pct: (2800 / normMax) * 100 },
  ];

  const mo = Math.round(C.total / 6);
  const projData = [1, 2, 3, 4, 5, 6].map(m => ({ m, v: mo * m }));
  const projMax = projData[5]?.v || 1;

  const timeline: { period: string; text: string }[] = [];
  if (D.sleep < 6.5 || D.sleepQ >= 3) {
    timeline.push({ period: 'Każda noc', text: `${D.sleep}h snu${D.sleepQ >= 3 ? ' i do tego kiepska jakość' : ''}. HGH wydziela się w głębokim śnie. Bez niego <b>regeneracja mięśniowa, spalanie tłuszczu i odnowa komórkowa nie zachodzą</b>. Ludzie śpiący <6h mają 13% wyższe ryzyko śmierci i tracą 19-29% produktywności.` });
  }
  if (D.stress >= 3 || D.energy >= 3) {
    timeline.push({ period: 'Cały dzień', text: `Wysoki stres + niska energia = <b>kortyzol chronicznie podwyższony</b>. Ciało w trybie przetrwania: magazynuje tłuszcz na brzuchu, rozkłada mięśnie na energię, tłumi libido. Biochemia, nie słabość.` });
  }
  if (D.wknd > 0 && D.drinks > 3) {
    timeline.push({ period: 'Weekend', text: `${D.drinks} drinków x ${D.wknd} weekendów. Dawka >1.5g/kg alkoholu (5-6 piw dla 70kg) = <b>spadek testosteronu o ~27% w 12h</b>, normalizacja po 36h. ${D.subs > 0 ? 'Substancje dodatkowo wyczerpują serotoninę i dopaminę.' : 'Synteza białek mięśniowych zatrzymana na 2-3 dni.'}` });
  }
  if (D.dietChaos >= 3 || D.binge >= 3) {
    timeline.push({ period: 'Cyklicznie', text: `Chaotyczne żywienie${D.binge >= 3 ? ' + cykliczne objadanie' : ''} = <b>skoki insuliny</b>. Ciało nie wie kiedy budować, kiedy spalać. Domyślnie magazynuje. Tłuszcz trzewny to bezpośredni efekt.` });
  }
  if (C.totalLostH > 20) {
    timeline.push({ period: '6 miesięcy', text: `<b>${C.totalLostH}h</b> pracy na autopilocie. Przy Twojej stawce to <b>${C.prodCost.toLocaleString('pl-PL')} zł</b>. Twój mózg chemicznie nie jest w stanie działać na 100% kiedy hormony, sen i jadłospis nie grają.` });
  }

  // Severity opcje
  const sevOpts = [{ n: '0', l: 'Brak' }, { n: '1', l: 'Rzadko' }, { n: '2', l: 'Często' }, { n: '3', l: 'Zawsze' }];
  const sevColors = ['#3cba5e', '#d4a82a', '#e8923a', '#dc4444'];

  // Animowane liczniki dla wyników
  const animTotal = useCounter(C.total, 1400, countersActive);
  const animScore = useCounter(SC, 1000, countersActive);
  const animHard = useCounter(C.hardTotal, 1200, countersActive);
  const animHidden = useCounter(C.hiddenTotal, 1300, countersActive);

  const SevField = ({ label, sub, k, val }: { label: string; sub?: string; k: SevKey; val: number }) => (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: sub ? 6 : 12, lineHeight: 1.45 }}>
        {label}{sub && <span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>{sub}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
        {sevOpts.map((o, i) => {
          const on = val === i;
          return (
            <button
              key={i}
              onClick={() => sev(k, i)}
              role="switch"
              aria-checked={on}
              aria-label={`${label}: ${o.l}`}
              style={{
                padding: '14px 4px', textAlign: 'center',
                border: `1.5px solid ${on ? sevColors[i] : M.brd2}`,
                background: on ? sevColors[i] + '12' : M.s1,
                cursor: 'pointer', borderRadius: 10,
                transition: 'all .2s ease',
                transform: on ? 'scale(1.03)' : 'scale(1)',
                minHeight: 44,
              }}
            >
              <span style={{ fontFamily: M.mono, fontSize: 18, fontWeight: 700, display: 'block', marginBottom: 3, color: on ? sevColors[i] : M.t3 }}>{o.n}</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: on ? sevColors[i] : M.t4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{o.l}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const Slider = ({ label, min, max, step, k, val, unit, note, ariaLabel }: { label: string; min: number; max: number; step: number; k: keyof FD; val: number; unit: string; note?: string; ariaLabel?: string }) => {
    const p = ((val - min) / (max - min)) * 100;
    const hot = unit === 'h' ? val < 7 : val > 0;
    return (
      <div style={{ marginBottom: 28 }}>
        {label && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontSize: 15, color: M.t1, fontWeight: 500, flex: 1, lineHeight: 1.45 }}>{label}</span>
          <span style={{ fontFamily: M.mono, fontSize: 17, fontWeight: 700, color: hot ? M.gold : M.t1, minWidth: 60, textAlign: 'right' }}>{val}{unit}</span>
        </div>}
        <div style={{ position: 'relative', height: 48, display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, height: 6, background: M.s3, borderRadius: 3, top: '50%', marginTop: -3 }} />
          <div style={{ position: 'absolute', left: 0, height: 6, width: `${p}%`, background: hot ? M.gold : M.t4, borderRadius: 3, transition: 'width .2s cubic-bezier(.4,0,.2,1)', top: '50%', marginTop: -3, opacity: hot ? 0.8 : 0.4 }} />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={val}
            onChange={e => upd(k, parseFloat(e.target.value))}
            aria-label={ariaLabel || label}
            aria-valuenow={val}
            aria-valuemin={min}
            aria-valuemax={max}
            style={{ width: '100%', height: 48, WebkitAppearance: 'none', background: 'transparent', position: 'relative', zIndex: 2, cursor: 'pointer', margin: 0, padding: 0 }}
          />
        </div>
        {note && <div style={{ textAlign: 'right', fontFamily: M.mono, fontSize: 11, color: M.t3, marginTop: 6 }}>{note}</div>}
      </div>
    );
  };

  const Chip = ({ t, label }: { t: ChipKey; label: string }) => {
    const on = D.tags.has(t);
    return (
      <div
        onClick={() => tog(t)}
        role="switch"
        aria-checked={on}
        aria-label={label}
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && tog(t)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px',
          background: on ? M.gold + '10' : M.s1,
          border: `1.5px solid ${on ? M.gold + '40' : M.brd2}`,
          cursor: 'pointer', marginBottom: 6, borderRadius: 12,
          transition: 'all .2s ease',
          transform: on ? 'scale(1.01)' : 'scale(1)',
          minHeight: 44,
        }}
      >
        <div style={{
          width: 22, height: 22,
          border: `2px solid ${on ? M.gold : M.brd2}`,
          background: on ? M.gold : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 6,
          transition: 'all .2s ease',
        }}>
          {on && <span style={{ fontSize: 11, color: '#0a0a0a', fontWeight: 700 }}>✓</span>}
        </div>
        <span style={{ flex: 1, fontSize: 14.5, fontWeight: on ? 500 : 400, color: on ? M.t1 : M.t2 }}>{label}</span>
      </div>
    );
  };

  const SH = ({ n, title }: { n: string; title: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
      <div style={{ fontFamily: M.mono, fontSize: 10, fontWeight: 700, background: M.gold, color: M.bg, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 8 }}>{n}</div>
      <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: M.t2 }}>{title}</div>
    </div>
  );

  // Logo komponent: okrągłe logo + tekst
  const Logo = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        border: `1.5px solid ${M.gold}30`,
        boxShadow: `0 0 10px ${M.gold}15`,
        overflow: 'hidden', flexShrink: 0,
      }}>
        <img
          src="/logo-circle.png"
          alt="Hantle i Talerz"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
      <span style={{ fontFamily: M.mono, fontSize: 10, fontWeight: 700, letterSpacing: 3.5, textTransform: 'uppercase', color: M.t3 }}>Hantle i Talerz</span>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700;800&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:${M.bg};color:${M.t1};font-family:${M.sans};min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased;width:100%}
        h1,h2,h3{text-shadow:0 0 20px rgba(255,255,255,.1),0 1px 2px rgba(0,0,0,.6)}
        p,span,div,label{text-shadow:0 1px 2px rgba(0,0,0,.4)}
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 50% at 50% 0%,#141210 0%,transparent 60%);pointer-events:none;z-index:0}
        body::after{content:'';position:fixed;inset:0;opacity:.35;background:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.03'/%3E%3C/svg%3E");pointer-events:none;z-index:0}

        input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:48px;background:transparent;cursor:pointer;margin:0;touch-action:none;-webkit-tap-highlight-color:transparent}
        input[type=range]::-webkit-slider-runnable-track{height:6px;background:transparent;border-radius:3px;cursor:pointer}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;background:${M.gold};border:none;border-radius:50%;cursor:grab;box-shadow:0 1px 4px rgba(0,0,0,.5),0 0 0 4px rgba(200,168,78,.12);margin-top:-8px}
        input[type=range]::-webkit-slider-thumb:active{cursor:grabbing;box-shadow:0 1px 6px rgba(0,0,0,.5),0 0 0 8px rgba(200,168,78,.15);width:24px;height:24px;margin-top:-9px}
        input[type=range]::-moz-range-thumb{width:22px;height:22px;background:${M.gold};border:none;border-radius:50%;cursor:grab;box-shadow:0 1px 4px rgba(0,0,0,.5),0 0 0 4px rgba(200,168,78,.12)}
        input[type=range]::-moz-range-track{background:transparent;height:6px;border:none;cursor:pointer}

        input[type=email],input[type=text]{width:100%;padding:16px 18px;background:${M.s1};border:1.5px solid ${M.brd2};color:${M.t1};font-size:16px;font-weight:500;font-family:${M.sans};outline:none;border-radius:12px;transition:border-color .2s ease,box-shadow .2s ease}
        input[type=email]:focus,input[type=text]:focus{border-color:${M.gold};box-shadow:0 0 0 3px ${M.gold}15}
        input[type=email]::placeholder,input[type=text]::placeholder{color:${M.t4}}

        button{font-family:${M.sans};transition:all .2s ease}
        button:hover{opacity:.9}
        button:active{transform:scale(0.98)}
        a{transition:opacity .2s ease}
        a:hover{opacity:.85}

        /* ── Keyframes premium ── */
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp .5s ease both}

        @keyframes pulseGlow{
          0%,100%{box-shadow:0 0 0 0 rgba(200,168,78,0.18),0 0 12px rgba(200,168,78,0.08)}
          50%{box-shadow:0 0 0 8px rgba(200,168,78,0),0 0 24px rgba(200,168,78,0.18)}
        }
        @keyframes shimmer{
          0%{background-position:-200% center}
          100%{background-position:200% center}
        }
        @keyframes morphBlob{
          0%,100%{border-radius:42% 58% 55% 45% / 48% 52% 48% 52%}
          25%{border-radius:55% 45% 38% 62% / 62% 38% 62% 38%}
          50%{border-radius:38% 62% 60% 40% / 40% 60% 40% 60%}
          75%{border-radius:60% 40% 45% 55% / 55% 45% 52% 48%}
        }
        @keyframes gradientShift{
          0%,100%{background-position:0% 50%}
          50%{background-position:100% 50%}
        }
        @keyframes borderGlow{
          0%,100%{border-color:rgba(200,168,78,0.15)}
          50%{border-color:rgba(200,168,78,0.45)}
        }
        @keyframes float{
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(-8px)}
        }
        @keyframes scorePulse{
          0%,100%{filter:drop-shadow(0 0 6px rgba(200,168,78,0.25))}
          50%{filter:drop-shadow(0 0 16px rgba(200,168,78,0.55))}
        }
        @keyframes pulse-gold{0%,100%{box-shadow:0 0 0 0 ${M.gold}20}50%{box-shadow:0 0 0 6px ${M.gold}00}}
        @keyframes heroEntry{from{opacity:0;transform:translateY(20px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}

        .shimmer-btn{
          background:linear-gradient(90deg,${M.gold} 0%,#e8cc80 40%,${M.gold} 50%,#a08a3e 100%) !important;
          background-size:200% auto !important;
          animation:shimmer 2.8s linear infinite !important;
        }
        .blob-bg{animation:morphBlob 12s ease-in-out infinite}
        .score-ring{animation:scorePulse 2.5s ease-in-out infinite}
        .border-glow{animation:borderGlow 3s ease-in-out infinite}
        .float-el{animation:float 4s ease-in-out infinite}
        .hero-entry{animation:heroEntry 0.7s cubic-bezier(.16,1,.3,1) both}

        /* Focus visible accesibility */
        *:focus-visible{outline:2px solid ${M.gold};outline-offset:2px;border-radius:8px}

        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${M.brd2};border-radius:2px}

        @media (prefers-reduced-motion: reduce){
          *{animation:none !important;transition-duration:0.01ms !important}
        }
      `}</style>

      {/* ── Skip-to-content dla dostępności ── */}
      <a
        href="#diagnostyka"
        style={{
          position: 'absolute',
          top: -60,
          left: 16,
          background: M.gold,
          color: '#0a0a0a',
          padding: '8px 16px',
          fontFamily: M.mono,
          fontSize: 12,
          fontWeight: 700,
          borderRadius: 8,
          zIndex: 9999,
          textDecoration: 'none',
          transition: 'top 0.2s ease',
        }}
        onFocus={e => (e.currentTarget.style.top = '8px')}
        onBlur={e => (e.currentTarget.style.top = '-60px')}
      >
        Przejdź do diagnostyki
      </a>

      {/* ── Scroll progress bar ── */}
      <ScrollProgress />

      {/* ── Gold particles canvas ── */}
      <GoldParticles />

      <div
        id="diagnostyka"
        ref={topRef}
        style={{ maxWidth: 440, width: '100%', margin: '0 auto', padding: '0 0 60px', position: 'relative', zIndex: 1 }}
      >

        {/* ── FORM ── */}
        {phase === 'form' && (
          <>
            {/* Top bar z logo + progress */}
            <div style={{
              position: 'sticky', top: 0, zIndex: 100,
              background: 'rgba(10,10,10,0.92)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderBottom: `1px solid ${M.brd}`,
              padding: '12px 16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Logo />
                <span style={{ fontFamily: M.mono, fontSize: 11, fontWeight: 700, color: M.gold }}>{pct}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Postęp formularza"
                style={{ height: 3, background: M.s2, overflow: 'hidden', borderRadius: 2 }}
              >
                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${M.goldDim}, ${M.gold})`, transition: 'width 0.4s ease', borderRadius: 2 }} />
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                {SECTIONS.map((s, i) => (
                  <div key={i} style={{ flex: 1, height: 2, background: i < sec ? M.gold : i === sec ? M.gold : M.s2, opacity: i < sec ? 0.5 : i === sec ? 1 : 0.3, transition: 'all .3s ease' }} title={s} />
                ))}
              </div>
            </div>

            {/* Live counter */}
            {C.total > 0 && (
              <div style={{
                position: 'sticky', top: 72, zIndex: 99,
                background: 'rgba(10,10,10,0.92)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                borderBottom: `1px solid ${M.brd}`,
                padding: '10px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4 }}>Straty / 6 mies.</span>
                <span style={{ fontFamily: M.mono, fontSize: 18, fontWeight: 700, color: M.gold, textShadow: `0 0 12px ${M.gold}25` }}>{C.total.toLocaleString('pl-PL')} zł</span>
              </div>
            )}

            <div style={{ padding: '0 16px' }}>
              {/* Hero - pierwszy ekran */}
              {sec === 0 && (
                <div
                  className={loaded ? 'hero-entry' : ''}
                  style={{ padding: '40px 0 32px', textAlign: 'center', position: 'relative' }}
                >
                  {/* Morfujące blob tła */}
                  <div
                    className="blob-bg"
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: '10%', left: '50%',
                      transform: 'translateX(-50%)',
                      width: 280, height: 280,
                      background: `radial-gradient(ellipse, ${M.gold}08 0%, transparent 70%)`,
                      pointerEvents: 'none',
                      zIndex: 0,
                    }}
                  />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{
                      display: 'inline-flex', fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
                      color: M.gold, border: `1px solid ${M.gold}25`, padding: '7px 18px', marginBottom: 22,
                      background: M.gold + '08', borderRadius: 20, fontWeight: 600,
                    }} className="border-glow">
                      2 minuty
                    </div>
                    <h1 style={{
                      fontSize: 28, fontWeight: 800, lineHeight: 1.18, letterSpacing: -0.5, marginBottom: 16,
                      color: M.t1, textShadow: '0 0 24px rgba(255,255,255,.1), 0 1px 3px rgba(0,0,0,.5)',
                    }}>
                      Ile{' '}
                      <em style={{
                        fontStyle: 'normal',
                        background: `linear-gradient(135deg, ${M.gold} 0%, #e8cc80 50%, ${M.goldMuted} 100%)`,
                        backgroundSize: '200% auto',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        animation: 'gradientShift 4s ease infinite',
                      }}>
                        naprawdę
                      </em>{' '}
                      Cię kosztuje<br />to jak teraz żyjesz?
                    </h1>
                    <p style={{ color: M.t3, fontSize: 14.5, lineHeight: 1.65, fontWeight: 400, maxWidth: 340, margin: '0 auto 14px' }}>
                      Przeliczam hormony, mózg i formę na złotówki. Na bazie badań, nie opinii.
                    </p>
                    <div style={{ fontFamily: M.mono, fontSize: 10, color: M.t4, letterSpacing: 1.5 }}>🔒 Twoje odpowiedzi są anonimowe &middot; Żadne dane nie są zapisywane</div>
                    <div style={{ fontFamily: M.mono, fontSize: 9.5, color: M.t4, letterSpacing: 1, marginTop: 8, opacity: 0.7 }}>Kalkulacja oparta na 9 badaniach naukowych</div>
                  </div>
                </div>
              )}

              {/* Nagłówek sekcji (nie-hero) */}
              {sec > 0 && (
                <div className="fade-up" style={{ padding: '28px 0 24px' }}>
                  <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 8 }}>Sekcja {sec + 1}</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.3, color: M.t1, textShadow: '0 0 20px rgba(255,255,255,.08)' }}>{SECTIONS[sec]}</h2>
                </div>
              )}

              {sec === 0 && (
                <div className="fade-up">
                  <SH n="01" title="Ile śpisz naprawdę" />
                  <div style={{ fontSize: 14, color: M.t3, fontWeight: 400, paddingLeft: 38, marginBottom: 28 }}>Nie ile leżysz. Ile faktycznie śpisz.</div>
                  <Slider label="Średni sen w nocy" min={3} max={9} step={0.5} k="sleep" val={D.sleep} unit="h" note={`Deficyt vs 7.5h: ${Math.max((7.5 - D.sleep) * 7, 0).toFixed(0)}h / tydzień`} ariaLabel="Średni czas snu w nocy w godzinach" />
                  <SevField label="Jakość snu" sub="Budzisz się, kręcisz, masz płytki sen?" k="sleepQ" val={D.sleepQ} />
                  <SevField label="Telefon przed snem" sub="Scrollujesz w łóżku?" k="screenBed" val={D.screenBed} />
                </div>
              )}

              {sec === 1 && (
                <div className="fade-up">
                  <SevField label="Poziom stresu w ciągu dnia" k="stress" val={D.stress} />
                  <SevField label="Energia i motywacja" sub="Jak często czujesz się wypalony?" k="energy" val={D.energy} />
                  <SevField label="Głód dopaminowy" sub="Szukasz ciągłej stymulacji, trudno skupić się na nudnym zadaniu?" k="dopamine" val={D.dopamine} />
                  <Slider label="Ile godzin dziennie tracisz przez mgłę / wolniejsze myślenie?" min={0} max={4} step={0.5} k="lost" val={D.lost} unit="h" ariaLabel="Liczba godzin traconych dziennie przez mgłę umysłową" />
                  {/* Średni przychód netto */}
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                      <span style={{ fontSize: 15, color: M.t1, fontWeight: 500, lineHeight: 1.45 }}>Średni przychód netto / miesiąc</span>
                      <span style={{ fontFamily: M.mono, fontSize: 17, fontWeight: 700, color: M.gold, minWidth: 80, textAlign: 'right' }}>{salaryInput.toLocaleString('pl-PL')} zł</span>
                    </div>
                    <div style={{ position: 'relative', height: 48, display: 'flex', alignItems: 'center' }}>
                      <div style={{ position: 'absolute', left: 0, right: 0, height: 6, background: M.s3, borderRadius: 3, top: '50%', marginTop: -3 }} />
                      <div style={{ position: 'absolute', left: 0, height: 6, width: `${((salaryInput - 4000) / (50000 - 4000)) * 100}%`, background: M.gold, borderRadius: 3, transition: 'width .2s cubic-bezier(.4,0,.2,1)', top: '50%', marginTop: -3, opacity: 0.8 }} />
                      <input
                        type="range"
                        min={4000}
                        max={50000}
                        step={500}
                        value={salaryInput}
                        aria-label="Średni przychód netto miesięcznie w złotych"
                        aria-valuenow={salaryInput}
                        aria-valuemin={4000}
                        aria-valuemax={50000}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          setSalaryInput(v);
                          upd('rate', Math.round(v / 168));
                        }}
                        style={{ width: '100%', height: 48, WebkitAppearance: 'none', background: 'transparent', position: 'relative', zIndex: 2, cursor: 'pointer', margin: 0, padding: 0 }}
                      />
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: M.mono, fontSize: 11, color: M.t3, marginTop: 6 }}>
                      = {D.rate} zł/godz. netto
                    </div>
                  </div>
                </div>
              )}

              {sec === 2 && (
                <div className="fade-up">
                  <SevField label="Chaos w żywieniu" sub="Jesz nieregularnie, omijasz posiłki, improwizujesz?" k="dietChaos" val={D.dietChaos} />
                  <SevField label="Cykliczne objadanie" sub="Po weekendach, stresie, z nudów?" k="binge" val={D.binge} />
                  <Slider label="Wydajesz miesięcznie na śmieciowe jedzenie" min={0} max={1000} step={50} k="junk" val={D.junk} unit=" zł" note={`6 miesięcy: ${(D.junk * 6).toLocaleString('pl-PL')} zł`} ariaLabel="Miesięczne wydatki na śmieciowe jedzenie w złotych" />
                </div>
              )}

              {sec === 3 && (
                <div className="fade-up">
                  <Slider label="Weekendy imprezowe w miesiącu" min={0} max={4} step={1} k="wknd" val={D.wknd} unit="" ariaLabel="Liczba imprezowych weekendów w miesiącu" />
                  <Slider label="Drinki na imprezie (średnio)" min={0} max={20} step={1} k="drinks" val={D.drinks} unit="" note={D.drinks > 5 ? `${D.drinks} drinków = ~${Math.round(D.drinks * 3.4)}% spadek testosteronu w 12h (Vingren 2013)` : ''} ariaLabel="Średnia liczba drinków na imprezie" />
                  <Slider label="Wydajesz na imprezie (alkohol, wyjścia)" min={0} max={800} step={50} k="cash" val={D.cash} unit=" zł" note={`Suma 6 mies.: ${(D.cash * D.wknd * 6).toLocaleString('pl-PL')} zł`} ariaLabel="Wydatki na imprezie w złotych" />
                  <Slider label="Wydajesz na substancje" min={0} max={800} step={50} k="subs" val={D.subs} unit=" zł" ariaLabel="Miesięczne wydatki na substancje w złotych" />
                  {D.subs > 0 && (
                    <div style={{ padding: '12px 16px', background: M.s1, borderRadius: 12, border: `1px solid ${M.brd}`, marginTop: -12, marginBottom: 28 }}>
                      <div style={{ fontSize: 11, color: M.t4, fontFamily: M.mono, letterSpacing: 0.5, marginBottom: 8 }}>CO TO OZNACZA DLA TWOJEGO CIAŁA:</div>
                      <div style={{ fontSize: 12.5, color: M.t3, lineHeight: 1.7 }}>
                        {D.subs > 0 && D.subs <= 200 && '• Okazjonalne użycie - serotonina potrzebuje 2-4 tyg. na regenerację. Przy regularnym cyklu okno regeneracji nigdy się nie zamyka.'}
                        {D.subs > 200 && D.subs <= 500 && '• Regularne wydatki na substancje - deplecja serotoniny + dopaminy. Mózg zaczyna traktować baseline jako „za mało". Trening i dieta tracą na efektywności.'}
                        {D.subs > 500 && '• Poważne wydatki - na tym poziomie układ nerwowy jest w trybie ciągłej kompensacji. Regeneracja po weekendzie zajmuje cały tydzień. Forma stoi w miejscu.'}
                      </div>
                    </div>
                  )}
                  {D.drinks > 10 && (
                    <div style={{ fontSize: 11.5, color: M.org, fontStyle: 'italic', marginTop: -16, marginBottom: 24, lineHeight: 1.5 }}>
                      {D.drinks}+ drinków regularnie. Wątroba potrzebuje ~72h na pełną regenerację. Przy 2+ weekendach - nigdy nie wraca do baseline.
                    </div>
                  )}
                </div>
              )}

              {sec === 4 && (
                <div className="fade-up">
                  <Slider label="Miesięczny koszt siłowni / trenera" min={0} max={500} step={50} k="gym" val={D.gym} unit=" zł" ariaLabel="Miesięczny koszt członkostwa w siłowni lub trenera w złotych" />
                  <Slider label="Planowane treningi w tygodniu" min={0} max={7} step={1} k="plan" val={D.plan} unit="" ariaLabel="Liczba planowanych treningów w tygodniu" />
                  <Slider label="Ile opuszczasz przez zmęczenie / kaca" min={0} max={4} step={1} k="miss" val={D.miss} unit="" note={`Tracisz: ${D.miss * 4 * 6} treningów w 6 mies.`} ariaLabel="Liczba treningów opuszczanych tygodniowo przez zmęczenie lub kaca" />
                </div>
              )}

              {sec === 5 && (
                <div className="fade-up">
                  <div style={{ fontSize: 15, color: M.t2, fontWeight: 500, marginBottom: 18, lineHeight: 1.5 }}>Zaznacz co obserwujesz u siebie.</div>
                  {([
                    ['fatigue', 'Ciągłe zmęczenie mimo odpoczynku'],
                    ['mood', 'Wahania nastroju, drażliwość'],
                    ['libido', 'Obniżone libido lub motywacja seksualna'],
                    ['belly', 'Brzuch który nie schodzi mimo treningu'],
                    ['brain', 'Brain fog - mgła, problemy z koncentracją'],
                    ['anxiety', 'Niepokój, natrętne myśli'],
                    ['joints', 'Bóle stawów lub słaba regeneracja'],
                    ['skin', 'Pogorszona cera, wypryski'],
                    ['motivation', 'Brak motywacji, apatia'],
                    ['digest', 'Problemy trawienne, wzdęcia'],
                    ['cravings', 'Nagły głód na słodycze lub fast food'],
                    ['recovery', 'Wolna regeneracja po treningu (3+ dni)'],
                    ['focus', 'Nie możesz się skupić dłużej niż 20 minut'],
                    ['headaches', 'Częste bóle głowy lub migreny'],
                    ['sweating', 'Nocne poty lub budzenie się zlany potem'],
                    ['heartRate', 'Podwyższone tętno spoczynkowe'],
                  ] as [ChipKey, string][]).map(([k, l]) => <Chip key={k} t={k} label={l} />)}
                </div>
              )}

              {/* Nav buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 36, paddingBottom: 20 }}>
                {sec > 0 && (
                  <button
                    onClick={back}
                    aria-label="Poprzednia sekcja"
                    style={{
                      flex: 1, padding: 16, background: M.s1, color: M.t3,
                      border: `1.5px solid ${M.brd2}`, fontSize: 14, fontWeight: 600,
                      cursor: 'pointer', borderRadius: 12, minHeight: 44,
                    }}
                  >
                    Wstecz
                  </button>
                )}
                <button
                  onClick={go}
                  aria-label={sec === SECTIONS.length - 1 ? 'Oblicz straty i przejdź do wyniku' : 'Przejdź do następnej sekcji'}
                  className={sec === SECTIONS.length - 1 ? 'shimmer-btn' : ''}
                  style={{
                    flex: 2, padding: 18,
                    background: sec === SECTIONS.length - 1 ? M.gold : M.t1,
                    color: sec === SECTIONS.length - 1 ? '#0a0a0a' : M.bg,
                    border: 'none', fontFamily: M.mono, fontSize: 12, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: 2.5, cursor: 'pointer', borderRadius: 12,
                    minHeight: 44,
                  }}
                >
                  {sec === SECTIONS.length - 1 ? 'Oblicz moje straty' : 'Dalej'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── LEAD GATE ── */}
        {phase === 'gate' && (
          <div className="fade-up" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', textAlign: 'center' }}>
            <div style={{ maxWidth: 400, width: '100%' }}>
              <Logo />

              {/* Częściowy wynik - WOW moment */}
              <div style={{ marginTop: 32, marginBottom: 12 }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 10 }}>Twój Damage Score</div>
                <div style={{ fontFamily: M.mono, fontSize: 72, fontWeight: 800, lineHeight: 1, color: scoreColor, textShadow: `0 0 30px ${scoreColor}30` }}>{SC}</div>
                <div style={{ fontFamily: M.mono, fontSize: 12, color: M.t4, marginTop: 6 }}>/100</div>
              </div>

              {/* Karta wyniku ze szkłem */}
              <div style={{
                background: 'rgba(19,19,19,0.75)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${M.gold}20`,
                padding: 18, marginBottom: 28, borderRadius: 14,
              }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 8 }}>Tracisz w 6 miesięcy</div>
                <div style={{ fontFamily: M.mono, fontSize: 36, fontWeight: 800, color: M.gold }}>{C.total.toLocaleString('pl-PL')} zł</div>
                <div style={{ fontFamily: M.mono, fontSize: 12, color: M.t4, marginTop: 4 }}>= {Math.round(C.total / 6).toLocaleString('pl-PL')} zł / miesiąc</div>
              </div>

              {/* Gate - formularz ze szklem */}
              <div style={{
                background: 'rgba(19,19,19,0.72)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: `1px solid ${M.brd2}`,
                padding: '24px 18px',
                borderRadius: 16,
              }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25, letterSpacing: -0.5, marginBottom: 10, color: M.t1, textShadow: '0 0 20px rgba(255,255,255,.1)' }}>
                  Twój wynik jest gotowy.
                </h2>
                <p style={{ fontSize: 14, color: M.t3, lineHeight: 1.6, marginBottom: 24, fontWeight: 400 }}>
                  Podaj dane, żebym mógł spojrzeć na Twój wynik i powiedzieć Ci co z tym zrobić.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
                  {/* Instagram handle */}
                  <div>
                    <div style={{ fontSize: 11, color: M.t3, fontWeight: 600, marginBottom: 5, fontFamily: M.mono, letterSpacing: 0.5 }}>Nick na Instagramie *</div>
                    <input
                      type="text"
                      placeholder="@twojnick"
                      value={igHandle}
                      aria-label="Nick na Instagramie"
                      aria-required="true"
                      onChange={e => { setIgHandle(e.target.value); setIgErr(''); }}
                      style={{ borderColor: igErr ? M.red : undefined }}
                    />
                    {igErr && <div role="alert" style={{ fontSize: 11, color: M.red, fontFamily: M.mono, marginTop: 4 }}>{igErr}</div>}
                  </div>

                  {/* Email */}
                  <div>
                    <div style={{ fontSize: 11, color: M.t3, fontWeight: 600, marginBottom: 5, fontFamily: M.mono, letterSpacing: 0.5 }}>Email *</div>
                    <input
                      type="email"
                      placeholder="twoj@email.com"
                      value={email}
                      aria-label="Adres email"
                      aria-required="true"
                      onChange={e => { setEmail(e.target.value); setEmailErr(''); }}
                      style={{ borderColor: emailErr ? M.red : undefined }}
                    />
                    {emailErr && <div role="alert" style={{ fontSize: 11, color: M.red, fontFamily: M.mono, marginTop: 4 }}>{emailErr}</div>}
                  </div>

                  {/* Imię - opcjonalne */}
                  <div>
                    <div style={{ fontSize: 11, color: M.t4, fontWeight: 600, marginBottom: 5, fontFamily: M.mono, letterSpacing: 0.5 }}>Imię (opcjonalne)</div>
                    <input
                      type="text"
                      placeholder="Jak masz na imię?"
                      value={imie}
                      aria-label="Imię (opcjonalne)"
                      onChange={e => setImie(e.target.value.slice(0, 50))}
                    />
                  </div>

                  {/* CTA z shimmer */}
                  <button
                    onClick={submit}
                    disabled={loading}
                    aria-label={loading ? 'Ładowanie wyniku' : 'Pokaż mój wynik'}
                    className={!loading ? 'shimmer-btn' : ''}
                    style={{
                      width: '100%', padding: 18, marginTop: 6,
                      background: loading ? M.brd2 : M.gold,
                      color: loading ? M.t4 : '#0a0a0a',
                      border: 'none', fontFamily: M.mono, fontSize: 12, fontWeight: 700, letterSpacing: 2.5,
                      textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', borderRadius: 12,
                      boxShadow: loading ? 'none' : `0 0 20px ${M.gold}25`,
                      minHeight: 44,
                    }}
                  >
                    {loading ? 'Ładuję wynik...' : 'Pokaż mój wynik →'}
                  </button>
                </div>
              </div>

              <p style={{ fontSize: 11, color: M.t4, marginTop: 16, fontFamily: M.mono, letterSpacing: 0.5, textAlign: 'center' }}>
                Odezwę się do Ciebie w DM w ciągu 24h z konkretnym feedbackiem.
              </p>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {phase === 'results' && (
          <div className="fade-up" style={{ padding: '32px 16px 20px', width: '100%', boxSizing: 'border-box' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 32, paddingBottom: 20, borderBottom: `1px solid ${M.brd}` }}>
              <Logo />
              <div style={{ marginTop: 18 }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: M.t4, marginBottom: 6 }}>Wyniki</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, color: M.t1, textShadow: `0 0 24px rgba(255,255,255,.1)` }}>Twoja diagnoza</h2>
              </div>
            </div>

            {/* Score ring z pulse + glow */}
            <Reveal>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 auto 32px', width: '100%' }}>
                <div
                  className="score-ring"
                  style={{
                    position: 'relative', width: 160, height: 160,
                    filter: `drop-shadow(0 0 12px ${scoreColor}35)`,
                  }}
                >
                  <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
                    <circle cx="80" cy="80" r="64" fill="none" stroke={M.s2} strokeWidth={7} />
                    <circle
                      cx="80" cy="80" r="64"
                      fill="none"
                      stroke={scoreColor}
                      strokeWidth={7}
                      strokeDasharray={2 * Math.PI * 64}
                      strokeDashoffset={2 * Math.PI * 64 - (SC / 100) * 2 * Math.PI * 64}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 8px ${scoreColor}50)` }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: M.mono, fontSize: 36, fontWeight: 800, color: scoreColor, lineHeight: 1, textShadow: `0 0 16px ${scoreColor}40` }}>
                      {countersActive ? animScore : SC}
                    </span>
                    <span style={{ fontFamily: M.mono, fontSize: 11, color: M.t4, letterSpacing: 1, marginTop: 2 }}>/100</span>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: scoreColor, marginTop: 14, textAlign: 'center', textShadow: `0 0 12px ${scoreColor}25` }}>
                  {SC >= 75 ? 'Pracujesz przeciwko sobie' : SC >= 50 ? 'Hormony i mózg pod presją' : SC >= 25 ? 'Twoje ciało już to czuje' : SC > 5 ? 'Niskie ryzyko - ale nie zero' : 'Bazowy poziom - masz fundament pod formę'}
                </div>
              </div>
            </Reveal>

            <WaveDivider />

            {/* Total - zlota karta z licznikiem */}
            <Reveal delay={80}>
              <div style={{
                background: `linear-gradient(135deg, ${M.gold}, ${M.goldMuted})`,
                textAlign: 'center', padding: '24px 16px 20px',
                position: 'relative', overflow: 'hidden', marginBottom: 20, borderRadius: 16, width: '100%',
                boxSizing: 'border-box',
                boxShadow: `0 8px 40px ${M.gold}20, 0 0 0 1px ${M.gold}30`,
              }} className="float-el">
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg,transparent,transparent 4px,rgba(0,0,0,.06) 4px,rgba(0,0,0,.06) 8px)' }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 3.5, textTransform: 'uppercase', color: '#0a0a0a', opacity: .6, marginBottom: 6 }}>Tracisz w 6 miesięcy</div>
                  <div style={{ fontFamily: M.mono, fontSize: 40, fontWeight: 800, color: '#0a0a0a', lineHeight: 1.1 }}>
                    {countersActive ? animTotal.toLocaleString('pl-PL') : C.total.toLocaleString('pl-PL')} zł
                  </div>
                  <div style={{ fontFamily: M.mono, fontSize: 12, color: '#0a0a0a', opacity: .55, marginTop: 4 }}>= {Math.round(C.total / 6).toLocaleString('pl-PL')} zł / miesiąc</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 10, fontFamily: M.mono, fontSize: 10 }}>
                    <span style={{ color: '#0a0a0a', opacity: .7 }}>
                      wprost: {countersActive ? animHard.toLocaleString('pl-PL') : C.hardTotal.toLocaleString('pl-PL')} zł
                    </span>
                    <span style={{ color: '#0a0a0a', opacity: .4 }}>|</span>
                    <span style={{ color: '#0a0a0a', opacity: .7 }}>
                      ukryte: {countersActive ? animHidden.toLocaleString('pl-PL') : C.hiddenTotal.toLocaleString('pl-PL')} zł
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Comparison text */}
            {comparisons.length > 0 && (
              <Reveal delay={120}>
                <div style={{
                  background: 'rgba(19,19,19,0.8)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: `1px solid ${M.brd}`,
                  padding: '16px 16px', marginBottom: 20, borderRadius: 12, width: '100%', boxSizing: 'border-box',
                }}>
                  <p style={{ fontSize: 13, color: M.t2, lineHeight: 1.6, fontWeight: 400, textAlign: 'center' }}
                    dangerouslySetInnerHTML={{ __html: `Za <strong style="color:${M.gold};font-weight:600">${C.total.toLocaleString('pl-PL')} zł</strong> w pół roku mógłbyś mieć: ${comparisons.join(', ')}.` }} />
                </div>
              </Reveal>
            )}

            {/* Norm: Ty vs przeciętny — pokaż tylko przy istotnym wyniku */}
            {C.total > 3500 && (
              <Reveal delay={160}>
                <div style={{
                  background: 'rgba(19,19,19,0.8)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: `1px solid ${M.brd}`,
                  padding: '18px 14px', marginBottom: 20, borderRadius: 12, width: '100%', boxSizing: 'border-box',
                }}>
                  <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 14 }}>Ty vs przeciętny facet 25-35</div>
                  {normData.map((n, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < normData.length - 1 ? 10 : 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: i === 0 ? M.t1 : M.t3, width: 58, flexShrink: 0 }}>{n.label}</span>
                      <div style={{ flex: 1, height: 7, background: M.s3, overflow: 'hidden', borderRadius: 4, minWidth: 0 }}>
                        <div style={{ height: '100%', background: n.color, width: `${n.pct}%`, transition: 'width .8s ease', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontFamily: M.mono, fontSize: 11, fontWeight: 600, width: 55, flexShrink: 0, textAlign: 'right', color: n.color === M.gold ? M.gold : n.color === M.grn ? M.grn : M.t4 }}>
                        {n.value >= 1000 ? `${(n.value / 1000).toFixed(1)}k` : n.value.toLocaleString('pl-PL')}
                      </span>
                    </div>
                  ))}
                  <div style={{ marginTop: 10, fontSize: 11, color: M.t4, fontStyle: 'italic', textAlign: 'center' }}>
                    &ldquo;Świadomy&rdquo; = żyje normalnie, ale rozumie mechanizmy.
                  </div>
                </div>
              </Reveal>
            )}

            {/* Projection: kumulacja 6 mies */}
            <Reveal delay={200}>
              <div style={{
                background: 'rgba(19,19,19,0.8)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: `1px solid ${M.brd}`,
                padding: '18px 14px', marginBottom: 20, borderRadius: 12, width: '100%', boxSizing: 'border-box',
              }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 16 }}>Kumulacja strat: 6 miesięcy</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 2, marginBottom: 8 }}>
                  {projData.map((p, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                      <div style={{ height: 55, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 4 }}>
                        <div style={{ width: '80%', maxWidth: 26, background: `linear-gradient(180deg, ${M.gold}, ${M.goldDim})`, minHeight: 3, height: `${(p.v / projMax) * 50}px`, borderRadius: '4px 4px 0 0', transition: 'height .6s ease' }} />
                      </div>
                      <div style={{ fontFamily: M.mono, fontSize: 9, color: M.t4 }}>M{p.m}</div>
                      <div style={{ fontFamily: M.mono, fontSize: 9, color: M.t3, marginTop: 1, fontWeight: 500 }}>{(p.v / 1000).toFixed(1)}k</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${M.brd}` }}>
                  <span style={{ fontSize: 12, color: M.t3, fontWeight: 500 }}>Suma po 6 mies.</span>
                  <span style={{ fontFamily: M.mono, fontSize: 17, fontWeight: 700, color: M.gold, textShadow: `0 0 12px ${M.gold}20` }}>{C.total.toLocaleString('pl-PL')} zł</span>
                </div>
              </div>
            </Reveal>

            <WaveDivider flip />

            {/* Podzial strat - split: twarde + ukryte */}
            {catData.length > 0 && (
              <div style={{ marginBottom: 20, width: '100%' }}>
                {/* TWARDE - wydajesz wprost */}
                {catData.filter(x => x.type === 'hard').length > 0 && (
                  <Reveal delay={0}>
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                        <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4 }}>Wydajesz wprost</div>
                        <div style={{ fontFamily: M.mono, fontSize: 13, fontWeight: 700, color: M.gold }}>{C.hardTotal.toLocaleString('pl-PL')} zł</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, width: '100%', marginBottom: 18 }}>
                        {catData.filter(x => x.type === 'hard').map((c, i) => (
                          <div key={i} style={{
                            background: 'rgba(19,19,19,0.85)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            border: `1px solid ${M.brd}`, padding: '14px 12px', borderRadius: 12, minWidth: 0,
                            transition: 'border-color .3s ease',
                          }} className="border-glow">
                            <div style={{ fontSize: 15, marginBottom: 4 }}>{c.ic}</div>
                            <div style={{ fontFamily: M.mono, fontSize: 15, fontWeight: 700, color: M.gold, textShadow: `0 0 10px ${M.gold}15` }}>{c.v.toLocaleString('pl-PL')} zł</div>
                            <div style={{ fontSize: 10, color: M.t4, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2, fontWeight: 600 }}>{c.l}</div>
                            <div style={{ height: 3, background: M.s3, marginTop: 8, borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: c.c, width: `${(c.v / maxC) * 100}%`, transition: 'width 1s ease .3s', borderRadius: 2 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  </Reveal>
                )}

                {/* UKRYTE - tracisz niewidocznie */}
                {catData.filter(x => x.type === 'hidden').length > 0 && (
                  <Reveal delay={80}>
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                        <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4 }}>Tracisz niewidocznie</div>
                        <div style={{ fontFamily: M.mono, fontSize: 13, fontWeight: 700, color: M.t3 }}>{C.hiddenTotal.toLocaleString('pl-PL')} zł</div>
                      </div>
                      <div style={{ fontSize: 11, color: M.t4, fontStyle: 'italic', marginBottom: 10 }}>Szacunek na bazie badań naukowych (RAND 2016, Hemp HBR 2004). Nie rachunki z banku - realne koszty konsekwencji, które tracisz niewidocznie każdego miesiąca.</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, width: '100%' }}>
                        {catData.filter(x => x.type === 'hidden').map((c, i) => (
                          <div key={i} style={{
                            background: 'rgba(19,19,19,0.85)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            border: `1px solid ${M.brd}`, padding: '14px 12px', borderRadius: 12, minWidth: 0,
                          }}>
                            <div style={{ fontSize: 15, marginBottom: 4 }}>{c.ic}</div>
                            <div style={{ fontFamily: M.mono, fontSize: 15, fontWeight: 700, color: M.t3 }}>{c.v.toLocaleString('pl-PL')} zł</div>
                            <div style={{ fontSize: 10, color: M.t4, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2, fontWeight: 600 }}>{c.l}</div>
                            <div style={{ height: 3, background: M.s3, marginTop: 8, borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: c.c, width: `${(c.v / maxC) * 100}%`, transition: 'width 1s ease .3s', borderRadius: 2 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  </Reveal>
                )}
              </div>
            )}

            {/* Stagnacja - karta */}
            {C.brakes > 0 && C.wastedSessions > 0 && (
              <Reveal delay={100}>
                <div style={{
                  background: 'rgba(19,19,19,0.82)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: `1px solid ${M.brd}`,
                  padding: '18px 14px', marginBottom: 20, borderRadius: 12, width: '100%', boxSizing: 'border-box',
                }}>
                  <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 14 }}>Stanie w miejscu</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <div style={{ textAlign: 'center', padding: '14px 8px', background: M.s2, borderRadius: 10 }}>
                      <div style={{ fontFamily: M.mono, fontSize: 28, fontWeight: 800, color: M.red }}>{C.stagnationMonths}</div>
                      <div style={{ fontSize: 10, color: M.t4, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4, fontWeight: 600 }}>mies. bez progresu</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '14px 8px', background: M.s2, borderRadius: 10 }}>
                      <div style={{ fontFamily: M.mono, fontSize: 28, fontWeight: 800, color: M.org }}>{C.wastedSessions}</div>
                      <div style={{ fontSize: 10, color: M.t4, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4, fontWeight: 600 }}>treningów na marne</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                    {[0,1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < C.brakes ? M.red : M.s3, transition: 'background .3s ease' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: M.t4, fontFamily: M.mono, letterSpacing: 0.3 }}>
                    {C.brakes}/5 hamulców aktywnych. {C.wastedPct}% wysiłku treningowego zmarnowane.
                  </div>
                  <p style={{ fontSize: 11.5, color: M.t3, lineHeight: 1.6, marginTop: 10, fontWeight: 400 }}>
                    Trenujesz, ale fundamenty (sen, jadłospis, stres) sabotują progres. Za 6 miesięcy będziesz w tym samym miejscu co teraz. <strong style={{ color: M.t1, fontWeight: 500 }}>To nie brak dyscypliny. To zła kolejność.</strong>
                  </p>
                </div>
              </Reveal>
            )}

            {/* Hormony */}
            {hormones.length > 0 && (
              <Reveal delay={120}>
                <div style={{
                  background: 'rgba(19,19,19,0.82)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: `1px solid ${M.brd}`,
                  padding: '18px 14px', marginBottom: 20, borderRadius: 12, width: '100%', boxSizing: 'border-box',
                }}>
                  <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 14 }}>Wpływ na Twoje hormony</div>
                  {hormones.map((h, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < hormones.length - 1 ? `1px solid ${M.brd}` : 'none', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: M.t1, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 14 }}>{h.a}</span> {h.n}
                      </span>
                      <span style={{ fontFamily: M.mono, fontSize: 10, fontWeight: 500, padding: '3px 8px', letterSpacing: 0.3, color: h.c, border: `1px solid ${h.c}25`, borderRadius: 6, background: h.c + '08', whiteSpace: 'nowrap', flexShrink: 0, textShadow: `0 0 8px ${h.c}15` }}>{h.i}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
            )}

            <WaveDivider />

            {/* Timeline */}
            {timeline.length > 0 && (
              <Reveal delay={80}>
                <div style={{ marginBottom: 20, width: '100%' }}>
                  <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 16 }}>Co się dzieje w Twoim ciele</div>
                  {timeline.map((t, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                        <div style={{ width: 8, height: 8, background: M.gold, borderRadius: 4, flexShrink: 0, boxShadow: `0 0 8px ${M.gold}40`, animation: 'pulseGlow 2.5s ease-in-out infinite' }} />
                        {i < timeline.length - 1 && <div style={{ width: 1, flex: 1, background: M.brd2, marginTop: 3, minHeight: 10 }} />}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontFamily: M.mono, fontSize: 10, fontWeight: 600, color: M.gold, marginBottom: 4 }}>{t.period}</div>
                        <p style={{ fontSize: 12.5, color: M.t3, fontWeight: 400, lineHeight: 1.6, wordBreak: 'break-word' }}
                          dangerouslySetInnerHTML={{ __html: t.text.replace(/<b>/g, `<strong style="color:${M.t2};font-weight:500">`).replace(/<\/b>/g, '</strong>') }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            )}

            {/* Insights */}
            {insights.length > 0 && (
              <Reveal delay={100}>
                <div style={{ marginBottom: 20, width: '100%' }}>
                  {insights.map((ins, i) => (
                    <div key={i} style={{
                      padding: '14px 14px',
                      borderLeft: `2px solid ${M.gold}`,
                      background: 'rgba(19,19,19,0.78)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      marginBottom: 8,
                      borderRadius: '0 10px 10px 0',
                    }}>
                      <p style={{ fontSize: 12.5, color: M.t3, lineHeight: 1.65, fontWeight: 400, wordBreak: 'break-word' }}
                        dangerouslySetInnerHTML={{ __html: ins.replace(/<b>/g, `<strong style="color:${M.t1};font-weight:600">`).replace(/<\/b>/g, '</strong>') }} />
                    </div>
                  ))}
                </div>
              </Reveal>
            )}

            {/* Potencjal */}
            <Reveal delay={100}>
              <div style={{
                padding: '24px 18px', marginBottom: 20,
                border: `1px solid ${M.gold}30`,
                background: `linear-gradient(135deg, ${M.gold}08, transparent)`,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: 14, width: '100%', boxSizing: 'border-box',
              }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.gold, marginBottom: 16 }}>Twoj potencjal</div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 48, fontWeight: 800, fontFamily: M.mono, color: M.gold, lineHeight: 1 }}>{potentialUsed}%</div>
                  <div style={{ fontSize: 12, color: M.t3, marginTop: 6 }}>tyle wykorzystujesz ze swojego ciala</div>
                </div>
                <div style={{ position: 'relative', height: 8, background: M.s3, borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ position: 'absolute', left: 0, height: '100%', width: `${potentialUsed}%`, background: `linear-gradient(90deg, ${M.red}, ${M.org})`, borderRadius: 4, transition: 'width 1.5s ease' }} />
                  <div style={{ position: 'absolute', left: `${potentialUsed}%`, height: '100%', width: `${potential}%`, background: `linear-gradient(90deg, ${M.gold}40, ${M.gold})`, borderRadius: '0 4px 4px 0', opacity: 0.4 }} />
                </div>
                <p style={{ fontSize: 13, color: M.t2, lineHeight: 1.7, textAlign: 'center', marginBottom: 0 }}>
                  Na podstawie {'>'}120 wspolprac i badan naukowych - Twoj organizm ma <strong style={{ color: M.gold }}>{potential}% niewykorzystanego potencjalu</strong>.
                  {potential > 30 && <><br />To energia, sila, regeneracja i ostrość umyslu, ktore masz w sobie ale ktore teraz blokujesz swoim stylem zycia.</>}
                </p>
              </div>
            </Reveal>

            {/* 3 personalne tipy */}
            <Reveal delay={120}>
              <div style={{
                padding: '22px 16px', marginBottom: 20,
                border: `1px solid ${M.brd}`,
                background: 'rgba(19,19,19,0.78)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: 14, width: '100%', boxSizing: 'border-box',
              }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 6 }}>3 rzeczy ktore mozesz zrobic juz jutro</div>
                <div style={{ fontSize: 11, color: M.gold, fontFamily: M.mono, marginBottom: 18 }}>+{totalBoostMin}-{totalBoostMax}% potencjalu w ciagu 30 dni</div>

                {tips.slice(0, 3).map((tip, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 14, padding: '14px 0',
                    borderTop: i > 0 ? `1px solid ${M.brd}` : 'none',
                  }}>
                    <div style={{ fontSize: 24, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{tip.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: M.t1 }}>{tip.title}</div>
                        <div style={{ fontFamily: M.mono, fontSize: 11, color: M.grn, fontWeight: 600 }}>{tip.boost}</div>
                      </div>
                      <div style={{ fontSize: 12, color: M.t3, lineHeight: 1.6 }}>{tip.desc}</div>
                    </div>
                  </div>
                ))}

                <div style={{
                  marginTop: 18, padding: '14px 16px',
                  background: `${M.gold}0a`, border: `1px solid ${M.gold}20`,
                  borderRadius: 10, textAlign: 'center',
                }}>
                  <p style={{ fontSize: 12.5, color: M.t2, lineHeight: 1.65, marginBottom: 0 }}>
                    Te tipy to <strong style={{ color: M.t1 }}>+{totalBoostMin}-{totalBoostMax}%</strong>. Sam, bez nadzoru.<br />
                    Chcesz wyciagnac <strong style={{ color: M.gold }}>100%</strong> ze swojego organizmu?<br />
                    <span style={{ fontSize: 11.5, color: M.t4 }}>Napisz <strong style={{ color: M.gold }}>JAZDA</strong> w DM @hantleitalerz</span>
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Closing */}
            <Reveal delay={140}>
              <div style={{
                textAlign: 'center', padding: '22px 18px', marginBottom: 20,
                border: `1px solid ${M.brd}`,
                background: 'rgba(19,19,19,0.78)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: 14, width: '100%', boxSizing: 'border-box',
              }}>
                <p style={{ fontSize: 13.5, color: M.t2, lineHeight: 1.75, fontWeight: 400 }}>
                  Te liczby nie znikna same.<br />
                  Za 6 miesiecy beda wyzsze albo nizsze.<br />
                  <strong style={{ color: M.gold, fontWeight: 600 }}>Zalezy co zrobisz teraz.</strong>
                </p>
                <p style={{ fontSize: 12, color: M.t4, lineHeight: 1.6, fontWeight: 400, marginTop: 10 }}>
                  Hormony, mozg, metabolizm. Kiedy rozumiesz mechanike, przestajesz tracic.
                </p>
              </div>
            </Reveal>

            <WaveDivider flip />

            {/* CTA */}
            <Reveal delay={80}>
              <div style={{
                background: 'rgba(19,19,19,0.82)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: `1px solid ${M.brd2}`,
                padding: '22px 16px', marginBottom: 20, borderRadius: 16, width: '100%', boxSizing: 'border-box',
              }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 14 }}>Co dalej?</div>
                <p style={{ fontSize: 13.5, color: M.t3, lineHeight: 1.7, fontWeight: 400, marginBottom: 8 }}>
                  Pracuję z facetami którzy żyją dokładnie tak jak Ty. Imprezy, praca, chaos.
                </p>
                <p style={{ fontSize: 13.5, color: M.t2, lineHeight: 1.7, fontWeight: 500, marginBottom: 8 }}>
                  Mimo to mają formę, energię i sprawny mózg.
                </p>
                <p style={{ fontSize: 13, color: M.t3, lineHeight: 1.7, fontWeight: 400, marginBottom: 20 }}>
                  Różnica? Wiedzą <em>co</em> sabotuje ich ciało i mają plan który to naprawia. <strong style={{ color: M.t1, fontWeight: 600 }}>Bez rezygnowania z życia.</strong>
                </p>
                <a
                  href="https://system.talerzihantle.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shimmer-btn"
                  aria-label="Sprawdź czy się kwalifikujesz do współpracy"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: M.gold,
                    color: '#0a0a0a',
                    fontFamily: M.mono, fontSize: 12, fontWeight: 700, letterSpacing: 2,
                    textTransform: 'uppercase', textDecoration: 'none', padding: 18,
                    textAlign: 'center', marginBottom: 10, borderRadius: 12,
                    boxShadow: `0 0 24px ${M.gold}30`,
                    minHeight: 44,
                    lineHeight: '1',
                  } as React.CSSProperties}
                >
                  Sprawdź czy się kwalifikujesz →
                </a>
                <div style={{ textAlign: 'center', fontSize: 11, color: M.t4, fontFamily: M.mono, letterSpacing: 0.3, marginBottom: 18 }}>
                  lub napisz <strong style={{ color: M.gold }}>JAZDA</strong> w DM @hantleitalerz
                </div>
                <div style={{ height: 1, background: M.brd, margin: '0 20px 18px' }} />
                <p style={{ textAlign: 'center', fontSize: 11.5, color: M.t4, marginBottom: 10 }}>
                  Nie jesteś jeszcze gotowy na współpracę 1:1?
                </p>
                <a
                  href="https://neurobiologia-formy.talerzihantle.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Neurobiologia Formy - ebook za 99 złotych"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textAlign: 'center', padding: '14px 14px', minHeight: 44,
                    background: 'transparent', border: `1.5px solid ${M.gold}40`, color: M.gold,
                    fontFamily: M.mono, fontSize: 10, fontWeight: 700, letterSpacing: 2,
                    textTransform: 'uppercase', textDecoration: 'none', borderRadius: 12,
                  }}
                >
                  Neurobiologia Formy. 99 zł
                </a>
                <p style={{ textAlign: 'center', fontSize: 10.5, color: M.t4, marginTop: 6, fontFamily: M.mono }}>
                  Ebook który tłumaczy dlaczego Twoje ciało działa tak a nie inaczej.
                </p>
              </div>
            </Reveal>

            {/* DM notification */}
            <Reveal delay={80}>
              <div style={{
                textAlign: 'center', padding: '20px 16px', marginBottom: 20,
                background: `${M.gold}08`,
                border: `1px solid ${M.gold}20`,
                borderRadius: 14, width: '100%', boxSizing: 'border-box',
              }}>
                <p style={{ fontSize: 13.5, color: M.t2, lineHeight: 1.65, fontWeight: 500, marginBottom: 6 }}>
                  Analizuję Twoje odpowiedzi.
                </p>
                <p style={{ fontSize: 12.5, color: M.t3, lineHeight: 1.65, fontWeight: 400 }}>
                  Napiszę do Ciebie w DM <strong style={{ color: M.gold, fontWeight: 600 }}>@hantleitalerz</strong> w ciągu 24h z konkretnym feedbackiem co u Ciebie nie gra i od czego zacząć.
                </p>
              </div>
            </Reveal>

            {/* Share — skopiuj link */}
            <Reveal delay={60}>
              <div style={{ textAlign: 'center', marginBottom: 20, width: '100%' }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://diagnostyka.talerzihantle.com').then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    });
                  }}
                  style={{
                    width: '100%', padding: 16,
                    background: copied ? M.grn + '15' : M.s1,
                    border: `1.5px solid ${copied ? M.grn + '40' : M.brd2}`,
                    color: copied ? M.grn : M.t3,
                    fontFamily: M.mono, fontSize: 11, fontWeight: 600,
                    letterSpacing: 1.5, cursor: 'pointer', borderRadius: 12,
                    transition: 'all .2s ease', minHeight: 44,
                  }}
                >
                  {copied ? '✓ Link skopiowany' : 'Skopiuj link - wyślij diagnostykę znajomemu'}
                </button>
              </div>
            </Reveal>

            {/* Źródła naukowe */}
            <Reveal delay={60}>
              <div style={{ padding: '16px 12px', background: M.s1, border: `1px solid ${M.brd}`, marginBottom: 24, borderRadius: 12, width: '100%', boxSizing: 'border-box' }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 10 }}>Źródła naukowe (9 badań)</div>
                <div style={{ fontSize: 10.5, color: M.t4, lineHeight: 1.8 }}>
                  {[
                    'RAND Europe, 2016: pracownicy śpiący <6h tracą ekwiwalent 2.4% PKB w produktywności',
                    'Leproult & Van Cauter, JAMA 2011: 1 tydzień 5h snu = 10-15% spadek testosteronu',
                    'Parr et al., PLOS ONE 2014: alkohol po treningu obniża syntezę białek mięśniowych o 24-37%',
                    'Cappuccio et al., 2010: meta-analiza, <6h snu = 12% wyższe ryzyko śmierci',
                    'Hemp, Harvard Business Review 2004: prezenteizm (praca w obniżonej formie) kosztuje 3x więcej niż absencja',
                    'Vingren et al., 2013: alkohol >1.5g/kg = spadek T o ~23% w ciągu 10-16h',
                    'Halson, Sports Medicine 2014: deficyt snu upośledza wydolność, układ odpornościowy i regenerację',
                    'Schoenfeld et al., 2017: progres wymaga progressive overload + regeneracja + jadłospis jednocześnie',
                    'Expert Rev. Endocrinol. Metab., 2023: meta-analiza 21 badań, 10 199 mężczyzn, styl życia > wiek',
                  ].map((s, i) => <span key={i} style={{ display: 'block', marginBottom: 4, paddingLeft: 16, textIndent: -16 }}>[{i + 1}] {s}</span>)}
                </div>
              </div>
            </Reveal>
          </div>
        )}

        {/* ── FOOTER ── */}
        <footer style={{ textAlign: 'center', padding: '24px 16px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, borderTop: `1px solid ${M.brd}` }}>
          <Logo />
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              href="https://kontra.talerzihantle.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: M.mono, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: M.t4, textDecoration: 'none' }}
            >
              KONTRA
            </a>
            <span style={{ color: M.brd2 }}>|</span>
            <a
              href="https://bramka.talerzihantle.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: M.mono, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: M.t4, textDecoration: 'none' }}
            >
              BRAMKA
            </a>
            <span style={{ color: M.brd2 }}>|</span>
            <a
              href="https://instagram.com/hantleitalerz"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram @hantleitalerz"
              style={{ fontFamily: M.mono, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: M.t4, textDecoration: 'none' }}
            >
              Instagram
            </a>
          </div>
          <span style={{ fontFamily: M.mono, fontSize: 9.5, color: M.t4, letterSpacing: 1 }}>Diagnostyka v7 &copy; 2026</span>
        </footer>

      </div>
    </>
  );
}
