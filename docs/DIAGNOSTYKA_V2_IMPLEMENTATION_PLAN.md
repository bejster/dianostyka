# IMPLEMENTATION PLAN: DIAGNOSTYKA TYGODNIA V2

**Projekt:** Diagnostyka Tygodnia V2 (Hantle i Talerz)  
**Gałąź:** `feat/diagnostyka-v2`  
**Cel:** Przebudowa assessmentu w system 1 pytanie / ekran z adaptacyjnym scoringiem, dynamiczną mapą tygodnia, 6 profilami, raportem online/PDF oraz zintegrowanym pozyskiwaniem leadów.

---

## ETRAPY IMPLEMENTACJI (FAZY)

### FAZA 1: Assessment Shell & 1-Question-per-Screen UX Component
- Stworzenie nadrzędnego komponentu `SingleQuestionFlow.tsx` z płynną animacją przejścia (250ms), autosave sesji w `localStorage`, nawigacją „Wstecz” oraz wskaźnikiem sekcji i progressu (np. `Krok 4 z 18`).
- Przygotowanie kart wyboru dla urządzeń mobilnych (min 52px wysokości tarczy klikalnej, reakcja na dotyk/haptics `vibe()`).
- Zapewnienie, że standardowe pytanie mieści się w całości bez scrolla na ekranie 390×844px.

### FAZA 2: Config-Driven Questions & Assessment Engine (`assessment-config.ts` & `scoring-engine.ts`)
- Ekstraktowana konfiguracja pytań do `app/lib/assessment-config.ts` (wersjonowana, niezależna od UI).
- Czysty silnik kalkulacyjny `app/lib/scoring-engine.ts` z testami jednostkowymi (odseparowanie scoringu diagnostycznego od sprzedażowego `lead_fit`).
- Obsługa branching'u (np. pytania warunkowe o alkohol/weekend tylko przy `wknd >= 2`).

### FAZA 3: Visual Result Teaser & Dynamic Online Report
- Ekran natychmiastowego wyniku przed podaniem emaila: Wynik Główny Odporności Tygodnia (0-100), Nazwa Profilu (A-F), Główne Domino oraz Kluczowa Synteza.
- Przeprojektowany Raport Online (`WeekPage.tsx` + `app/w/page.tsx`):
  1. Okładka / Hero
  2. Najważniejsze Odkrycie (Reframe LLM / Surowy cytat)
  3. Mapa Pęknięcia Tygodnia (Wizualna oś czasowa od środy do poniedziałku)
  4. 6 Obszarów / Domen
  5. Łańcuch Przyczynowo-Skutkowy (Domino)
  6. Mocne Strony
  7. 3 Ruchy na 14 Dni
  8. Czego Teraz Nie Robić
  9. Dopasowane Case Study
  10. Spersonalizowane CTA (Zimny / Warm / Hot Lead)

### FAZA 4: Email Gate & PDF Generation
- Rozdzielone zgody RODO (zgoda na dostarczenie raportu vs opcjonalny checkbox marketingowy).
- Zapis leada do MailerLite (`/api/subscribe`) z tagowaniem profilowym (`profile_weekend_cost`, `lead_hot`, itd.).
- Silnik generowania PDF (`/api/pdf` / client-side canvas PDF generation) z identycznym układasm jak raport online (`diagnoza-tygodnia-[imie]-[data].pdf`).

### FAZA 5: Analityka, Prywatność & Performance
- Śledzenie zdarzeń bez wysyłania wrażliwych danych zdrowotnych.
- Wsparcie dla bezpiecznych tokenów (`/w/[secure-token]`) uniemożliwiające indeksowanie prywatnych raportów w Google.
- Optymalizacja LCP < 2.5s, INP < 200ms.

---

## VERIFICATION & TESTS
- Testy jednostkowe w `tests/scoring-engine.test.ts` oraz `tests/week-plan.test.ts` dla 6 person testowych (`sleep_debt_michal`, `evening_hunger_loop`, `weekend_recovery_cost`, `fragile_perfect_plan`, `chronic_stress_driver`, `no_return_point`).
- Testy kompilacji Next.js `npm run build`.
