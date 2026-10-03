# Lead Decision Engine — Telegram Cockpit

## Cel
Ten moduł zamienia ukończoną Diagnostykę 168 w jedną decyzję operatorską dla Michała.
Nie ocenia zdrowia ani nie zmienia wyniku diagnostycznego. Odpowiada tylko na:
1. czy pisać,
2. jak szybko,
3. do jakiej ścieżki sprzedażowej lead pasuje,
4. jaki jest najbliższy blocker,
5. jaki jest jeden następny ruch.

## Źródło prawdy
- decyzja: `app/lib/lead-operator-decision.ts`
- render Telegrama: `app/api/lead-notify/route.ts`
- fit premium: `app/lib/premium-fit.ts`
- wejście danych: `app/diagnoza/page.tsx`
- kontrakty: `tests/lead-operator-decision.test.ts` + `tests/premium-icp-patch-v1.test.ts`

## Zasada nadrzędna
Severity problemu i wartość sprzedażowa to dwie różne rzeczy.
`score / severity_band` opisują problem.
`FIT / INTENT / URGENCY / FINANSE` opisują decyzję operatora.
Nie tworzymy sztucznego „lead score 0–100”.

## Lane
- `SALES_NOW` — jawna chęć prowadzenia + szybki termin + PRO.
- `QUALIFY_NOW` — chce pomocy, termin bliski, fit PRO/KIERUNEK.
- `QUALIFY` — chce pomocy, ale brakuje sygnału do przejścia dalej.
- `NURTURE` — woli sam / brak realnego WHY NOW.
- `REVIEW` — ryzykowny model współpracy; najpierw sprawdzić oczekiwania.
- `NO_CONTACT` — brak kanału kontaktu.

## Telegram — kolejność czytania
1. decyzja,
2. osoba + źródło,
3. kandydat/oferta,
4. FIT / INTENT / URGENCY / FINANSE,
5. problem diagnostyczny,
6. blocker,
7. NEXT MOVE,
8. tylko jedna wiadomość `DM NOW`.

Nie wracamy do starego formatu:
`OTWÓRZ → POGŁĘB → DRUGIE DNO → MOST`.
Następny ruch po openerze ma wynikać z prawdziwej odpowiedzi leada.

## Jak używać
- 🔥: otwórz DM od razu, potem szybko kwalifikuj pracę/budżet.
- 🟢: otwórz wartością, następnie kwalifikacja.
- 🟡: jedna wymiana o problemie, potem kwalifikacja.
- 🧊: daj jeden konkret; bez pitchu.
- ⚠️: sprawdź oczekiwania wobec prowadzenia przed ofertą.
- ⚫: nie inwestuj ręcznego czasu, dopóki nie ma kontaktu.

## Learning loop
Każda przyszła korekta routingu powinna wynikać z danych:
`lane → odpowiedział → zakwalifikowany → oferta → zakup → wartość / retencja`.

Nie dodajemy pseudo-precyzyjnych punktów FIT/INTENT bez danych historycznych.
Po zebraniu wystarczającej liczby leadów można kalibrować reguły na realnym close rate.

## Guardrails
- nie wysyłać w Telegramie zbędnego dumpu wrażliwych odpowiedzi,
- nie mieszać severity z intentem,
- nie wymyślać budżetu — `FINANSE: ?` dopóki brak danych,
- nie pitchować `NURTURE`,
- nie traktować `RYZYKO` jako automatycznego klienta 1:1,
- zachować atrybucję źródła (HiT / TH2 / Diagnostyka 168).
