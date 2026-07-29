import { NextRequest, NextResponse } from 'next/server';

const SYS_PROMPT = `Jestes analitykiem tresci dla diagnostyki Michala (Hantle i Talerz / HiT - facet 28-40 lat, wyczerpany tydzien, szuka prawdy i mechanizmu, zero sciemnia, zero coachingu).

Lead wpisal wlasnymi slowami:
- BOL: co go najbardziej obciaza
- TRIGGER: czemu akurat teraz to sprawdza
- SELF-DX: co jego zdaniem go trzyma w miejscu

Twoje zadanie: przeanalizuj tekst leada i wyciągnij Z JEGO REALNEJ SYTUACJI (zero zmyślania, zero sztampowych szablonów) pięć precyzyjnych elementów:

1. CYTAT: 1-2 zdania DOKŁADNIE wyciągnięte z wypowiedzi leada. Prawdziwe słowa leada, max 25 słów.
2. FALSZYWE_ZALOZENIE: Jakie ukryte błędne założenie ma lead pod swoim myśleniem (np. myśli, że to brak silnej woli, podczas gdy to opóźniona reakcja stresowa osi HPA lub rozbity sen NREM). 1 zdanie, max 20 słów.
3. MECHANIZM: Głębokie, neurobiologiczne/fizjologiczne wyjaśnienie PRZYCZYNY jego problemu (kortyzol, grelina/leptyna, NREM, glukoza, testosteron, oś HPA, obciążenie psychiczne). Pokaż mu coś, czego NIE WIEDZIAŁ o swoim tygodniu. 2-3 zdania, max 50 słów.
4. KOLEJNOSC: 3 precyzyjne kroki rozbrajające ten konkretny problem w kolejności fizjologicznej. Tablica 3 stringów, każdy max 8 słów.
5. PULAPKA: Dlaczego samodzielne próby kolejną dietą/treningiem z internetu go z tego nie wyciągną. 1 zdanie, max 25 słów.

ZASADY TONU MICHAŁA (TWARDE):
- WYLACZNIE polski alfabet lacinski. ZERO cyrylicy, zero obcych alfabetow.
- Głos praktyka rozmawiającego z jednym inteligentnym facetem. Szacunek dla jego czasu i inteligencji.
- ZAKAZ wyrazów slopowych: kluczowe, kluczowy, holistycznie, game changer, transformacja, najlepsza wersja, mindset, ekspert, realnie, super, świetnie, wspaniale, proces, system, chaos, potencjał, optymalizacja, efektywność, nieefektywny, wsparcie, podejście, aspekt, element, dedykowany, podróż, wyzwanie, zapewnia, umożliwia, stanowi, odblokuj, uwolnij.
- ZAKAZ binarnego sloganu: "To nie X. To Y." oraz "Nie chodzi o X, chodzi o Y."
- ZAKAZ długich myślników em-dash (—) ORAZ półpauzy en-dash (–). Stosuj przecinki, kropki i dwukropki. ZAKAZ przecinka tuż przed spójnikiem „i".
- ZAKAZ asekuracji i lania wody: może, często, zazwyczaj, zwykle, wydaje się, warto, pamiętaj, wpływa na, odgrywa rolę, znacząco. Pisz twierdząco.
- Zdania krótkie, max 12-14 słów. Zero jednego długiego akapitu w polu. Mów jak do jednego kumpla przy kawie, nie jak podręcznik.
- FIZJOLOGIA OSTROŻNIE: zero zmyślonych procentów i liczby godzin podanych jako pewnik. Nie twierdź, że jeden weekend albo jedna noc zmienia hormony. Mów o wzorcu, nie o epizodzie. Przyczyny stawiaj miękko (podcina, przygasza, rozjeżdża), nie kategorycznie.
- ZAKAZ coachingowego klepania po plecach i zmyślonego podziwu. Pisz konkret, mechanizm i wniosek.
- ZAKAZ moralizowania o żywieniu, ciele czy nawykach.

KONTEKST USERA:
- Worst category: {worstCat}
- Segment: {segment}
- Wiek: {age}

PRZYKŁAD RYTMU I GŁOSU (naśladuj ton i długość zdań, NIE treść, dopasuj do realnej sytuacji leada):
{"cytat":"po 21 zjadam pół lodówki i nie wiem czemu","falszywe_zalozenie":"Myślisz, że to brak silnej woli wieczorem.","mechanizm":"Do osiemnastej trzymasz wszystko na kawie i napięciu. Wieczorem układ nerwowy szuka najszybszego zejścia z obrotów. Lodówka jest pod ręką. To rachunek za cały dzień, nie słaby charakter.","kolejnosc":["Białko w pierwszym posiłku","Zejście z obrotów przed 21","Telefon poza sypialnią"],"pulapka":"Kolejna dieta z internetu tego nie ruszy. Ona celuje w talerz, a Twój wieczór rozkręca napięcie z całego dnia."}
{"cytat":"trenuję latami, a po ciele nie widać","falszywe_zalozenie":"Myślisz, że brakuje Ci wiedzy albo lepszego planu.","mechanizm":"Wiesz o treningu więcej niż większość ludzi na sali. Wiedzy masz nadto. Tydzień wykłada się na wykonaniu, bo pierwszy gorszy dzień kasuje resztę i nikt nie pilnuje kolejności.","kolejnosc":["Wersja minimum na gorszy dzień","Jeden stały posiłek kotwica","Rozliczenie co tydzień"],"pulapka":"Kolejny plan z internetu nie zadziała. Wiedzę już masz, brakuje kogoś, kto Cię z wykonania rozliczy."}

ZWROC TYLKO PURE JSON, BEZ MARKDOWN, BEZ BACKTICKOW, dokladnie tymi kluczami:
{"cytat":"...","falszywe_zalozenie":"...","mechanizm":"...","kolejnosc":["krok1","krok2","krok3"],"pulapka":"..."}`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      // Brak klucza w env, frontend ma fallback szablon
      return NextResponse.json({ ok: false, reason: 'no_api_key' });
    }

    const body = await req.json();
    const { pain, selfDx, trigger, worstCat, segment, age } = body || {};

    // Walidacja: musi byc cos w pain albo selfDx
    if ((!pain || typeof pain !== 'string' || !pain.trim()) &&
        (!selfDx || typeof selfDx !== 'string' || !selfDx.trim())) {
      return NextResponse.json({ ok: false, reason: 'no_input' });
    }

    // Sanityzacja: max 500 znakow per pole (frontend juz tnie ale safety)
    const pPain = String(pain || '').slice(0, 500).trim();
    const pTrigger = String(trigger || '').slice(0, 500).trim();
    const pSelfDx = String(selfDx || '').slice(0, 500).trim();
    const pWorstCat = String(worstCat || 'Sen').slice(0, 50);
    const pSegment = String(segment || 'CIEPELY').slice(0, 20);
    const pAge = Number(age) || 30;

    const userMsg = `BOL: ${pPain || '(brak)'}\nTRIGGER: ${pTrigger || '(brak)'}\nCO MNIE TRZYMA: ${pSelfDx || '(brak)'}`;
    const sys = SYS_PROMPT
      .replace('{worstCat}', pWorstCat)
      .replace('{segment}', pSegment)
      .replace('{age}', String(pAge));

    // Call OpenRouter (OpenAI-compatible). DeepSeek V3: najtanszy sensowny model
    // (~$0.0002/lead, publiczny ruch nie boli). Tanie modele przeciekaja obcymi
    // alfabetami w polskim, stad guard (cyrylica + CJK + em-dash) i 1 retry.
    let reframe: Record<string, unknown> | null = null;
    let lastReason = 'unknown_error';

    for (let attempt = 0; attempt < 2 && !reframe; attempt++) {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://diagnostyka.talerzihantle.com',
          'X-Title': 'Diagnostyka HiT',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          max_tokens: 1024,
          temperature: 0.4,
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: userMsg },
          ],
        }),
      });

      if (!r.ok) { lastReason = `api_error_${r.status}`; continue; }

      const json = await r.json();
      const text: string = json?.choices?.[0]?.message?.content || '';

      // Czyszczenie: usun markdown code fences jak model dolozyl
      const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(cleaned);
      } catch { lastReason = 'parse_error'; continue; }

      // Walidacja struktury minimum
      if (typeof parsed !== 'object' || !parsed.mechanizm || !Array.isArray(parsed.kolejnosc)) {
        lastReason = 'invalid_structure'; continue;
      }

      // Guard: cyrylica, chinskie znaki, em/en-dash albo utwardzone bany = krzaki/slop u leada, retry/fallback
      const allText = JSON.stringify(parsed);
      const bannedWords = /(kluczow|holistyczn|transformacj|mindset|\bproces\b|\bsystem\b|\bchaos\b|potencjał|optymalizacj|nieefektywn|świetnie|wspaniale)/i;
      if (/[Ѐ-ӿ]/.test(allText) || /[一-鿿　-〿]/.test(allText) || allText.includes('—') || allText.includes('–') || bannedWords.test(allText)) {
        lastReason = 'lang_leak'; continue;
      }

      reframe = parsed;
    }

    if (!reframe) {
      return NextResponse.json({ ok: false, reason: lastReason });
    }

    return NextResponse.json({ ok: true, reframe });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: 'unknown_error' });
  }
}
