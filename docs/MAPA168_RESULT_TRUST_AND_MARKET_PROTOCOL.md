# Mapa 168 — kontrakt wartości, zaufania i Market Intelligence

Status: **TEST**. Produkcja nie jest potwierdzeniem działania nowej warstwy. Właściciel wyniku: `ResultExperience`, `week-decision-card`. Właściciel zapisu: istniejący `/api/lead-notify` → Make **9778887** → kanoniczny CRM Notion.

## Co musi zobaczyć użytkownik

1. **Pierwsze 5 sekund:** jego hipoteza kontra odczyt z własnych odpowiedzi, bez diagnozy medycznej.
2. **Osobista wskazówka:** nie archetyp wklejony każdemu, ale 2 konkretne odpowiedzi, *jaki może być związek*, i 1 decyzja, od czego zacząć.
3. **Jeden test:** wybrany istniejącym selektorem z 20 eksperymentów; `week-decision-card` nie dokłada drugiego, konkurencyjnego planu.
4. **Jeśli nie zadziała:** co obali tę hipotezę, jakich danych nadal brak, co sprawdzać dalej.
5. **Tego nie zmieniam:** najlepiej trzymający się obszar oraz lista ograniczeń z banku eksperymentów.
6. **Zaufanie:** prawdziwe własne odpowiedzi, przyznanie ograniczeń ankiety, brak zmyślonych godzin, gwarancji, oszczędności, hormonów, opowieści o historii klienta.
7. **Proof 1:1:** tylko zweryfikowana opinia ze źródłem; nie umieszczać sztywnej liczby gwiazdek, jeśli nie została aktualnie sprawdzona. Proces pracy ma być pokazany na realnym przykładzie decyzji, nie sloganem o indywidualnym podejściu.

## Czego ankieta nie wie

- Zbieżność odpowiedzi nie jest potwierdzeniem przyczyny.
- Indeks 0–100 jest arbitralnym porównaniem odpowiedzi, **nie** procentem zdrowia, energii, hormonów lub potencjału.
- 72h to wstępny sprawdzian wzorca, nie dowód skuteczności, badanie kontrolowane ani obietnica trwałej zmiany.
- Niski wynik libido/napędu nie uprawnia do diagnozy testosteronu, tarczycy ani medycznego protokołu.
- Brak odpowiedzi = `unknown`, nie „brak prób” lub „nie ma problemu”.

## Market Intelligence: wykorzystuj obecny CRM zamiast nowego systemu

`market-signal.ts` buduje **wyłącznie deklaracje**: cel, pierwsze tarcie, wyzwalacz odpuszczenia, liczba nieskutecznych startów, kontekst pracy, potrzeba wsparcia, termin, obecność własnych słów bólu. Typ dowodu: `self_report`. Te pola są częścią prywatnego `derived_signals` wysyłanego do Make i istniejącego CRM, nie do publicznego linku ani do PostHog.

**Historia zapłaconych rozwiązań:** nie dodawaj kolejnego ekranu do celowo zamrożonej ankiety. To informacja do zebrania/uzupełnienia w istniejącym formularzu współpracy lub rozmowie, po wiarygodnym połączeniu tożsamości obu ścieżek. `paid_solution_history` pozostaje `null`, jeśli brak odpowiedzi.

**Sprzedaż:** oddziel deklarację „chcę pomocy” od faktycznej oferty, płatności i retencji. `severity`, objawy, stosowane substancje i niska energia NIE są proxy zamożności ani prawa do agresywnego follow-upu.

**Segmenty:** HiT i TH2 raportuj osobno; dalej według rzeczywistego UTM/źródła i typu odbiorcy. Użytkownicy z własnego Instagrama nie są reprezentatywną próbą całej Polski. Cytaty z pól otwartych = wyłącznie autentyczne, anonimowe i bez identyfikacji; kategorie dopasowane przez model oznacz `inference`, nie jako odpowiedzi osoby.

## Czy raport ma wartość? Sprawdź, nie zgaduj

Istniejące zdarzenia PostHog: `result_viewed`, `nnv_viewed`, `result_reaction` (new / known / off), `experiment_viewed`, `experiment_committed`, `return_7d`, `cta_nabor_clicked`. Bez treści PII, wrażliwych odpowiedzi i danych medycznych. Sprawdzić faktyczne dotarcie tych eventów do **właściwego** projektu PostHog; bieżący podłączony connector pokazywał inny/default projekt.

Zestawiaj je z istniejącą ścieżką: źródło → ukończenie → reakcja na insight → test → powrót → rozmowa → oferta → płatność. Ostatnie trzy etapy wymagają wiarygodnego łączenia rekordów w CRM, nie domysłu z analityki anonimowej. Unikaj pseudoprecyzyjnych ROI i „top 5 bóli rynku” na małych próbach.

**Pętla dla contentu:** pytanie „Jakie konkretne słowa i sceny powtarzają się u osób, które potem kupują?” jest cenniejsze niż „jaki procent kliknął sen?”. Z każdego mocnego wzorca powstaje kandydat ROOT (scena → stara diagnoza → wcześniejsza możliwość → konkretny eksperyment) i dopiero po porównaniu z już opublikowanymi materiałami trafia do istniejącego Content Banku. Nie zakładać automatycznego przepływu do banku bez wdrożenia i readback.

## Release gate

- `npm run test:lead`, `npm test`, `tsc --noEmit`, lint i build zielone.
- Podgląd na telefonie i desktopie, wszystkie drzwi: general, HiT, TH2 i `fast_fit`.
- Case tests: mismatched vs matched self-diagnosis, niski confidence, weekend/return, praca/trening, stres/jedzenie, brak danych i hormone-boundary.
- Przykładowy wynik: fakt w interfejsie = identyczny fakt wejściowy, action = faktycznie wybrany eksperyment.
- Synthetic E2E oznaczone TEST/Do Not Contact: weryfikacja Create/Update i readback istniejącego CRM, przejście do formularza współpracy, brak ujawnienia danych innej osoby.
- Właściwy projekt PostHog: udokumentowany event `nnv_viewed` i `result_reaction` po rzeczywistym wyświetleniu i kliknięciu.
- Nie merge'uj na produkcję na podstawie samego sukcesu kompilacji. Bez readback i QA status **TEST**, nie **LIVE/CLOSED**.
