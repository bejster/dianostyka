import { NextRequest, NextResponse } from 'next/server';

// Walidacja email — regex RFC 5322 uproszczony
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      instagram_handle,
      imie,
      wynik_kwota,
      wynik_score,
      wynik_potencjal,
      wynik_niewykorzystany,
      wynik_hamulce,
      wynik_badania_count,
      wynik_badania_priorytet,
      biggest_category,
      timestamp,
      source,
      odpowiedzi,
      // Stary format (backward compatibility)
      score,
      totalCost,
      fields,
    } = body;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Podaj poprawny email' }, { status: 400 });
    }

    const apiKey = process.env.MAILERLITE_API_KEY;
    const groupId = process.env.MAILERLITE_GROUP_ID;

    // Buduj pola MailerLite — wszystkie dane z diagnostyki
    const mlFields: Record<string, string> = {
      diagnostyka_score: String(wynik_score ?? score ?? ''),
      diagnostyka_cost: String(wynik_kwota ?? totalCost ?? ''),
    };
    if (instagram_handle) mlFields.diagnostyka_ig = instagram_handle;
    if (imie) mlFields.name = imie;
    if (biggest_category) mlFields.diagnostyka_top_cat = biggest_category;
    // Nowe pola — potencjał, hamulce, badania
    if (wynik_potencjal) mlFields.diagnostyka_blocked = String(wynik_potencjal);
    if (wynik_niewykorzystany) mlFields.diagnostyka_usable = String(wynik_niewykorzystany);
    if (wynik_hamulce) mlFields.diagnostyka_brakes = String(wynik_hamulce);
    if (wynik_badania_count) mlFields.diagnostyka_tests_count = String(wynik_badania_count);
    if (wynik_badania_priorytet) mlFields.diagnostyka_tests_priority = String(wynik_badania_priorytet);
    if (fields) Object.assign(mlFields, fields);

    let mlOk = false;
    let webhookOk = false;

    // 1. MailerLite — dodaj do grupy diagnostyka-leads
    if (apiKey && groupId) {
      try {
        const mlRes = await fetch('https://connect.mailerlite.com/api/subscribers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            groups: [groupId],
            fields: mlFields,
          }),
        });
        mlOk = mlRes.ok;
        if (!mlRes.ok) {
          const err = await mlRes.text();
          console.error('MailerLite error:', mlRes.status, err);
        }
      } catch (mlErr) {
        console.error('MailerLite fetch error:', mlErr);
      }
    } else {
      console.warn('MailerLite: brak MAILERLITE_API_KEY lub MAILERLITE_GROUP_ID');
    }

    // 2. n8n webhook — forward pełnego payloadu (jeśli URL ustawiony)
    const webhookUrl = process.env.N8N_DIAGNOSTYKA_WEBHOOK;
    if (webhookUrl) {
      try {
        const whRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            instagram_handle: instagram_handle || '',
            imie: imie || '',
            wynik_kwota: wynik_kwota || String(totalCost ?? ''),
            wynik_score: wynik_score || String(score ?? ''),
            wynik_potencjal: wynik_potencjal || '',
            wynik_niewykorzystany: wynik_niewykorzystany || '',
            wynik_hamulce: wynik_hamulce || '',
            wynik_badania_count: wynik_badania_count || '',
            wynik_badania_priorytet: wynik_badania_priorytet || '',
            biggest_category: biggest_category || '',
            timestamp: timestamp || new Date().toISOString(),
            source: source || 'diagnostyka_hit',
            odpowiedzi: odpowiedzi || {},
          }),
        });
        webhookOk = whRes.ok;
        if (!whRes.ok) {
          console.error('n8n webhook error:', whRes.status, await whRes.text());
        }
      } catch (whErr) {
        console.error('n8n webhook fetch error:', whErr);
      }
    }

    // 3. Telegram idzie przez n8n workflow (node "Powiadomienie Telegram")

    // Zwracamy status — frontend wie czy się udało
    return NextResponse.json({
      ok: true,
      mailerlite: mlOk,
      webhook: webhookOk,
    });
  } catch (e) {
    console.error('Subscribe API error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
