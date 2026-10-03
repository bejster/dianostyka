# TH2 BIO → DIAGNOSTYKA 168 — CANONICAL RUNBOOK

Status owner: TH2 acquisition bridge
Canonical release branch: `release/th2-bio-bridge-v2-20261003`

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

CRM target po cutover:
- Acquisition Channel = `TH2 → HiT`
- Acquisition Detail = `entry_variant`
- Conversion Surface = `Diagnostyka 168`

Production-safety przed cutover:
- live Make zostaje na legacy `Acquisition Channel = Diagnostyka 168`, dopóki live app nie wysyła nowych pól;
- mapping TH2 → HiT został osobno zweryfikowany synthetic E2E, ale jest celowo wyłączony do momentu deployu app;
- kolejność aktywacji jest atomowa: APP PROD → MAKE MAPPING → E2E → BIO.

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

## 8. Smoke / activation gates
PREVIEW — już zweryfikowane:
- Vercel preview READY + HTTP 200
- `?door=th2&src=organic&campaign=th2_bio_v1` zawiera TH2 hero, CTA i `th2_bridge_v1`
- TH2 nadal używa tego samego SingleQuestionFlow/scoringu
- synthetic direct CRM E2E potwierdził: `TH2 → HiT`, detail=`th2`, TEST, Exclude from KPI=true, Do Not Contact=true

PRODUCTION — wymagane przy cutover:
- zwykłe wejście bez `door` nadal renderuje stare HiT/general copy
- `door=hit` nie zmienia scoringu
- TH2 completion tworzy lead
- Telegram pokazuje źródło
- po aktywacji mappingu CRM zapisuje `TH2 → HiT`
- Acquisition Detail zapisuje `th2`
- nabor URL niesie `door=th2`
- synthetic QA ma Record Type=TEST, Exclude from KPI=true, Do Not Contact=true

## 9. Production cutover
Nie deployować starego ogromnego feature brancha tylko po to, żeby wpuścić TH2.

Release jest chirurgiczny i startuje z dokładnego SHA produkcyjnie zbliżonego builda:
`1ed4b38b283381044f319324db434b143fc3f33c`.

Kolejność cutover:
1. deploy release do app production,
2. smoke TH2 + general/HiT na domenie production,
3. przełącz Make modules 4/6 z legacy channel na precomputed `acquisition_channel_json` / `acquisition_detail_json`,
4. synthetic E2E przez production endpoint i weryfikacja Notion,
5. dopiero wtedy podmiana bio/linku Instagram,
6. pierwsze realne TH2 completion sprawdzić w CRM,
7. po 7–14 dniach analizować nie tylko klik/completion, ale qualified i paid.

Jeśli którykolwiek krok 1–4 nie przejdzie: NIE zmieniać bio. Live CRM ma zostać na bezpiecznym legacy mappingu.

## 10. Definition of Done
DONE dopiero gdy jednocześnie:
- kod jest na production,
- canonical URL pokazuje TH2 entry,
- CRM E2E zapisuje TH2 → HiT,
- bio na Instagramie wskazuje canonical URL,
- pierwszy realny lead przejdzie cały łańcuch lub synthetic E2E potwierdzi każdy systemowy hop.

Preview albo commit ≠ DONE.
