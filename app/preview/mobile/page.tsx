import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// Review aid on preview deployments only. Never part of the published lead flow.
export default function MobileReview() {
  if (process.env.VERCEL_ENV !== 'preview') notFound();
  return <main style={{ minHeight: '100vh', background: '#171715', padding: '24px 12px', color: '#f2eee4', fontFamily: 'Arial, sans-serif' }}>
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      <p style={{ fontSize: 14 }}>Podgląd układu na szerokości 390 px</p>
      <p><Link href="/" style={{ color: '#d3b365' }}>Otwórz stronę w pełnym oknie ↗</Link></p>
      <iframe title="Diagnostyka 168 na szerokości telefonu" src="/" style={{ display: 'block', width: 390, maxWidth: '100%', height: 1400, border: '1px solid #4c4432', borderRadius: 16, background: '#08080a' }} />
    </div>
  </main>;
}
