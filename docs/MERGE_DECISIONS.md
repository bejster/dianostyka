# MERGE DECISIONS · DIAGNOSTYKA FLAGSHIP

Branch `feat/diagnostyka-flagship-20260926`, baza `5c161c8` (PROD, FROZEN). Status: PREVIEW, nie PROD.

Źródła:
- **A** = PROD `5c161c8`: hero „W poniedziałek ogarniasz”, copy, Make CRM + dedupe, pytania, router.
- **B** = Visual Instrument `37d045f`: 11 commitów przeniesionych na A (9 identycznych patchy, 2 dopasowane przy konflikcie; `git cherry -v HEAD 37d045f`).
- **C** = warstwa decyzyjna 3.0 (ta gałąź).
- **D** = brudny worktree `C:/dev/diagnostyka-v264-final-20260907`, HEAD `fdc6255` z 09.09. Poza linią `5c161c8`. Jego nieśledzone testy (`result-v4-payoff`, `mobile-touch-v31`, `conversion-content-signals`) są w `5c161c8` w nowszej wersji pod tymi samymi nazwami. **Wchłonięty, nic do wzięcia.**
- **E** = `0c6d21c` (release/setter-crm-bridge, 10.09). Writer Make z `lead_ref`, porcjowaniem pól i `lead_ref` generowanym w przeglądarce. To samo żyje w A jako `8206f84` (`MAKE_DIAGNOSTYKA_WEBHOOK`, `chunkForNotion`, fallback n8n) plus `page.tsx:105-111`. **Wyparty przez A, nic do wzięcia.**

Zasada rozstrzygania: dowód (test, dane z ruchu, zasada sprzedaży) wygrywa z gustem. Tam, gdzie nie ma jeszcze danych z ruchu, piszę to wprost.

