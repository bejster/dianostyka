import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'O której godzinie pęka Twój tydzień? | Hantle i Talerz',
  description: 'Przegląd tygodnia w 5 minut. Na końcu: godzina, o której się sypiesz, liczby i rachunek, którego nikt Ci nie wystawił.',
  openGraph: {
    title: 'O której godzinie pęka Twój tydzień? | Hantle i Talerz',
    description: 'Przegląd tygodnia w 5 minut. Na końcu: godzina, o której się sypiesz, liczby i rachunek, którego nikt Ci nie wystawił.',
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
    title: 'O której godzinie pęka Twój tydzień? | Hantle i Talerz',
    description: 'Przegląd tygodnia w 5 minut. Na końcu: godzina, o której się sypiesz, liczby i rachunek, którego nikt Ci nie wystawił.',
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700;800&family=Instrument+Serif:ital@0;1&family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet" />
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
