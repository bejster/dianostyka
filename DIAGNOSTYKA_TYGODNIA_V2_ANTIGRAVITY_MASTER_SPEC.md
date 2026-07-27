# DIAGNOSTYKA TYGODNIA V2

Master Build Spec dla Google Antigravity

Projekt: Hantle i Talerz  
Obecna aplikacja: https://diagnostyka.talerzihantle.com/  
Strona marki: https://talerzihantle.com/  
Benchmark mechaniki: https://score.joinoptimized.com/cellhealth  
Język interfejsu: polski  
Priorytet: mobile-first  

## 0. POLECENIE DLA AGENTA

Jesteś jednocześnie:
- senior product designerem,
- UX researcherem,
- CRO strategiem,
- full-stack developerem,
- specjalistą od wizualizacji danych,
- QA engineerem,
- specjalistą od dostępności,
- analitykiem produktu.

Twoim zadaniem jest przebudować istniejącą Diagnostykę Tygodnia w pełnoprawny, produkcyjny assessment online, który:
- jest bardzo prosty i płynny na telefonie,
- pokazuje jedno pytanie na ekran,
- zachowuje wartościową logikę obecnej diagnostyki,
- daje realnie spersonalizowany wynik,
- generuje atrakcyjny raport online i PDF,
- pozyskuje jakościowe leady bez agresywnego wciskania rozmowy,
- nie udaje diagnozy medycznej,
- jest mierzalny, testowalny i łatwy do dalszej rozbudowy.

### Zasada pracy
Najpierw audyt, potem plan, potem implementacja.
Nie zaczynaj od ślepego przepisywania aplikacji. Najpierw uruchom aktualny projekt lokalnie, przejdź całą ścieżkę w przeglądarce, sprawdź kod, zależności, routing, formularz, scoring, API, bazę danych, integracje, wysyłkę maili, analitykę i deployment.

### Bezpieczeństwo
- Pracuj na nowej gałęzi: `feat/diagnostyka-v2`.
- Przed zmianami utwórz checkpoint/commit aktualnego stanu.
- Nie usuwaj produkcyjnych danych.
- Nie zmieniaj sekretów, domeny ani produkcyjnego deploymentu bez wyraźnej zgody właściciela.
- Nie wykonuj destrukcyjnych komend dotyczących systemu plików, dysków, baz danych ani hostingu.
- Nie publikuj aplikacji na produkcji. Przygotuj preview/staging i instrukcję wdrożenia.
- Nie wpisuj kluczy API do repozytorium.
- Zachowaj możliwość łatwego rollbacku.

---

## 1. DECYZJA STRATEGICZNA

Nie przenosimy całej diagnostyki do zwykłej podstrony głównego serwisu.

### Docelowa architektura:
**A. talerzihantle.com/diagnoza**
Krótki landing/pre-frame na głównej domenie marki.  
Jego funkcja:
- wyjaśnić problem,
- pokazać, czego użytkownik się dowie,
- przedstawić przykładowy wynik,
- zbudować zaufanie,
- skierować do assessmentu.
Landing nie powinien zawierać pełnego, długiego formularza.

**B. diagnostyka.talerzihantle.com**
Dedykowana aplikacja assessmentowa bez menu i rozpraszaczy.  
Jej funkcja:
- jedno pytanie na ekran,
- adaptacyjna ścieżka,
- zapis postępu,
- scoring,
- wynik,
- raport,
- pozyskanie leada,
- dopasowanie kolejnego kroku.

**C. Spersonalizowany wynik online**
Przykładowy routing: `/wynik/[secure-token]` lub `/report/[secure-token]`  
Raport online jest wersją główną. PDF jest generowany z tego samego źródła danych i służy jako wersja do zapisania/pobrania.

---

## 2. CEL BIZNESOWY I ODBIORCA

### Główny odbiorca
Mężczyzna 25–40 lat:
- pracuje umysłowo lub prowadzi biznes,
- jest przeciążony i ma mało czasu,
- zna podstawy treningu i odżywiania,
- wielokrotnie zaczynał redukcję lub „wracał do formy”,
- ma problem z wdrożeniem, nie z brakiem informacji,
- traci kontrolę wieczorem, przy stresie, podczas chaosu albo w weekend,
- chce wyglądać i funkcjonować lepiej bez udawania mnicha,
- jest zimnym lub letnim odbiorcą marki.

---

## 3. GŁÓWNA OBIETNICA PRODUKTU

**Nazwa:** Diagnoza Tygodnia  
**Główny wskaźnik:** Odporność Twojego Tygodnia  
**Obietnica:** Odkryj pierwszy moment, od którego rozjeżdża się Twój sen, energia, apetyt, trening i forma.  
**Supporting copy:** 4–5 minut. Jedno pytanie na ekran. Na końcu zobaczysz swój główny mechanizm, mapę tygodnia i trzy pierwsze ruchy.

---

## 4. AUDYT OBECNEJ APLIKACJI — ETAP 0

Przed implementacją utwórz plik: `docs/DIAGNOSTYKA_V2_AUDIT.md`.
Audyt ma zawierać:
1. Architekturę techniczną
2. Pełny inventory pytań
3. Audyt UX
4. Audyt logiki
5. Audyt treści
6. Audyt benchmarków

---

## 5. DOCELOWY USER FLOW
Landing (max 6 sekcji) $\rightarrow$ Question flow (1 pytanie / ekran, 16-20 pytań) $\rightarrow$ Visual result teaser $\rightarrow$ Email gate (opcjonalny / rozdzielony consent) $\rightarrow$ Spersonalizowany raport online + PDF.

---

## 6. QUESTION FLOW
- Jedno pytanie na jeden widok (cards single choice, sliders, num inputs).
- Autosave sesji, powrót wstecz bez utraty danych.
- Cienki progress bar, sekcje, micro-insights.

---

## 7. OBSZARY WYNIKU
6 domen: Sen i dług regeneracyjny, Energia i obciążenie, Apetyt i kontrola jedzenia, Trening i tarcie wykonawcze, Weekend i koszt powrotu, Odporność systemu na chaos.

---

## 8. SCORING & PROFILES
- Transparentny, konfigurowalny scoring engine.
- Oddzielenie scoringu diagnostycznego od sprzedażowego (lead fit).
- 6 profili (Profil A-F).

---

## 9. DESIGN SYSTEM, COPY & ACCESSIBILITY
- Modern performance editorial system, dark mode, high contrast, sans-serif typography.
- Naturalny, męski, bez-AI-slopu język Michała.
- RODO & Privacy checklist.
