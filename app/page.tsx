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

// Wagi objawów: im poważniejszy symptom, tym wyższy wpływ na score i koszt
// Koszt: szacunek konsekwencji finansowych na 6 miesięcy (suplementy, wizyty, utracona produktywność)
// Waga score: wpływ na łączny wynik (1.0 = bazowy, 2.0 = podwójny)
const TAG_WEIGHTS: Record<ChipKey, { cost: number; scoreW: number }> = {
  fatigue:   { cost: 500, scoreW: 1.8 },   // chroniczne zmęczenie, wpływa na wszystko, dużo suplementów/kaw
  mood:      { cost: 400, scoreW: 1.5 },   // wahania nastroju, wizyty psycholog, gorsze decyzje
  libido:    { cost: 600, scoreW: 2.0 },   // spadek libido, mocny marker hormonalny, endokrynolog
  belly:     { cost: 450, scoreW: 1.6 },   // brzuch nie schodzi, insulinooporność, diety, suplementy
  brain:     { cost: 550, scoreW: 1.8 },   // mgła mózgowa, utracona produktywność, neurolog
  anxiety:   { cost: 500, scoreW: 1.7 },   // lęki, psychiatra/psycholog, suplementy, CBD
  joints:    { cost: 350, scoreW: 1.2 },   // bóle stawów, fizjoterapeuta, suplementy kolagen/MSM
  skin:      { cost: 250, scoreW: 1.0 },   // skóra, dermatolog, kosmetyki, cynk
  motivation:{ cost: 450, scoreW: 1.6 },   // brak motywacji, dopamina, utracone szanse
  digest:    { cost: 350, scoreW: 1.3 },   // trawienie, gastroenterolog, probiotyki, dieta eliminacyjna
  cravings:  { cost: 300, scoreW: 1.2 },   // głód na słodycze, insulinooporność, gorsze żywienie
  recovery:  { cost: 400, scoreW: 1.4 },   // wolna regeneracja, zmarnowane treningi, suplementy
  focus:     { cost: 500, scoreW: 1.7 },   // koncentracja, utracona produktywność, nootropiki
  headaches: { cost: 400, scoreW: 1.3 },   // bóle głowy, leki, wizyty, absencja w pracy
  sweating:  { cost: 300, scoreW: 1.2 },   // nocne poty, zaburzony sen, testy hormonalne
  heartRate: { cost: 450, scoreW: 1.5 },   // podwyższone tętno, kardiolog, stres, substancje
};

// Oblicz ważony koszt sygnałów i ważony score sygnałów
function tagCost(tags: Set<ChipKey>): number {
  let total = 0;
  tags.forEach(t => { total += TAG_WEIGHTS[t]?.cost || 350; });
  return total;
}
function tagScoreWeighted(tags: Set<ChipKey>): number {
  let total = 0;
  tags.forEach(t => { total += TAG_WEIGHTS[t]?.scoreW || 1.0; });
  return total;
}

function costs(D: FD) {
  // === TWARDE KOSZTY: wydajesz wprost, weryfikowalne ===
  const wkndCost = Math.round((D.cash + D.subs) * D.wknd * 6);
  const foodCost = Math.round(D.junk * 6 + (D.binge >= 3 ? 300 : 0));
  const trainCost = D.plan > 0 ? Math.round(D.gym * 6 * Math.min(D.miss / D.plan, 1)) : 0;
  // Sen: kompensacja deficytu, kawa, suplementy, gorsze decyzje zakupowe (Cappuccio 2010)
  const sleepCost = D.sleep < 7 ? Math.round((7.5 - D.sleep) * 140 * 6) : 0;

  // === UKRYTE KOSZTY: szacunek oparty na badaniach naukowych ===
  // Produktywność: mgła × stawka × 26 tyg. (RAND 2016: <6h snu = -2.4% GDP; Hemp HBR 2004: prezenteizm 3× droższy niż absencja)
  const prodCost = Math.round(D.lost * 26 * D.rate);
  // Stagnacja: treningi bez progresu bo fundamenty nie grają
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
  // Symptomy: ważony koszt, każdy objaw ma inną wagę (250-600 zł / 6 mies.)
  const signalCost = Math.round(tagCost(D.tags));

  const totalLostH = Math.round(D.lost * 26);
  const hardTotal = wkndCost + foodCost + trainCost + sleepCost;
  const hiddenTotal = prodCost + stagnationCost + signalCost;
  const total = hardTotal + hiddenTotal;

  return { sleepCost, foodCost, wkndCost, trainCost, prodCost, stagnationCost, signalCost,
           total, hardTotal, hiddenTotal, totalLostH,
           brakes, wastedPct, wastedSessions, stagnationMonths };
}

