// Podglad Karty na mock-danych. Jedzie z buildem, ale nie ma prawa wpasc do wyszukiwarki.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function PreviewWowLayout({ children }: { children: React.ReactNode }) {
  return children;
}
