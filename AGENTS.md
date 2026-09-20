# Diagnostyka: zasady pracy

## MICHAŁ VOICE: obowiązkowy przed copy

Każda zmiana polskiego tekstu dla odbiorcy, także UX, pytania, odpowiedzi, wyniki, CTA i podgląd strony, wymaga MICHAŁ VOICE. Michał nie musi przypominać o skillu.

- Owner: https://app.notion.com/p/3c1d3f5a0f5b810d9a3ff44e50296f6d (MICHAŁ VOICE / LANGUAGE CANONICAL). Przeczytaj aktualny canonical oraz wskazane w nim ALL-SURFACE GATE i GENERICITY KILL SWITCH. Skrót w skillu landingowym nie zastępuje canonicalu.
- Runtime w MICHAL-BUSINESS-OS: `systems/content-os/runtime/VOICE_RUNTIME.md`; ostatnie korekty: `.claude/voice-learning/corrections_recent.md`.
- Przed generowaniem wybierz 5–12 pasujących prawdziwych próbek z `systems/content-os/knowledge/personal-voice/VOICE_BANK.csv`, zgodnie z `VOICE_SOURCE_POLICY.md`. Podaj w opisie pracy identyfikatory próbek i użyty profil/surface. Nie przenoś z próbek historycznych claimów, godzin, cen ani adresów CTA.
- Aktualna korekta Michała ma pierwszeństwo przed starszym przykładem. Odrzucone teksty AI nie są pozytywnymi próbkami głosu.
- Po redakcji wykonaj anti-slop lint oraz osobną ocenę positive Michał-fit względem próbek. Testy kodu nie potwierdzają głosu. Nie deklaruj pełnego Voice PASS bez obu ocen. Brak źródeł/runtime oznacza jawne ograniczenie, nie zgodę na udawanie pełnego użycia skilla.
- Nie duplikuj Voice OS w tym repo. Ten plik jest loaderem do jednego ownera, nie drugim kanonem.

Korekta Michała z 20.09.2026 dla tej diagnostyki: poprzednie teksty były generyczne, miały sztuczną budowę zdań i za dużo słów. Odrzucony przykład „Obiad był. Tylko ciągle było coś pilniejszego.” nie jest wzorcem. Zachowaj krótkie ekrany, naturalną składnię i ciekawość wynikającą z odpowiedzi. Każde pytanie musi zmieniać późniejszą decyzję. Nie dopisuj problemu, przyczyny ani faktu, którego odpowiedzi nie potwierdzają.

## Kopia przed nadpisaniem

Michał wymaga backupu każdej nadpisywanej wersji, z datą i godziną w nazwie.

- Przed zmianą istniejącej wersji zachowaj jej pełny stan w Git. Jeśli są niezapisane zmiany, zabezpiecz je przed dalszą edycją.
- Nazwa kopii: `backup/<wersja>_YYYY-MM-DD_HH-mm-ss_CEST` albo `..._CET`, zgodnie z czasem Europe/Warsaw. Można użyć UTC, jeśli oznaczenie UTC jest częścią nazwy.
- Tag lub osobna gałąź ma wskazywać dokładny commit kopii. Nie przesuwaj ani nie nadpisuj istniejących kopii.
- Przed publikacją zmiany upewnij się, że kopia poprzedniej wersji jest dostępna również w zdalnym repozytorium.
- Przed wdrożeniem na główną domenę zapisz również identyfikator poprzedniego deploymentu i commit, żeby można było wrócić do poprzedniej publikacji.
- Zgoda na podgląd nie oznacza zgody na zastąpienie strony produkcyjnej.
