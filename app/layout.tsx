import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ile Cię kosztuje to jak żyjesz? | Hantle i Talerz',
  description: 'Przelicz hormony, mózg i formę na złotówki. 2 minuty, zero oceniania.',
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
