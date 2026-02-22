import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ile Cię kosztuje to jak żyjesz? | Hantle i Talerz',
  description: 'Przelicz hormony, mózg i formę na złotówki. 2 minuty, zero oceniania.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
