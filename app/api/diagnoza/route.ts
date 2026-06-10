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

    // Call OpenRouter (OpenAI-compatible), Claude Haiku 4.5 (szybki + tani dla klasyfikacji)
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://diagnostyka.talerzihantle.com',
        'X-Title': 'Diagnostyka HiT',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4.5',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: userMsg },
        ],
      }),
    });

    if (!r.ok) {
      return NextResponse.json({ ok: false, reason: 'api_error', status: r.status });
    }

    const json = await r.json();
    const text: string = json?.choices?.[0]?.message?.content || '';

    // Czyszczenie: usun markdown code fences jak Claude dolozyl
    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();

    let reframe;
    try {
      reframe = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ ok: false, reason: 'parse_error' });
    }

    // Walidacja struktury minimum
    if (typeof reframe !== 'object' || !reframe.mechanizm || !Array.isArray(reframe.kolejnosc)) {
      return NextResponse.json({ ok: false, reason: 'invalid_structure' });
    }

    return NextResponse.json({ ok: true, reframe });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: 'unknown_error' });
  }
}
