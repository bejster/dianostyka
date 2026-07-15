import type { Metadata } from 'next';

// Strona-podglad do share: /w?g=23:37&t=Wieczorny%20odpad&s=48
// Crawler (Messenger/IG/WhatsApp) czyta dynamiczne OG z godzina usera; czlowiek jest odsylany na quiz.
type SP = Promise<Record<string, string | string[] | undefined>>;

const pick = (v: string | string[] | undefined, max: number) =>
  (typeof v === 'string' ? v : '').slice(0, max);

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const g = pick(sp.g, 24) || '22:47';
  const t = pick(sp.t, 48);
  const s = pick(sp.s, 3);
  const img = `https://diagnostyka.talerzihantle.com/api/og?g=${encodeURIComponent(g)}&t=${encodeURIComponent(t)}&s=${encodeURIComponent(s)}`;
  const title = `Moje ${g} · o tej godzinie pęka mój tydzień`;
  const description = 'Godzina, typ i rachunek w złotówkach. Sprawdź swoje w 5 minut.';
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: img, width: 1200, height: 630 }], locale: 'pl_PL', type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [img] },
    robots: { index: false },
  };
}

export default async function W({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const g = pick(sp.g, 24) || '22:47';
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#e0ddd6', fontFamily: 'Georgia, serif', textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 13, letterSpacing: 6, color: '#c8a84e', fontWeight: 700, marginBottom: 18 }}>HANTLE I TALERZ</div>
      <div style={{ fontSize: 15, color: '#8a857a', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 8 }}>O tej godzinie pęka jego tydzień</div>
      <div style={{ fontSize: 84, fontStyle: 'italic', color: '#c8a84e', lineHeight: 1, marginBottom: 28 }}>{g}</div>
      <a href="/" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #c8a84e, #a08a3e)', color: '#0a0a0a', textDecoration: 'none', padding: '16px 28px', borderRadius: 12, fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>
        Sprawdź swoją godzinę &rarr;
      </a>
      <script dangerouslySetInnerHTML={{ __html: "setTimeout(function(){ location.replace('/'); }, 1600);" }} />
      <noscript><a href="/" style={{ color: '#c8a84e' }}>Przejdź do przeglądu</a></noscript>
    </main>
  );
}