function score(D: FD) {
  // Ważony score sygnałów: libido/brain/fatigue ważą więcej niż skin/cravings
  const tagScore = tagScoreWeighted(D.tags);
  const s = Math.min(((D.sleepQ + D.screenBed) / 8 + (7.5 - Math.min(D.sleep, 7.5)) / 2) * 15, 15)
    + Math.min(((D.stress + D.energy + D.dopamine) / 10) * 20, 20)
    + Math.min(((D.dietChaos + D.binge) / 8) * 12, 12)
    + Math.min((D.drinks / 15) * 12 + (D.subs > 0 ? 8 : 0), 20)
    + Math.min((D.miss / 3) * 15, 15)
    + Math.min((tagScore / 12) * 18, 18);
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

// === HOOK: scroll progress bar ===
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

// === HOOK: scroll reveal dla sekcji wyników ===
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

// === HOOK: animowany licznik ===
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

// === KOMPONENT: Reveal wrapper z animacją wejścia ===
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

// === KOMPONENT: Wave divider między sekcjami ===
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

// === KOMPONENT: Animowane niebo z gwiazdami ===
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Sprawdź prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = window.devicePixelRatio || 1;

    // Konfiguracja gwiazd: subtelne, ledwo widoczne w tle
    const STAR_COUNT = 120;
    const SHOOTING_STAR_CHANCE = 0.0005; // rzadkie spadające gwiazdy

    // Rozmiar canvas
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

    // Typy gwiazd: różne rozmiary i jasności
    interface Star {
      x: number; y: number;
      r: number;          // promień
      baseAlpha: number;  // bazowa jasność
      twinkleSpeed: number; // prędkość migotania
      twinklePhase: number; // faza migotania
      color: string;        // odcień gwiazdy
    }

    // Kolory gwiazd: głównie białe, kilka z lekkim odcieniem
    const starColors = [
      '255,255,255',   // biała (dominujące)
      '255,255,255',   // biała
      '255,255,255',   // biała
      '230,240,255',   // lekko niebieska
      '255,245,230',   // lekko ciepła
    ];

    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => {
      const sizeRand = Math.random();
      // Normalne rozmiary, ale przyciemnione (subtelne tło)
      const r = sizeRand < 0.55 ? Math.random() * 0.7 + 0.3
              : sizeRand < 0.82 ? Math.random() * 1.0 + 0.7
              : sizeRand < 0.95 ? Math.random() * 1.3 + 1.0
              : Math.random() * 1.8 + 1.5;
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r,
        baseAlpha: Math.random() * 0.12 + 0.06,  // subtelne: 0.06-0.18
        twinkleSpeed: Math.random() * 0.015 + 0.003,
        twinklePhase: Math.random() * Math.PI * 2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
      };
    });

    // Spadające gwiazdy
    interface ShootingStar {
      x: number; y: number;
      vx: number; vy: number;
      life: number; maxLife: number;
      length: number;
    }
    const shootingStars: ShootingStar[] = [];

    let time = 0;

    const loop = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      time += 1;

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Rysowanie gwiazd z migotaniem
      for (const star of stars) {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
        const alpha = star.baseAlpha + twinkle * 0.06;
        const clampedAlpha = Math.max(0.03, Math.min(0.25, alpha));

        // Delikatny glow tylko dla największych
        if (star.r > 1.5) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.r * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${star.color},${clampedAlpha * 0.06})`;
          ctx.fill();
        }

        // Główna gwiazda
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.color},${clampedAlpha})`;
        ctx.fill();
      }

      // Spadające gwiazdy: tworzenie
      if (Math.random() < SHOOTING_STAR_CHANCE) {
        const angle = Math.random() * 0.5 + 0.3; // kąt 17-46 stopni
        const speed = Math.random() * 4 + 3;
        shootingStars.push({
          x: Math.random() * W * 0.8,
          y: Math.random() * H * 0.3,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: Math.random() * 40 + 30,
          length: Math.random() * 80 + 40,
        });
      }

      // Spadające gwiazdy: renderowanie
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.life += 1;

        const progress = ss.life / ss.maxLife;
        const alpha = progress < 0.3 ? progress / 0.3
                    : progress > 0.7 ? (1 - progress) / 0.3
                    : 1;

        // Gradient ogon spadającej gwiazdy
        const tailX = ss.x - (ss.vx / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy)) * ss.length * alpha;
        const tailY = ss.y - (ss.vy / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy)) * ss.length * alpha;

        const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
        grad.addColorStop(0, `rgba(255,255,255,0)`);
        grad.addColorStop(0.7, `rgba(200,220,255,${alpha * 0.15})`);
        grad.addColorStop(1, `rgba(255,255,255,${alpha * 0.3})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(ss.x, ss.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Jasny punkt na czele
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.3})`;
        ctx.fill();

        // Usuwanie martwych spadających gwiazd
        if (ss.life >= ss.maxLife) {
          shootingStars.splice(i, 1);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}

// === KOMPONENT: Scroll progress bar ===
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

  // Autosave formularza: restore stanu z localStorage (TTL 7 dni)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('diag_form_state');
      if (!raw) return;
      const saved = JSON.parse(raw);
      const TTL = 7 * 24 * 60 * 60 * 1000; // 7 dni
      if (!saved.savedAt || Date.now() - saved.savedAt > TTL) {
        localStorage.removeItem('diag_form_state');
        return;
      }
      // Restore tylko jeśli jesteśmy w fazie form (nie nadpisuj wyników)
      if (saved.D) {
        setD({ ...saved.D, tags: new Set(saved.D.tags || []) });
      }
      if (typeof saved.sec === 'number') setSec(saved.sec);
      if (typeof saved.salary === 'number') setSalaryInput(saved.salary);
    } catch {}
  }, []);

  // Autosave formularza: zapisz przy każdej zmianie stanu (tylko w fazie form)
  useEffect(() => {
    if (phase !== 'form') return;
    try {
      const payload = {
        D: { ...D, tags: Array.from(D.tags) },
        sec,
        salary: salaryInput,
        savedAt: Date.now(),
      };
      localStorage.setItem('diag_form_state', JSON.stringify(payload));
    } catch {}
  }, [D, sec, salaryInput, phase]);

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
    // Walidacja email: RFC 5322 uproszczony
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setEmailErr('Podaj poprawny email'); return; }
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
    const payloadBlocked = Math.min(sc, 85);

    // Priority lead formula: kwalifikacja serious lead na bazie commitment + budget proxies
    // triedBefore proxy: D.plan > 0 = próbował (1), D.plan >= 3 i miss === 0 = systematyczny (2)
    const triedBefore = D.plan >= 3 && D.miss === 0 ? 2 : D.plan > 0 ? 1 : 0;
    // frustration proxy: 0 = wysoka frustracja (4+ tagów lub niska energia), 1 = niska
    const frustration = (D.tags.size >= 4 || D.energy >= 3) ? 0 : 1;
    const commitmentProxy =
      (triedBefore === 2 ? 2 : triedBefore === 1 ? 1 : 0) +
      (D.tags.size >= 4 ? 1 : 0) +
      (frustration === 0 ? 1 : 0);
    const budgetProxy =
      D.rate >= 90 ? 3 : D.rate >= 50 ? 2 : 1;
    const isPriorityLead = sc >= 60 && commitmentProxy >= 2 && budgetProxy >= 2;
    // path obliczone na poziomie komponentu (reuse w results UI)

    const payload = {
      instagram_handle: finalHandle,
      email,
      imie: imie.trim() || null,
      wynik_kwota: String(c.total),
      wynik_score: String(sc),
      wynik_potencjal: String(payloadBlocked),
      wynik_niewykorzystany: String(Math.max(100 - sc, 15)),
      wynik_hamulce: String(c.brakes),
      wynik_badania_count: String(badaniaUnique.length),
      wynik_badania_priorytet: badaniaWysoki.map(b => b.nazwa).join(', '),
      biggest_category: biggest?.l || '',
      priority_lead: isPriorityLead ? '1' : '0',
      commitment_proxy: String(commitmentProxy),
      budget_proxy: String(budgetProxy),
      path,
      timestamp: new Date().toISOString(),
      source: 'diagnostyka_hit',
      odpowiedzi,
    };
    // Wysyłka do API (MailerLite + webhook n8n) z retry
    const sendPayload = async (data: typeof payload, retryCount = 0): Promise<boolean> => {
      try {
        const res = await fetch('/api/subscribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          // Wyczyść ewentualny retry z sessionStorage
          try { sessionStorage.removeItem('diag_lead_retry'); } catch {}
          return true;
        }
        throw new Error(`HTTP ${res.status}`);
      } catch {
        if (retryCount < 2) {
          // Retry po 1.5s, max 2 próby
          await new Promise(r => setTimeout(r, 1500));
          return sendPayload(data, retryCount + 1);
        }
        // Po 3 nieudanych próbach: zapisz do sessionStorage
        try { sessionStorage.setItem('diag_lead_retry', JSON.stringify(data)); } catch {}
        return false;
      }
    };
    await sendPayload(payload);
    // Po submit: wyczyść autosave (formularz wypełniony)
    try { localStorage.removeItem('diag_form_state'); } catch {}
    // Zawsze pokaż wyniki: lead jest zapisany w sessionStorage na wypadek retry
    setPhase('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Retry nieudanych wysyłek z poprzedniej sesji
  useEffect(() => {
    try {
      const retry = sessionStorage.getItem('diag_lead_retry');
      if (retry) {
        const data = JSON.parse(retry);
        fetch('/api/subscribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).then(res => {
          if (res.ok) sessionStorage.removeItem('diag_lead_retry');
        }).catch(() => {});
      }
    } catch {}
  }, []);

  const C = costs(D); const SC = score(D);
  const pct = Math.round(((sec + 1) / SECTIONS.length) * 100);
  const scoreColor = SC >= 75 ? M.red : SC >= 50 ? M.org : SC >= 25 ? M.yel : M.grn;

  // Path routing: używane w submit() oraz w results UI dla downsell
  const path: 'weekendowa' | 'mozgowa' | 'ciala' | 'general' =
    (D.drinks > 5 || D.subs > 0 || D.wknd >= 2) ? 'weekendowa' :
    (D.dopamine >= 2 || D.tags.has('focus') || D.tags.has('motivation') || D.screenBed >= 2) ? 'mozgowa' :
    (D.tags.has('libido') || D.tags.has('belly') || D.tags.has('recovery')) ? 'ciala' :
    'general';

  // Downsell config per path: używany w results UI
  const downsellMap: Record<typeof path, { url: string; label: string; tagline: string } | null> = {
    weekendowa: {
      url: 'https://kontra.talerzihantle.com',
      label: 'KONTRA: protokół weekendowy. 49 zł',
      tagline: 'Jak imprezować i nie niszczyć progresu. Napisany dla Ciebie.',
    },
    mozgowa: {
      url: 'https://neurobiologia-formy.talerzihantle.com',
      label: 'Neurobiologia Formy. 99 zł',
      tagline: 'Materiał który tłumaczy dlaczego Twój mózg działa tak a nie inaczej.',
    },
    ciala: {
      url: 'https://krew-i-hormony.talerzihantle.com',
      label: 'Krew i Hormony. 99 zł',
      tagline: 'Interpretacja badań pod sylwetkę. Wartości referencyjne nie wystarczą.',
    },
    general: null,
  };
  const downsell = downsellMap[path];

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

  // Zalecane badania krwi - personalizowane na bazie odpowiedzi
  const badania: { nazwa: string; dlaczego: string; priorytet: 'wysoki' | 'sredni' }[] = [];

  // Zawsze podstawa
  badania.push({ nazwa: 'Morfologia z rozmazem', dlaczego: 'Bazowy obraz zdrowia: stan zapalny, anemia, odporność. Bez tego nie wiesz od czego zacząć.', priorytet: 'wysoki' });
  badania.push({ nazwa: 'Testosteron całkowity + wolny', dlaczego: 'Kluczowy hormon męskiej formy. Reguluje masę mięśniową, libido, energię i motywację. Bez niego stoisz w miejscu.', priorytet: 'wysoki' });
  badania.push({ nazwa: 'SHBG', dlaczego: 'Określa ile testosteronu jest faktycznie aktywne biologicznie. Wysoki SHBG = masz T ale ciało go nie używa.', priorytet: 'wysoki' });

  // Sen
  if (D.sleep < 6.5 || D.sleepQ >= 2) {
    badania.push({ nazwa: 'Kortyzol (poranny, godz. 8:00)', dlaczego: 'Deficyt snu = podwyższony kortyzol, który sabotuje regenerację i testosteron', priorytet: 'wysoki' });
    badania.push({ nazwa: 'Magnez (Mg) w surowicy', dlaczego: 'Niedobór magnezu = gorszy sen, skurcze, wyższy kortyzol. 80% mężczyzn ma niedobór', priorytet: 'sredni' });
    badania.push({ nazwa: 'Prolaktyna', dlaczego: 'Zaburzenia snu mogą podnosić prolaktynę, która hamuje testosteron', priorytet: 'sredni' });
  }

  // Stres / energia / wypalenie
  if (D.stress >= 2 || D.energy >= 2) {
    badania.push({ nazwa: 'TSH + fT3 + fT4', dlaczego: 'Tarczyca reguluje metabolizm i energię. Stres ją hamuje, subkliniczne niedoczynności są częste', priorytet: 'wysoki' });
    badania.push({ nazwa: 'Ferrytyna', dlaczego: 'Niedobór żelaza = zmęczenie, mgła, słaba regeneracja. Norma "ok" to nie norma optymalna', priorytet: 'wysoki' });
    badania.push({ nazwa: 'DHEA-S', dlaczego: 'Hormon anty-stresowy. Jeśli niski, ciało przegrywa z kortyzolem', priorytet: 'sredni' });
    if (!badania.some(b => b.nazwa.includes('Kortyzol'))) {
      badania.push({ nazwa: 'Kortyzol (poranny, godz. 8:00)', dlaczego: 'Chroniczny stres = oś HPA rozregulowana. Kortyzol powinien być wysoki rano i niski wieczorem', priorytet: 'wysoki' });
    }
  }

  // Alkohol / substancje
  if (D.drinks > 5 || D.subs > 0) {
    badania.push({ nazwa: 'AST + ALT + GGTP', dlaczego: `${D.drinks > 10 ? D.drinks + ' drinków' : D.subs > 0 ? 'Substancje' : 'Alkohol'} obciąża wątrobę. GGTP to najbardziej czuły marker uszkodzenia alkoholowego`, priorytet: 'wysoki' });
    badania.push({ nazwa: 'Bilirubina całkowita', dlaczego: 'Marker wydolności wątroby, podwyższona przy przeciążeniu toksynami', priorytet: 'sredni' });
    badania.push({ nazwa: 'Estradiol (E2)', dlaczego: 'Alkohol zwiększa aromatyzację testosteronu do estrogenów. Więcej E2 = mniej T', priorytet: 'wysoki' });
    if (D.subs > 0) {
      badania.push({ nazwa: 'Serotonina w surowicy', dlaczego: 'Substancje wyczerpują zapas serotoniny. Niski poziom = wahania nastroju, lęki, bezsenność', priorytet: 'sredni' });
      badania.push({ nazwa: 'Witamina B12 + kwas foliowy', dlaczego: 'Substancje i alkohol niszczą zapasy wit. B, kluczowe dla układu nerwowego i energii', priorytet: 'wysoki' });
    }
  }

  // Libido / problemy hormonalne
  if (D.tags.has('libido')) {
    if (!badania.some(b => b.nazwa.includes('Estradiol'))) {
      badania.push({ nazwa: 'Estradiol (E2)', dlaczego: 'Zaburzony stosunek T/E2 to częsta przyczyna spadku libido u mężczyzn', priorytet: 'wysoki' });
    }
    badania.push({ nazwa: 'LH + FSH', dlaczego: 'Sprawdzają czy problem z testosteronem jest na poziomie jąder czy mózgu (przysadka)', priorytet: 'wysoki' });
    if (!badania.some(b => b.nazwa.includes('Prolaktyna'))) {
      badania.push({ nazwa: 'Prolaktyna', dlaczego: 'Podwyższona prolaktyna hamuje libido i erekcję niezależnie od poziomu T', priorytet: 'wysoki' });
    }
  }

  // Brzuch / dieta / insulinooporność
  if (D.tags.has('belly') || D.binge >= 2 || D.dietChaos >= 3) {
    badania.push({ nazwa: 'Insulina na czczo + glukoza', dlaczego: 'Obliczenie HOMA-IR, wczesny marker insulinooporności, zanim cukier będzie "za wysoki"', priorytet: 'wysoki' });
    badania.push({ nazwa: 'HbA1c (hemoglobina glikowana)', dlaczego: 'Średni poziom cukru z ostatnich 3 miesięcy, lepszy obraz niż jednorazowa glukoza', priorytet: 'sredni' });
    badania.push({ nazwa: 'Lipidogram rozszerzony', dlaczego: 'Cholesterol, triglicerydy, LDL/HDL: pełen obraz ryzyka metabolicznego', priorytet: 'sredni' });
  }

  // Mgła mózgowa / koncentracja
  if (D.tags.has('brain') || D.tags.has('focus')) {
    if (!badania.some(b => b.nazwa.includes('Ferrytyna'))) {
      badania.push({ nazwa: 'Ferrytyna', dlaczego: 'Niedobór żelaza to najczęstsza przyczyna „mgły mózgowej" u mężczyzn. Optymalna: 80-150 ng/ml', priorytet: 'wysoki' });
    }
    badania.push({ nazwa: 'Witamina D3 (25-OH)', dlaczego: 'Niedobór wit. D = gorsze funkcje kognitywne, spadek nastroju, słabsza odporność. 80% Polaków ma niedobór', priorytet: 'wysoki' });
    badania.push({ nazwa: 'hsCRP (białko C-reaktywne)', dlaczego: 'Marker przewlekłego stanu zapalnego, neuroinflamacja wpływa na koncentrację i energię', priorytet: 'sredni' });
    badania.push({ nazwa: 'Homocysteina', dlaczego: 'Podwyższona uszkadza naczynia i neurony. Często wysoka przy niedoborze B12 i kwasu foliowego', priorytet: 'sredni' });
  }

  // Stawy / regeneracja
  if (D.tags.has('joints') || D.tags.has('recovery')) {
    if (!badania.some(b => b.nazwa.includes('Witamina D3'))) {
      badania.push({ nazwa: 'Witamina D3 (25-OH)', dlaczego: 'Niedobór wit. D = słabsze kości, stawy, wolniejsza regeneracja. Optymalna: 50-80 ng/ml', priorytet: 'wysoki' });
    }
    if (!badania.some(b => b.nazwa.includes('hsCRP'))) {
      badania.push({ nazwa: 'hsCRP (białko C-reaktywne)', dlaczego: 'Stan zapalny = wolniejsza regeneracja, bóle stawów, przewlekłe zmęczenie', priorytet: 'sredni' });
    }
    badania.push({ nazwa: 'Wapń (Ca) całkowity', dlaczego: 'Kluczowy dla kości, stawów i prawidłowej pracy mięśni', priorytet: 'sredni' });
  }

  // Skóra
  if (D.tags.has('skin')) {
    badania.push({ nazwa: 'Cynk (Zn) w surowicy', dlaczego: 'Niedobór cynku = trądzik, wolne gojenie, spadek T. Trening i alkohol wyczerpują cynk', priorytet: 'sredni' });
    if (!badania.some(b => b.nazwa.includes('fT3'))) {
      badania.push({ nazwa: 'TSH + fT3 + fT4', dlaczego: 'Problemy ze skórą mogą wskazywać na niedoczynność tarczycy', priorytet: 'sredni' });
    }
  }

  // Pocenie / tętno
  if (D.tags.has('sweating') || D.tags.has('heartRate')) {
    if (!badania.some(b => b.nazwa.includes('fT3'))) {
      badania.push({ nazwa: 'TSH + fT3 + fT4', dlaczego: 'Nadczynność tarczycy = pocenie, szybkie tętno, utrata masy. Trzeba wykluczyć', priorytet: 'wysoki' });
    }
    badania.push({ nazwa: 'Sód (Na) + Potas (K)', dlaczego: 'Zaburzenia elektrolitów = arytmie, skurcze, nadmierne pocenie', priorytet: 'sredni' });
  }

  // Głód na słodycze
  if (D.tags.has('cravings')) {
    badania.push({ nazwa: 'Chrom (Cr) w surowicy', dlaczego: 'Niedobór chromu = nasilony głód na słodycze i węglowodany proste', priorytet: 'sredni' });
    if (!badania.some(b => b.nazwa.includes('Insulina'))) {
      badania.push({ nazwa: 'Insulina na czczo + glukoza', dlaczego: 'Głód na słodycze często = reaktywna hipoglikemia lub początkowa insulinooporność', priorytet: 'wysoki' });
    }
  }

  // Bóle głowy
  if (D.tags.has('headaches')) {
    if (!badania.some(b => b.nazwa.includes('Magnez'))) {
      badania.push({ nazwa: 'Magnez (Mg) w surowicy', dlaczego: 'Niedobór magnezu to częsta przyczyna bólów głowy i migren. Suplementacja Mg zmniejsza częstotliwość o 40%', priorytet: 'wysoki' });
    }
    if (!badania.some(b => b.nazwa.includes('hsCRP'))) {
      badania.push({ nazwa: 'hsCRP (białko C-reaktywne)', dlaczego: 'Przewlekły stan zapalny może powodować nawracające bóle głowy', priorytet: 'sredni' });
    }
  }

  // Lęki / niepokój
  if (D.tags.has('anxiety')) {
    if (!badania.some(b => b.nazwa.includes('Magnez'))) {
      badania.push({ nazwa: 'Magnez (Mg) w surowicy', dlaczego: 'Magnez to naturalny regulator układu nerwowego. Niedobór = lęki, napięcie, bezsenność', priorytet: 'wysoki' });
    }
    if (!badania.some(b => b.nazwa.includes('Witamina D3'))) {
      badania.push({ nazwa: 'Witamina D3 (25-OH)', dlaczego: 'Niski poziom wit. D silnie koreluje z lękami i depresją u mężczyzn 25-40', priorytet: 'sredni' });
    }
    if (!badania.some(b => b.nazwa.includes('fT3'))) {
      badania.push({ nazwa: 'TSH + fT3 + fT4', dlaczego: 'Zaburzenia tarczycy mogą nasilać lęki, trzeba wykluczyć', priorytet: 'sredni' });
    }
  }

  // Deduplikacja badan po nazwie
  const badaniaUnique = badania.filter((b, i, arr) => arr.findIndex(x => x.nazwa === b.nazwa) === i);
  const badaniaWysoki = badaniaUnique.filter(b => b.priorytet === 'wysoki');
  const badaniaSredni = badaniaUnique.filter(b => b.priorytet === 'sredni');

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

  // Potencjal - ile % blokujesz stylem zycia vs ile wykorzystujesz
  const blocked = Math.min(SC, 85); // ile % potencjalu blokujesz stylem zycia
  const usable = Math.max(100 - SC, 15); // ile % potencjalu wykorzystujesz

  // 3 personalne tipy - zaawansowane, nieoczywiste, na bazie 150 wspolprac
  const tips: { icon: string; title: string; desc: string; boost: string }[] = [];

  // Tip 1 - najwazniejszy problem: ukryte mechanizmy
  if (D.sleep < 6.5 || D.sleepQ >= 2) {
    tips.push({
      icon: '🌙',
      title: D.sleep < 6 ? 'Twoja glimfatyka nie działa' : 'Architektura snu jest zaburzona',
      desc: D.sleep < 6
        ? `Przy ${D.sleep}h mózg nie kończy cyklu oczyszczania (system glimfatyczny). Toksyny metaboliczne, w tym beta-amyloid, zostają w tkance mózgowej. Efekt? Mgła, zmęczenie, spadek pamięci roboczej. Nie chodzi o „więcej snu". Chodzi o to, że Twój mózg dosłownie nie zdąży się umyć.`
        : `Jakość snu decyduje o proporcji faz. Faza 3 (głęboki sen) to 80% wydzielania hormonu wzrostu. Ekran przed snem skraca tę fazę o 20-30 min. Jeden zabieg: temperatura sypialni 18°C + brak światła niebieskiego 90 min przed snem. Większość moich podopiecznych widzi efekt po 5 dniach.`,
      boost: '+4-6%',
    });
  }

  if (D.drinks > 5 || D.subs > 0) {
    tips.push({
      icon: '⚗️',
      title: D.subs > 0 ? 'Deplecja neuroprzekaźników' : 'Acetaldehyd sabotuje regenerację',
      desc: D.subs > 0
        ? `Substancje nie „uszkadzają mózg". One wyczerpują zapas prekursorów serotoniny (tryptofan, 5-HTP) i dopaminy (tyrozyna, L-DOPA). Bez tych cegiełek mózg nie produkuje motywacji ani dobrego nastroju przez 2-4 tygodnie. Kluczowe: uzupełnienie tyrozyny i tryptofanu z diety przyspiesza odbudowę o 40%.`
        : `Alkohol rozkłada się do acetaldehydu, substancji 30x bardziej toksycznej niż sam alkohol. ${D.drinks} drinków = Twoja wątroba potrzebuje 12-18h na oczyszczenie. W tym czasie synteza białek mięśniowych jest zatrzymana, kortyzol podwyższony, a jelita przepuszczają toksyny do krwi (zespół nieszczelnego jelita). N-acetylocysteina 600mg przed imprezą zmniejsza uszkodzenia o ~30%.`,
      boost: D.subs > 0 ? '+6-10%' : '+3-6%',
    });
  }

  if (D.stress >= 2 || D.energy >= 2) {
    tips.push({
      icon: '🫀',
      title: 'Układ nerwowy utknął w trybie walki',
      desc: `Chroniczny stres to nie „za dużo pracy". To dominacja układu sympatycznego nad parasympatycznym. Twoje ciało produkuje kortyzol zamiast testosteronu (wspólny prekursor: pregnenolon). Najskuteczniejsza interwencja z moich 150 współprac: 5 min oddechu przeponowego (wydech 2x dłuższy niż wdech) zaraz po przebudzeniu. Obniża kortyzol o 23% w 14 dni.`,
      boost: '+3-5%',
    });
  }

  if (D.miss > 0 && tips.length < 3) {
    tips.push({
      icon: '🔬',
      title: 'Tracisz efekt superkompensacji',
      desc: `Mięsień rośnie nie na treningu, rośnie 48-72h po nim, w fazie superkompensacji. ${D.miss} opuszczone sesje/tyg to nie ${D.miss * 4 * 6} straconych treningów, to ${D.miss * 4 * 6} utraconych okien anabolicznych. Ciało wraca do poziomu wyjściowego zamiast budować. Układ z moimi podopiecznymi: trening w poniedziałek i czwartek rano (8:00), statystycznie najniższy wskaźnik odwołań.`,
      boost: '+3-4%',
    });
  }

  if (D.dietChaos >= 2 && tips.length < 3) {
    tips.push({
      icon: '🧬',
      title: 'Insulina blokuje lipolizę',
      desc: `Chaotyczne jedzenie powoduje skoki insuliny co 2-3h. Dopóki insulina jest podwyższona, Twoje ciało chemicznie NIE MOŻE spalać tłuszczu (insulina hamuje lipazę hormonowrażliwą). Nie chodzi o kalorie, chodzi o okna metaboliczne. 3 posiłki w stałych porach (bez przekąsek) otwierają 4-5h okno spalania między posiłkami. 80% moich podopiecznych traci tłuszcz brzuszny w 4-6 tygodni tylko tą zmianą.`,
      boost: '+3-5%',
    });
  }

  if (D.dopamine >= 2 && tips.length < 3) {
    tips.push({
      icon: '🧪',
      title: 'Receptory D2 są zregulowane w dół',
      desc: `Ciągła stymulacja (scrollowanie, jedzenie, substancje) powoduje obniżenie wrażliwości receptorów dopaminowych D2. Efekt: potrzebujesz coraz więcej bodźca żeby poczuć cokolwiek. To ten sam mechanizm co tolerancja na używki. Interwencja: 90 min bez telefonu po przebudzeniu. Pozwala na naturalny szczyt dopaminy porannej. Moi podopieczni zgłaszają wzrost motywacji po 7-10 dniach.`,
      boost: '+2-4%',
    });
  }

  if (D.tags.has('belly') && tips.length < 3) {
    tips.push({
      icon: '🔥',
      title: 'Tłuszcz trzewny produkuje estrogen',
      desc: `Tłuszcz na brzuchu to nie kwestia estetyki. Tkanka tłuszczowa trzewna zawiera enzym aromatazę, który przekształca testosteron w estradiol. Im więcej tłuszczu brzusznego, tym mniej testosteronu. To pętla sprzężenia zwrotnego: mniej T = więcej tłuszczu = jeszcze mniej T. Przerwanie cyklu: trening siłowy 3x/tyg + 3 posiłki białkowo-tłuszczowe dziennie.`,
      boost: '+3-5%',
    });
  }

  if (D.tags.has('brain') && tips.length < 3) {
    tips.push({
      icon: '🧠',
      title: 'Neuroinflamacja obniża wydajność',
      desc: `Mgła mózgowa to nie zmęczenie. To przewlekły stan zapalny w ośrodkowym układzie nerwowym, neuroinflamacja. Główne źródła: nieszczelne jelito (alkohol, stres), niedobór snu, niedobór kwasów omega-3. Suplementacja omega-3 (2g EPA dziennie) + probiotyk wieloszczepowy przez 30 dni. 70% moich podopiecznych z mgłą zgłasza poprawę po 3 tygodniach.`,
      boost: '+2-4%',
    });
  }

  // Uzupełnienie jeśli mniej niż 3 wskazówki
  if (tips.length < 3) {
    tips.push({
      icon: '🩸',
      title: 'Niedobór magnezu blokuje 300 enzymów',
      desc: `80% mężczyzn ma subkliniczny niedobór magnezu, nie na tyle niski żeby wyszedł w badaniach, ale na tyle żeby upośledzał sen, regenerację i pracę nerwów. Magnez uczestniczy w 300+ reakcjach enzymatycznych. Forma ma znaczenie: cytrynian lub glicynian (nie tlenek). 400mg przed snem. Efekt po 10-14 dniach: lepszy sen, mniej skurczów, niższy kortyzol.`,
      boost: '+2-3%',
    });
  }

  const totalBoostMin = tips.reduce((s, t) => s + parseInt(t.boost.replace('+','').split('-')[0]), 0);
  const totalBoostMax = tips.reduce((s, t) => s + parseInt(t.boost.replace('+','').split('-')[1] || t.boost.replace('+','').split('-')[0]), 0);

  const comparisons: string[] = [];
  if (C.total > 3000) comparisons.push(`${Math.round(C.total / 99)} ebooków o zdrowiu`);
  if (C.total > 5000) comparisons.push('roczną kartę na najlepszą siłownię w mieście');
  if (C.total > 8000) comparisons.push('pełny panel badań krwi co 3 miesiące przez rok');
  if (C.total > 12000) comparisons.push('rok suplementacji dobranej pod Ciebie');
  if (C.total > 18000) comparisons.push('6 miesięcy pracy z trenerem personalnym');
  if (C.total > 30000) comparisons.push('rok indywidualnej opieki dietetyka + trenera');

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

        /* === Keyframes premium === */
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

      {/* === Skip-to-content dla dostępności === */}
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

      {/* === Scroll progress bar === */}
      <ScrollProgress />

      {/* === Animowane niebo z gwiazdami === */}
      <StarField />

      <div
        id="diagnostyka"
        ref={topRef}
        style={{ maxWidth: 440, width: '100%', margin: '0 auto', padding: '0 0 60px', position: 'relative', zIndex: 1, overflow: 'hidden' }}
      >

        {/* === FORM === */}
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
                      5 minut &middot; 7 sekcji
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
                    <p style={{ color: M.t3, fontSize: 14.5, lineHeight: 1.65, fontWeight: 400, maxWidth: 360, margin: '0 auto 14px' }}>
                      Jedyna diagnostyka po której dostaniesz badania krwi spersonalizowane do Twoich odpowiedzi. Endokrynolog tego nie zrobi.
                    </p>
                    <div style={{ fontFamily: M.mono, fontSize: 10, color: M.t4, letterSpacing: 1.5 }}>🔒 Twoje odpowiedzi są poufne &middot; Używam ich tylko do analizy Twoich wyników</div>
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

                  {/* Conditional: jeśli wknd=0, pomijamy 5 pól weekendowych */}
                  {D.wknd === 0 ? (
                    <div style={{
                      padding: '18px 16px', marginTop: 8, marginBottom: 24,
                      background: `${M.grn}08`, border: `1px solid ${M.grn}25`,
                      borderRadius: 12,
                    }}>
                      <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: M.grn, marginBottom: 8 }}>
                        Zero imprez = jeden problem mniej
                      </div>
                      <p style={{ fontSize: 13, color: M.t2, lineHeight: 1.6, marginBottom: 0 }}>
                        Pomijam dalsze pytania o weekend. Przejdziemy od razu do treningu.
                      </p>
                    </div>
                  ) : (
                    <>
                      <Slider label="Drinki na imprezie (średnio)" min={0} max={20} step={1} k="drinks" val={D.drinks} unit="" note={D.drinks > 5 ? `${D.drinks} drinków = ~${Math.round(D.drinks * 3.4)}% spadek testosteronu w 12h (Vingren 2013)` : ''} ariaLabel="Średnia liczba drinków na imprezie" />
                      <Slider label="Wydajesz na imprezie (alkohol, wyjścia)" min={0} max={800} step={50} k="cash" val={D.cash} unit=" zł" note={`Suma 6 mies.: ${(D.cash * D.wknd * 6).toLocaleString('pl-PL')} zł`} ariaLabel="Wydatki na imprezie w złotych" />

                      {/* Substancje: chipy zamiast slidera PLN */}
                      <div style={{ marginBottom: 28 }}>
                        <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 12, lineHeight: 1.45 }}>
                          Substancje (mefedron / kokaina)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                          {[
                            { v: 0, l: 'Nie' },
                            { v: 150, l: 'Sporadycznie' },
                            { v: 400, l: 'Regularnie' },
                            { v: 100, l: 'Wolę nie odp.' },
                          ].map((opt, i) => {
                            const on = D.subs === opt.v;
                            return (
                              <button
                                key={i}
                                onClick={() => upd('subs', opt.v)}
                                role="switch"
                                aria-checked={on}
                                aria-label={`Substancje: ${opt.l}`}
                                style={{
                                  padding: '14px 8px', textAlign: 'center',
                                  border: `1.5px solid ${on ? M.gold : M.brd2}`,
                                  background: on ? M.gold + '12' : M.s1,
                                  cursor: 'pointer', borderRadius: 10,
                                  transition: 'all .2s ease',
                                  transform: on ? 'scale(1.02)' : 'scale(1)',
                                  minHeight: 44,
                                  color: on ? M.gold : M.t2,
                                  fontSize: 12.5, fontWeight: 600,
                                }}
                              >
                                {opt.l}
                              </button>
                            );
                          })}
                        </div>
                      </div>

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
                    </>
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
                    ['brain', 'Mgła mózgowa, problemy z koncentracją'],
                    ['anxiety', 'Niepokój, natrętne myśli'],
                    ['motivation', 'Brak motywacji, apatia'],
                    ['recovery', 'Wolna regeneracja po treningu (3+ dni)'],
                    ['focus', 'Nie możesz się skupić dłużej niż 20 minut'],
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

        {/* === LEAD GATE === */}
        {phase === 'gate' && (
          <div className="fade-up" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', textAlign: 'center' }}>
            <div style={{ maxWidth: 400, width: '100%' }}>
              <Logo />

              {/* Częściowy wynik - WOW moment */}
              <div style={{ marginTop: 32, marginBottom: 12 }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 10 }}>Twój Wynik</div>
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
                Odezwę się do Ciebie w DM w ciągu 24h z konkretną informacją zwrotną.
              </p>
            </div>
          </div>
        )}

        {/* === RESULTS === */}
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

            {/* Total - ciemna karta ze zlotym akcentem */}
            <Reveal delay={80}>
              <div style={{
                background: `linear-gradient(160deg, #0e0e0e, #151510)`,
                textAlign: 'center', padding: '28px 18px 24px',
                position: 'relative', overflow: 'hidden', marginBottom: 20, borderRadius: 16, width: '100%',
                boxSizing: 'border-box',
                border: `2px solid ${M.gold}40`,
                boxShadow: `0 8px 40px ${M.gold}15, inset 0 1px 0 ${M.gold}15`,
              }} className="float-el">
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg,transparent,transparent 4px,rgba(200,168,78,.03) 4px,rgba(200,168,78,.03) 8px)' }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 3.5, textTransform: 'uppercase', color: M.t4, marginBottom: 8 }}>Tracisz w 6 miesięcy</div>
                  <div style={{ fontFamily: M.mono, fontSize: 44, fontWeight: 800, color: M.gold, lineHeight: 1.1, textShadow: `0 0 30px ${M.gold}30` }}>
                    {countersActive ? animTotal.toLocaleString('pl-PL') : C.total.toLocaleString('pl-PL')} zł
                  </div>
                  <div style={{ fontFamily: M.mono, fontSize: 13, color: M.t3, marginTop: 6 }}>= {Math.round(C.total / 6).toLocaleString('pl-PL')} zł / miesiąc</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12, fontFamily: M.mono, fontSize: 10.5 }}>
                    <span style={{ color: M.t3 }}>
                      wprost: <strong style={{ color: M.t1 }}>{countersActive ? animHard.toLocaleString('pl-PL') : C.hardTotal.toLocaleString('pl-PL')} zł</strong>
                    </span>
                    <span style={{ color: M.brd2 }}>|</span>
                    <span style={{ color: M.t3 }}>
                      ukryte: <strong style={{ color: M.org }}>{countersActive ? animHidden.toLocaleString('pl-PL') : C.hiddenTotal.toLocaleString('pl-PL')} zł</strong>
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Co moglbys miec zamiast */}
            {comparisons.length > 0 && (
              <Reveal delay={120}>
                <div style={{
                  background: 'rgba(19,19,19,0.8)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: `1px solid ${M.brd}`,
                  padding: '18px 16px', marginBottom: 20, borderRadius: 12, width: '100%', boxSizing: 'border-box',
                }}>
                  <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: M.t4, marginBottom: 12 }}>
                    Za te pieniądze mógłbyś mieć
                  </div>
                  {comparisons.slice(0, 4).map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ color: M.gold, fontSize: 11, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 12.5, color: M.t2, lineHeight: 1.5 }}>{c}</span>
                    </div>
                  ))}
                  <p style={{ fontSize: 11.5, color: M.t4, textAlign: 'center', marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
                    Zamiast tego tracisz <strong style={{ color: M.red }}>{C.total.toLocaleString('pl-PL')} zł</strong> na konsekwencje, których nawet nie widzisz.
                  </p>
                </div>
              </Reveal>
            )}

            {/* Norm: Ty vs przeciętny, pokaż tylko przy istotnym wyniku */}
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

            {/* === Progresja: Co się stanie jeśli nic nie zmienisz === */}
            {SC >= 20 && (
              <Reveal delay={110}>
                <div style={{
                  position: 'relative', overflow: 'hidden',
                  background: `linear-gradient(160deg, rgba(19,19,19,0.9), ${M.red}06)`,
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: `1px solid ${M.red}20`,
                  padding: '22px 16px', marginBottom: 20, borderRadius: 14, width: '100%', boxSizing: 'border-box',
                }}>
                  <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.red, marginBottom: 18 }}>
                    {imie.trim() ? `${imie.trim()}, jeśli nic nie zmienisz` : 'Jeśli nic nie zmienisz'}
                  </div>

                  {/* Timeline progresji */}
                  {[
                    {
                      period: 'Za 3 miesiące',
                      color: M.org,
                      items: [
                        D.sleep < 6.5 && 'Deficyt snu staje się chroniczny. Kortyzol bazowy podnosi się o 15-20%',
                        D.tags.has('fatigue') && 'Zmęczenie zaczynasz traktować jako normę. Nie jest.',
                        D.miss > 0 && `Kolejne ${D.miss * 12} treningów stracone na marne przez złe fundamenty`,
                        D.drinks > 5 && 'Tolerancja na alkohol rośnie. Pijesz więcej żeby poczuć ten sam efekt',
                        D.stress >= 2 && 'Chroniczny stres obniża produkcję testosteronu o kolejne 5-10%',
                        D.tags.has('belly') && 'Tłuszcz trzewny rośnie. Aromataza konwertuje więcej T na estradiol',
                      ].filter(Boolean).slice(0, 2) as string[],
                    },
                    {
                      period: 'Za 6 miesięcy',
                      color: M.red,
                      items: [
                        `${C.total.toLocaleString('pl-PL')} zł stracone na konsekwencje stylu życia`,
                        D.tags.has('libido') && 'Libido spada dalej. Partnerka/partner to zauważa',
                        D.tags.has('brain') && 'Mgła mózgowa staje się codziennością. Produktywność na 60%',
                        D.subs > 0 && 'Receptory D2 dalej się degradują. Potrzebujesz coraz więcej żeby poczuć radość',
                        D.sleep < 7 && 'Ryzyko insulinooporności wzrasta 2.5x przy chronicznie krótkim śnie',
                        C.brakes >= 3 && `${C.stagnationMonths}+ miesięcy bez progresu mimo regularnych treningów`,
                      ].filter(Boolean).slice(0, 2) as string[],
                    },
                    {
                      period: 'Za 12 miesięcy',
                      color: '#dc2626',
                      items: [
                        `Straty finansowe: ${(C.total * 2).toLocaleString('pl-PL')} zł. Większość niewidoczna`,
                        'Objawy, które teraz ignorujesz, zaczynają wymagać leczenia',
                        SC >= 50 ? 'Lekarz zleca badania i mówi „musi pan coś zmienić". Ale nie wie co konkretnie' : 'Ciało adaptuje się do niskiej wydajności. To staje się Twoja nowa normalność',
                        D.tags.size >= 4 && 'Kaskada objawów: jeden problem napędza kolejny. Im dłużej czekasz, tym trudniej to naprawić',
                      ].filter(Boolean).slice(0, 2) as string[],
                    },
                  ].map((block, bi) => (
                    <div key={bi} style={{ marginBottom: bi < 2 ? 16 : 0 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: 4, background: block.color, flexShrink: 0, boxShadow: `0 0 8px ${block.color}50` }} />
                        <span style={{ fontFamily: M.mono, fontSize: 11, fontWeight: 700, color: block.color, letterSpacing: 0.5 }}>{block.period}</span>
                      </div>
                      {block.items.map((item, ii) => (
                        <div key={ii} style={{ display: 'flex', gap: 8, marginLeft: 16, marginBottom: 6 }}>
                          <span style={{ color: block.color, fontSize: 10, flexShrink: 0, marginTop: 2 }}>▸</span>
                          <span style={{ fontSize: 11.5, color: M.t3, lineHeight: 1.55 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  ))}

                  <div style={{
                    marginTop: 16, padding: '12px 14px',
                    background: `${M.red}0c`, border: `1px solid ${M.red}18`, borderRadius: 10,
                  }}>
                    <p style={{ fontSize: 12, color: M.t2, lineHeight: 1.65, marginBottom: 0, textAlign: 'center' }}>
                      To nie straszenie. To <strong style={{ color: M.t1 }}>matematyka i biologia</strong>.<br />
                      Każdy tydzień bez zmian pogłębia problem. Im później zaczniesz, tym dłużej trwa naprawa.
                    </p>
                  </div>
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

            {/* Zalecane badania krwi */}
            {badaniaUnique.length > 0 && (
              <Reveal delay={130}>
                <div style={{
                  position: 'relative', overflow: 'hidden',
                  background: 'rgba(19,19,19,0.82)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: `1px solid ${M.gold}20`,
                  padding: '22px 16px', marginBottom: 20, borderRadius: 14, width: '100%', boxSizing: 'border-box',
                }}>
                  {/* Znak wodny */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-25deg)', fontFamily: M.mono, fontSize: 56, fontWeight: 900, color: `${M.gold}06`, letterSpacing: 8, whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none' }}>HANTLE I TALERZ</div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>🩸</span>
                    <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.gold }}>Zalecane badania krwi</div>
                  </div>
                  <div style={{ fontSize: 11, color: M.t4, marginBottom: 16, lineHeight: 1.5 }}>
                    Personalizowana lista na bazie Twoich odpowiedzi. Badania, które lekarz Ci nie zleci. Bo nie zna Twojego stylu życia.
                  </div>

                  {badaniaWysoki.length > 0 && (
                    <>
                      <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: M.red, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 3, background: M.red, display: 'inline-block' }} />
                        Priorytet: zrób jak najszybciej ({badaniaWysoki.length})
                      </div>
                      {badaniaWysoki.map((b, i) => (
                        <div key={`w-${i}`} style={{ padding: '10px 0', borderBottom: `1px solid ${M.brd}` }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: M.t1, marginBottom: 3 }}>{b.nazwa}</div>
                          {/* Pierwsze 2 interpretacje widoczne jako teaser, reszta zamazana */}
                          {i < 2 ? (
                            <div style={{ fontSize: 11, color: M.t3, lineHeight: 1.55, marginTop: 4 }}>{b.dlaczego}</div>
                          ) : (
                            <div style={{ position: 'relative', marginTop: 4 }}>
                              <div style={{ fontSize: 11, color: M.t4, lineHeight: 1.5, filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none' }}>{b.dlaczego}</div>
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: M.gold, padding: '4px 10px', background: 'rgba(10,10,10,0.8)', border: '1px solid ' + M.gold + '30', borderRadius: 6 }}>
                                  Pełna interpretacja → napisz DM @hantleitalerz
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {badaniaSredni.length > 0 && (
                    <>
                      <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: M.org, marginTop: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 3, background: M.org, display: 'inline-block' }} />
                        Warto sprawdzić ({badaniaSredni.length})
                      </div>
                      {badaniaSredni.map((b, i) => (
                        <div key={`s-${i}`} style={{ padding: '10px 0', borderBottom: `1px solid ${M.brd}` }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: M.t1, marginBottom: 3 }}>{b.nazwa}</div>
                          <div style={{ position: 'relative', marginTop: 4 }}>
                            <div style={{ fontSize: 11, color: M.t4, lineHeight: 1.5, filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none' }}>{b.dlaczego}</div>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: M.gold, padding: '4px 10px', background: 'rgba(10,10,10,0.8)', border: '1px solid ' + M.gold + '30', borderRadius: 6 }}>
                                Interpretacja wyników → napisz DM @hantleitalerz
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  <div style={{ marginTop: 16, padding: '12px 14px', background: `${M.gold}08`, border: `1px solid ${M.gold}15`, borderRadius: 10 }}>
                    <p style={{ fontSize: 11, color: M.t3, lineHeight: 1.6, marginBottom: 0 }}>
                      💡 <strong style={{ color: M.t1 }}>Wskazówka:</strong> Badania rób na czczo, rano (7:00-9:00). Wyniki „w normie" nie znaczą „optymalne". Zakres referencyjny jest dla ogółu populacji, nie dla mężczyzny który trenuje i chce mieć formę. Potrzebujesz interpretacji? <strong style={{ color: M.gold }}>Napisz w DM @hantleitalerz</strong>
                    </p>
                  </div>

                  <div style={{ fontSize: 10, color: M.t4, fontFamily: M.mono, textAlign: 'center', marginTop: 14, letterSpacing: 0.5, opacity: 0.6 }}>
                    Lista na bazie {'>'}150 współprac i aktualnych wytycznych endokrynologicznych
                  </div>
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
                position: 'relative', overflow: 'hidden',
                padding: '24px 18px', marginBottom: 20,
                border: `1px solid ${M.gold}30`,
                background: `linear-gradient(135deg, ${M.gold}08, transparent)`,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: 14, width: '100%', boxSizing: 'border-box',
              }}>
                {/* Znak wodny */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-30deg)', fontFamily: M.mono, fontSize: 44, fontWeight: 900, color: `${M.gold}05`, letterSpacing: 6, whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none' }}>DIAGNOSTYKA HiT</div>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.gold, marginBottom: 16 }}>Twój potencjał</div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 48, fontWeight: 800, fontFamily: M.mono, color: M.gold, lineHeight: 1 }}>{usable}%</div>
                  <div style={{ fontSize: 12, color: M.t3, marginTop: 6 }}>tyle wykorzystujesz ze swojego ciała</div>
                </div>
                <div style={{ position: 'relative', height: 8, background: M.s3, borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ position: 'absolute', left: 0, height: '100%', width: `${blocked}%`, background: `linear-gradient(90deg, ${M.red}, ${M.org})`, borderRadius: 4, transition: 'width 1.5s ease' }} />
                  <div style={{ position: 'absolute', left: `${blocked}%`, height: '100%', width: `${usable}%`, background: `linear-gradient(90deg, ${M.gold}40, ${M.gold})`, borderRadius: '0 4px 4px 0', opacity: 0.4 }} />
                </div>
                <p style={{ fontSize: 13, color: M.t2, lineHeight: 1.7, textAlign: 'center', marginBottom: 0 }}>
                  Na podstawie {'>'}150 współprac i badań naukowych, Twój organizm ma <strong style={{ color: M.gold }}>{blocked}% niewykorzystanego potencjału</strong>.
                  {blocked > 30 && <><br />To energia, siła, regeneracja i ostrość umysłu, które masz w sobie ale które teraz blokujesz swoim stylem życia.</>}
                </p>
              </div>
            </Reveal>

            {/* 3 personalne tipy */}
            <Reveal delay={120}>
              <div style={{
                position: 'relative', overflow: 'hidden',
                padding: '22px 16px', marginBottom: 20,
                border: `1px solid ${M.brd}`,
                background: 'rgba(19,19,19,0.78)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: 14, width: '100%', boxSizing: 'border-box',
              }}>
                {/* Znak wodny */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-20deg)', fontFamily: M.mono, fontSize: 48, fontWeight: 900, color: `${M.gold}04`, letterSpacing: 6, whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none' }}>HANTLE I TALERZ</div>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 6 }}>3 rzeczy które możesz zrobić już jutro</div>
                <div style={{ fontSize: 11, color: M.gold, fontFamily: M.mono, marginBottom: 18 }}>od +{totalBoostMin}% do +{totalBoostMax}% potencjału w ciągu 30 dni</div>

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
                      {/* Pierwsze 2 zdania widoczne: mocniejszy teaser */}
                      <div style={{ fontSize: 12, color: M.t3, lineHeight: 1.6 }}>
                        {tip.desc.split('. ').slice(0, 2).join('. ')}.
                      </div>
                      {/* Reszta zamazana z paywall overlay */}
                      {tip.desc.split('. ').length > 2 && (
                        <div style={{ position: 'relative', marginTop: 6 }}>
                          <div style={{ fontSize: 12, color: M.t4, lineHeight: 1.6, filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none' }}>
                            {tip.desc.split('. ').slice(2).join('. ')}
                          </div>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: M.gold, padding: '6px 14px', background: 'rgba(10,10,10,0.8)', border: '1px solid ' + M.gold + '30', borderRadius: 8 }}>
                              🔒 Pełny protokół we współpracy
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div style={{
                  marginTop: 18, padding: '14px 16px',
                  background: `${M.gold}0a`, border: `1px solid ${M.gold}20`,
                  borderRadius: 10, textAlign: 'center',
                }}>
                  <p style={{ fontSize: 12.5, color: M.t2, lineHeight: 1.65, marginBottom: 0 }}>
                    Te wskazówki to <strong style={{ color: M.t1 }}>od +{totalBoostMin}% do +{totalBoostMax}%</strong>. Sam, bez nadzoru.<br />
                    Chcesz wyciągnąć <strong style={{ color: M.gold }}>100%</strong>? Poniżej sprawdź jak mogę Ci w tym pomóc.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* === MEGA CTA: perswazja + psychologia straty + imie + bonus === */}
            <Reveal delay={140}>
              <div style={{
                position: 'relative', overflow: 'hidden',
                background: `linear-gradient(160deg, rgba(19,19,19,0.95), rgba(200,168,78,0.08))`,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `2px solid ${M.gold}40`,
                padding: '28px 20px', marginBottom: 20, borderRadius: 18, width: '100%', boxSizing: 'border-box',
                boxShadow: `0 0 40px ${M.gold}10, inset 0 1px 0 ${M.gold}15`,
              }}>
                {/* Znak wodny */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-25deg)', fontFamily: M.mono, fontSize: 52, fontWeight: 900, color: `${M.gold}04`, letterSpacing: 8, whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none' }}>HANTLE I TALERZ</div>

                {/* Personalizowana kwalifikacja z imieniem + social proof */}
                {SC >= 25 && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20,
                    padding: '16px 14px', background: `${M.gold}12`, border: `1px solid ${M.gold}30`,
                    borderRadius: 12,
                  }}>
                    <span style={{ fontSize: 26, flexShrink: 0, marginTop: 2 }}>✅</span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: M.gold, marginBottom: 6, lineHeight: 1.3 }}>
                        {imie.trim()
                          ? `${imie.trim()}, wstępnie kwalifikujesz się do współpracy`
                          : 'Wstępnie kwalifikujesz się do współpracy'
                        }
                      </div>
                      <div style={{ fontSize: 12.5, color: M.t2, lineHeight: 1.6, marginBottom: 8 }}>
                        {SC >= 50
                          ? `Widziałem Twój profil: ${SC}/100 pkt, ${D.tags.size} objawów, ${blocked}% niewykorzystanego potencjału. To dokładnie wzorzec ludzi z którymi pracuję i u których widzę największe zmiany w ciągu 3-6 miesięcy.`
                          : `Twoje wyniki (${SC}/100) pokazują konkretne blokady. Widziałem to wielokrotnie. Przy odpowiednim podejściu możesz odzyskać ${Math.min(blocked, 40)}% potencjału.`
                        }
                      </div>
                      {/* Spersonalizowany social proof z danymi */}
                      <div style={{
                        padding: '10px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 8,
                        border: `1px solid ${M.gold}15`,
                      }}>
                        <div style={{ fontSize: 11.5, color: M.t3, lineHeight: 1.6 }}>
                          {SC >= 60 && D.tags.size >= 4
                            ? <>Twój profil pokrywa się z <strong style={{ color: M.gold }}>~78%</strong> moich podopiecznych na starcie. Ci ludzie odzyskali średnio {Math.min(blocked - 5, 35)}% potencjału w pierwszych 8 tygodniach.</>
                            : SC >= 40
                            ? <>Pracowałem z facetami o bardzo podobnym profilu: score {SC > 50 ? '50-70' : '35-55'}, {D.tags.size >= 3 ? 'kilka objawów naraz' : 'konkretne blokady'}. Średni progres: <strong style={{ color: M.gold }}>widoczna zmiana w 4-6 tygodni</strong>.</>
                            : <>Nawet przy score {SC}/100 widzę konkretne punkty do naprawy. Mniejszy problem = <strong style={{ color: M.gold }}>szybszy efekt</strong>. Zanim się rozkręci.</>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Personalizowany problem - co dokladnie naprawiamy */}
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.gold, marginBottom: 14 }}>
                  {imie.trim() ? `${imie.trim()}, dokładnie z tym pracuję` : 'Dokładnie z tym pracuję'}
                </div>

                <div style={{ marginBottom: 18 }}>
                  {/* Dynamiczna lista problemow na bazie wynikow */}
                  {[
                    D.sleep < 6.5 && { ic: '😴', t: `${D.sleep}h snu niszczy Ci regenerację i hormony`, d: 'Naprawiam to w pierwszych 2 tygodniach. Bez tabletek, bez wstawania o 5 rano.' },
                    D.drinks > 5 && { ic: '🍺', t: `${D.drinks} drinków na imprezę sabotuje Twoją formę`, d: 'Mam protokół który minimalizuje szkody bez rezygnowania z imprez. Zero moralizowania.' },
                    D.subs > 0 && { ic: '💊', t: 'Substancje wyczerpują Twoje neuroprzekaźniki', d: 'Pracuję z facetami którzy używają. Wiem jak odbudować serotoninę i dopaminę między sesjami.' },
                    D.stress >= 2 && { ic: '😰', t: 'Chroniczny stres zjada Twój testosteron', d: 'Kortyzol i testosteron biorą się z tego samego prekursora. Wiem jak przerzucić produkcję na Twoją korzyść.' },
                    D.miss > 0 && { ic: '❌', t: `${D.miss} tracone treningi tygodniowo = zerowy progres`, d: 'Układ treningowy dopasowany do Twojego chaosu. Nie musisz być zdyscyplinowany - musisz mieć system.' },
                    D.tags.has('belly') && { ic: '🔥', t: 'Brzuch nie schodzi mimo treningu', d: 'To nie kwestia kalorii. To hormony i insulina. Naprawiam przyczynę, nie objaw.' },
                    D.tags.has('libido') && { ic: '⬇️', t: 'Libido na dnie', d: 'W 80% przypadków to sen + stres + alkohol. Kiedy naprawimy te 3 rzeczy, testosteron wraca sam.' },
                    D.tags.has('brain') && { ic: '🧠', t: 'Mgła mózgowa i zerowa koncentracja', d: 'Neuroinflamacja z jelita, niedobory, rozregulowana dopamina. Wiem od czego zacząć.' },
                    D.tags.has('fatigue') && { ic: '🔋', t: 'Chroniczne zmęczenie mimo snu', d: 'To nie lenistwo. To mitochondria, żelazo albo tarczyca. Diagnozuję to w pierwszym tygodniu.' },
                  ].filter(Boolean).slice(0, 4).map((item, i) => item && (
                    <div key={i} style={{
                      display: 'flex', gap: 10, padding: '10px 0',
                      borderBottom: `1px solid ${M.brd}`,
                    }}>
                      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{item.ic}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: M.t1, marginBottom: 3 }}>{item.t}</div>
                        <div style={{ fontSize: 11.5, color: M.t3, lineHeight: 1.55 }}>{item.d}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Psychologia straty - co tracisz BEZ systemu */}
                {C.total > 3000 && (
                  <div style={{
                    padding: '16px 14px', marginBottom: 18,
                    background: `${M.red}0a`, border: `1px solid ${M.red}20`, borderRadius: 12,
                  }}>
                    <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: M.red, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: M.red, display: 'inline-block' }} />
                      {imie.trim() ? `${imie.trim()}, bez zmian dalej tracisz` : 'Bez zmian dalej tracisz'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                      <div style={{ textAlign: 'center', padding: '10px 6px', background: 'rgba(10,10,10,0.5)', borderRadius: 8 }}>
                        <div style={{ fontFamily: M.mono, fontSize: 22, fontWeight: 800, color: M.red }}>{C.total.toLocaleString('pl-PL')}</div>
                        <div style={{ fontSize: 9, color: M.t4, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 3 }}>zł / 6 miesięcy</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '10px 6px', background: 'rgba(10,10,10,0.5)', borderRadius: 8 }}>
                        <div style={{ fontFamily: M.mono, fontSize: 22, fontWeight: 800, color: M.org }}>{blocked}%</div>
                        <div style={{ fontSize: 9, color: M.t4, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 3 }}>potencjału zmarnowane</div>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: M.t3, lineHeight: 1.65, marginBottom: 0 }}>
                      Każdy tydzień bez systemu to kolejne <strong style={{ color: M.red }}>{Math.round(C.total / 26).toLocaleString('pl-PL')} zł</strong> stracone na konsekwencje i <strong style={{ color: M.red }}>{C.wastedSessions > 0 ? `${Math.round(C.wastedSessions / 26)} treningów` : 'progres'}</strong> wyrzucone w błoto.
                    </p>
                    {/* Porównanie: co tracisz vs co zyskujesz */}
                    <div style={{
                      marginTop: 12, display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'center',
                    }}>
                      <div style={{ textAlign: 'center', padding: '10px 6px', background: `${M.red}10`, borderRadius: 8, border: `1px solid ${M.red}15` }}>
                        <div style={{ fontFamily: M.mono, fontSize: 11, fontWeight: 700, color: M.red }}>{Math.round(C.total / 6).toLocaleString('pl-PL')} zł/mies.</div>
                        <div style={{ fontSize: 9, color: M.t4, marginTop: 3 }}>tracisz niewidocznie</div>
                      </div>
                      <div style={{ fontSize: 16, color: M.t4 }}>vs</div>
                      <div style={{ textAlign: 'center', padding: '10px 6px', background: `${M.gold}10`, borderRadius: 8, border: `1px solid ${M.gold}15` }}>
                        <div style={{ fontFamily: M.mono, fontSize: 11, fontWeight: 700, color: M.gold }}>system</div>
                        <div style={{ fontSize: 9, color: M.t4, marginTop: 3 }}>który to naprawia</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(10,10,10,0.4)', borderRadius: 8, border: `1px solid ${M.brd}` }}>
                      <p style={{ fontSize: 11.5, color: M.t3, lineHeight: 1.6, marginBottom: 0, textAlign: 'center' }}>
                        To nie jest tani kurs ani ebook. To <strong style={{ color: M.gold }}>najwyższa półka indywidualnej współpracy w Polsce</strong>, bo łączę trening, neurobiologię i wiedzę której nie ma nikt inny.
                        {C.total > 8000 && <> Kwota którą tracisz w {C.total > 15000 ? '1 miesiąc' : '2-3 miesiące'} <strong style={{ color: M.t1 }}>przewyższa koszt całej współpracy</strong>.</>}
                      </p>
                    </div>
                  </div>
                )}

                {/* Co dostajesz - konkretnie */}
                <div style={{
                  padding: '16px 14px', marginBottom: 18,
                  background: 'rgba(10,10,10,0.5)', border: `1px solid ${M.brd2}`, borderRadius: 12,
                }}>
                  <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: M.gold, marginBottom: 12 }}>
                    Na stronie zobaczysz
                  </div>
                  {[
                    'Jak wygląda współpraca - krok po kroku, bez ściemy',
                    'Efekty ludzi z podobnym profilem do Twojego',
                    'Formularz kwalifikacyjny - wypełniasz, ja oceniam czy i jak mogę pomóc',
                  ].map((t, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: M.gold, fontSize: 12, flexShrink: 0, marginTop: 1 }}>→</span>
                      <span style={{ fontSize: 12.5, color: M.t2, lineHeight: 1.55 }}>{t}</span>
                    </div>
                  ))}
                </div>

                {/* BONUS - urgency */}
                <div style={{
                  padding: '14px 14px', marginBottom: 20,
                  background: `linear-gradient(135deg, ${M.gold}15, ${M.gold}08)`,
                  border: `1px solid ${M.gold}35`, borderRadius: 12,
                  position: 'relative',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>🎁</span>
                    <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: M.gold, fontWeight: 700 }}>
                      Bonus za wypełnienie formularza
                    </div>
                  </div>
                  <p style={{ fontSize: 12.5, color: M.t2, lineHeight: 1.65, marginBottom: 0 }}>
                    {imie.trim()
                      ? `${imie.trim()}, jeśli wypełnisz formularz na stronie - dostaniesz ode mnie`
                      : 'Jeśli wypełnisz formularz na stronie - dostaniesz ode mnie'}
                    {' '}<strong style={{ color: M.gold }}>spersonalizowaną analizę</strong> na bazie Twoich wyników z diagnostyki.
                    Co dokładnie blokuje Twój progres, od czego zacząć i czy współpraca ma w Twoim przypadku sens. <strong style={{ color: M.t1 }}>Za darmo, w DM, w ciągu 24h.</strong>
                  </p>
                </div>

                {/* Glowny CTA - MEGA DUZY */}
                <a
                  href="https://system.talerzihantle.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shimmer-btn"
                  aria-label="Wchodzę - pokaż jak pomagasz"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: `linear-gradient(135deg, ${M.gold}, #d4b85a, ${M.gold})`,
                    color: '#0a0a0a',
                    fontFamily: M.mono, textDecoration: 'none', padding: '24px 20px',
                    textAlign: 'center', marginBottom: 6, borderRadius: 14,
                    boxShadow: `0 4px 30px ${M.gold}40, 0 0 80px ${M.gold}15`,
                    minHeight: 64,
                  } as React.CSSProperties}
                >
                  <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase', lineHeight: 1.3 }}>
                    {imie.trim() ? `${imie.trim()}, wchodzę →` : 'Wchodzę - pokaż jak pomagasz →'}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, marginTop: 6, opacity: 0.7 }}>
                    Przeczytaj + wypełnij formularz kwalifikacyjny
                  </span>
                </a>

                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: M.t4, fontFamily: M.mono, letterSpacing: 0.5 }}>
                    system.talerzihantle.com
                  </div>
                </div>

                {/* Social proof */}
                <div style={{
                  display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16,
                }}>
                  {[
                    { n: '150+', l: 'podopiecznych' },
                    { n: `${blocked}%`, l: 'Twojego potencjału do odblokowania' },
                  ].map((s, i) => (
                    <div key={i} style={{
                      padding: '8px 14px', background: 'rgba(10,10,10,0.5)',
                      border: `1px solid ${M.brd}`, borderRadius: 8, textAlign: 'center', flex: 1, minWidth: 100,
                    }}>
                      <div style={{ fontFamily: M.mono, fontSize: 16, fontWeight: 700, color: M.gold }}>{s.n}</div>
                      <div style={{ fontSize: 8.5, color: M.t4, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Alternatywa - DM */}
                <div style={{ textAlign: 'center', fontSize: 11, color: M.t4, fontFamily: M.mono, letterSpacing: 0.3, marginBottom: 16 }}>
                  Wolisz pogadać najpierw? Napisz <strong style={{ color: M.gold }}>JAZDA</strong> w DM <a href="https://instagram.com/hantleitalerz" target="_blank" rel="noopener noreferrer" style={{ color: M.gold, textDecoration: 'none', fontWeight: 600 }}>@hantleitalerz</a>
                </div>

                {/* Downsell per path: pokazuje się tylko gdy path ma dopasowany produkt */}
                {downsell && (
                  <>
                    <div style={{ height: 1, background: M.brd, margin: '0 10px 16px' }} />

                    <p style={{ textAlign: 'center', fontSize: 11, color: M.t4, marginBottom: 10 }}>
                      Nie jesteś jeszcze gotowy?
                    </p>
                    <a
                      href={downsell.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        textAlign: 'center', padding: '14px 14px', minHeight: 44,
                        background: 'transparent', border: `1.5px solid ${M.gold}40`, color: M.gold,
                        fontFamily: M.mono, fontSize: 10, fontWeight: 700, letterSpacing: 2,
                        textTransform: 'uppercase', textDecoration: 'none', borderRadius: 12,
                      }}
                    >
                      {downsell.label}
                    </a>
                    <p style={{ textAlign: 'center', fontSize: 10.5, color: M.t4, marginTop: 6, fontFamily: M.mono }}>
                      {downsell.tagline}
                    </p>
                  </>
                )}
              </div>
            </Reveal>

            {/* DM notification - personalizowany */}
            <Reveal delay={80}>
              <div style={{
                textAlign: 'center', padding: '20px 16px', marginBottom: 20,
                background: `${M.gold}08`,
                border: `1px solid ${M.gold}20`,
                borderRadius: 14, width: '100%', boxSizing: 'border-box',
              }}>
                <p style={{ fontSize: 13.5, color: M.t2, lineHeight: 1.65, fontWeight: 500, marginBottom: 6 }}>
                  {imie.trim() ? `${imie.trim()}, analizuję Twoje odpowiedzi.` : 'Analizuję Twoje odpowiedzi.'}
                </p>
                <p style={{ fontSize: 12.5, color: M.t3, lineHeight: 1.65, fontWeight: 400 }}>
                  Napiszę do Ciebie w DM <strong style={{ color: M.gold, fontWeight: 600 }}>@hantleitalerz</strong> w ciągu 24h z konkretną informacją zwrotną.
                  {SC >= 40 && <> A jeśli wypełnisz formularz na <strong style={{ color: M.gold }}>system.talerzihantle.com</strong> - dostaniesz pełną analizę + plan działania.</>}
                </p>
              </div>
            </Reveal>

            {/* DM pre-fill: szybki kontakt z gotowym tekstem */}
            <Reveal delay={50}>
              <div style={{ textAlign: 'center', marginBottom: 12, width: '100%' }}>
                <a
                  href={`https://ig.me/m/hantleitalerz?text=${encodeURIComponent(`Diagnostyka ${SC}/100, priorytet: ${path}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    // Track event: diag_dm_prefill
                    try {
                      const w = window as unknown as { dataLayer?: Array<Record<string, unknown>> };
                      if (w.dataLayer) {
                        w.dataLayer.push({ event: 'diag_dm_prefill', score: SC, path });
                      }
                    } catch {}
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '100%', padding: 16, textDecoration: 'none',
                    background: `linear-gradient(135deg, ${M.gold}18, ${M.gold}08)`,
                    border: `1.5px solid ${M.gold}40`,
                    color: M.gold,
                    fontFamily: M.mono, fontSize: 11, fontWeight: 700,
                    letterSpacing: 1.8, textTransform: 'uppercase', borderRadius: 12,
                    transition: 'all .2s ease', minHeight: 44,
                    boxShadow: `0 0 16px ${M.gold}10`,
                  }}
                  aria-label="Napisz w DM z gotową wiadomością"
                >
                  Napisz mi w DM, wynik już wpisany →
                </a>
                <div style={{ fontSize: 10, color: M.t4, fontFamily: M.mono, marginTop: 6, letterSpacing: 0.5 }}>
                  @hantleitalerz &middot; otwiera Instagram z gotowym tekstem
                </div>
              </div>
            </Reveal>

            {/* Share: skopiuj link */}
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

        {/* === FOOTER === */}
        <footer style={{ textAlign: 'center', padding: '24px 16px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, borderTop: `1px solid ${M.brd}` }}>
          <Logo />
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              href="https://easycart.pl/checkout/2fe7f473"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: M.mono, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: M.t4, textDecoration: 'none' }}
            >
              KONTRA
            </a>
            <span style={{ color: M.brd2 }}>|</span>
            <a
              href="https://easycart.pl/checkout/729ec3ec"
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
          <span style={{ fontFamily: M.mono, fontSize: 9.5, color: M.t4, letterSpacing: 1 }}>Diagnostyka &copy; 2026</span>
        </footer>

      </div>
    </>
  );
}
