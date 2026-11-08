# HiT × Mapa 168 — prezent po follow / jeden produkt

**Status: implementacja w izolowanej gałęzi, nie LIVE (08.11.2026).** Nie twórz drugiej diagnostyki, osobnego CRM, formularza Jotform ani nowej automatyzacji Make. Source owner: repo `bejster/dianostyka`, domena `168.talerzihantle.com`. Wcześniejszy osobny quiz w `bio-hit` został odrzucony, PR #4 zamknięty bez merge.

## 1. Co rzeczywiście dostaje odbiorca

Jedna istniejąca Mapa 168:
- Nowa wersja wejścia tylko dla osób, które kliknęły link po follow.
- Po **pierwszych trzech** odpowiedziach otrzymuje pierwszy warunkowy sygnał dotyczący weekendu i powrotu do rytmu; wyłącznie na podstawie kliknięć, bez ustalania przyczyny i bez nowego scoringu.
- Dalej kontynuuje **te same** pytania. Nie odpowiada drugi raz; istniejąca sesja pozostaje zachowana.
- Na końcu dotychczasowy pełny wynik i **jeden** test na 72 godziny. Strona informuje o „około 5 minut”, a nie „30 sekund” ani „5 pytaniach”.
- Osoba chcąca działać samodzielnie może to zrobić. Kupujący pytający o współpracę trafia do istniejącego CloserOS / aktualnego Commercial Truth, bez wymuszania darmowej diagnostyki.

**Wejście DM (kanoniczne):**
https://168.talerzihantle.com/?door=hit&src=dm&utm_source=instagram&utm_medium=dm&utm_campaign=follow_welcome_168

Atrybucja ma wymiar źródła ruchu, nie ma tam IG handle, numeru telefonu ani identyfikatora leada.

## 2. Wykonanie ManyChat (tylko jeśli Meta udostępni dostęp do bety)

Na **@hantleitalerz**, w obecnym workspace: Automations → Basic → Say hi to new followers. Upewnij się, że konto jest połączone przez Unified Instagram onboarding. Nie rozłączaj ani nie rekonfiguruj produkcyjnych automatyzacji `JAZDA` bez porównania. Meta kontroluje dostęp do Follow-to-DM, nie abonament ManyChat.

- **Trigger**: nowy follower. **Opóźnienie**: 5 minut (konfiguracja do sprawdzenia w UI).
- **Opening DM**: krótki komunikat i zwykły przycisk `Tak, podeślij`. To nie może być URL button — pierwsza świadoma interakcja otwiera zgodną z Meta dalszą rozmowę.
- **Po kliknięciu**: jedna wiadomość z linkiem Mapy 168. Bez formularza kontaktowego przed wynikiem, bez automatycznej oferty cenowej i bez obowiązkowego follow-upu.
- **Brak kliknięcia / odmowa**: STOP.
- **Gotowy zakup / pyta o cenę**: od razu realna oferta z aktualną ceną, nie zsyłać na quiz.
- **Existing contacts, PAID, DNC, aktywne rozmowy**: respektować kwalifikacje i tłumienie w obecnym ManyChat/CRM. Nie twierdzić, że filtry są aktywne, zanim odczyt i test to potwierdzą.
- **Nie uruchamiać drugiego keywordu `MAPA` / `DIAGNOZA`**; hasło sprzedażowe `JAZDA` pozostaje u obecnego ownera.

### Gotowe DM, nie wysłane

**Opening:**
```text
siema, dzięki za follow 👊

zrobiłem Mapę 168, żebyś nie musiał zgadywać, co zmieniać

przechodzisz przez swój tydzień i dostajesz jeden test na 72h

chcesz link?
```
Przycisk opt-in: **Tak, podeślij**

**Po kliknięciu:**
```text
jasne, tutaj masz:
https://168.talerzihantle.com/?door=hit&src=dm&utm_source=instagram&utm_medium=dm&utm_campaign=follow_welcome_168

około 5 minut. bez maila, wynik na końcu

jak coś nie pasuje, możesz mi odpisać
```

### Alternatywa przy braku Follow-to-DM

