# Diagnostyka: zasady pracy

## Kopia przed nadpisaniem

Michał wymaga backupu każdej nadpisywanej wersji, z datą i godziną w nazwie.

- Przed zmianą istniejącej wersji zachowaj jej pełny stan w Git. Jeśli są niezapisane zmiany, zabezpiecz je przed dalszą edycją.
- Nazwa kopii: `backup/<wersja>_YYYY-MM-DD_HH-mm-ss_CEST` albo `..._CET`, zgodnie z czasem Europe/Warsaw. Można użyć UTC, jeśli oznaczenie UTC jest częścią nazwy.
- Tag lub osobna gałąź ma wskazywać dokładny commit kopii. Nie przesuwaj ani nie nadpisuj istniejących kopii.
- Przed publikacją zmiany upewnij się, że kopia poprzedniej wersji jest dostępna również w zdalnym repozytorium.
- Przed wdrożeniem na główną domenę zapisz również identyfikator poprzedniego deploymentu i commit, żeby można było wrócić do poprzedniej publikacji.
- Zgoda na podgląd nie oznacza zgody na zastąpienie strony produkcyjnej.
