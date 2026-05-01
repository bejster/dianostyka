'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

// ── Tracking: wysyłka eventów do n8n via sendBeacon ──
function trackEvent(event: string, data?: Record<string, unknown>) {
  try {
    const payload = {
      event,
      ...data,
      ts: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
    };
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        'https://n8n.srv1313512.hstgr.cloud/webhook/diagnostyka-events',
        JSON.stringify(payload)
      );
    }
  } catch (_e) {}
}

// ── Meta Pixel: bezpieczne wywolanie fbq (skrypt zaladowany w layout.tsx) ──
function fbqTrack(event: string, params?: Record<string, unknown>) {
  try {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { fbq?: (...args: unknown[]) => void };
    if (typeof w.fbq === 'function') {
      if (params) w.fbq('track', event, params);
      else w.fbq('track', event);
    }
  } catch (_e) {}
}

type SevKey = 'sleepQ' | 'screenBed' | 'stress' | 'energy' | 'dopamine' | 'dietChaos' | 'binge';
type ChipKey = 'fatigue' | 'mood' | 'libido' | 'belly' | 'brain' | 'anxiety' | 'joints' | 'skin' | 'motivation' | 'digest' | 'cravings' | 'recovery' | 'focus' | 'headaches' | 'sweating' | 'heartRate' | 'procrastination' | 'impatience' | 'memory' | 'confidence';

interface FD {
  age: number;
  sleep: number; sleepQ: number; screenBed: number; stress: number; energy: number;
  dopamine: number; dietChaos: number; junk: number; binge: number; wknd: number;
  drinks: number; cash: number; subs: number; lost: number; plan: number;
  miss: number; gym: number; rate: number; tags: Set<ChipKey>;
  wakeTime: number;     // godzina wstania (5-10)
  alarm: number;        // budzik: 0=sam, 1=budzik
  workHours: number;    // ile godzin pracy (6-14)
  progress: number;     // czujesz postępy: 0=tak, 1=trochę, 2=nie
  meals: number;        // ile posiłków (1-5)
  cooking: number;      // gotujesz: 0=tak, 1=mix, 2=zamawiam
  mondayFeel: number;   // poniedziałek rano: 0=ok, 1=średnio, 2=źle, 3=tragedia
  weekendWork: number;  // weekend wpływa na pracę: 0=nie, 1=czasem, 2=regularnie
  trainYears: number;   // ile lat trenuje (0-15)
  trainHappy: number;   // zadowolony z wyników: 0=tak, 1=nie do końca, 2=nie
  trainPlan: number;    // ma plan: 0=tak, 1=improwizuje
  triedBefore: number;  // próbował zmienić sam: 0=nie, 1=raz-dwa, 2=wiele razy
  frustration: number;  // co frustruje: 0=brak wyników, 1=brak energii, 2=brak czasu, 3=brak konsekwencji
}

const INIT: FD = {
  age: 28,
  sleep: 7, sleepQ: 0, screenBed: 0, stress: 0, energy: 0, dopamine: 0,
  dietChaos: 0, junk: 0, binge: 0, wknd: 1, drinks: 0, cash: 0,
  subs: 0, lost: 0, plan: 0, miss: 0, gym: 150, rate: 60,
  tags: new Set(),
  wakeTime: 7, alarm: 1, workHours: 8, progress: 1, meals: 3, cooking: 1,
  mondayFeel: 1, weekendWork: 1, trainYears: 3, trainHappy: 1, trainPlan: 1,
  triedBefore: 1, frustration: 1,
};

const SECTIONS = ['Sen', 'Stres', 'Żywienie', 'Weekend', 'Trening', 'Sygnały', 'Głowa'];

