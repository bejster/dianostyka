# AUDYT OBECNEJ APLIKACJI DIAGNOSTYKI TYGODNIA (ETAP 0)

**Data audytu:** 2026-07-27  
**Wersja bazowa:** `codex/funnel-pilot-2026-07-15` / `feat/diagnostyka-v2`  
**Projekt:** Diagnostyka Tygodnia (Hantle i Talerz)  
**URL produkcji:** https://diagnostyka.talerzihantle.com/  

---

## 1. ARCHITEKTURA TECHNICZNA

- **Framework & Wersja:** Next.js 16.1.6 (App Router with Turbopack), React 19.2.3, TypeScript 5.9.3.
- **Stylizacje & Design Tokens:** Inline CSS z centralnym tokenem `M` (gold, dark theme `#0e0e0e`, serif Google fonty / Inter) oraz Tailwind CSS v4.
- **Routing:**
  - `/` (`app/page.tsx`) — Strona główna z landingiem, 7 sekcjami quizu, generatorem reframe, ekranem wyników i artefaktem `WeekPage`.
  - `/w` (`app/w/page.tsx`) — Dynamiczny viewer zapisanej karty tygodnia z weryfikacją JWT tokena (`jose`).
  - `/w/preview` (`app/w/preview/page.tsx`) — Dev/Admin preview dla generowanych kart.
  - `/api/diagnoza` (`app/api/diagnoza/route.ts`) — Serverless API łączące z OpenRouter (DeepSeek V3 / Claude) generujące reframe z wypowiedzi usera.
  - `/api/subscribe` (`app/api/subscribe/route.ts`) — Integracja z MailerLite API v2 (zapis leada + tagowanie).
  - `/api/telegram-lead` (`app/api/telegram-lead/route.ts`) — Zawiadomienie w czasie rzeczywistym na Telegrama o nowym leadzie.
  - `/api/og` (`app/api/og/route.ts`) — Dynamiczne generowanie kart społecznościowych PNG (`@vercel/og`).
- **Scoring Engine:** Determinastyczny silnik `score(D: FD)` w `app/page.tsx` oraz `buildWeekPlan(input)` w `app/lib/week-plan.ts`.
- **Analityka & Tracking:**
  - Custom beacon eventy na `https://n8n.srv1313512.hstgr.cloud/webhook/diagnostyka-events`.
  - Meta Pixel (`fbqTrack`) z eventami `Lead`, `InitiateCheckout`, `ViewContent`.
- **Hosting & Deployment:** Netlify (`@netlify/plugin-nextjs`) oraz Vercel target.

---

## 2. PEŁNY INVENTORY PYTAŃ (CURRENT APP)

