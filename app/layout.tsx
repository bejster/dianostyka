import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Diagnostyka Neurochemiczna - Ile Cię kosztuje to jak żyjesz?',
  description: 'Sprawdź ile naprawdę tracisz na swoim stylu życia. Pełna diagnostyka: sen, stres, żywienie, weekend, trening.',
  openGraph: {
    title: 'Diagnostyka Neurochemiczna - Ile Cię kosztuje to jak żyjesz?',
    description: 'Sprawdź ile naprawdę tracisz na swoim stylu życia. Pełna diagnostyka: sen, stres, żywienie, weekend, trening.',
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
    title: 'Diagnostyka Neurochemiczna - Ile Cię kosztuje to jak żyjesz?',
    description: 'Sprawdź ile naprawdę tracisz na swoim stylu życia. Pełna diagnostyka: sen, stres, żywienie, weekend, trening.',
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
        {/* Meta Pixel - tracking lead funnel */}
        <script dangerouslySetInnerHTML={{__html:`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','1699985401399738');fbq('track','PageView');
        `}} />
        <noscript dangerouslySetInnerHTML={{__html:`<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1699985401399738&ev=PageView&noscript=1"/>`}} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