Stosuj link sticker do istniejącej Mapy 168 w Stories lub dobrowolne prośby w aktywnych DM. Nie uruchamiaj zimnych masowych wiadomości. Link do Stories powinien mieć osobne oznaczenie źródła ruchu, bez przypisywania go do automatu po follow; obecna Mapa 168 nadal działa. Brak potwierdzenia eligibility ≠ brak zainteresowania odbiorców.

## 3. Techniczne zachowanie produktu

- Wejście follow rozpoznawane tylko przy `door=hit`, `src=dm`, `utm_campaign=follow_welcome_168` i dozwolonym pathname; reszta wejść (HiT bio, TH2, general, `mode=fast_fit`) pozostaje bez zmian.
- Nie ma nowych pytań, zmian `ASSESSMENT_VERSION`, przelicznika wyniku ani API. Pierwszy sygnał po 3 odpowiedziach wykorzystuje kanoniczne `weekend_pattern`, `monday_recovery`, `primary_goal`.
- Sygnał ma cztery warianty, w tym uczciwy wariant „weekend nie wygląda na główną przeszkodę”. Nie wyciąga przyczynowości z dwóch korelacji.
- Zdarzenie `hit_follow_first_value_viewed` zawiera tylko kategorię wejścia, **bez surowych odpowiedzi i PII**. Nie jest dowodem kompletnego zapisu do PostHog/CRM, dopóki nie ma readbacku.
- Aktualny formularz może wysyłać zdarzenia i odpowiedzi do backendu, dlatego **nie twierdzimy, że wszystko zostaje tylko w przeglądarce**. Zgody, polityka prywatności, logi i faktyczny backend wymagają odrębnego E2E.

## 4. Testy i bramki

- [x] Odzyskano realny projekt / produkcyjny SHA / istniejący wspólny scoring.
- [x] Izolowana kopia repo, bez zmiany obecnego `main` i innych PR-ów.
- [x] Po dodaniu pierwszego odczytu: TypeScript `tsc --noEmit` i Next.js production build oba PASS.
- [x] Nowy finalny build: 6 wariantów otwarcia × Chromium/WebKit × 390/430/1440 = 36/36 PASS.
- [x] 16/16 nowych unit PASS; scoped lint 0 errors (6 zastanych warning w SingleQuestionFlow). Pełny stary suite bazowy 267 PASS / 1 FAIL `result-conversation.test.ts` — nie zaliczać do pełnego PASS.
- [x] Wyniki E2E bez zapisu do prawdziwego CRM: 6/6 scenariuszy Chromium/WebKit (trening 24Q, jedzenie 24Q, weekend 23Q, plateau 23Q, duplikaty food/plateau WebKit) + widoczna pierwsza obserwacja po 3 Q. Wszystkie POST przechwycono i zablokowano; nie twierdzić, że produkcyjny webhook i CRM są przetestowane.
- [ ] Preview nowego SHA na Vercel, publiczny GET, mobilny wynik i brak regresji.
- [ ] ManyChat eligibility, Preview i prawdziwy follow → opt-in → DM → kliknięcie → zakończenie Mapy → ewentualne dobrowolne zapytanie o opiekę; brak konfliktu z istniejącym JAZDA.
- [ ] Rzeczywisty CRM Make/Notion + odpowiedni PostHog readback (nie symulacja).
- [ ] Świadome produkcyjne wydanie i ponowny odczyt domeny, dopiero po wszystkich odpowiednich bramkach.

**Źródło reguł ManyChat:** https://help.manychat.com/en/articles/17741911-follow-to-dm-on-instagram-say-hi-to-new-followers-beta — beta, once-per-follower i Meta one-message-per-user-per-week. Never treat 24-hour message window as blanket permission for unsolicited selling.

**Wykonane lokalne QA** na Talerzowniku: `C:\dev\mapa168-follow-20261108\evidence\`. Treści i wyniki scenariuszy są **modelowymi testami**, a nie prawdziwymi wypowiedziami klientów, leadami ani danymi rynku.

[executed on device: Talerzownik (9f52e594-035b-42d1-811e-cec331432022)]