// Wagi objawów - im poważniejszy symptom, tym wyższy wpływ na score i koszt
// Koszt: szacunek konsekwencji finansowych na 6 miesięcy (suplementy, wizyty, utracona produktywność)
// Waga score: wpływ na łączny wynik (1.0 = bazowy, 2.0 = podwójny)
const TAG_WEIGHTS: Record<ChipKey, { cost: number; scoreW: number }> = {
  fatigue:   { cost: 500, scoreW: 1.8 },   // chroniczne zmęczenie - wpływa na wszystko, dużo suplementów/kaw
  mood:      { cost: 400, scoreW: 1.5 },   // wahania nastroju - wizyty psycholog, gorsze decyzje
  libido:    { cost: 600, scoreW: 2.0 },   // spadek libido - mocny marker hormonalny, endokrynolog
  belly:     { cost: 450, scoreW: 1.6 },   // brzuch nie schodzi - insulinooporność, diety, suplementy
  brain:     { cost: 550, scoreW: 1.8 },   // mgła mózgowa - utracona produktywność, neurolog
  anxiety:   { cost: 500, scoreW: 1.7 },   // lęki - psychiatra/psycholog, suplementy, CBD
  joints:    { cost: 350, scoreW: 1.2 },   // bóle stawów - fizjoterapeuta, suplementy kolagen/MSM
  skin:      { cost: 250, scoreW: 1.0 },   // skóra - dermatolog, kosmetyki, cynk
  motivation:{ cost: 450, scoreW: 1.6 },   // brak motywacji - dopamina, utracone szanse
  digest:    { cost: 350, scoreW: 1.3 },   // trawienie - gastroenterolog, probiotyki, dieta eliminacyjna
  cravings:  { cost: 300, scoreW: 1.2 },   // głód na słodycze - insulinooporność, gorsze żywienie
  recovery:  { cost: 400, scoreW: 1.4 },   // wolna regeneracja - zmarnowane treningi, suplementy
  focus:     { cost: 500, scoreW: 1.7 },   // koncentracja - utracona produktywność, nootropiki
  headaches: { cost: 400, scoreW: 1.3 },   // bóle głowy - leki, wizyty, absencja w pracy
  sweating:  { cost: 300, scoreW: 1.2 },   // nocne poty - zaburzony sen, testy hormonalne
  heartRate: { cost: 450, scoreW: 1.5 },   // podwyższone tętno - kardiolog, stres, substancje
  procrastination: { cost: 450, scoreW: 1.6 }, // prokrastynacja - utracona produktywność, gorsze decyzje
  impatience: { cost: 300, scoreW: 1.3 },      // brak cierpliwości - impulsywne decyzje, porzucanie planów
  memory: { cost: 500, scoreW: 1.8 },          // słabsza pamięć - neuroplastyczność, hipokamp
  confidence: { cost: 400, scoreW: 1.5 },      // mniejsza pewność siebie - gorsze decyzje zawodowe
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
  // ── TWARDE KOSZTY - wydajesz wprost, weryfikowalne ──
  const wkndCost = Math.round((D.cash + D.subs) * D.wknd * 6);
  const foodCost = Math.round(D.junk * 6 + (D.binge >= 3 ? 300 : 0));
  const trainCost = D.plan > 0 ? Math.round(D.gym * 6 * Math.min(D.miss / D.plan, 1)) : 0;
  // Sen: kompensacja deficytu - kawa, suplementy, gorsze decyzje zakupowe (Cappuccio 2010)
  const sleepCostRaw = D.sleep < 7 ? Math.round((7.5 - D.sleep) * 140 * 6) : 0;
  const sleepCost = D.sleep >= 6.5 ? Math.round(sleepCostRaw * 0.5) : sleepCostRaw;

  // ── UKRYTE KOSZTY - szacunek oparty na badaniach naukowych ──
  // Produktywność: mgła x stawka x 26 tyg. (RAND 2016: <6h snu = -2.4% GDP; Hemp HBR 2004: praca w obniżonej formie 3x droższa niż absencja)
  const wkndScale = Math.min(D.wknd / 2, 1); // skalowanie dla rzadko imprezujących
  const prodCost = Math.round(D.lost * 26 * D.rate * wkndScale);
  // Stagnacja: treningi bez progresu bo fundamenty nie grają
  const brakes = [
    D.sleepQ >= 2 || D.sleep < 6.5,       // kiepski sen / za mało snu
    D.dietChaos >= 2 || D.binge >= 2,      // chaos w żywieniu
    D.stress >= 3 || D.energy >= 3,        // wysoki stres / wypalenie
    D.drinks > 5 || D.subs > 0,           // alkohol / substancje
    D.dopamine >= 3,                       // rozregulowana dopamina
  ].filter(Boolean).length;
  const wastedPct = Math.min(brakes * 12 * Math.min(D.wknd / 2, 1), 60);
  const wastedSessions = D.plan > 0 ? Math.round(D.plan * 26 * wastedPct / 100) : 0;
  const stagnationMonths = Math.round(brakes * 1.5 * Math.min(D.wknd / 2, 1) * 10) / 10;
  const costPerSession = D.plan > 0 ? D.gym / (D.plan * 4) : 0;
  const stagnationCost = Math.round(wastedSessions * (costPerSession + 1.25 * Math.max(D.rate * 0.2, 10)) * wkndScale);
  // Symptomy: ważony koszt - każdy objaw ma inną wagę (250-600 zł / 6 mies.)
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
  // Ważony score - AGRESYWNY scoring, typowy user 40-55% potencjału
  // Max possible: 20+25+15+20+18+15+12 = 125, capped at 100
  const tagScore = tagScoreWeighted(D.tags);
  const s =
    // Sen (max 20): sleep 5h + bad quality + phone = 20
    Math.min(((D.sleepQ + D.screenBed) / 4 + (7.5 - Math.min(D.sleep, 7.5))) * 6, 20)
    // Stres (max 25): stress 3 + energy 3 + dopamine 3 = 25
    + Math.min((D.stress + D.energy + D.dopamine) * 2.8, 25)
    // Dieta (max 15): chaos 3 + binge 3 = 15
    + Math.min((D.dietChaos + D.binge) * 2.5, 15)
    // Weekend (max 20): drinks 10+ = 14, subs = +6
    + Math.min(D.drinks * 1.4 + (D.subs > 0 ? 6 : 0), 20)
    // Trening (max 18): miss 3 + unhappy + no plan = 18
    + Math.min(D.miss * 4 + (D.trainHappy >= 1 ? 5 : 0) + (D.trainPlan >= 1 ? 3 : 0), 18)
    // Sygnaly (max 15): 5+ tags = 15
    + Math.min(tagScore * 1.5, 15)
    // Glowa (max 12): no progress + long hours + bad monday + tried before
    + Math.min((D.progress >= 2 ? 5 : D.progress >= 1 ? 2 : 0) + (D.workHours > 9 ? 3 : D.workHours > 8 ? 1 : 0) + (D.mondayFeel >= 2 ? 3 : D.mondayFeel >= 1 ? 1 : 0) + (D.triedBefore >= 2 ? 3 : D.triedBefore >= 1 ? 1 : 0), 12);
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
  mono: "'Inter', system-ui, -apple-system, sans-serif",
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
    if (prefersReduced) {
      const id = requestAnimationFrame(() => setVal(target));
      return () => cancelAnimationFrame(id);
    }
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

// ── KOMPONENT: Animowane niebo z gwiazdami ──
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

    // Konfiguracja gwiazd - subtelne, ledwo widoczne w tle
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

    // Typy gwiazd - różne rozmiary i jasności
    interface Star {
      x: number; y: number;
      r: number;          // promień
      baseAlpha: number;  // bazowa jasność
      twinkleSpeed: number; // prędkość migotania
      twinklePhase: number; // faza migotania
      color: string;        // odcień gwiazdy
    }

    // Kolory gwiazd - głównie białe, kilka z lekkim odcieniem
    const starColors = [
      '255,255,255',   // biała (dominujące)
      '255,255,255',   // biała
      '255,255,255',   // biała
      '230,240,255',   // lekko niebieska
      '255,245,230',   // lekko ciepła
    ];

    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => {
      const sizeRand = Math.random();
      // Normalne rozmiary, ale przyciemnione - subtelne tło
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

      // Spadające gwiazdy - tworzenie
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

      // Spadające gwiazdy - renderowanie
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
        background: `linear-gradient(90deg, ${M.goldDim}, ${M.gold}, #e8cc80)`,
        transition: 'width 0.1s linear',
        boxShadow: `0 0 10px ${M.gold}60, 0 0 20px ${M.gold}30`,
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
  const [utmSource, setUtmSource] = useState('');
  const [utmProblem, setUtmProblem] = useState('');
  const [countersActive, setCountersActive] = useState(false); // uruchom liczniki po wejściu w wyniki
  const [showDetails, setShowDetails] = useState(false); // collapsible cost breakdown
  const [showBadania, setShowBadania] = useState(false); // collapsible blood tests
  const [showProgresja, setShowProgresja] = useState(false); // collapsible progression timeline
  const [showHormony, setShowHormony] = useState(false); // collapsible hormones
  const [showStickyCta, setShowStickyCta] = useState(false); // sticky CTA po scrollu
  const [secTransition, setSecTransition] = useState<'idle' | 'out-left' | 'out-right' | 'in'>('idle'); // animacja przejscia sekcji
  const topRef = useRef<HTMLDivElement>(null);

  // Efekt wejścia hero + tracking startu + UTM
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    trackEvent('diag_started');
    // Pixel: ViewContent - lead zaczyna formularz diagnostyki
    fbqTrack('ViewContent', { content_name: 'diagnostyka_start', content_category: 'lead_gen' });
    // Odczytaj UTM z URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const src = params.get('utm_source') || '';
      const prob = params.get('problem') || '';
      if (src) setUtmSource(src);
      if (prob) setUtmProblem(prob);
    }
    return () => clearTimeout(t);
  }, []);

  // Uruchom liczniki animowane przy przejściu do wyników + tracking + sticky CTA
  useEffect(() => {
    if (phase === 'results') {
      const sc = score(D);
      trackEvent('diag_results_view', { score: sc });
      const t = setTimeout(() => setCountersActive(true), 400);
      // Sticky CTA - pokaż po scrollu 400px
      const onScroll = () => {
        setShowStickyCta(window.scrollY > 400);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); };
    }
    return undefined;
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const upd = (k: keyof FD, v: number) => setD(p => ({ ...p, [k]: v }));
  const sev = (k: SevKey, v: number) => setD(p => ({ ...p, [k]: v }));
  const tog = (t: ChipKey) => setD(p => {
    const tags = new Set(p.tags); tags.has(t) ? tags.delete(t) : tags.add(t);
    return { ...p, tags };
  });

  const go = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (sec < SECTIONS.length - 1) {
      setSecTransition('out-left');
      setTimeout(() => {
        const nextSec = sec + 1;
        trackEvent('diag_section', { section: SECTIONS[nextSec], step: nextSec + 1 });
        setSec(nextSec);
        setSecTransition('in');
        setTimeout(() => setSecTransition('idle'), 400);
      }, 250);
    } else {
      trackEvent('diag_gate_view');
      // Pixel: Lead - lead doszedl do email gate (skonczyl 7 sekcji formularza)
      fbqTrack('Lead', { content_name: 'diagnostyka_gate', content_category: 'lead_gen' });
      setPhase('gate');
    }
  };
  const back = () => {
    setSecTransition('out-right');
    setTimeout(() => {
      setSec(s => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSecTransition('in');
      setTimeout(() => setSecTransition('idle'), 400);
    }, 250);
  };

  const submit = async () => {
    // Walidacja IG handle
    const handle = igHandle.trim().replace(/^@/, '');
    if (!handle) { setIgErr('Podaj nick na Instagramie'); return; }
    // Walidacja email - RFC 5322 uproszczony
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setEmailErr('Podaj poprawny email'); return; }
    setLoading(true);
    const c = costs(D); const sc = score(D);
    // Oblicz metryki biologiczne na potrzeby payloadu
    // Payload bioAge - zsynchronizowany z display bioAge (realistyczne +3-7)
    const pBioAge = (() => {
      let penalty = 0;
      if (D.sleep < 5.5) penalty += 3;
      else if (D.sleep < 6) penalty += 2;
      else if (D.sleep < 6.5) penalty += 1.5;
      else if (D.sleep < 7) penalty += 0.5;
      if (D.sleepQ >= 2) penalty += 1;
      if (D.screenBed >= 2) penalty += 0.5;
      if (D.stress >= 3) penalty += 2.5;
      else if (D.stress >= 2) penalty += 1.5;
      if (D.drinks > 10) penalty += 2.5;
      else if (D.drinks > 6) penalty += 1.5;
      else if (D.drinks > 3) penalty += 1;
      if (D.subs > 0) penalty += 2;
      if (D.energy >= 3) penalty += 1.5;
      else if (D.energy >= 2) penalty += 0.5;
      if (D.dopamine >= 3) penalty += 1;
      if (D.dietChaos >= 2) penalty += 1;
      if (D.binge >= 2) penalty += 0.5;
      if (D.miss >= 2) penalty += 0.5;
      if (D.workHours >= 12) penalty += 1;
      else if (D.workHours >= 10) penalty += 0.5;
      if (D.mondayFeel >= 3) penalty += 1;
      else if (D.mondayFeel >= 2) penalty += 0.5;
      if (D.meals <= 1) penalty += 0.5;
      return Math.round((D.age + penalty + Math.min(D.tags.size * 0.25, 2)) * 10) / 10;
    })();
    // Payload cognitive - zsynchronizowany z display cognitive
    const pCognitive = (() => {
      let pct = 100;
      if (D.sleep < 5.5) pct -= 28;
      else if (D.sleep < 6) pct -= 22;
      else if (D.sleep < 6.5) pct -= 15;
      else if (D.sleep < 7) pct -= 10;
      if (D.sleepQ >= 2) pct -= 5;
      if (D.stress >= 3) pct -= 35;
      else if (D.stress >= 2) pct -= 18;
      if (D.dopamine >= 3) pct -= 22;
      else if (D.dopamine >= 2) pct -= 10;
      if (D.drinks > 10) pct -= 18;
      else if (D.drinks > 6) pct -= 12;
      else if (D.drinks > 3) pct -= 6;
      if (D.subs > 0) pct -= 15;
      if (D.energy >= 3) pct -= 8;
      if (D.miss >= 2) pct -= 6;
      if (D.tags.has('brain')) pct -= 6;
      if (D.tags.has('focus')) pct -= 6;
      if (D.workHours >= 12) pct -= 12;
      else if (D.workHours >= 10) pct -= 7;
      if (D.progress === 2) pct -= 6;
      if (D.mondayFeel >= 3) pct -= 8;
      else if (D.mondayFeel >= 2) pct -= 5;
      if (D.tags.has('memory')) pct -= 6;
      if (D.tags.has('procrastination')) pct -= 4;
      if (D.screenBed >= 2) pct -= 4;
      return Math.max(pct, 15);
    })();
    const pBrainAge = (() => {
      let penalty = 0;
      if (D.sleep < 6) penalty += 4; else if (D.sleep < 7) penalty += 2;
      if (D.stress >= 3) penalty += 3; else if (D.stress >= 2) penalty += 1.5;
      if (D.dopamine >= 3) penalty += 3; else if (D.dopamine >= 2) penalty += 1;
      if (D.drinks > 8) penalty += 2.5; else if (D.drinks > 4) penalty += 1;
      if (D.subs > 0) penalty += 3;
      if (D.tags.has('brain')) penalty += 1;
      if (D.tags.has('focus')) penalty += 1;
      if (D.tags.has('headaches')) penalty += 0.5;
      if (D.miss >= 2) penalty += 1;
      if (D.tags.has('memory')) penalty += 1;
      if (D.tags.has('procrastination')) penalty += 0.5;
      return Math.round((D.age + penalty) * 10) / 10;
    })();
    // Tracking: email gate submit
    trackEvent('diag_gate_submit', { email });
    const finalHandle = '@' + handle;
    const odpowiedzi = {
      sleep: D.sleep, sleepQ: D.sleepQ, screenBed: D.screenBed,
      wakeTime: D.wakeTime, alarm: D.alarm,
      stress: D.stress, energy: D.energy, dopamine: D.dopamine,
      workHours: D.workHours, progress: D.progress,
      dietChaos: D.dietChaos, junk: D.junk, binge: D.binge,
      meals: D.meals, cooking: D.cooking,
      wknd: D.wknd, drinks: D.drinks, cash: D.cash, subs: D.subs,
      mondayFeel: D.mondayFeel, weekendWork: D.weekendWork,
      lost: D.lost, plan: D.plan, miss: D.miss, gym: D.gym,
      trainYears: D.trainYears, trainHappy: D.trainHappy, trainPlan: D.trainPlan,
      rate: D.rate, tags: Array.from(D.tags),
      triedBefore: D.triedBefore, frustration: D.frustration,
    };
    const biggest = catData.reduce((a, b) => a.v > b.v ? a : b, catData[0]);
    const payloadBlocked = Math.min(sc, 85);
    // Oblicz segment (GORACY/CIEPELY/ZIMNY) i routed product do payloadu
    const segment = sc > 60 ? 'GORACY' : sc > 40 ? 'CIEPELY' : 'ZIMNY';
    // Najgorsza kategoria wg catScores (zsynchronizowane z CTA routing)
    const pCatScores = [
      { label: 'Sen', pct: Math.max(100 - Math.round(((D.sleepQ + D.screenBed) / 6 + (7.5 - Math.min(D.sleep, 7.5)) / 1.5) * 55), 5) },
      { label: 'Stres', pct: Math.max(100 - Math.round(((D.stress + D.energy + (D.workHours > 9 ? 1 : 0)) / 7) * 100), 5) },
      { label: 'Żywienie', pct: Math.max(100 - Math.round(((D.dietChaos + D.binge + (D.meals <= 1 ? 1 : 0)) / 7) * 100), 5) },
      { label: 'Weekend', pct: Math.max(100 - Math.round((D.drinks / 12) * 65 + (D.subs > 0 ? 35 : 0)), 5) },
      { label: 'Trening', pct: Math.max(100 - Math.round(((D.miss * 1.5 + (D.trainHappy >= 1 ? 1 : 0)) / 4) * 100), 5) },
      { label: 'Głowa', pct: Math.max(100 - Math.round((tagScoreWeighted(D.tags) / 10) * 90), 5) },
    ];
    const worstCatP = pCatScores.reduce((a, b) => a.pct < b.pct ? a : b, pCatScores[0]);
    // Routed product - diagnostyka ZAWSZE kieruje na system (coaching page z formularzem)
    // Sprzedaz produktow per sciezka odbywa sie w DM po formularzu, nie na diagnostyce
    const routedProduct = 'system_coaching';
    // PRIORITY FLAG - proxy dla HOT+WYSOKI budget (per Council recommendation)
    // Bez dodatkowego pytania - wyliczane z istniejacych odpowiedzi
    const commitmentProxy = (D.triedBefore >= 2 ? 2 : D.triedBefore) + (D.frustration >= 3 ? 2 : D.frustration >= 1 ? 1 : 0);
    const budgetProxy = (c.hardTotal >= 3000 ? 3 : c.hardTotal >= 1500 ? 2 : 1);
    const priorityLead = sc >= 60 && commitmentProxy >= 3 && budgetProxy >= 2;
    const payload = {
      instagram_handle: finalHandle,
      email,
      imie: imie.trim() || null,
      wynik_kwota: String(c.total),
      wynik_score: String(sc),
      wynik_potencjal: String(payloadBlocked),
      wynik_niewykorzystany: String(Math.max(100 - sc, 15)),
      wynik_potential: String(100 - sc),
      wynik_bio_age: String(pBioAge),
      wynik_brain_age: String(pBrainAge),
      wynik_cognitive: String(pCognitive),
      wynik_hamulce: String(c.brakes),
      wynik_badania_count: String(badaniaUnique.length),
      wynik_badania_priorytet: badaniaWysoki.map(b => b.nazwa).join(', '),
      biggest_category: biggest?.l || '',
      segment,
      worst_category: worstCatP.label,
      routed_product: routedProduct,
      // Priority routing fields (dla n8n priority_lead switch node)
      severity_score: sc,
      commitment_proxy: commitmentProxy,
      budget_proxy: budgetProxy,
      priority_lead: priorityLead,
      priority_tag: priorityLead ? 'segment_priority_1on1' : `segment_${segment.toLowerCase()}`,
      timestamp: new Date().toISOString(),
      source: 'diagnostyka_hit',
      utm_source: utmSource || null,
      hormony_problem: utmProblem || null,
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
          // Retry po 1.5s - max 2 próby
          await new Promise(r => setTimeout(r, 1500));
          return sendPayload(data, retryCount + 1);
        }
        // Po 3 nieudanych próbach - zapisz do sessionStorage
        try { sessionStorage.setItem('diag_lead_retry', JSON.stringify(data)); } catch {}
        return false;
      }
    };
    await sendPayload(payload);
    // Telegram notification usunięta - n8n workflow (SK powiadomienia) obsługuje to przez /api/subscribe
    // Backup: wyslij do unified-leads (Notion + Telegram + MailerLite)
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(
          'https://n8n.srv1313512.hstgr.cloud/webhook/unified-leads',
          JSON.stringify({
            event: 'diagnostyka_lead',
            name: payload.imie || '',
            email: payload.email || '',
            ig: payload.instagram_handle || '',
            scores: { overall: payload.wynik_score, categories: payload.biggest_category, potential: payload.wynik_potential, bioAge: payload.wynik_bio_age, brainAge: payload.wynik_brain_age, cognitive: payload.wynik_cognitive },
            utm_source: utmSource || null,
            hormony_problem: utmProblem || null,
            ts: new Date().toISOString(),
          })
        );
      }
    } catch (_e) {}
    // Pixel: CompleteRegistration - lead skonczyl diagnostyke (zapisany do MailerLite + n8n)
    fbqTrack('CompleteRegistration', {
      content_name: 'diagnostyka_complete',
      status: priorityLead ? 'priority' : segment.toLowerCase(),
      value: sc,
      currency: 'PLN',
    });
    // Zawsze pokaż wyniki - lead jest zapisany w sessionStorage na wypadek retry
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

  // Before/after comparison - szacunek oszczednosci po 3 miesiacach w systemie
  const optimizedCost = Math.round(C.total * 0.3);
  const savings = C.total - optimizedCost;

  // Priorytet #1 - poglebia problem, nie daje rozwiazan. Pokazuje DLACZEGO sam tego nie naprawisz.
  const priority = (() => {
    const areas = [
      { area: 'Sen', score: (D.sleepQ + D.screenBed + Math.max(0, 7.5 - D.sleep) * 1.5), action: D.sleep < 6 ? `Śpisz ${D.sleep}h. Mózg nie ma czasu na oczyszczanie z toksyn metabolicznych, beta-amyloidu, produktów zapalnych. Rano rozbity, po południu zjazd, wieczorem scrollujesz, bo dopamina nie doszła do normy. Samego snu nie wydłużysz, dopóki nie ruszysz trzech rzeczy naraz: światła rano, ekranu przed spaniem i kortyzolu w ciągu dnia.` : `${D.sleep}h w łóżku nie znaczy ${D.sleep}h snu. Architektura snu zmienia proporcje faz. Głęboki sen odpowiada za 80% wydzielania hormonu wzrostu. Kortyzol, ekrany, alkohol skracają tę fazę nawet przy 8h w pościeli. Jesteś w łóżku, regeneracja zatrzymuje się w połowie.`, impact: 'Każda noc pogarsza parametry' },
      { area: 'Stres', score: (D.stress * 2 + D.energy + (D.workHours > 9 ? 2 : 0) + (D.mondayFeel >= 2 ? 1 : 0)), action: `Chroniczny kortyzol nie spada sam. Organizm przyzwyczaił się do tego poziomu i traktuje go jako bazę. Kortyzol i testosteron walczą o ten sam prekursor, pregnenolon. Kortyzol wygrywa, testosteron leci w dół. Mniej masy, gorsze libido, wolniejsza regeneracja. Ruszysz sam stres i zobaczysz, że sen się nie dogania, bo osie hormonalne są ze sobą spięte.`, impact: 'Sabotuje resztę parametrów' },
      { area: 'Alkohol', score: (D.drinks / 2 + (D.subs > 0 ? 4 : 0)), action: D.drinks > 8 ? `${D.drinks} drinków = 12-18h detoksyfikacji wątroby. W tym czasie synteza białek mięśniowych stoi, kortyzol jest podwyższony, jelita przepuszczają endotoksyny do krwi. Następny weekend przychodzi zanim organizm wrócił do normy. Samego picia nie odstawisz na zero, potrzebujesz protokołu osłonowego przed, w trakcie i po.` : `Nawet umiarkowane picie obniża testosteron na 72h i niszczy fazę REM. Aromataza w tkance tłuszczowej szybciej przekształca testosteron w estradiol pod wpływem alkoholu. Mniej T, więcej E2, gorsze proporcje. W lustrze nie widzisz, widzisz za 6 miesięcy.`, impact: 'Cofasz się co tydzień' },
      { area: 'Żywienie', score: (D.dietChaos * 1.5 + D.binge + (D.meals <= 1 ? 2 : 0)), action: `Jedzenie bez rytmu powoduje skoki insuliny co 2-3h. Przy podwyższonej insulinie enzym lipaza jest zablokowany, organizm nie spala tłuszczu. Greliny i leptyny tracą synchronizację, mózg przestaje odróżniać głód od nudy. Jesz nie za dużo, jesz na złym zegarze.`, impact: 'Blokuje spalanie i hormony' },
      { area: 'Dopamina', score: (D.dopamine * 2 + (D.screenBed >= 2 ? 1 : 0)), action: `Receptory D2 są zregulowane w dół. Scrollowanie, substancje, jedzenie dają coraz mniej kopa. Ten sam mechanizm co tolerancja na używki. Dopamina napędza motywację do treningu, dyscyplinę przy jedzeniu, jakość snu. Kiedy jest wypalona, sypie się wszystko naraz. Samego detoksu dopaminowego nie starczy, potrzeba jednoczesnej korekty snu, kortyzolu i aktywności.`, impact: 'Niszczy motywację i dyscyplinę' },
      { area: 'Trening', score: (D.miss * 2 + (D.trainHappy >= 1 ? 1 : 0) + (D.trainPlan >= 1 ? 1 : 0)), action: D.miss >= 2 ? `Opuszczasz treningi, bo organizm nie ma z czego regenerować. Przy rozjechanym kortyzolu, niedoborze snu i wypalonej dopaminie każdy trening bierze więcej, niż daje. Efekt: trenujesz, nic nie widzisz, motywacja leci, siłownia odpada. Lepszy plan treningowy tego nie ruszy. Pracuje się nad godzinami między treningami.` : `Trenujesz regularnie, a wyników brak. Trening to 4-5h tygodniowo. Pozostałe 163h decydują, czy cokolwiek z tej pracy zostanie. Kortyzol, sen, żywienie, regeneracja hormonalna. Bez tego trenujesz na 30-40% efektywności. Nie potrzebujesz nowego planu, potrzebujesz naprawić godziny poza siłownią.`, impact: 'Wysiłek bez efektów' },
    ];
    const worst = areas.sort((a, b) => b.score - a.score)[0];
    return worst;
  })();

  const hormones: { n: string; a: string; i: string; c: string }[] = [];
  if (D.sleep < 6.5 || D.sleepQ >= 3) hormones.push({ n: 'HGH', a: '↓', i: 'Obniżona regeneracja', c: M.org });
  if (D.drinks > 5 || D.subs > 0 || D.tags.has('libido')) hormones.push({ n: 'Testosteron', a: '↓', i: D.drinks > 10 || D.subs > 0 ? 'Mocny spadek' : 'Spadek', c: D.drinks > 10 || D.subs > 0 ? M.red : M.org });
  if (D.stress >= 3 || D.sleepQ >= 3) hormones.push({ n: 'Kortyzol', a: '↑', i: 'Chronicznie wysoki', c: M.red });
  if (D.dopamine >= 3 || D.tags.has('motivation')) hormones.push({ n: 'Dopamina', a: '⚡', i: 'Desensytyzacja', c: M.red });
  if (D.tags.has('mood') || D.subs > 0) hormones.push({ n: 'Serotonina', a: '↓', i: D.subs > 0 ? 'Wyczerpanie' : 'Spadek', c: D.subs > 0 ? M.red : M.org });
  if (D.tags.has('belly') || D.binge >= 3) hormones.push({ n: 'Insulina', a: '↑', i: 'Insulinooporność', c: M.org });
  if (D.sleepQ >= 3 || D.screenBed >= 3) hormones.push({ n: 'Melatonina', a: '↓', i: 'Zaburzony cykl', c: M.org });
  if (D.tags.has('heartRate') || (D.stress >= 3 && D.subs > 0)) hormones.push({ n: 'Adrenalina', a: '↑', i: 'Układ sympatyczny non-stop', c: M.red });

  // Zalecane badania krwi - ZERO hardcoded defaults, wszystko pod konkretne sygnały
  const badania: { nazwa: string; dlaczego: string; priorytet: 'wysoki' | 'sredni' }[] = [];

  // Morfologia - baseline, ale tylko jeśli user ma jakikolwiek sygnał do interpretacji
  const hasAnySignal = D.tags.size >= 1 || D.stress >= 2 || D.energy >= 2 || D.sleep < 7 || D.drinks > 5 || D.subs > 0 || D.miss > 0 || D.binge >= 2 || D.dopamine >= 2;
  if (hasAnySignal) {
    badania.push({ nazwa: 'Morfologia z rozmazem', dlaczego: 'Punkt startowy: stan zapalny, anemia, odporność. Reszta interpretuje się w kontekście tego wyniku.', priorytet: 'wysoki' });
  }

  // Testosteron całkowity + wolny - tylko gdy sygnały męskie
  const tSignals: string[] = [];
  if (D.tags.has('libido')) tSignals.push('libido');
  if (D.tags.has('mood')) tSignals.push('nastrój');
  if (D.tags.has('belly')) tSignals.push('sylwetka');
  if (D.trainYears >= 2 && D.trainHappy >= 1) tSignals.push('brak efektów z treningu');
  if (D.sleep < 6.5) tSignals.push('regeneracja');
  if (D.drinks > 8 || D.subs > 0) tSignals.push('obciążenie wątroby');
  if (tSignals.length >= 1) {
    badania.push({ nazwa: 'Testosteron całkowity + wolny', dlaczego: `Twoje sygnały (${tSignals.slice(0, 3).join(', ')}) wskazują, że T trzeba zmierzyć w pierwszej kolejności.`, priorytet: 'wysoki' });
  }

  // SHBG - TYLKO gdy trenujesz długo bez efektu LUB problem z libido/formą przy normalnym T
  if ((D.trainYears >= 3 && D.trainHappy >= 1) || (D.tags.has('libido') && D.tags.has('belly'))) {
    badania.push({ nazwa: 'SHBG', dlaczego: 'Często wysoki u facetów, którzy trenują długo, a efektów brak. Wiąże wolny testosteron, więc wynik T „w normie” nie znaczy, że organizm go używa.', priorytet: 'wysoki' });
  }

  // Sen
  if (D.sleep < 6.5 || D.sleepQ >= 2) {
    badania.push({ nazwa: 'Kortyzol (poranny, godz. 8:00)', dlaczego: 'Deficyt snu = podwyższony kortyzol, który sabotuje regenerację i testosteron', priorytet: 'wysoki' });
    badania.push({ nazwa: 'Magnez (Mg) w erytrocytach', dlaczego: 'Niedobór magnezu = gorszy sen, skurcze, wyższy kortyzol. 80% mężczyzn ma niedobór', priorytet: 'sredni' });
    badania.push({ nazwa: 'Prolaktyna', dlaczego: 'Zaburzenia snu mogą podnosić prolaktynę, która hamuje testosteron', priorytet: 'sredni' });
  }

  // Stres / energia / wypalenie
  if (D.stress >= 2 || D.energy >= 2) {
    badania.push({ nazwa: 'TSH + fT3 + fT4', dlaczego: 'Tarczyca reguluje metabolizm i energię. Stres ją hamuje - subkliniczne niedoczynności są częste', priorytet: 'wysoki' });
    badania.push({ nazwa: 'Ferrytyna', dlaczego: 'Niedobór żelaza = zmęczenie, mgła, słaba regeneracja. Norma "ok" to nie norma optymalna', priorytet: 'wysoki' });
    badania.push({ nazwa: 'DHEA-S', dlaczego: 'Hormon anty-stresowy - jeśli niski, organizm przegrywa z kortyzolem', priorytet: 'sredni' });
    if (!badania.some(b => b.nazwa.includes('Kortyzol'))) {
      badania.push({ nazwa: 'Kortyzol (poranny, godz. 8:00)', dlaczego: 'Chroniczny stres = oś HPA rozregulowana. Kortyzol powinien być wysoki rano i niski wieczorem', priorytet: 'wysoki' });
    }
  }

  // Alkohol / substancje
  if (D.drinks > 5 || D.subs > 0) {
    badania.push({ nazwa: 'AST + ALT + GGTP', dlaczego: `${D.drinks > 10 ? D.drinks + ' drinków' : D.subs > 0 ? 'Substancje' : 'Alkohol'} obciąża wątrobę. GGTP - najbardziej czuły marker uszkodzenia alkoholowego`, priorytet: 'wysoki' });
    badania.push({ nazwa: 'Bilirubina całkowita', dlaczego: 'Marker wydolności wątroby - podwyższona przy przeciążeniu toksynami', priorytet: 'sredni' });
    badania.push({ nazwa: 'Estradiol (E2)', dlaczego: 'Alkohol zwiększa aromatyzację testosteronu do estrogenów. Więcej E2 = mniej T', priorytet: 'wysoki' });
    if (D.subs > 0) {
      badania.push({ nazwa: 'Prolaktyna', dlaczego: 'Substancje zaburzają oś dopaminową. Podwyższona prolaktyna = spadek libido, motywacji i T', priorytet: 'sredni' });
      badania.push({ nazwa: 'Witamina B12 + kwas foliowy', dlaczego: 'Substancje i alkohol niszczą zapasy wit. B - kluczowe dla układu nerwowego i energii', priorytet: 'wysoki' });
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
    badania.push({ nazwa: 'Insulina na czczo + glukoza', dlaczego: 'Obliczenie HOMA-IR - wczesny marker insulinooporności, zanim cukier będzie "za wysoki"', priorytet: 'wysoki' });
    badania.push({ nazwa: 'HbA1c (hemoglobina glikowana)', dlaczego: 'Średni poziom cukru z ostatnich 3 miesięcy - lepszy obraz niż jednorazowa glukoza', priorytet: 'sredni' });
    badania.push({ nazwa: 'Lipidogram rozszerzony', dlaczego: 'Cholesterol, triglicerydy, LDL/HDL - pełen obraz ryzyka metabolicznego', priorytet: 'sredni' });
  }

  // Mgła mózgowa / koncentracja
  if (D.tags.has('brain') || D.tags.has('focus')) {
    if (!badania.some(b => b.nazwa.includes('Ferrytyna'))) {
      badania.push({ nazwa: 'Ferrytyna', dlaczego: 'Niedobór żelaza to najczęstsza przyczyna „mgły mózgowej" u mężczyzn. Optymalna: 80-150 ng/ml', priorytet: 'wysoki' });
    }
    badania.push({ nazwa: 'Witamina D3 (25-OH)', dlaczego: 'Niedobór wit. D = gorsze funkcje kognitywne, spadek nastroju, słabsza odporność. 80% Polaków ma niedobór', priorytet: 'wysoki' });
    badania.push({ nazwa: 'hsCRP (białko C-reaktywne)', dlaczego: 'Marker przewlekłego stanu zapalnego - stan zapalny w mózgu wpływa na koncentrację i energię', priorytet: 'sredni' });
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
    badania.push({ nazwa: 'HbA1c (hemoglobina glikowana)', dlaczego: 'Głód na słodycze może wskazywać na wahania cukru. HbA1c pokaże średni poziom z 3 miesięcy', priorytet: 'sredni' });
    if (!badania.some(b => b.nazwa.includes('Insulina'))) {
      badania.push({ nazwa: 'Insulina na czczo + glukoza', dlaczego: 'Głód na słodycze często = reaktywna hipoglikemia lub początkowa insulinooporność', priorytet: 'wysoki' });
    }
  }

  // Bóle głowy
  if (D.tags.has('headaches')) {
    if (!badania.some(b => b.nazwa.includes('Magnez'))) {
      badania.push({ nazwa: 'Magnez (Mg) w erytrocytach', dlaczego: 'Niedobór magnezu to częsta przyczyna bólów głowy i migren. Suplementacja Mg zmniejsza częstotliwość o 40%', priorytet: 'wysoki' });
    }
    if (!badania.some(b => b.nazwa.includes('hsCRP'))) {
      badania.push({ nazwa: 'hsCRP (białko C-reaktywne)', dlaczego: 'Przewlekły stan zapalny może powodować nawracające bóle głowy', priorytet: 'sredni' });
    }
  }

  // Lęki / niepokój
  if (D.tags.has('anxiety')) {
    if (!badania.some(b => b.nazwa.includes('Magnez'))) {
      badania.push({ nazwa: 'Magnez (Mg) w erytrocytach', dlaczego: 'Magnez to naturalny regulator układu nerwowego. Niedobór = lęki, napięcie, bezsenność', priorytet: 'wysoki' });
    }
    if (!badania.some(b => b.nazwa.includes('Witamina D3'))) {
      badania.push({ nazwa: 'Witamina D3 (25-OH)', dlaczego: 'Niski poziom wit. D silnie koreluje z lękami i depresją u mężczyzn 25-40', priorytet: 'sredni' });
    }
    if (!badania.some(b => b.nazwa.includes('fT3'))) {
      badania.push({ nazwa: 'TSH + fT3 + fT4', dlaczego: 'Zaburzenia tarczycy mogą nasilać lęki - trzeba wykluczyć', priorytet: 'sredni' });
    }
  }

  // Deduplikacja badan po nazwie
  const badaniaUnique = badania.filter((b, i, arr) => arr.findIndex(x => x.nazwa === b.nazwa) === i);
  const badaniaWysoki = badaniaUnique.filter(b => b.priorytet === 'wysoki');
  const badaniaSredni = badaniaUnique.filter(b => b.priorytet === 'sredni');

  const insights: string[] = [];
  if (D.tags.size >= 6) insights.push(`Zaznaczyłeś <b>${D.tags.size} z 20 sygnałów</b>. To wzorzec który się pogłębia z każdym tygodniem.`);
  else if (D.tags.size >= 3) insights.push(`<b>${D.tags.size} sygnały</b> kręcą spiralę. Zmęczenie, gorsze żywienie, gorszy trening. I tak w kółko.`);
  if (D.dopamine >= 3 && D.binge >= 2) insights.push(`Głód dopaminowy + objadanie = <b>rozregulowany układ nagrody</b>. To biochemia, nie słaba wola.`);
  if (D.tags.has('libido') && (D.stress >= 3 || D.sleep < 6.5)) insights.push(`Niższe libido + ${D.stress >= 3 ? 'chroniczny stres' : 'kiepski sen'} = <b>klasyka spadku testosteronu</b>. Badania 10 199 mężczyzn: to styl życia, nie wiek.`);
  if (D.tags.has('belly') && (D.binge >= 2 || D.dietChaos >= 3)) insights.push(`Brzuch nie schodzi + objadanie = <b>insulinooporność w budowie</b>. Sam trening tego nie przebije.`);
  if (D.drinks > 10 && D.tags.has('libido')) insights.push(`${D.drinks} drinków regularnie + niższe libido. 14+ drinków tygodniowo = <b>~6.8% chroniczny spadek T</b>. Alkohol zamienia testosteron w estrogen.`);
  if (D.tags.has('sweating') && D.drinks > 5) insights.push(`Nocne poty + alkohol = <b>kortyzol nocą nie schodzi</b>. Organizm próbuje się detoksyfikować zamiast regenerować.`);
  if (D.tags.has('heartRate') && (D.stress >= 2 || D.subs > 0)) insights.push(`Podwyższone tętno spoczynkowe = <b>układ sympatyczny na stałym gazie</b>. ${D.subs > 0 ? 'Substancje to potęgują.' : 'Stres chroniczny tego nie odpuści sam.'}`);
  if (D.tags.has('headaches') && D.sleep < 6.5) insights.push(`Bóle głowy + deficyt snu = <b>przewlekły stan zapalny</b>. Ibuprofen to plaster, nie rozwiązanie.`);
  if (D.tags.has('procrastination') && D.dopamine >= 2) insights.push(`Prokrastynacja + głód dopaminowy = <b>mózg wybiera natychmiastową nagrodę</b>. Scrollujesz zamiast robić, bo dopamina bazowa jest za niska.`);
  if (D.tags.has('memory') && D.sleep < 7) insights.push(`Słabsza pamięć + deficyt snu = <b>hipokamp nie konsoliduje wspomnień</b>. Sen poniżej 7h blokuje przenoszenie informacji z pamięci krótkotrwałej do długotrwałej.`);
  if (D.tags.has('confidence') && D.trainHappy >= 1) insights.push(`Mniejsza pewność siebie + niezadowolenie z wyników. <b>Testosteron i pewność siebie korelują bezpośrednio</b>. To nie psychologia, to biochemia.`);
  if (D.tags.has('impatience') && D.dopamine >= 2) insights.push(`Brak cierpliwości + rozregulowana dopamina = <b>mózg przyzwyczajony do szybkich nagród</b>. Dlatego trudno wytrwać przy planie który wymaga tygodni.`);
  if (D.triedBefore >= 2) insights.push(`Próbowałeś wiele razy sam. <b>To nie dyscyplina jest problemem</b>. Widzisz fragmenty, ale nie widzisz jak one na siebie wpływają.`);
  if (C.total > 8000) insights.push(`<b>${C.total.toLocaleString('pl-PL')} zł w pół roku</b>. Na konsekwencje, nie na sam weekend.`);

  // Potencjal - ile % blokujesz stylem zycia vs ile wykorzystujesz
  const blocked = Math.min(SC, 85); // ile % potencjalu blokujesz stylem zycia
  const usable = Math.max(100 - SC, 15); // ile % potencjalu wykorzystujesz
  const potential = 100 - SC; // procent potencjalu ktory faktycznie wykorzystujesz

  // Wiek biologiczny - bazowy wiek + kary za nawyki - AGRESYWNY scoring
  // Cel: stress=3, sleep=6, drinks=8 -> +5-8 lat
  // Bio age - realistyczne: typowy user +3-7 lat, ekstremalny +10-12 max
  const bioAge = (() => {
    const baseAge = D.age;
    let penalty = 0;
    if (D.sleep < 5.5) penalty += 3;
    else if (D.sleep < 6) penalty += 2;
    else if (D.sleep < 6.5) penalty += 1.5;
    else if (D.sleep < 7) penalty += 0.5;
    if (D.sleepQ >= 2) penalty += 1;
    if (D.screenBed >= 2) penalty += 0.5;
    if (D.stress >= 3) penalty += 2.5;
    else if (D.stress >= 2) penalty += 1.5;
    else if (D.stress >= 1) penalty += 0.5;
    if (D.drinks > 10) penalty += 2.5;
    else if (D.drinks > 6) penalty += 1.5;
    else if (D.drinks > 3) penalty += 1;
    if (D.subs > 0) penalty += 2;
    if (D.energy >= 3) penalty += 1.5;
    else if (D.energy >= 2) penalty += 0.5;
    if (D.dopamine >= 3) penalty += 1;
    else if (D.dopamine >= 2) penalty += 0.5;
    if (D.dietChaos >= 2) penalty += 1;
    if (D.binge >= 2) penalty += 0.5;
    if (D.miss >= 2) penalty += 0.5;
    if (D.workHours >= 12) penalty += 1;
    else if (D.workHours >= 10) penalty += 0.5;
    if (D.mondayFeel >= 3) penalty += 1;
    else if (D.mondayFeel >= 2) penalty += 0.5;
    if (D.meals <= 1) penalty += 0.5;
    const tagPenalty = Math.min(D.tags.size * 0.25, 2);
    return Math.round((baseAge + penalty + tagPenalty) * 10) / 10;
  })();

  // Sprawnosc kognitywna - % mocy mozgu (Walker 2017, Topiwala 2022) - AGRESYWNY scoring
  // Cel: stress=3 sam daje cognitive ~60-65%, nie 85-90%
  const cognitive = (() => {
    let pct = 100;
    // Sen - Walker 2017: <6h = kognitywnie jak pijany
    if (D.sleep < 5.5) pct -= 28;
    else if (D.sleep < 6) pct -= 22;
    else if (D.sleep < 6.5) pct -= 15;
    else if (D.sleep < 7) pct -= 10;
    if (D.sleepQ >= 2) pct -= 5;       // płytki sen = mniej REM = gorszy mózg
    // Stres - kortyzol degraduje hipokamp (Sapolsky 2004)
    if (D.stress >= 3) pct -= 35;       // stres 100% = mózg na 65% mocy sam z siebie
    else if (D.stress >= 2) pct -= 18;
    else if (D.stress >= 1) pct -= 7;
    // Dopamina - desensytyzacja D2 (Volkow 2001)
    if (D.dopamine >= 3) pct -= 22;
    else if (D.dopamine >= 2) pct -= 10;
    // Alkohol - Topiwala et al. 2022: umiarkowane picie zmniejsza objętość mózgu
    if (D.drinks > 10) pct -= 18;
    else if (D.drinks > 6) pct -= 12;
    else if (D.drinks > 3) pct -= 6;
    // Substancje - neurotoksyczność
    if (D.subs > 0) pct -= 15;
    // Energia - wypalenie = mózg na rezerwie
    if (D.energy >= 3) pct -= 8;
    else if (D.energy >= 2) pct -= 4;
    // Trening - brak BDNF
    if (D.miss >= 2) pct -= 6;
    // Symptomy
    if (D.tags.has('brain')) pct -= 6;
    if (D.tags.has('focus')) pct -= 6;
    if (D.tags.has('memory')) pct -= 6;
    if (D.tags.has('procrastination')) pct -= 4;
    // Nowe pola
    if (D.workHours >= 12) pct -= 12;
    else if (D.workHours >= 10) pct -= 7;
    if (D.progress === 2) pct -= 6;
    if (D.mondayFeel >= 3) pct -= 8;
    else if (D.mondayFeel >= 2) pct -= 5;
    if (D.screenBed >= 2) pct -= 4;
    return Math.max(pct, 15);
  })();

  // Wiek mozgu - osobna metryka od wieku biologicznego
  // Brain age - realistyczne: +4-8 lat typowy, +10-14 ekstremalny
  const brainAge = (() => {
    const baseAge = D.age;
    let penalty = 0;
    if (D.sleep < 5.5) penalty += 3;
    else if (D.sleep < 6.5) penalty += 2;
    else if (D.sleep < 7) penalty += 1;
    if (D.sleepQ >= 2) penalty += 1;
    if (D.screenBed >= 2) penalty += 0.5;
    if (D.stress >= 3) penalty += 2.5;
    else if (D.stress >= 2) penalty += 1.5;
    if (D.energy >= 3) penalty += 1;
    if (D.dopamine >= 3) penalty += 2;
    else if (D.dopamine >= 2) penalty += 1;
    if (D.drinks > 8) penalty += 1.5;
    else if (D.drinks > 4) penalty += 1;
    if (D.subs > 0) penalty += 2.5;
    if (D.workHours >= 10) penalty += 1;
    if (D.mondayFeel >= 2) penalty += 0.5;
    if (D.tags.has('brain')) penalty += 1;
    if (D.tags.has('focus')) penalty += 0.5;
    if (D.tags.has('memory')) penalty += 1;
    if (D.tags.has('headaches')) penalty += 0.5;
    if (D.miss >= 2) penalty += 0.5;
    // Mózg nieco starszy od ciała (min +1)
    return Math.round((baseAge + Math.max(penalty, bioAge - baseAge + 1)) * 10) / 10;
  })();

  // Roczny spadek kognitywny przy obecnym stylu zycia
  const cognitiveDecayPerYear = Math.round((100 - cognitive) * 0.12 * 10) / 10;
  const cognitiveIn5Years = Math.max(Math.round(cognitive - cognitiveDecayPerYear * 5), 20);

  // Insight o mozgu - po obliczeniu cognitive
  if (cognitive < 75) insights.push(`Twój mózg pracuje na <b>${cognitive}% mocy</b>. To organ który zarabia Ci pieniądze, a Ty go degradujesz stylem życia.`);

  // tips usunięte z renderowania - diagnostyka pogłębia problem, nie daje rozwiązań


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
    timeline.push({ period: 'Cały dzień', text: `Wysoki stres + niska energia = <b>kortyzol chronicznie podwyższony</b>. Organizm w trybie przetrwania: magazynuje tłuszcz na brzuchu, rozkłada mięśnie na energię, tłumi libido. Biochemia, nie słabość.` });
  }
  if (D.wknd > 0 && D.drinks > 3) {
    timeline.push({ period: 'Weekend', text: `${D.drinks} drinków x ${D.wknd} weekendów. Dawka >1.5g/kg alkoholu (5-6 piw dla 70kg) = <b>spadek testosteronu o ~27% w 12h</b>, normalizacja po 36h. ${D.subs > 0 ? 'Substancje dodatkowo wyczerpują serotoninę i dopaminę.' : 'Synteza białek mięśniowych zatrzymana na 2-3 dni.'}` });
  }
  if (D.dietChaos >= 3 || D.binge >= 3) {
    timeline.push({ period: 'Cyklicznie', text: `Chaotyczne żywienie${D.binge >= 3 ? ' + cykliczne objadanie' : ''} = <b>skoki insuliny</b>. Organizm nie wie kiedy budować, kiedy spalać. Domyślnie magazynuje. Tłuszcz trzewny to bezpośredni efekt.` });
  }
  if (C.totalLostH > 20) {
    timeline.push({ period: '6 miesięcy', text: `<b>${C.totalLostH}h</b> pracy na autopilocie. Przy Twojej stawce to <b>${C.prodCost.toLocaleString('pl-PL')} zł</b>. Twój mózg chemicznie nie jest w stanie działać na 100% kiedy hormony, sen i jadłospis nie grają.` });
  }

  // ── 6 kategorii - obliczone % dla compact bars - TWARDY scoring ──
  const catScores = [
    { label: 'Sen', pct: Math.max(100 - Math.round(((D.sleepQ + D.screenBed) / 6 + (7.5 - Math.min(D.sleep, 7.5)) / 1.5) * 55), 5) },
    { label: 'Stres', pct: Math.max(100 - Math.round(((D.stress + D.energy + (D.workHours > 9 ? 1 : 0)) / 7) * 100), 5) },
    { label: 'Żywienie', pct: Math.max(100 - Math.round(((D.dietChaos + D.binge + (D.meals <= 1 ? 1 : 0)) / 7) * 100), 5) },
    { label: 'Weekend', pct: Math.max(100 - Math.round((D.drinks / 12) * 65 + (D.subs > 0 ? 35 : 0)), 5) },
    { label: 'Trening', pct: Math.max(100 - Math.round(((D.miss * 1.5 + (D.trainHappy >= 1 ? 1 : 0)) / 4) * 100), 5) },
    { label: 'Głowa', pct: Math.max(100 - Math.round((tagScoreWeighted(D.tags) / 10) * 90), 5) },
  ];
  // Badge: KRYTYCZNY przy <= 5%, WYSOKI przy <= 20%
  const catBadge = (pct: number) => pct <= 5 ? 'KRYTYCZNY' : pct <= 20 ? 'WYSOKI' : null;
  const catBadgeColor = (pct: number) => pct <= 5 ? M.red : M.org;
  const catBarColor = (pct: number) => pct >= 70 ? M.grn : pct >= 45 ? M.yel : M.red;
  // Jeśli jakakolwiek kategoria jest krytyczna, obniż potencjał extra

  // Severity opcje
  const sevOpts = [{ n: '0', l: 'Brak' }, { n: '1', l: 'Rzadko' }, { n: '2', l: 'Często' }, { n: '3', l: 'Zawsze' }];
  const sevColors = ['#3cba5e', '#d4a82a', '#e8923a', '#dc4444'];

  // Animowane liczniki dla wyników
  const animTotal = useCounter(C.total, 1400, countersActive);
  const animScore = useCounter(SC, 1000, countersActive);
  const animHard = useCounter(C.hardTotal, 1200, countersActive);
  const animHidden = useCounter(C.hiddenTotal, 1300, countersActive);
  const animPotential = useCounter(potential, 1000, countersActive);
  const animCognitive = useCounter(cognitive, 1100, countersActive);
  const animBioAge = useCounter(Math.round(bioAge), 900, countersActive);
  const animBrainAge = useCounter(Math.round(brainAge), 1000, countersActive);

  const SevField = ({ label, sub, k, val }: { label: string; sub?: string; k: SevKey; val: number }) => (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: sub ? 6 : 12, lineHeight: 1.45 }}>
        {label}{sub && <span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>{sub}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
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
                padding: '16px 4px', textAlign: 'center',
                border: `1.5px solid ${on ? sevColors[i] : M.brd2}`,
                background: on ? sevColors[i] + '12' : M.s1,
                cursor: 'pointer', borderRadius: 12,
                transition: 'all .25s ease',
                transform: on ? 'scale(1.03)' : 'scale(1)',
                minHeight: 58,
                boxShadow: on ? `0 0 14px ${sevColors[i]}25` : 'none',
              }}
            >
              <span style={{ fontSize: 20, fontWeight: 700, display: 'block', marginBottom: 4, color: on ? sevColors[i] : M.t3 }}>{o.n}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: on ? sevColors[i] : M.t4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{o.l}</span>
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
          transition: 'all .25s ease',
          transform: on ? 'scale(1.01)' : 'scale(1)',
          minHeight: 48,
          boxShadow: on ? `0 0 12px ${M.gold}15` : 'none',
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:${M.bg};color:${M.t1};font-family:${M.sans};min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased;width:100%}
        h1,h2,h3{text-shadow:0 0 20px rgba(255,255,255,.1),0 1px 2px rgba(0,0,0,.6)}
        p,span,div,label{text-shadow:0 1px 2px rgba(0,0,0,.4)}
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 50% at 50% 0%,#141210 0%,transparent 60%);pointer-events:none;z-index:0}
        body::after{content:'';position:fixed;inset:0;opacity:.35;background:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.03'/%3E%3C/svg%3E");pointer-events:none;z-index:0}

        input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:48px;background:transparent;cursor:pointer;margin:0;touch-action:none;-webkit-tap-highlight-color:transparent}
        input[type=range]::-webkit-slider-runnable-track{height:6px;background:transparent;border-radius:3px;cursor:pointer}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;background:${M.gold};border:none;border-radius:50%;cursor:grab;box-shadow:0 0 12px rgba(200,168,78,.4),0 1px 4px rgba(0,0,0,.5),0 0 0 4px rgba(200,168,78,.12);margin-top:-9px;transition:all .2s ease}
        input[type=range]::-webkit-slider-thumb:active{cursor:grabbing;box-shadow:0 0 20px rgba(200,168,78,.6),0 1px 6px rgba(0,0,0,.5),0 0 0 8px rgba(200,168,78,.15);width:26px;height:26px;margin-top:-10px}
        input[type=range]::-moz-range-thumb{width:24px;height:24px;background:${M.gold};border:none;border-radius:50%;cursor:grab;box-shadow:0 0 12px rgba(200,168,78,.4),0 1px 4px rgba(0,0,0,.5),0 0 0 4px rgba(200,168,78,.12)}
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

        @keyframes secOutLeft{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-30px)}}
        @keyframes secOutRight{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(30px)}}
        @keyframes secIn{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
        .sec-out-left{animation:secOutLeft .25s ease both}
        .sec-out-right{animation:secOutRight .25s ease both}
        .sec-in{animation:secIn .4s cubic-bezier(.16,1,.3,1) both}

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

      {/* ── Animowane niebo z gwiazdami ── */}
      <StarField />

      <div
        id="diagnostyka"
        ref={topRef}
        style={{ maxWidth: 440, width: '100%', margin: '0 auto', padding: '0 0 60px', position: 'relative', zIndex: 1, overflow: 'hidden' }}
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
                <span style={{ fontFamily: M.mono, fontSize: 10, fontWeight: 700, color: M.gold, textAlign: 'right' }}>Sekcja {sec + 1} z 7: {SECTIONS[sec]}</span>
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
                <span style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4 }}>Tyle Cię to kosztuje / 6 mies.</span>
                <span style={{ fontFamily: M.mono, fontSize: 18, fontWeight: 700, color: M.gold, textShadow: `0 0 12px ${M.gold}25` }}>{C.total.toLocaleString('pl-PL')} zł</span>
              </div>
            )}

            <div
              className={secTransition === 'out-left' ? 'sec-out-left' : secTransition === 'out-right' ? 'sec-out-right' : secTransition === 'in' ? 'sec-in' : ''}
              style={{ padding: '0 16px' }}
            >
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
                      color: M.gold, border: `1.5px solid ${M.gold}40`, padding: '8px 20px', marginBottom: 22,
                      background: M.gold + '10', borderRadius: 20, fontWeight: 700,
                      boxShadow: `0 0 12px ${M.gold}15`,
                    }} className="border-glow">
                      Audyt 1:1 &middot; 200+ facetów &middot; 9 lat z neurobiologią
                    </div>
                    <h1 style={{
                      fontSize: 34, fontWeight: 900, lineHeight: 1.02, letterSpacing: -0.8, marginBottom: 20,
                      color: M.t1, textShadow: '0 0 24px rgba(255,255,255,.1), 0 1px 3px rgba(0,0,0,.5)',
                      textWrap: 'balance',
                    }}>
                      Przesiewam, czy{' '}
                      <span style={{
                        color: M.gold,
                        fontWeight: 900,
                      }}>
                        pasujemy.
                      </span>{' '}
                      Ty i ja, pół roku, 1:1.
                    </h1>
                    <p style={{ color: M.t2, fontSize: 16, lineHeight: 1.55, fontWeight: 500, maxWidth: 400, margin: '0 auto 18px' }}>
                      Wypełniasz audyt 12 pytań. <strong style={{ color: M.t1 }}>Czytam osobiście</strong>. Po 24h wracam w DM @hantleitalerz z konkretną decyzją: pasujemy, nie pasujemy, dopytuję jeszcze 2 rzeczy.
                    </p>
                    <p style={{ color: M.t3, fontSize: 13, lineHeight: 1.6, fontWeight: 400, maxWidth: 380, margin: '0 auto 18px', fontStyle: 'italic' }}>
                      Filtr pod <strong style={{ color: M.gold, fontStyle: 'normal' }}>sześciomiesięczne prowadzenie 1:1</strong>, nie pod tani materiał. Po formularzu wracam z konkretną ofertą, jeśli widzę że ma sens po obu stronach.
                    </p>
                    <div style={{ fontFamily: M.mono, fontSize: 10, color: M.t4, letterSpacing: 1.5, marginTop: 4 }}>Poufne &middot; 300+ paneli hormonalnych &middot; 5.0 Google</div>
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
                  <div style={{ marginBottom: 28 }}>
                    <Slider label="Twój wiek" min={18} max={50} step={1} k="age" val={D.age} unit=" lat" ariaLabel="Twój wiek w latach" />
                  </div>
                  <SH n="01" title="Sen" />
                  <div style={{ fontSize: 14, color: M.t3, fontWeight: 400, paddingLeft: 38, marginBottom: 28 }}>Leżysz 8h, ale ile z tego to prawdziwy sen?</div>
                  <Slider label="Ile godzin faktycznie śpisz" min={3} max={9} step={0.5} k="sleep" val={D.sleep} unit="h" note={`Deficyt vs 7.5h: ${Math.max((7.5 - D.sleep) * 7, 0).toFixed(0)}h / tydzień`} ariaLabel="Średni czas snu w nocy w godzinach" />
                  <SevField label="Budzisz się w nocy, kręcisz, płytki sen?" sub="Nie chodzi o to ile śpisz. Chodzi o to czy sen Cię regeneruje." k="sleepQ" val={D.sleepQ} />
                  <SevField label="Scrollujesz w łóżku?" sub="Ekran tłumi melatoninę o 50% na 90 minut." k="screenBed" val={D.screenBed} />
                  <Slider label="O której wstajesz w tygodniu?" min={4} max={10} step={0.5} k="wakeTime" val={D.wakeTime} unit=":00" ariaLabel="Godzina wstawania w tygodniu" />
                  {/* Budzik czy sam */}
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 6, lineHeight: 1.45 }}>
                      Budzenie<span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>Jeśli potrzebujesz budzika, Twój organizm nie skończył regeneracji.</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                      {[{ n: '🔇', l: 'Sam', v: 0 }, { n: '⏰', l: 'Budzik', v: 1 }].map(o => {
                        const on = D.alarm === o.v;
                        return (
                          <button key={o.v} onClick={() => upd('alarm', o.v)} style={{
                            padding: '16px 4px', textAlign: 'center',
                            border: `1.5px solid ${on ? M.gold : M.brd2}`,
                            background: on ? M.gold + '12' : M.s1,
                            cursor: 'pointer', borderRadius: 12, transition: 'all .25s ease',
                            transform: on ? 'scale(1.03)' : 'scale(1)', minHeight: 58,
                            boxShadow: on ? `0 0 14px ${M.gold}25` : 'none',
                          }}>
                            <span style={{ fontSize: 20, fontWeight: 700, display: 'block', marginBottom: 4, color: on ? M.gold : M.t3 }}>{o.n}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: on ? M.gold : M.t4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{o.l}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {sec === 1 && (
                <div className="fade-up">
                  {/* Micro-reward: insight z poprzedniej sekcji */}
                  <div style={{ borderLeft: `3px solid ${M.gold}`, padding: '8px 12px', marginBottom: 20, background: `${M.gold}08`, borderRadius: '0 8px 8px 0', maxWidth: '100%', margin: '0 auto 20px' }}>
                    <p style={{ fontSize: 12, color: M.t3, margin: 0, lineHeight: 1.5, textAlign: 'center' }}>Na podstawie Twojego snu: deficyt <strong style={{ color: M.gold }}>{Math.max((7.5 - D.sleep) * 7, 0).toFixed(0)}h</strong> tygodniowo</p>
                  </div>
                  <SevField label="Stres w ciągu dnia" sub="Napięcie w karku, ścisk w żołądku, myśli o pracy po 22:00?" k="stress" val={D.stress} />
                  <SevField label="Wypalenie" sub="Wstajesz i już nie masz siły. Kawa nie pomaga." k="energy" val={D.energy} />
                  <SevField label="Głód dopaminowy" sub="Otwierasz telefon co 3 minuty. Na nudnym zadaniu nie wytrzymujesz 10 minut." k="dopamine" val={D.dopamine} />
                  <Slider label="Ile godzin dziennie tracisz na mgłę, wolniejsze myślenie?" min={0} max={4} step={0.5} k="lost" val={D.lost} unit="h" ariaLabel="Liczba godzin traconych dziennie przez mgłę umysłową" />
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
                  <Slider label="Ile godzin pracujesz dziennie?" min={4} max={14} step={1} k="workHours" val={D.workHours} unit="h" ariaLabel="Liczba godzin pracy dziennie" />
                  {/* Postępy w życiu */}
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 6, lineHeight: 1.45 }}>
                      Poczucie progresu<span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>Rok temu vs teraz. Idziesz do przodu?</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                      {[{ n: '✓', l: 'Tak', v: 0 }, { n: '~', l: 'Trochę', v: 1 }, { n: '✗', l: 'Nie', v: 2 }].map(o => {
                        const on = D.progress === o.v;
                        const col = o.v === 0 ? M.grn : o.v === 1 ? M.yel : M.red;
                        return (
                          <button key={o.v} onClick={() => upd('progress', o.v)} style={{
                            padding: '16px 4px', textAlign: 'center',
                            border: `1.5px solid ${on ? col : M.brd2}`,
                            background: on ? col + '12' : M.s1,
                            cursor: 'pointer', borderRadius: 12, transition: 'all .25s ease',
                            transform: on ? 'scale(1.03)' : 'scale(1)', minHeight: 58,
                            boxShadow: on ? `0 0 14px ${col}25` : 'none',
                          }}>
                            <span style={{ fontSize: 20, fontWeight: 700, display: 'block', marginBottom: 4, color: on ? col : M.t3 }}>{o.n}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: on ? col : M.t4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{o.l}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {sec === 2 && (
                <div className="fade-up">
                  {/* Micro-reward: insight z poprzedniej sekcji */}
                  <div style={{ borderLeft: `3px solid ${M.gold}`, padding: '8px 12px', marginBottom: 20, background: `${M.gold}08`, borderRadius: '0 8px 8px 0', maxWidth: '100%', margin: '0 auto 20px' }}>
                    <p style={{ fontSize: 12, color: M.t3, margin: 0, lineHeight: 1.5, textAlign: 'center' }}>Stracona produktywność: ~<strong style={{ color: M.gold }}>{Math.round(D.lost * D.rate * 22)} zł</strong> miesięcznie</p>
                  </div>
                  <SevField label="Chaos w jedzeniu" sub="Omijasz śniadanie, wieczorem jesz za trzech?" k="dietChaos" val={D.dietChaos} />
                  <SevField label="Objadanie się" sub="Cały dzień na diecie, wieczorem pizza + lody. Po weekendzie znowu od zera." k="binge" val={D.binge} />
                  <Slider label="Wydajesz miesięcznie na junk food / zamówienia" min={0} max={1000} step={50} k="junk" val={D.junk} unit=" zł" note={`6 miesięcy: ${(D.junk * 6).toLocaleString('pl-PL')} zł`} ariaLabel="Miesięczne wydatki na śmieciowe jedzenie w złotych" />
                  {/* Ile posiłków dziennie */}
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 6, lineHeight: 1.45 }}>
                      Ile posiłków dziennie<span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>Pełne posiłki, nie baton z automatu.</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                      {[{ n: '1', l: 'Jeden', v: 1 }, { n: '2', l: 'Dwa', v: 2 }, { n: '3', l: 'Trzy', v: 3 }, { n: '4+', l: 'Cztery+', v: 4 }].map(o => {
                        const on = D.meals === o.v;
                        const col = o.v <= 1 ? M.red : o.v === 2 ? M.org : M.grn;
                        return (
                          <button key={o.v} onClick={() => upd('meals', o.v)} style={{
                            padding: '16px 4px', textAlign: 'center',
                            border: `1.5px solid ${on ? col : M.brd2}`,
                            background: on ? col + '12' : M.s1,
                            cursor: 'pointer', borderRadius: 12, transition: 'all .25s ease',
                            transform: on ? 'scale(1.03)' : 'scale(1)', minHeight: 58,
                            boxShadow: on ? `0 0 14px ${col}25` : 'none',
                          }}>
                            <span style={{ fontSize: 20, fontWeight: 700, display: 'block', marginBottom: 4, color: on ? col : M.t3 }}>{o.n}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: on ? col : M.t4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{o.l}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Jak jesz - gotowanie */}
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 6, lineHeight: 1.45 }}>
                      Jak jesz na co dzień<span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>Ubereats czy patelnia?</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                      {[{ n: '🍳', l: 'Gotuję', v: 0 }, { n: '↔', l: 'Mix', v: 1 }, { n: '📱', l: 'Zamawiam', v: 2 }].map(o => {
                        const on = D.cooking === o.v;
                        const col = o.v === 0 ? M.grn : o.v === 1 ? M.yel : M.org;
                        return (
                          <button key={o.v} onClick={() => upd('cooking', o.v)} style={{
                            padding: '16px 4px', textAlign: 'center',
                            border: `1.5px solid ${on ? col : M.brd2}`,
                            background: on ? col + '12' : M.s1,
                            cursor: 'pointer', borderRadius: 12, transition: 'all .25s ease',
                            transform: on ? 'scale(1.03)' : 'scale(1)', minHeight: 58,
                            boxShadow: on ? `0 0 14px ${col}25` : 'none',
                          }}>
                            <span style={{ fontSize: 20, fontWeight: 700, display: 'block', marginBottom: 4, color: on ? col : M.t3 }}>{o.n}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: on ? col : M.t4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{o.l}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {sec === 3 && (
                <div className="fade-up">
                  {/* Micro-reward: insight z poprzedniej sekcji */}
                  <div style={{ borderLeft: `3px solid ${M.gold}`, padding: '8px 12px', marginBottom: 20, background: `${M.gold}08`, borderRadius: '0 8px 8px 0', maxWidth: '100%', margin: '0 auto 20px' }}>
                    <p style={{ fontSize: 12, color: M.t3, margin: 0, lineHeight: 1.5, textAlign: 'center' }}>Śmieciowe jedzenie: <strong style={{ color: M.gold }}>{(D.junk * 6).toLocaleString('pl-PL')} zł</strong> w 6 miesięcy</p>
                  </div>
                  <div style={{ fontSize: 13.5, color: M.t3, fontWeight: 400, marginBottom: 20, lineHeight: 1.6 }}>Zero moralizowania. Policzę co Cię to kosztuje w złotówkach i testosteronie.</div>
                  <Slider label="Ile weekendów w miesiącu imprezujesz?" min={0} max={4} step={1} k="wknd" val={D.wknd} unit="" ariaLabel="Liczba imprezowych weekendów w miesiącu" />
                  <Slider label="Ile drinków na wyjściu?" min={0} max={20} step={1} k="drinks" val={D.drinks} unit="" note={D.drinks > 5 ? `${D.drinks} drinków = ~${Math.round(D.drinks * 3.4)}% spadek testosteronu w 12h (Vingren 2013)` : ''} ariaLabel="Średnia liczba drinków na imprezie" />
                  <Slider label="Ile wydajesz na wyjścia (alkohol, kluby, taksówki)" min={0} max={800} step={50} k="cash" val={D.cash} unit=" zł" note={`Suma 6 mies.: ${(D.cash * D.wknd * 6).toLocaleString('pl-PL')} zł`} ariaLabel="Wydatki na imprezie w złotych" />
                  <Slider label="Ile wydajesz na substancje" min={0} max={800} step={50} k="subs" val={D.subs} unit=" zł" ariaLabel="Miesięczne wydatki na substancje w złotych" />
                  {D.subs > 0 && (
                    <div style={{ padding: '12px 16px', background: M.s1, borderRadius: 12, border: `1px solid ${M.brd}`, marginTop: -12, marginBottom: 28 }}>
                      <div style={{ fontSize: 11, color: M.t4, fontFamily: M.mono, letterSpacing: 0.5, marginBottom: 8 }}>CO TO OZNACZA DLA TWOJEGO ORGANIZMU:</div>
                      <div style={{ fontSize: 12.5, color: M.t3, lineHeight: 1.7 }}>
                        {D.subs > 0 && D.subs <= 200 && '• Okazjonalne użycie - serotonina potrzebuje 2-4 tyg. na regenerację. Przy regularnym cyklu okno regeneracji nigdy się nie zamyka.'}
                        {D.subs > 200 && D.subs <= 500 && '• Regularne wydatki na substancje - wyczerpanie serotoniny + dopaminy. Mózg zaczyna traktować normalny poziom jako „za mało". Trening i odżywianie tracą na efektywności.'}
                        {D.subs > 500 && '• Poważne wydatki - na tym poziomie układ nerwowy jest w trybie ciągłej kompensacji. Regeneracja po weekendzie zajmuje cały tydzień. Forma stoi w miejscu.'}
                      </div>
                    </div>
                  )}
                  {D.drinks > 10 && (
                    <div style={{ fontSize: 11.5, color: M.org, fontStyle: 'italic', marginTop: -16, marginBottom: 24, lineHeight: 1.5 }}>
                      {D.drinks}+ drinków regularnie. Wątroba potrzebuje ~72h na pełną regenerację. Przy 2+ weekendach - nigdy nie wraca do poziomu wyjściowego.
                    </div>
                  )}
                  {/* Poniedziałek rano */}
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 6, lineHeight: 1.45 }}>
                      Poniedziałek rano<span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>Wstajesz i od razu wiesz jak będzie.</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                      {[{ n: '0', l: 'Ok', v: 0 }, { n: '1', l: 'Średnio', v: 1 }, { n: '2', l: 'Źle', v: 2 }, { n: '3', l: 'Tragedia', v: 3 }].map(o => {
                        const on = D.mondayFeel === o.v;
                        const cols = [M.grn, M.yel, M.org, M.red];
                        const col = cols[o.v];
                        return (
                          <button key={o.v} onClick={() => upd('mondayFeel', o.v)} style={{
                            padding: '16px 4px', textAlign: 'center',
                            border: `1.5px solid ${on ? col : M.brd2}`,
                            background: on ? col + '12' : M.s1,
                            cursor: 'pointer', borderRadius: 12, transition: 'all .25s ease',
                            transform: on ? 'scale(1.03)' : 'scale(1)', minHeight: 58,
                            boxShadow: on ? `0 0 14px ${col}25` : 'none',
                          }}>
                            <span style={{ fontSize: 20, fontWeight: 700, display: 'block', marginBottom: 4, color: on ? col : M.t3 }}>{o.n}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: on ? col : M.t4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{o.l}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Weekend a praca */}
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 6, lineHeight: 1.45 }}>
                      Weekend vs produktywność<span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>Czy po weekendzie pracujesz na pół gwizdka?</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                      {[{ n: '0', l: 'Nie', v: 0 }, { n: '1', l: 'Czasem', v: 1 }, { n: '2', l: 'Regularnie', v: 2 }].map(o => {
                        const on = D.weekendWork === o.v;
                        const col = o.v === 0 ? M.grn : o.v === 1 ? M.yel : M.red;
                        return (
                          <button key={o.v} onClick={() => upd('weekendWork', o.v)} style={{
                            padding: '16px 4px', textAlign: 'center',
                            border: `1.5px solid ${on ? col : M.brd2}`,
                            background: on ? col + '12' : M.s1,
                            cursor: 'pointer', borderRadius: 12, transition: 'all .25s ease',
                            transform: on ? 'scale(1.03)' : 'scale(1)', minHeight: 58,
                            boxShadow: on ? `0 0 14px ${col}25` : 'none',
                          }}>
                            <span style={{ fontSize: 20, fontWeight: 700, display: 'block', marginBottom: 4, color: on ? col : M.t3 }}>{o.n}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: on ? col : M.t4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{o.l}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {sec === 4 && (
                <div className="fade-up">
                  {/* Micro-reward: insight z poprzedniej sekcji */}
                  <div style={{ borderLeft: `3px solid ${M.gold}`, padding: '8px 12px', marginBottom: 20, background: `${M.gold}08`, borderRadius: '0 8px 8px 0', maxWidth: '100%', margin: '0 auto 20px' }}>
                    <p style={{ fontSize: 12, color: M.t3, margin: 0, lineHeight: 1.5, textAlign: 'center' }}>Weekend kosztuje Cię: <strong style={{ color: M.gold }}>{(D.cash * D.wknd).toLocaleString('pl-PL')} zł</strong> miesięcznie{D.drinks > 5 ? <> + <strong style={{ color: M.gold }}>{Math.round(D.drinks * 3.4)}%</strong> spadek testosteronu</> : null}</p>
                  </div>
                  <Slider label="Ile płacisz za siłownię miesięcznie?" min={0} max={500} step={50} k="gym" val={D.gym} unit=" zł" ariaLabel="Miesięczny koszt siłowni w złotych" />
                  <Slider label="Ile treningów planujesz tygodniowo?" min={0} max={7} step={1} k="plan" val={D.plan} unit="" ariaLabel="Liczba planowanych treningów w tygodniu" />
                  <Slider label="Ile odpuszczasz bo zmęczenie, kac, brak motywacji?" min={0} max={4} step={1} k="miss" val={D.miss} unit="" note={`Tracisz: ${D.miss * 4 * 6} treningów w 6 mies.`} ariaLabel="Liczba treningów opuszczanych tygodniowo przez zmęczenie lub kaca" />
                  <Slider label="Od ilu lat trenujesz?" min={0} max={15} step={1} k="trainYears" val={D.trainYears} unit=" lat" ariaLabel="Liczba lat treningu" />
                  {/* Zadowolony z wyników */}
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 6, lineHeight: 1.45 }}>
                      Efekty treningu<span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>Widzisz progres w lustrze i na sztandze?</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                      {[{ n: '✓', l: 'Tak', v: 0 }, { n: '~', l: 'Nie do końca', v: 1 }, { n: '✗', l: 'Nie', v: 2 }].map(o => {
                        const on = D.trainHappy === o.v;
                        const col = o.v === 0 ? M.grn : o.v === 1 ? M.yel : M.red;
                        return (
                          <button key={o.v} onClick={() => upd('trainHappy', o.v)} style={{
                            padding: '16px 4px', textAlign: 'center',
                            border: `1.5px solid ${on ? col : M.brd2}`,
                            background: on ? col + '12' : M.s1,
                            cursor: 'pointer', borderRadius: 12, transition: 'all .25s ease',
                            transform: on ? 'scale(1.03)' : 'scale(1)', minHeight: 58,
                            boxShadow: on ? `0 0 14px ${col}25` : 'none',
                          }}>
                            <span style={{ fontSize: 20, fontWeight: 700, display: 'block', marginBottom: 4, color: on ? col : M.t3 }}>{o.n}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: on ? col : M.t4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{o.l}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Plan treningowy */}
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 6, lineHeight: 1.45 }}>
                      Plan treningowy<span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>Trenujesz z planem czy robisz co akurat chcesz?</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                      {[{ n: '📋', l: 'Mam plan', v: 0 }, { n: '🎲', l: 'Improwizuję', v: 1 }].map(o => {
                        const on = D.trainPlan === o.v;
                        const col = o.v === 0 ? M.grn : M.org;
                        return (
                          <button key={o.v} onClick={() => upd('trainPlan', o.v)} style={{
                            padding: '16px 4px', textAlign: 'center',
                            border: `1.5px solid ${on ? col : M.brd2}`,
                            background: on ? col + '12' : M.s1,
                            cursor: 'pointer', borderRadius: 12, transition: 'all .25s ease',
                            transform: on ? 'scale(1.03)' : 'scale(1)', minHeight: 58,
                            boxShadow: on ? `0 0 14px ${col}25` : 'none',
                          }}>
                            <span style={{ fontSize: 20, fontWeight: 700, display: 'block', marginBottom: 4, color: on ? col : M.t3 }}>{o.n}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: on ? col : M.t4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{o.l}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {sec === 5 && (
                <div className="fade-up">
                  {/* Micro-reward: insight z poprzedniej sekcji */}
                  <div style={{ borderLeft: `3px solid ${M.gold}`, padding: '8px 12px', marginBottom: 20, background: `${M.gold}08`, borderRadius: '0 8px 8px 0', maxWidth: '100%', margin: '0 auto 20px' }}>
                    <p style={{ fontSize: 12, color: M.t3, margin: 0, lineHeight: 1.5, textAlign: 'center' }}>Tracisz <strong style={{ color: M.gold }}>{D.miss * 4 * 6}</strong> treningów w 6 miesięcy</p>
                  </div>
                  <div style={{ fontSize: 15, color: M.t2, fontWeight: 500, marginBottom: 18, lineHeight: 1.5 }}>Zaznacz wszystko co pasuje. Im więcej, tym jaśniejszy obraz.</div>
                  {([
                    ['fatigue', 'Zmęczony mimo 8h snu. Kawa nie pomaga.'],
                    ['mood', 'Wahania nastroju. Z 0 do 100 bez powodu.'],
                    ['libido', 'Libido spadło. Mniej chęci, mniej myśli o seksie.'],
                    ['belly', 'Brzuch nie schodzi mimo treningu i diety.'],
                    ['brain', 'Mgła mózgowa. Czytasz zdanie 3 razy.'],
                    ['anxiety', 'Niepokój bez powodu. Myśli kręcą się w kółko.'],
                    ['joints', 'Stawy bolą. Kolana, barki, łokcie.'],
                    ['skin', 'Cera gorsza niż kiedyś. Wypryski, suchość.'],
                    ['motivation', 'Zero motywacji. Robisz minimum.'],
                    ['digest', 'Wzdęcia, problemy z trawieniem.'],
                    ['cravings', 'Wieczorny głód na słodycze albo fast food.'],
                    ['recovery', 'Po treningu boli 3+ dni. Kiedyś było szybciej.'],
                    ['focus', '20 minut skupienia i głowa odpływa.'],
                    ['headaches', 'Bóle głowy co kilka dni.'],
                    ['sweating', 'Nocne poty. Budzisz się mokry.'],
                    ['heartRate', 'Tętno spoczynkowe powyżej 75 bpm.'],
                    ['procrastination', 'Odkładasz rzeczy na później. Codziennie.'],
                    ['impatience', 'Nie wytrzymujesz w kolejce. Irytuje Cię wszystko.'],
                    ['memory', 'Zapominasz o czym myślałeś 5 sekund temu.'],
                    ['confidence', 'Mniej pewny siebie niż rok temu.'],
                  ] as [ChipKey, string][]).map(([k, l]) => <Chip key={k} t={k} label={l} />)}
                </div>
              )}

              {sec === 6 && (
                <div className="fade-up">
                  {/* Micro-reward: insight z poprzedniej sekcji */}
                  <div style={{ borderLeft: `3px solid ${M.gold}`, padding: '8px 12px', marginBottom: 20, background: `${M.gold}08`, borderRadius: '0 8px 8px 0', maxWidth: '100%', margin: '0 auto 20px' }}>
                    <p style={{ fontSize: 12, color: M.t3, margin: 0, lineHeight: 1.5, textAlign: 'center' }}>Zaznaczono <strong style={{ color: M.gold }}>{D.tags.size}</strong> objawów</p>
                  </div>
                  <div style={{ fontSize: 13.5, color: M.t3, fontWeight: 400, marginBottom: 20, lineHeight: 1.6 }}>Ostatnia sekcja. Dwie minuty i masz pełen obraz.</div>
                  {/* Próby zmiany */}
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 6, lineHeight: 1.45 }}>
                      Próby zmiany<span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>Ile razy startowałeś od poniedziałku?</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                      {[{ n: '0', l: 'Nie', v: 0 }, { n: '1', l: 'Raz-dwa', v: 1 }, { n: '2', l: 'Wiele razy', v: 2 }].map(o => {
                        const on = D.triedBefore === o.v;
                        const col = o.v === 0 ? M.t4 : o.v === 1 ? M.yel : M.org;
                        return (
                          <button key={o.v} onClick={() => upd('triedBefore', o.v)} style={{
                            padding: '16px 4px', textAlign: 'center',
                            border: `1.5px solid ${on ? col : M.brd2}`,
                            background: on ? col + '12' : M.s1,
                            cursor: 'pointer', borderRadius: 12, transition: 'all .25s ease',
                            transform: on ? 'scale(1.03)' : 'scale(1)', minHeight: 58,
                            boxShadow: on ? `0 0 14px ${col}25` : 'none',
                          }}>
                            <span style={{ fontSize: 20, fontWeight: 700, display: 'block', marginBottom: 4, color: on ? col : M.t3 }}>{o.n}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: on ? col : M.t4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{o.l}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Co najbardziej frustruje */}
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 6, lineHeight: 1.45 }}>
                      Co Cię najbardziej wkurza<span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>Jedno główne. Reszta się z tego wynika.</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                      {[{ n: '📉', l: 'Brak wyników', v: 0 }, { n: '🔋', l: 'Brak energii', v: 1 }, { n: '⏰', l: 'Brak czasu', v: 2 }, { n: '🔄', l: 'Brak konsekwencji', v: 3 }, { n: '✓', l: 'Jest ok', v: 4 }].map(o => {
                        const on = D.frustration === o.v;
                        return (
                          <button key={o.v} onClick={() => upd('frustration', o.v)} style={{
                            padding: '16px 4px', textAlign: 'center',
                            border: `1.5px solid ${on ? M.gold : M.brd2}`,
                            background: on ? M.gold + '12' : M.s1,
                            cursor: 'pointer', borderRadius: 12, transition: 'all .25s ease',
                            transform: on ? 'scale(1.03)' : 'scale(1)', minHeight: 58,
                            boxShadow: on ? `0 0 14px ${M.gold}25` : 'none',
                          }}>
                            <span style={{ fontSize: 20, fontWeight: 700, display: 'block', marginBottom: 4, color: on ? M.gold : M.t3 }}>{o.n}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: on ? M.gold : M.t4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{o.l}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
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
                      cursor: 'pointer', borderRadius: 12, minHeight: 48,
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
                    flex: 2, padding: '16px 32px',
                    background: `linear-gradient(135deg, #c8a84e, #a08a3e)`,
                    color: '#0a0a0a',
                    border: 'none', fontFamily: M.sans, fontSize: 15, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: 2.5, cursor: 'pointer', borderRadius: 12,
                    minHeight: 48,
                    boxShadow: '0 4px 20px rgba(200,168,78,0.2)',
                  }}
                >
                  {sec === SECTIONS.length - 1 ? 'Pokaż raport' : 'Dalej'}
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
                  {SC >= 60 ? 'Wynik wyższy niż u 80% facetów po 30.' : SC >= 40 ? 'Średnio. Ale widzę punkt, który ciągnie resztę.' : 'Niski wynik. I tu zaczyna się ciekawie.'}
                </h2>
                <p style={{ fontSize: 14, color: M.t3, lineHeight: 1.6, marginBottom: 24, fontWeight: 400 }}>
                  Pełny raport ma <strong style={{ color: M.t1 }}>wiek biologiczny, sprawność mózgu, hormony do sprawdzenia i priorytet nr 1</strong>. Pokazuję od razu na ekranie. Email zostaje u mnie, żebym wracał w DM z konkretną ofertą prowadzenia 1:1, jeśli widzę że pasujemy.
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
                    aria-label={loading ? 'Ładowanie wyniku' : 'Pokaż moją diagnozę'}
                    className={!loading ? 'shimmer-btn' : ''}
                    style={{
                      width: '100%', padding: '16px 32px', marginTop: 6,
                      background: loading ? M.brd2 : 'linear-gradient(135deg, #c8a84e, #a08a3e)',
                      color: loading ? M.t4 : '#0a0a0a',
                      border: 'none', fontFamily: M.sans, fontSize: 15, fontWeight: 700, letterSpacing: 2.5,
                      textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', borderRadius: 12,
                      boxShadow: loading ? 'none' : '0 4px 20px rgba(200,168,78,0.2)',
                      minHeight: 48,
                    }}
                  >
                    {loading ? 'Ładuję wynik...' : 'Pokaż raport →'}
                  </button>
                </div>
              </div>

              <p style={{ fontSize: 11, color: M.t4, marginTop: 16, fontFamily: M.mono, letterSpacing: 0.5, textAlign: 'center' }}>
                Przeglądam wyniki osobiście. Do wybranych osób odezwę się w DM.
              </p>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {phase === 'results' && (
          <div className="fade-up" style={{ padding: '32px 16px 80px', width: '100%', boxSizing: 'border-box' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${M.brd}` }}>
              <Logo />
              <div style={{ marginTop: 14 }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: M.t4, marginBottom: 6 }}>Raport</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: M.t1 }}>{imie.trim() ? `${imie.trim()}, Twoje liczby` : 'Twoje liczby'}</h2>
              </div>
            </div>

            {/* ═══ SCREEN 1: WOW MOMENT - 3 metryki DUŻE + brain insight + before/after ═══ */}
            <Reveal delay={80}>
              <div style={{
                background: `linear-gradient(160deg, #0e0e0e, #151510)`,
                textAlign: 'center', padding: '28px 14px 24px',
                position: 'relative', overflow: 'hidden', marginBottom: 16, borderRadius: 16, width: '100%',
                boxSizing: 'border-box',
                border: `2px solid ${M.gold}40`,
                boxShadow: `0 8px 40px ${M.gold}15, inset 0 1px 0 ${M.gold}15`,
              }} className="float-el">
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg,transparent,transparent 4px,rgba(200,168,78,.03) 4px,rgba(200,168,78,.03) 8px)' }} />
                <div style={{ position: 'relative' }}>
                  {/* 3 metryki - DUŻE */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: M.mono, fontSize: 'clamp(40px, 10vw, 60px)', fontWeight: 800, color: M.gold, lineHeight: 1, textShadow: `0 0 24px ${M.gold}40` }}>
                        {countersActive ? animPotential : potential}%
                      </div>
                      <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: M.t4, marginTop: 6 }}>potencjału</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: M.mono, fontSize: 'clamp(40px, 10vw, 60px)', fontWeight: 800, color: bioAge > D.age + 2 ? M.org : M.t1, lineHeight: 1 }}>
                        {countersActive ? animBioAge : Math.round(bioAge)}
                      </div>
                      <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: M.t4, marginTop: 6 }}>wiek biol.</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: M.mono, fontSize: 'clamp(40px, 10vw, 60px)', fontWeight: 800, color: cognitive < 70 ? M.red : cognitive < 85 ? M.org : M.grn, lineHeight: 1 }}>
                        {countersActive ? animCognitive : cognitive}%
                      </div>
                      <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: M.t4, marginTop: 6 }}>mózg</div>
                    </div>
                  </div>
                  {/* Brain insight */}
                  <div style={{ fontSize: 13, color: M.t3, lineHeight: 1.6, marginTop: 8 }}>
                    Twój mózg pracuje na <strong style={{ color: cognitive < 70 ? M.red : M.gold }}>{cognitive}%</strong> swojej mocy.
                    {cognitiveDecayPerYear > 0.5 && <> Co roku tracisz ~{cognitiveDecayPerYear}% sprawności kognitywnej.</>}
                  </div>
                  {/* Identity shift */}
                  <div style={{ marginTop: 12, fontSize: 11.5, color: M.t4, lineHeight: 1.55, fontStyle: 'italic' }}>
                    Nikt Ci tego nie wytłumaczył. Teraz wiesz. Co z tym zrobisz, to już Twoja decyzja.
                  </div>
                  {brainAge > D.age + 1 && (
                    <div style={{ marginTop: 8, fontSize: 11.5, color: M.t4 }}>
                      Masz <strong style={{ color: M.t2 }}>{D.age} lat</strong>. Twój organizm ma <strong style={{ color: bioAge > D.age + 2 ? M.org : M.t2 }}>{Math.round(bioAge)}</strong>. Twój mózg ma <strong style={{ color: brainAge > D.age + 3 ? M.red : M.org }}>{Math.round(brainAge)}</strong>.
                    </div>
                  )}
                </div>
              </div>
            </Reveal>

            {/* Before/After - TERAZ vs PO 3 MIESIĄCACH */}
            {SC > 15 && (
              <Reveal delay={90}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, width: '100%' }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '14px 10px', background: 'rgba(220,68,68,0.08)', borderRadius: 12, border: '1px solid rgba(220,68,68,0.15)' }}>
                    <div style={{ fontFamily: M.mono, fontSize: 9, color: M.t4, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 6 }}>TERAZ</div>
                    <div style={{ fontFamily: M.mono, fontSize: 24, fontWeight: 800, color: M.red }}>{potential}%</div>
                    <div style={{ fontSize: 10, color: M.t4, marginTop: 3 }}>potencjału</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '14px 10px', background: 'rgba(200,168,78,0.08)', borderRadius: 12, border: '1px solid rgba(200,168,78,0.15)' }}>
                    <div style={{ fontFamily: M.mono, fontSize: 9, color: M.t4, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 6 }}>PO 3 MIESIĄCACH</div>
                    <div style={{ fontFamily: M.mono, fontSize: 24, fontWeight: 800, color: M.gold }}>{Math.min(potential + Math.round(SC * 0.45), 95)}%</div>
                    <div style={{ fontSize: 10, color: M.grn, marginTop: 3, fontWeight: 600 }}>+{Math.round(SC * 0.45)}% odzyskane</div>
                  </div>
                </div>
              </Reveal>
            )}

            {/* ═══ SCREEN 2: PRIORYTET #1 ═══ */}
            <Reveal delay={100}>
              <div style={{
                position: 'relative', overflow: 'hidden',
                background: `linear-gradient(160deg, rgba(19,19,19,0.95), ${M.gold}0a)`,
                border: `2px solid ${M.gold}35`,
                padding: '20px 16px', marginBottom: 20, borderRadius: 14, width: '100%', boxSizing: 'border-box',
                boxShadow: `0 4px 24px ${M.gold}10`,
              }}>
                <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: M.gold, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: M.gold, display: 'inline-block', boxShadow: `0 0 8px ${M.gold}60` }} />
                  {imie.trim() ? `${imie.trim()}, Twój priorytet nr 1` : 'Twój priorytet nr 1'}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: M.t1, marginBottom: 8, lineHeight: 1.35 }}>
                  {priority.area}
                </div>
                <p style={{ fontSize: 13, color: M.t2, lineHeight: 1.65, marginBottom: 10 }}>
                  {priority.action}
                </p>
                <div style={{ fontFamily: M.mono, fontSize: 10, color: M.grn, letterSpacing: 1, padding: '6px 10px', background: `${M.grn}0c`, border: `1px solid ${M.grn}20`, borderRadius: 8, display: 'inline-block' }}>
                  {priority.impact}
                </div>
              </div>
            </Reveal>

            {/* ═══ SCREEN 3: 6 KATEGORII (compact bars) ═══ */}
            <Reveal delay={110}>
              <div style={{
                background: M.s1, border: `1px solid ${M.brd}`,
                padding: '18px 16px', marginBottom: 20, borderRadius: 14, width: '100%', boxSizing: 'border-box',
              }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 16 }}>Twój profil</div>
                {/* Pain amplification */}
                {D.sleep < 6 && <div style={{ fontSize: 11, color: M.t4, lineHeight: 1.5, marginBottom: 12, padding: '8px 10px', background: `${M.red}08`, borderRadius: 8, border: `1px solid ${M.red}10` }}>Poniżej 6h snu mózg nie kończy cyklu oczyszczania. Toksyny metaboliczne zostają. Każda taka noc to skumulowana szkoda.</div>}
                {D.stress >= 3 && D.sleep >= 6 && <div style={{ fontSize: 11, color: M.t4, lineHeight: 1.5, marginBottom: 12, padding: '8px 10px', background: `${M.red}08`, borderRadius: 8, border: `1px solid ${M.red}10` }}>Chroniczny kortyzol nie spada sam. Organizm zaczyna traktować ten poziom jako normę. Im dłużej czekasz, tym trudniej go ściągnąć.</div>}
                {D.weekendWork >= 2 && D.sleep >= 6 && D.stress < 3 && <div style={{ fontSize: 11, color: M.t4, lineHeight: 1.5, marginBottom: 12, padding: '8px 10px', background: `${M.red}08`, borderRadius: 8, border: `1px solid ${M.red}10` }}>2 dni tygodniowo na 60% mocy = 100 dni w roku. Przez 5 lat to prawie 2 lata gorszych decyzji i słabszej pracy.</div>}
                {catScores.map((cat, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < catScores.length - 1 ? 10 : 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: M.t2, width: 72, flexShrink: 0 }}>{cat.label}</span>
                    <div style={{ flex: 1, height: 8, background: M.s3, borderRadius: 4, overflow: 'hidden', minWidth: 0 }}>
                      <div style={{ height: '100%', background: catBarColor(cat.pct), width: `${cat.pct}%`, borderRadius: 4, transition: 'width 1s ease .2s' }} />
                    </div>
                    <span style={{ fontFamily: M.mono, fontSize: 12, fontWeight: 700, color: catBarColor(cat.pct), width: 38, flexShrink: 0, textAlign: 'right' }}>{cat.pct}%</span>
                    {catBadge(cat.pct) && <span style={{ fontFamily: M.mono, fontSize: 8, fontWeight: 800, color: '#000', background: catBadgeColor(cat.pct), padding: '2px 5px', borderRadius: 3, letterSpacing: 0.5, flexShrink: 0 }}>{catBadge(cat.pct)}</span>}
                  </div>
                ))}
              </div>
            </Reveal>

            {/* ═══ SCREEN 4: COLLAPSIBLE SECTIONS ═══ */}

            {/* Collapsible: Koszty - TEASER tylko total + 1 insight */}
            <div style={{ marginBottom: 12 }}>
              <button onClick={() => setShowDetails(!showDetails)} style={{
                width: '100%', padding: '14px 18px', background: M.s1, border: `1px solid ${M.brd}`,
                borderRadius: showDetails ? '12px 12px 0 0' : 12, color: M.t2, fontSize: 13, fontWeight: 600, fontFamily: M.sans,
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                Ile realnie to Cię kosztuje ({C.total.toLocaleString('pl-PL')} zł / 6 mies.)
                <span style={{ transform: showDetails ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s', fontSize: 12 }}>&#9660;</span>
              </button>
              {showDetails && (
                <div style={{ padding: '16px 18px', background: M.s1, borderRadius: '0 0 12px 12px', border: `1px solid ${M.brd}`, borderTopWidth: 0 }}>
                  <div style={{ fontSize: 13, color: M.t3, lineHeight: 1.6, marginBottom: 12 }}>
                    Razem <strong style={{ color: M.gold }}>{C.total.toLocaleString('pl-PL')} zł</strong> w półrocze. Z tego <strong style={{ color: M.t2 }}>{C.hardTotal.toLocaleString('pl-PL')} zł</strong> wychodzi Ci z konta, <strong style={{ color: M.t2 }}>{C.hiddenTotal.toLocaleString('pl-PL')} zł</strong> to niewidzialne koszty: stracone treningi, gorsza praca, wolniejsza regeneracja.
                  </div>
                  {C.brakes > 0 && C.wastedSessions > 0 && (
                    <div style={{ padding: '12px 14px', background: M.s2, borderRadius: 10, fontSize: 12, color: M.t3, lineHeight: 1.6 }}>
                      <strong style={{ color: M.t1 }}>{C.brakes}/5 hamulców</strong> aktywnych. <strong style={{ color: M.t1 }}>{C.wastedPct}%</strong> wysiłku treningowego idzie w próżnię. <strong style={{ color: M.t1 }}>{C.stagnationMonths} mies.</strong> stagnacji.
                    </div>
                  )}
                  <div style={{ marginTop: 14, padding: '12px 14px', background: `${M.gold}08`, borderRadius: 10, fontSize: 11.5, color: M.t3, lineHeight: 1.55 }}>
                    Rozbicie tych kosztów per kategoria i plan jak to zatrzymać, omawiam 1:1.
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible: Badania krwi - TEASER top 3 tylko */}
            {badaniaUnique.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <button onClick={() => setShowBadania(!showBadania)} style={{
                  width: '100%', padding: '14px 18px', background: M.s1, border: `1px solid ${M.brd}`,
                  borderRadius: showBadania ? '12px 12px 0 0' : 12, color: M.t2, fontSize: 13, fontWeight: 600, fontFamily: M.sans,
                  cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  Ile i jakich badań krwi widzę dla Ciebie ({badaniaUnique.length})
                  <span style={{ transform: showBadania ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s', fontSize: 12 }}>&#9660;</span>
                </button>
                {showBadania && (
                  <div style={{ padding: '16px 18px', background: M.s1, borderRadius: '0 0 12px 12px', border: `1px solid ${M.brd}`, borderTopWidth: 0 }}>
                    <div style={{ fontSize: 13, color: M.t3, lineHeight: 1.6, marginBottom: 14 }}>
                      Dla Twojego profilu widzę <strong style={{ color: M.t1 }}>{badaniaUnique.length} badań</strong> do zrobienia. Trzy, od których warto zacząć:
                    </div>
                    <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: M.gold, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: M.gold }} /> Pierwsza trójka
                    </div>
                    {[...badaniaWysoki, ...badaniaSredni].slice(0, 3).map((b, i) => (
                      <div key={`top-${i}`} style={{ padding: '10px 0', borderBottom: i < 2 ? `1px solid ${M.brd}` : 'none' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: M.t1 }}>{b.nazwa}</div>
                        <div style={{ fontSize: 11.5, color: M.t3, lineHeight: 1.5, marginTop: 4 }}>{b.dlaczego}</div>
                      </div>
                    ))}
                    <div style={{ marginTop: 16, padding: '14px', background: `${M.gold}08`, borderRadius: 10, fontSize: 12, color: M.t3, lineHeight: 1.55 }}>
                      Resztę badań, kolejność i interpretację wyników omawiam na DM. Każdy panel leci pod Twój profil, nie z szablonu.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Collapsible: Progresja */}
            {SC > 20 && (
              <div style={{ marginBottom: 12 }}>
                <button onClick={() => setShowProgresja(!showProgresja)} style={{
                  width: '100%', padding: '14px 18px', background: M.s1, border: `1px solid ${M.brd}`,
                  borderRadius: showProgresja ? '12px 12px 0 0' : 12, color: M.t2, fontSize: 13, fontWeight: 600, fontFamily: M.sans,
                  cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  Co się stanie jeśli nic nie zmienisz
                  <span style={{ transform: showProgresja ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s', fontSize: 12 }}>&#9660;</span>
                </button>
                {showProgresja && (
                  <div style={{ padding: '16px 18px', background: M.s1, borderRadius: '0 0 12px 12px', border: `1px solid ${M.brd}`, borderTopWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 7, height: 7, borderRadius: 4, background: '#dc2626', boxShadow: `0 0 6px #dc262650` }} />
                      <span style={{ fontFamily: M.mono, fontSize: 11, fontWeight: 700, color: '#dc2626' }}>Za 12 miesięcy bez zmian</span>
                    </div>
                    <div style={{ fontSize: 13.5, color: M.t2, lineHeight: 1.65, marginLeft: 15 }}>
                      Mózg na <strong style={{ color: M.red }}>{cognitiveIn5Years}% mocy za 5 lat</strong>. Sprawność kognitywna <strong style={{ color: M.red }}>{Math.max(cognitive - Math.round(cognitiveDecayPerYear * 0.5), 30)}%</strong>. Objawy, które teraz są irytujące, zaczynają wymagać leczenia.
                    </div>
                    <div style={{ marginTop: 14, padding: '12px 14px', background: `${M.gold}08`, borderRadius: 10, fontSize: 11.5, color: M.t3, lineHeight: 1.55 }}>
                      Jak ta trajektoria wygląda miesiąc po miesiącu i gdzie można ją zatrzymać, omawiam 1:1.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Collapsible: Hormony - TEASER nazwy + strzałki, bez diagnoz */}
            {hormones.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <button onClick={() => setShowHormony(!showHormony)} style={{
                  width: '100%', padding: '14px 18px', background: M.s1, border: `1px solid ${M.brd}`,
                  borderRadius: showHormony ? '12px 12px 0 0' : 12, color: M.t2, fontSize: 13, fontWeight: 600, fontFamily: M.sans,
                  cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  Które hormony mi się tu świecą ({hormones.length})
                  <span style={{ transform: showHormony ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s', fontSize: 12 }}>&#9660;</span>
                </button>
                {showHormony && (
                  <div style={{ padding: '16px 18px', background: M.s1, borderRadius: '0 0 12px 12px', border: `1px solid ${M.brd}`, borderTopWidth: 0 }}>
                    <div style={{ fontSize: 13, color: M.t3, lineHeight: 1.6, marginBottom: 12 }}>
                      Na podstawie Twoich odpowiedzi <strong style={{ color: M.t1 }}>{hormones.length} osi hormonalnych</strong> wymaga sprawdzenia:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                      {hormones.map((h, i) => (
                        <span key={i} style={{ fontSize: 12, fontWeight: 600, color: M.t1, padding: '6px 12px', background: M.s2, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, color: h.c }}>{h.a}</span> {h.n}
                        </span>
                      ))}
                    </div>
                    <div style={{ padding: '12px 14px', background: `${M.gold}08`, borderRadius: 10, fontSize: 11.5, color: M.t3, lineHeight: 1.55 }}>
                      Które z tych osi naprawiać w pierwszej kolejności i w jakim tempie, decyduję po wynikach krwi w 1:1.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ DIAGNOZA - co widzę w Twoich odpowiedziach (Kalski) ═══ */}
            <Reveal delay={115}>
              <div style={{
                padding: '22px 18px', marginBottom: 14, borderRadius: 14,
                background: M.s1,
                border: `1px solid ${M.brd}`,
              }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, color: M.t4, marginBottom: 14, textTransform: 'uppercase', fontWeight: 700 }}>
                  {imie.trim() ? `${imie.trim()}, co tu widzę` : 'Co tu widzę'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {D.sleep < 7 && <div style={{ fontSize: 14, color: M.t2, lineHeight: 1.6 }}><strong style={{ color: M.t1 }}>Śpisz {D.sleep}h.</strong> To nie jest o zegarze. Przy takim rytmie kortyzol nie resetuje się w nocy, rano startujesz już z niższej pozycji.</div>}
                  {D.stress >= 2 && <div style={{ fontSize: 14, color: M.t2, lineHeight: 1.6 }}><strong style={{ color: M.t1 }}>Stres na {D.stress}/5.</strong> Organizm przestał odróżniać alarm od normy. Testosteron i kortyzol mają ten sam prekursor, wygrywa zawsze ten bardziej potrzebny.</div>}
                  {D.mondayFeel >= 1 && <div style={{ fontSize: 14, color: M.t2, lineHeight: 1.6 }}><strong style={{ color: M.t1 }}>Poniedziałek startujesz na minusie.</strong> Piątek wziął Ci 3 dni regeneracji. Tego się nie naprawia przez „mniej pić”.</div>}
                  {D.trainHappy >= 1 && D.trainYears >= 2 && <div style={{ fontSize: 14, color: M.t2, lineHeight: 1.6 }}><strong style={{ color: M.t1 }}>{D.trainYears} lat trenujesz, a efekty nie idą.</strong> Gdyby trening sam z siebie wystarczył, byłoby widać. Problem siedzi w pozostałych 163 godzinach tygodnia.</div>}
                  {D.triedBefore >= 2 && <div style={{ fontSize: 14, color: M.t2, lineHeight: 1.6 }}><strong style={{ color: M.t1 }}>Próbowałeś parę razy sam.</strong> Dyscypliny Ci nie brakuje. Brakuje danych z własnego organizmu, żeby wiedzieć, co dokładnie ruszać i w jakiej kolejności.</div>}
                  <div style={{ fontSize: 14, color: M.t3, lineHeight: 1.6, paddingTop: 12, borderTop: `1px solid ${M.brd}`, marginTop: 4, fontStyle: 'italic' }}>Te rzeczy się zazębiają. Pojedyncza zmiana nie trzyma długo, bo reszta natychmiast się przesuwa.</div>
                </div>
              </div>
            </Reveal>

            {/* ═══ DECYZJA - Kalski pozycjonuje, nie sprzedaje ═══ */}
            <Reveal delay={130}>
              <div style={{
                position: 'relative', overflow: 'hidden',
                background: `linear-gradient(160deg, rgba(19,19,19,0.95), rgba(200,168,78,0.08))`,
                border: `2px solid ${M.gold}40`,
                padding: '30px 22px', marginBottom: 20, borderRadius: 18, width: '100%', boxSizing: 'border-box',
                boxShadow: `0 0 40px ${M.gold}10, inset 0 1px 0 ${M.gold}15`,
              }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-25deg)', fontFamily: M.mono, fontSize: 52, fontWeight: 900, color: `${M.gold}04`, letterSpacing: 8, whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none' }}>HANTLE I TALERZ</div>

                {(() => {
                  const worstCat = catScores.reduce((a, b) => a.pct < b.pct ? a : b, catScores[0]);
                  const topCatLabel = worstCat.label;
                  const imieDisplay = imie.trim() || 'Stary';
                  return (
                    <div style={{ position: 'relative' }}>
                      <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.gold, fontWeight: 700, marginBottom: 14 }}>
                        Co z tym dalej
                      </div>
                      <h3 style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.15, marginBottom: 18, color: M.t1, letterSpacing: '-0.01em' }}>
                        {SC > 60
                          ? <>{imieDisplay}, to nie jest pojedynczy problem. To spięty układ.</>
                          : SC > 40
                          ? <>{imieDisplay}, {topCatLabel.toLowerCase()} ciągnie resztę za sobą.</>
                          : <>{imieDisplay}, baza jest. Ale widzę, co się rozjedzie.</>}
                      </h3>
                      <p style={{ fontSize: 14.5, color: M.t2, lineHeight: 1.7, marginBottom: 20 }}>
                        Od 9 lat pracuję z facetami w Twojej sytuacji. <strong style={{ color: M.t1 }}>180+ podopiecznych</strong>, 300+ paneli hormonalnych, 5.0 na Google. Tak to wygląda: <strong style={{ color: M.t1 }}>krew + Twoje odpowiedzi + plan pod Twój organizm</strong>. 6 miesięcy tygodniowych korekt. Piszesz do mnie na DM jak do kumpla, ja odpowiadam w ciągu dnia.
                      </p>
                      <div style={{ padding: '16px 18px', marginBottom: 24, background: `${M.gold}08`, borderRadius: 12, borderLeft: `3px solid ${M.gold}` }}>
                        <div style={{ fontSize: 13.5, color: M.t2, lineHeight: 1.65 }}>
                          {SC > 60
                            ? <>Z Twoich odpowiedzi widzę, że <strong style={{ color: M.t1 }}>{topCatLabel.toLowerCase()}</strong> ciągnie najmocniej. Ruszenie tego bez reszty to droga donikąd, sam byłem przy paru takich próbach z podopiecznymi, którzy przyszli dopiero po kolejnym nieudanym podejściu.</>
                            : SC > 40
                            ? <>Główny punkt to <strong style={{ color: M.t1 }}>{topCatLabel.toLowerCase()}</strong>, ale tu nie wchodzi się pojedynczą zmianą. Ten problem w Twoim wieku ma konkretną sekwencję, którą ustalamy razem.</>
                            : <>Masz {D.age} lat i okno, w którym te interwencje działają nieliniowo dobrze. Za 5 lat ten sam efekt kosztuje półroczną terapię. Widzę to na podopiecznych, którzy przyszli za późno.</>}
                        </div>
                      </div>
                      {(() => {
                        const dmText = `hej michal, zrobilem diagnostyke - ${topCatLabel.toLowerCase()} ciagnie, ${potential}% potencjalu. chcialbym porozmawiac o prowadzeniu`;
                        const dmHref = `https://ig.me/m/hantleitalerz?text=${encodeURIComponent(dmText)}`;
                        return (
                          <>
                            <a
                              href="https://nabor.talerzihantle.com?utm_source=diagnostyka"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shimmer-btn"
                              onClick={() => { trackEvent('diag_cta_click', { target: 'nabor_primary', score: SC, category: topCatLabel }); fbqTrack('AddToCart', { content_name: 'nabor_aplikacja', content_category: 'high_ticket', value: SC, currency: 'PLN' }); }}
                              style={{
                                display: 'block', textAlign: 'center',
                                background: `linear-gradient(135deg, ${M.gold}, #a08a3e)`,
                                color: M.bg,
                                fontFamily: M.sans, textDecoration: 'none', padding: '20px',
                                marginBottom: 10, borderRadius: 14,
                                boxShadow: '0 4px 24px rgba(200,168,78,0.25)',
                                position: 'relative', overflow: 'hidden',
                              } as React.CSSProperties}
                            >
                              <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1.2 }}>
                                WYPEŁNIJ PEŁNĄ APLIKACJĘ
                              </span>
                              <span style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: 1.5, marginTop: 4, opacity: 0.85 }}>
                                12 pytań &middot; 10 min &middot; wracam w 24h w DM
                              </span>
                            </a>
                            <div style={{ fontSize: 11.5, color: M.t4, lineHeight: 1.55, textAlign: 'center', marginBottom: 10 }}>
                              Aplikacja na sześciomiesięczne prowadzenie 1:1. Twoje odpowiedzi czytam osobiście. Wracam w 24h w DM @hantleitalerz z decyzją: pasujemy, nie pasujemy, dopytuję jeszcze 2 rzeczy.
                            </div>
                            <a
                              href={dmHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => trackEvent('diag_cta_click', { target: 'dm_secondary', score: SC, category: topCatLabel })}
                              style={{
                                display: 'block', textAlign: 'center', padding: '10px',
                                color: M.t4, fontSize: 11.5, fontWeight: 500, fontFamily: M.sans,
                                textDecoration: 'underline', textDecorationColor: `${M.t4}55`, textUnderlineOffset: 3,
                                marginBottom: 14,
                              }}
                            >
                              albo napisz od razu w DM @hantleitalerz →
                            </a>
                          </>
                        );
                      })()}
                      <div style={{ fontSize: 13, color: M.t3, lineHeight: 1.6, textAlign: 'center', paddingTop: 14, borderTop: `1px solid ${M.gold}20`, fontStyle: 'italic' }}>
                        Imprezujesz w piątek. Poniedziałek ma być Twój.
                      </div>
                    </div>
                  );
                })()}
              </div>
            </Reveal>

            {/* Źródła - kompaktowe */}
            <div style={{ padding: '12px', fontSize: 10, color: M.t4, lineHeight: 1.6, fontFamily: M.mono }}>
              Źródła: RAND 2016, Leproult & Van Cauter JAMA 2011, Parr et al. 2014, Cappuccio et al. 2010, Hemp HBR 2004, Vingren et al. 2013, Halson 2014, Schoenfeld et al. 2017, Expert Rev. Endocrinol. Metab. 2023
            </div>

            {/* ═══ STICKY CTA ═══ */}
            {showStickyCta && (
              <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
                padding: '12px 20px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
                background: 'linear-gradient(to top, rgba(10,10,10,0.95), rgba(10,10,10,0.8), transparent)',
              }}>
                <a
                  href="https://nabor.talerzihantle.com?utm_source=diagnostyka_sticky"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { trackEvent('diag_cta_click', { target: 'nabor_sticky', score: SC }); fbqTrack('InitiateCheckout', { content_name: 'nabor_sticky', content_category: 'high_ticket', value: SC, currency: 'PLN' }); }}
                  style={{
                    display: 'block', width: '100%', maxWidth: 520, margin: '0 auto',
                    padding: '14px', textAlign: 'center', borderRadius: 12,
                    background: `linear-gradient(135deg, ${M.gold}, #a08a3e)`,
                    color: M.bg, fontWeight: 800, fontSize: 13.5, textDecoration: 'none',
                    letterSpacing: 1.2,
                    boxShadow: '0 4px 20px rgba(200,168,78,0.35)',
                  }}
                >
                  WYPEŁNIJ PEŁNĄ APLIKACJĘ &rarr;
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── FOOTER ── */}
        <footer style={{ textAlign: 'center', padding: '24px 16px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, borderTop: `1px solid ${M.brd}` }}>
          <Logo />
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              href="https://ig.me/m/hantleitalerz?text=wje%C5%BCd%C5%BCam"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: M.mono, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: M.t4, textDecoration: 'none' }}
            >
              Współpraca 1:1
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
          <span style={{ fontFamily: M.mono, fontSize: 9.5, color: M.t4, letterSpacing: 1 }}>Hantle i Talerz &copy; 2026</span>
        </footer>

      </div>
    </>
  );
}
