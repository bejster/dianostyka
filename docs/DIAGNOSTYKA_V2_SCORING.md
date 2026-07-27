# DIAGNOSTYKA TYGODNIA V2 — SCORING & PROFILES SPECIFICATION

**Wersja silnika:** `2.0.0` (`scoring-engine.ts`)  
**Status:** Produkcyjnie przetestowany (`tests/scoring-engine.test.ts`)

---

## 1. ZASADY SCORINGU DOMENOWEGO (0–100)

Silnik mierzy 6 domen Odporności Tygodnia:
1. **Sen (`sleep`)** — długość snu, jakość pobudki, ekran przed snem.
2. **Energia i Stres (`energy`)** — poziom napięcia, godziny pracy, window pęknięcia.
3. **Żywienie (`nutrition`)** — wieczorne jedzenie, wydatek na dowozy.
4. **Weekend (`weekend`)** — rozjazd dobowy, spożycie alkoholu.
5. **Trening (`training`)** — tarcie wykonawcze i częstotliwość odpuszczania.
6. **Chaos i Głowa (`chaos`)** — liczba objawów psychosomatycznych i odkładanie decyzji.

Wzór normalizacji obszaru (100 = pełna odporność, 0 = punkt awarii):
$$DomainScore = 100 - Severity$$

---

## 2. ODPORNOŚĆ TYGODNIA (WYNIK GŁÓWNY 0–100)

$$OverallScore = (0.50 \times Avg_{all}) + (0.30 \times Avg_{2worst}) + (0.20 \times Resilience_{best})$$

- $Avg_{all}$: Średnia arytmetyczna ze wszystkich 6 domen.
- $Avg_{2worst}$: Średnia z 2 najsłabszych domen (waga najgorszych wycieków).
- $Resilience_{best}$: Wynik najsilniejszej domeny (bufor powrotu).

---

## 3. FORMULA GŁÓWNEGO DOMINO (PRIMARY LEVER)

Dla każdej domeny wyliczamy wskaźnik siły oddziaływania:
$$PrimaryLeverScore = (Severity \times 0.45) + (UpstreamWeight \times 100 \times 0.35) + (CrossDomainImpact \times 100 \times 0.20)$$

Domena z najwyższym wynikiem staje się główną dźwignią (Głównym Domino) w raporcie.

---

## 4. PROFILE WYNIKÓW (A – F)

| Profil | Kod | Nazwa Profilu | Główna Domena | Core Insight |
|---|---|---|---|---|
| Profil A | `A` | **Zaczynasz dzień na minusie** | `sleep` | Dzień nie sypie się popołudniu, ale rano przez opóźniony pik kortyzolu. |
| Profil B | `B` | **Wieczór zjada Ci następny dzień** | `nutrition` | Wieczorny apetyt to fizjologiczna odpowiedź na całodniowe napięcie. |
| Profil C | `C` | **Weekend kosztuje Cię trzy dni** | `weekend` | Rozjazd zegara biologicznego w weekend spłaca się aż do środy. |
| Profil D | `D` | **Twój plan działa tylko w laboratorium** | `training` | Przeładowany plan bez wersji minimum odpada przy pierwszym pożarze. |
| Profil E | `E` | **Cały tydzień jedziesz na napięciu** | `energy` | Stała aktywacja osi HPA blokuje nocną regenerację i obniża testosteron. |
| Profil F | `F` | **Nie brakuje Ci wiedzy. Brakuje Ci punktu powrotu** | `chaos` | Problem tkwi w braku procedury szybkiego powrotu po odchyleniu. |

---

## 5. SEGMENTACJA LEAD FIT (KWALIFIKACJA SPRZEDAŻOWA)

Scoring diagnostyczny jest odseparowany od scoringu sprzedażowego (`leadFitSegment`):
- **Cold Lead** ($OverallScore \ge 70$): Dobre fundamenty, propozycja 14-dniowego samodzielnego eksperymentu.
- **Warm Lead** ($45 < OverallScore < 70$): Umiarkowany wyciek, propozycja spersonalizowanego planu naprawczego.
- **Hot Lead** ($OverallScore \le 45$ lub wysoki stres/objawy): Głęboki wyciek energii, propozycja bezpłatnego omówienia wyników lub prowadzenia 1:1.
