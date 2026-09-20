# Diagnostyka 168: finalny pass Voice × Emotional Persuasion v3.6

Data: 2026-09-20  
Baza: `fda14845883510dbb742c4b3b5159b87241f29a4`  
Branch: `work/final-diagnostyka-emotion-voice-20260920`

## Cel

Dokończyć v3.5 bez przebudowywania logiki diagnostycznej. Zmiana ma zwiększać rozpoznanie siebie, znaczenie wyniku i sens następnego kroku, ale nie może wymyślać emocji, przyczyn, kosztów ani gotowości zakupowej.

## Co zmieniono

1. Pytania brzmią jak rozmowa o konkretnym tygodniu, nie jak formularz lub tekst copywritera.
2. Wszystkie 28 aktywnych tras wyniku zostały przejrzane pod wcześniejszy moment, mechanizm i falsyfikowalny krok.
3. Koszt jest pokazywany tylko wtedy, gdy użytkownik sam zaznaczył późniejszą konsekwencję. UI wyświetla jego własną odpowiedź jako krótką linię „To odbiło się później”.
4. Wynik utrzymuje jedną ścieżkę czytania: wniosek → koszt z odpowiedzi, jeśli istnieje → jeden krok → co obserwować → reakcja.
5. „Już próbowałem” i „u mnie jest inaczej” nie prowadzą do powtarzania odrzuconej rady. Najpierw naprawiają diagnozę lub wracają do poprzedniej próby.
6. Ścieżka samodzielna nadal nie pokazuje CTA do naboru. Ścieżka medyczna nadal nie kieruje do coachingu.
7. Most do prowadzenia tłumaczy mechanizm pracy: po próbie wracamy do wykonania, miejsca rozjazdu i kolejnej korekty. Nie używa deklaracji „jesteś gotowy”.

## Granice

- Bez wymyślonych scen, godzin, liczb, dialogów i historii.
- Bez syntetycznej oceny problemu lub severity.
- Bez przypisywania przyczyn medycznych.
- Bez sztucznego wstydu, identity threat, urgency i scarcity.
- Bez sloganowej antytezy „to nie X, tylko Y”.
- Brak danych nadal daje obserwację, nie pewną diagnozę.
- Pojedynczy przypadek nadal zostaje pojedynczym przypadkiem.

## Voice gate

Użyto aktualnego MICHAŁ VOICE V2, source policy i red-team. Aktywne pliki zostały dodatkowo przeskanowane pod typowe hard-fails: „warto”, „realnie”, „dieta” jako marketingowy skrót, „kluczowe”, „zadbaj”, em/en dash, przecinek bezpośrednio przed „i” oraz mechaniczne konstrukcje X/Y.

## QA

Finalny gate GitHub Actions dla kodu aplikacji:
- `npm test`: 188/188 PASS
- lint zmienionej powierzchni: PASS
- `npm run build`: PASS

Pierwszy pełny lint repo ujawnił istniejące błędy poza tą zmianą w `app/diagnoza/atmosphere.tsx`, `app/diagnoza/lab/page.tsx` i `app/w/page.tsx`. Nie były częścią tego patcha i nie zostały maskowane zmianą reguł. Finalny gate lintuje dokładnie pliki zmienione w v3.6.

Vercel preview dla kolejnych commitów brancha buduje się poprawnie. Produkcja nie została przełączona.

## Release rule

Nie promować tej gałęzi na produkcję w ciemno. Najpierw obejrzeć finalny preview na telefonie i desktopie, przejść co najmniej ścieżki:
- jedzenie → posiłek → praca,
- sen → ekran → nie mogłem zasnąć,
- trening → praca → dokładane zadania,
- dobry tydzień / maintain,
- „u mnie wygląda to inaczej”,
- „już tego próbowałem”,
- self,
- medical.

Dopiero po wizualnym smoke teście można podjąć osobną decyzję o promocji.
