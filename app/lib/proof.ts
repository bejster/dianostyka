// ── Dowód: realne before/after klientów. NIE zmyślać, tylko prawdziwe efekty. ──
// Pusta tablica = sekcja "Efekt u innych" w Karcie się NIE renderuje (nic nie udajemy).
// Gdy będą zdjęcia:
//   1. wrzuć pliki do public/proof/ (np. case1-before.jpg + case1-after.jpg),
//   2. dodaj wpis niżej: { before: '/proof/case1-before.jpg', after: '/proof/case1-after.jpg', caption: 'krótko, konkret' }.
// Sekcja zapali się sama po dopisaniu pierwszego wpisu.
export interface ProofCase {
  before: string;
  after: string;
  caption?: string;
}

export const PROOF: ProofCase[] = [];
