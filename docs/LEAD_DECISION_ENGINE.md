# Lead Decision Engine — Telegram Cockpit

## Status
Canonical owner branch: `release/th2-bio-bridge-v2-20261003`
Production status: release candidate until explicit production cutover.
This asset is part of the same TH2/HiT Diagnostyka release. Do not maintain a separate competing implementation.

## Cel
Po ukończeniu Diagnostyki 168 system ma dać Michałowi jedną decyzję operatorską:
1. czy pisać,
2. jak szybko,
3. do jakiej oferty lead potencjalnie pasuje,
4. jaki jest najbliższy blocker,
5. jaki jest jeden następny ruch.

To nie jest druga diagnoza zdrowotna i nie zmienia wyniku klienta.

## Źródła prawdy
- decyzja operatorska: `app/lib/lead-operator-decision.ts`
- Telegram: `app/api/lead-notify/route.ts`
- premium fit: `app/lib/premium-fit.ts`
- intake/payload: `app/diagnoza/page.tsx`
- TH2 attribution: `docs/TH2_BIO_TO_DIAGNOSTYKA_RUNBOOK.md`
- testy: `tests/lead-operator-decision.test.ts`, `tests/premium-icp-patch-v1.test.ts`, `tests/th2-bio-bridge.test.ts`
- wejście na Talerzownik: `docs/TALERZOWNIK_LEAD_ASSET_ENTRY.md`
- lokalny preflight: `scripts/talerzownik-lead-asset-preflight.ps1`

## Zasada nadrzędna
Severity problemu i wartość sprzedażowa to różne rzeczy.

`score / severity_band` = skala problemu.
`FIT / INTENT / URGENCY / FINANSE` = decyzja operatora.

Nie tworzymy pseudo-precyzyjnego lead score 0–100 bez danych z realnych zakupów.

## Lane
- `SALES_NOW` — jawna chęć prowadzenia + szybki termin + PRO.
- `QUALIFY_NOW` — chce pomocy, termin bliski, fit PRO/KIERUNEK.
- `QUALIFY` — chce pomocy, ale brakuje sygnału do przejścia dalej.
- `NURTURE` — woli sam / brak realnego WHY NOW.
- `REVIEW` — ryzykowny model współpracy; najpierw sprawdzić oczekiwania.
- `NO_CONTACT` — brak kanału kontaktu.

## Telegram — kontrakt UX
Kolejność:
1. decyzja,
2. osoba + źródło,
3. kandydat/oferta,
4. FIT / INTENT / URGENCY / FINANSE,
5. problem diagnostyczny,
6. blocker,
7. NEXT MOVE,
8. jedna wiadomość `DM NOW`.

Nie wracamy do starego:
`OTWÓRZ → POGŁĘB → DRUGIE DNO → MOST`.

Kolejna wiadomość ma wynikać z prawdziwej odpowiedzi leada.

## Jak używać
- 🔥: DM od razu; potem szybko praca/budżet.
- 🟢: opener z wartością; następnie kwalifikacja.
- 🟡: jedna wymiana o problemie; potem kwalifikacja.
- 🧊: jeden konkret; bez pitchu.
- ⚠️: najpierw oczekiwania wobec prowadzenia.
- ⚫: brak ręcznej pracy, dopóki nie ma kontaktu.

## Atrybucja
Telegram musi zachować źródło:
- TH2 · Talerz i Hantle
- HiT · Hantle i Talerz
- Diagnostyka 168

Źródło nie może zmieniać scoringu diagnostycznego. Może zmieniać framing, operator context i późniejszą analizę lejka.

## Guardrails
- zero dumpu wrażliwych odpowiedzi do Telegrama,
- severity ≠ sales temperature,
- `FINANSE: ?` dopóki brak danych,
- nie pitchować `NURTURE`,
- `RYZYKO` nie jest automatycznie klientem 1:1,
- brak nowej osobnej diagnostyki TH2,
- jeden silnik diagnostyczny i jeden operator decision engine.

## Regression gates
Minimalny szybki check:
`npm run test:lead`

Pełna bramka assetu:
`npm run check:lead-asset`

Przed produkcją dodatkowo:
`npm test`
oraz targeted ESLint z runbooka Talerzownika.

CI ma pilnować tego kontraktu przy przyszłych zmianach.

## Learning loop — dopiero po danych
Kolejna faza po realnym ruchu:
`lane → odpisał → qualified → oferta → zakup → wartość / retencja`.

Nie dokładamy punktów FIT/INTENT przed zebraniem realnej próbki.
Najpierw mierzymy, potem kalibrujemy.
