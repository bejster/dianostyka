# TH2 BIO → DIAGNOSTYKA 168 — CANONICAL RUNBOOK

Status owner: TH2 acquisition bridge
Canonical release branch: `release/th2-bio-bridge-20261003`

## 1. Cel
TH2 ma zamieniać symptom-aware odbiorcę (substancje, weekend, zjazd, sen, apetyt, energia, regeneracja) w klienta bez robienia z profilu klasycznego profilu trenerskiego.

Mechanizm:
CONTENT → PROFIL → CIEKAWOŚĆ → DIAGNOSTYKA → PUNKT PĘKNIĘCIA → PROBLEM-AWARE → INTENCJA → NABÓR / DM → KLIENT.

## 2. Canonical bio
Ostatnia linia bio:
`↓ Co naprawdę rozwala Ci tydzień?`

Tytuł linku:
`Znajdź swój Punkt Pęknięcia`

Canonical URL:
`https://diagnostyka.talerzihantle.com/?door=th2&src=organic&campaign=th2_bio_v1`

Nie dodawać `topic=weekend` do linku w bio. Weekend jest wejściem, nie diagnozą.

## 3. Co widzi user TH2
Kicker:
`Talerz i Hantle · 5 min · wynik od razu`

Hero:
`Weekend nie zawsze jest problemem. Często tylko pokazuje, gdzie tydzień pęka.`

Opis prowadzi przez:
sen → energia → apetyt → stres → trening → powrót po weekendzie.

CTA:
`Znajdź mój Punkt Pęknięcia →`

Po kliknięciu działa TEN SAM SingleQuestionFlow, scoring, wynik i routing co w Diagnostyce 168. TH2 zmienia framing i atrybucję, nie logikę wyniku.

## 4. Atrybucja
Front:
- `door=th2`
- `entry_copy=th2_bridge_v1`
- `entry_variant=th2` lub `th2_<topic>`

Private lead payload:
- `entry_door`
- `entry_topic`
- `entry_variant`

CRM:
- Acquisition Channel = `TH2 → HiT`
- Acquisition Detail = `entry_variant`
- Conversion Surface = `Diagnostyka 168`

Telegram/operator:
- pokazuje źródło TH2, żeby nie traktować tego leada jak identycznego wejścia z HiT.

Nabór:
- dostaje `door=th2` + istniejącą atrybucję, więc źródło nie ginie po wyniku.

## 5. Eventy, które mają żyć
PostHog / product analytics:
- diag_intro_viewed
- entry_variant
- entry_route_selected
- diag_start
- diag_complete
- diag_result_viewed
- result_viewed
- help_route / self_serve_route / data_needed_route
- cta_nabor_clicked

Do analityki produktu nie wysyłamy PII. @IG zostaje w prywatnym CRM / Telegramie.

## 6. Funnel do mierzenia
Minimum:
TH2 profile visit → bio link click → diag_start → diag_complete → help_route / CTA → nabór → qualified → paid.

Najważniejszy biznesowy odczyt:
`PAID z Acquisition Channel = TH2 → HiT`.

Nie optymalizować samego completion rate kosztem jakości leadów.

## 7. /55 — guardrails
1. Nie budować drugiej osobnej diagnostyki TH2.
2. Nie używać w bio etykiety `Diagnostyka 168` jako głównego CTA.
3. Nie zawężać bio tylko do używek albo tylko weekendu.
4. Nie zmieniać scoringu na podstawie źródła ruchu.
5. Severity ≠ sales temperature.
6. Źródło ruchu nie może zmieniać wyniku; może zmieniać framing, operator context i późniejszy follow-up.
7. Jeden główny link w bio. Nie dokładać równorzędnego `współpraca`.

## 8. Smoke przed production
- build/test PASS
- `?door=th2&src=organic&campaign=th2_bio_v1` renderuje TH2 hero i CTA
- zwykłe wejście bez `door` nadal renderuje stare HiT/general copy
- `door=hit` nie zmienia scoringu
- completion tworzy lead
- Telegram pokazuje źródło
- CRM zapisuje `TH2 → HiT`
- Acquisition Detail zapisuje `th2`
- nabor URL niesie `door=th2`
- synthetic QA ma Record Type=TEST, Exclude from KPI=true, Do Not Contact=true

## 9. Production cutover
Nie deployować starego ogromnego feature brancha tylko po to, żeby wpuścić TH2.

Release jest celowo chirurgiczny i bazuje na produkcyjnie zbliżonym `feat/content-paid-attribution-p0-20260926`.

Po deployu:
1. smoke na domenie production,
2. dopiero potem podmiana linku w bio Instagram,
3. pierwsze realne TH2 completion sprawdzić w CRM,
4. po 7–14 dniach analizować nie tylko klik/completion, ale qualified i paid.

## 10. Definition of Done
DONE dopiero gdy jednocześnie:
- kod jest na production,
- canonical URL pokazuje TH2 entry,
- CRM E2E zapisuje TH2 → HiT,
- bio na Instagramie wskazuje canonical URL,
- pierwszy realny lead przejdzie cały łańcuch lub synthetic E2E potwierdzi każdy systemowy hop.

Preview albo commit ≠ DONE.
