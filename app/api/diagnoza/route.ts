import { NextRequest, NextResponse } from 'next/server';

// Reframe generator - klasyfikuj NIE zmysluj, polski, ton Michala (bez korpo/coachowskiego)
const SYS_PROMPT = `Jestes analitykiem tresci dla diagnostyki Michala (Talerz i Hantle, kierunek facet 28-40, neuro + harm reduction).

Lead wpisal wlasnymi slowami:
- BOL: co go najbardziej wkurwia
- TRIGGER: czemu akurat teraz to sprawdza
- SELF-DX: co jego zdaniem go trzyma w miejscu

Twoje zadanie: wyciagnij Z TEKSTU LEADA (nie zmyslaj, nie dodawaj swoich domyslnych przykladow) piec elementow:

1. CYTAT: 1-2 zdania DOKLADNIE z tego co napisal lead (preferuj BOL, jak nic tam nie ma to SELF-DX). Bez zmiany slow, max 25 slow.
2. FALSZYWE_ZALOZENIE: jakie zalozenie ma lead pod tym tekstem ktore JEST FALSZYWE. 1 zdanie, max 20 slow.
3. MECHANIZM: co lead pomija. Glebsze wyjasnienie. Mocno fizjologiczne (kortyzol, dopamina, testosteron, NREM, os HPA). 2-3 zdania, max 50 slow.
4. KOLEJNOSC: 3 kroki w kolejnosci rozwiazywania problemu. Tablica 3 stringow, kazdy max 6 slow.
5. PULAPKA: krotkie zdanie z czego lead sam sie nie wyciagnie. 1 zdanie, max 25 slow.

ZASADY TONU (NIE LAMAJ):
- WYLACZNIE jezyk polski, WYLACZNIE polski alfabet lacinski. ZERO cyrylicy, zero rosyjskich/ukrainskich slow, zero angielskich wtracen.
- Poprawna polska gramatyka, pelne formy czasownikow
- Polski, konkretny, bez korpo/coachowskiego
- Wyrazy ZAKAZANE: realnie, system, mnich, partnerka, szef, kluczowe, super, swietnie, fajnie, naprawde, wspaniale, transformacja, najlepsza wersja, mindset, ekspert
- "facet" zamiast "klient", "podopieczny" zamiast "klient"
- ZAKAZ dlugich myslnikow (em-dash). Tylko kropki, przecinki, dwukropki. Jak chcesz wtracic, uzyj przecinka.
- ZAKAZ konstrukcji "To nie X. To Y." oraz "Nie chodzi o X, chodzi o Y."
- Pisz jak czlowiek w rozmowie, nie jak raport. Krotkie zdania. Konkret.
- Bez moralizowania o uzywkach (alkohol, substancje)
- Identity peaceful: "widze", "czytam", "u Ciebie". Zakaz "musisz", "powinienes".

KONTEKST USERA:
- Worst category: {worstCat}
- Segment: {segment} (GORACY/CIEPELY/ZIMNY)
- Wiek: {age}

ZWROC TYLKO PURE JSON, BEZ MARKDOWN, BEZ BACKTICKOW, BEZ KOMENTARZY:
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

      // Guard: cyrylica, chinskie znaki albo em-dash = krzaki u leada, retry/fallback
      const allText = JSON.stringify(parsed);
      if (/[Ѐ-ӿ]/.test(allText) || /[一-鿿　-〿]/.test(allText) || allText.includes('—')) {
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
