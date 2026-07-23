'use client';

// Zapis karty = druk do PDF przez przeglądarkę. Bez backendu, bez wysyłki.
// @media print w WeekPage czyści stronę do samego artefaktu.
export default function SaveCardButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="wp-save">
      {label}
    </button>
  );
}