| Element | A (PROD) | B (Instrument) | C / D / E | BIERZEMY | Dlaczego |
|---|---|---|---|---|---|
| Hero | „W poniedziałek ogarniasz. W piątek… »znowu to samo«” | ta sama treść w typografii przyrządu | C: bez zmian treści. D, E: brak | **A treść + B forma** | Hero A jest na PROD i przeszedł release gate `5c161c8`. B zmienia tylko warstwę wizualną. Test `v28-awareness-first` pilnuje treści. |
| Intro / CTA startu | „Pokaż mi, co ruszyć najpierw” | ten sam przycisk w stylu przyrządu | C: kicker drzwi (`?door`, `?topic`) nad hero | **A + B + kicker C** | Drzwi zmieniają tylko kicker i `entry_variant`. Pytania i wynik wspólne, więc porównanie drzwi mierzy wejście, nie inny produkt. Zły `door`/`topic` spada do general (QA). |
| Pytanie `prediction` (nowe) | brak | brak | C: „Obstaw, zanim policzymy: co najbardziej blokuje ten cel?” po `self_energy` | **C** | Obstawienie przed wynikiem daje wynikowi coś do potwierdzenia albo przesunięcia (prediction gap). Bez tego odczyt jest monologiem. Koszt: +1 krok. **Danych o odpadaniu jeszcze nie ma**: patrz event `prediction_locked` vs `experiment_shown`. |
| Pytanie `good_day` (nowe) | brak | brak | C: „Przypomnij sobie najlepszy dzień z ostatnich dwóch tygodni. Co wtedy było inaczej?” po `break_window` | **C** | Kontrast wzmacnia albo osłabia trop (`contrast_evidence`), więc pewność ma podstawę zamiast być dekoracją. Koszt: +1 krok, jak wyżej. |
| Pozostałe pytania (39) | 39 pytań | bez zmian treści | D: starsze wersje | **A** | Zero zmian treści pytań A. Testy A przechodzą bez zmian. |
| Kolejność pytań | A | A | C: wstawia 2 pytania w blok „tydzień” | **A + 2 wstawki C** | `prediction` przed danymi o tygodniu (żeby obstawienie było czyste), `good_day` zaraz po `break_window` (kontrast do złego dnia na świeżo). |
| Pierwszy ekran wyniku | nagłówek poziomu + mapa | wynik w języku przyrządu, SettlingReadout | C: odczyt 7 wierszy `rx-readout` | **B rama + C odczyt** | Człowiek w pierwszym kadrze dostaje decyzję: cel, obstawienie, trop, wcześniejsze ogniwo, test, co obserwować, pewność. QA: cały odczyt mieści się w 844 px na 390. |
| Beat: Obstawiłeś | brak | brak | C | **C** | Linia gap bez powtarzania typu obstawienia (red team). |
| Beat: Najmocniejszy trop | najsłabsza oś | ta sama oś w przyrządzie | C: zostaje jako objaw | **A logika + C etykieta** | Red team: trop i ogniwo to dwie taksonomie. Most w wierszu ogniwa: „Forma pokazuje, gdzie boli. Tu warto sprawdzić, gdzie to się zaczyna.” |
| Beat: Wcześniejszy moment | brak | brak | C: `UPSTREAM_OF` | **C** | Rdzeń 168: objaw rzadko jest przyczyną. Wiersz złoty, klucz odczytu. |
| Beat: Test 72h + Obserwuj | bank eksperymentów A | bank A w przyrządzie | C: nazwa + akcja w odczycie | **A bank + C forma** | Bank eksperymentów bez zmian. 72h zostaje, bo spinają go testy i copy A. 7 dni obsługuje pętla powrotu. |
| Beat: Pewność | brak (score) | brak | C: słowami, 3 kreski | **C** | Bez procentów i bez pseudo-score. Kontrdowód obniża pewność i jest pokazany. |
| Granica medyczna | brak | brak | C: `MEDICAL_BOUNDARY` | **C** | „Hormony” nie dostaje szacunku testosteronu. Usługa krwi zostaje płatna. |
| Dalsze beaty (mapa, dowód, demo prowadzenia) | A | B forma | C: bez zmian | **A + B** | Sprawdzone na PROD. Nie ruszamy. |
| CTA / router | `routeCategory` A → nabor / dane / self-serve | ta sama logika, B styl | C: eventy `*_route` | **A** | Router A nietykalny. C tylko go mierzy. |
| Pętla powrotu | brak | brak | C: `diagnostyka_v3_return`, panel po 3 dniach albo z `?return=1` | **C** | Domyka eksperyment i daje event `return_7d`. Rekord to same kategorie, whitelist dźwigni (red team). |
| Wizual / motion | ciemny layout A | przyrząd 168, skan, SettlingReadout, podziałka | C: stagger wierszy odczytu, reduced motion = brak animacji | **B + stagger C** | Instrument nietknięty. Stagger od 270 do 810 ms, poświata na kluczowym wierszu. |
| Analityka | PostHog | `ui=instrument-1`, PostHog tylko na produkcji | C: 17 eventów 3.0, allowlista w `result-v3-safety` | **B + C** | Payloady to same kategorie. Na preview PostHog nie strzela (QA: zero żądań). |
| Rura leada / Make CRM | `lead-notify` → Make (`8206f84`) + dedupe + fallback n8n | bez zmian | E: wcześniejsza wersja tego samego | **A, NIETYKALNE** | `git diff 5c161c8 HEAD -- app/api` = pusty. Na preview brak env Make/Telegram, więc walk nie wysyła leada. |

## Co świadomie odpada
- D w całości (starsza wersja A).
- E w całości (wyparte przez `8206f84`).
- Wiersz testu na 7 dni. Zostaje 72h, bo tak mówi reszta produktu.
- `constraint` i `failed_solution` na razie tylko w analityce. Nie dostały wiersza w odczycie, bo 8 wierszy nie mieści się w pierwszym kadrze na 375.

## Weto
Michał wetuje tylko tam, gdzie się nie zgadza. Freeze PROD bez zmian.
