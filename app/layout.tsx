import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ile Cię kosztuje to jak żyjesz? | Hantle i Talerz',
  description: 'Przelicz hormony, mózg i formę na złotówki. 2 minuty, zero oceniania.',
  openGraph: {
    title: 'Ile Cię kosztuje to jak żyjesz? | Hantle i Talerz',
    description: 'Przelicz hormony, mózg i formę na złotówki. 2 minuty, zero oceniania.',
    url: 'https://diagnostyka.talerzihantle.com',
    siteName: 'Diagnostyka | Hantle i Talerz',
    images: [
      {
        url: 'https://diagnostyka.talerzihantle.com/og.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'pl_PL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ile Cię kosztuje to jak żyjesz? | Hantle i Talerz',
    description: 'Przelicz hormony, mózg i formę na złotówki. 2 minuty, zero oceniania.',
    images: ['https://diagnostyka.talerzihantle.com/og.png'],
  },
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  other: {
    'theme-color': '#0a0a0a',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        {/* Floating particles background */}
        <div className="particle-container">
          <div className="particle particle-1"></div>
          <div className="particle particle-2"></div>
          <div className="particle particle-3"></div>
        </div>
        {children}
      </body>
    </html>
  );
}