| ID | Sekcja | Treść pytania | Typ odpowiedzi | Co mierzy | Wpływ na scoring / raport | Decyzja (V2) |
|---|---|---|---|---|---|---|
| Q0 | Start | Imię | Text Input | Identyfikacja usera | Personalizacja raportu | Zachować |
| Q1 | Sen | Ile godzin śpisz średnio w nocy? | Slider (4-9h) | Dług regeneracyjny | `sleepScore`, wiek biologiczny | Zachować (Single Screen) |
| Q2 | Sen | Jaka jest jakość Twojego snu? | Single choice cards | Regenerację NREM | `sleepQ`, sekcja I | Zachować |
| Q3 | Sen | Kiedy odkładasz telefon/ekrany przed snem? | Single choice cards | Higienę glikemiczno-światłą | `screenBed`, osie hormonalne | Zachować |
| Q4 | Stres | Ile godzin pracujesz w ciągu dnia? | Slider (6-14h) | Obciążenie psychiczne | `workHours`, podatek od stresu | Zachować |
| Q5 | Stres | Jak oceniasz poziom napięcia w pracy? | Single choice cards | Aktywację osi HPA | `stressScore`, kortyzol | Zachować |
| Q6 | Stres | Kiedy czujesz największy spadek energii? | Single choice cards | Pęknięcie dnia (`breakWindow`) | Wykres 0-24h, godzina pęknięcia | Zachować |
| Q7 | Żywienie | Jak wygląda Twój wieczór po pracy? | Single choice cards | Wieczorny apetyt | `dietChaos`, `binge` | Zachować |
| Q8 | Żywienie | Ile wydajesz miesięcznie na dowozy / jedzenie na mieście? | Slider (0-2000 zł) | Realny wydatek | `hardTotal`, koszt 6-miesięczny | Zachować |
| Q9 | Weekend | Co dzieje się z Twoim rytmem w weekend? | Single choice cards | Koszt powrotu w poniedziałek | `wknd`, podatek od weekendu | Zachować |
| Q10 | Weekend | Ile alkoholu pijesz w przeciętnym tygodniu? | Single choice cards | Oś regeneracji NREM/wątroby | `drinks`, rezygnacja z alkoholu | Branching (Warunkowe) |
| Q11 | Trening | Ile razy w tygodniu trenujesz lub planujesz? | Single choice cards | Tarcie wykonawcze | `plan`, `miss` | Zachować |
| Q12 | Trening | Ile wydajesz miesięcznie na siłownię / karnety? | Number input | Wydatek finansowy | Wyliczenie ukrytego kosztu | Zachować |
| Q13 | Sygnały | Jakie objawy zauważasz u siebie w ostatnich miesiącach? | Multi-select chips | Objawy obciążenia | `tags` (20 symptomów), lista lab | Zachować (Multi-card) |
| Q14 | Głowa | Co najbardziej frustruje Cię w Twojej obecnej formie? | Text Input / Select | Pain language leada | `pain`, reframe LLM | Zachować (Jedyny text input) |
| Q15 | Głowa | Co Twoim zdaniem trzyma Cię w miejscu? | Text Input / Select | Self-diagnosis leada | `selfDx`, reframe LLM | Zachować |
| Q16 | Głowa | Dlaczego akurat teraz to sprawdzasz? | Text Input / Select | Trigger leada | `trigger`, segment leada | Zachować |

---

## 3. AUDYT UX & MOBILNY

- **Problem wielopytaniowych bloków:** Obecna wersja grupuje pytania po 3-4 na sekcję, co wymaga długiego scrollowania na ekranie iPhone (390×844) i powoduje rozpraszanie uwagi.
- **Dostępność dla kciuka:** Karty i suwaki na mobile wymagają lepszych tarcz klikalnych (min. 52px).
- **Progress bar & Stany:** Użytkownik widzi sekcje I-VII, ale nie widzi dokładnego numeru pytania. Przycisk „Wstecz” działa, ale brakuje pełnego wsparcia dla powrotu po odświeżeniu strony (autosave sesji w `localStorage`).

---

## 4. AUDYT LOGIKI & SCORINGU

- Silnik `score(D: FD)` liczy wynik 0-100 ważony z 7 obszarów. Jest spójny i odporny, ale w V2 wymaga jawnego odseparowaniascoringu diagnostycznego od scoringu kwalifikacji sprzedażowej (`lead_fit`).
- 6 Profili Wyniku (Profil A-F) działają prawidłowo, a `buildWeekPlan` generuje spersonalizowane kotwice.

---

## 5. AUDYT TREŚCI (ANTI-AI VOICE AUDIT)

- Usunięto binarne slogany („To nie X, to Y”) oraz coachingową watę.
- Raport V2 musi zachować rzeczowy, męski i biologiczny język Michała bez obwiniania silnej woli i bez medycznych obietnic bez pokrycia.

---

## 6. AUDYT BENCHMARKÓW (Score.joinoptimized.com/cellhealth vs HiT)

- **Benchmark UX (Cell Health):** 1 pytanie na ekran, błyskawiczne przejście (250ms), jasna wizualizacja, pasek postępu, czyste karty single-choice.
- **Różnica HiT V2:** Zamiast laboratoryjnego pseudonaukowego UI, HiT V2 stawia na nowoczesny performance editorial, czarny motyw premium (`#0e0e0e`, akcenty złota `#c8a84e`), z głęboką neurofizjologią tygodnia i bezpośrednim generowaniem Karty Tygodnia online + PDF.
