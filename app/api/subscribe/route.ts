import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      instagram_handle,
      imie,
      wynik_kwota,
      wynik_score,
      biggest_category,
      timestamp,
      source,
      odpowiedzi,
      // Stary format (backward compatibility)
      score,
      totalCost,
      fields,
    } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const apiKey = process.env.MAILERLITE_API_KEY;
    const groupId = process.env.MAILERLITE_GROUP_ID;

    // Buduj pola MailerLite — nowy format (z gate'a) lub stary
    const mlFields: Record<string, string> = {
      diagnostyka_score: String(wynik_score ?? score ?? ''),
      diagnostyka_cost: String(wynik_kwota ?? totalCost ?? ''),
    };
    if (instagram_handle) mlFields.diagnostyka_ig = instagram_handle;
    if (imie) mlFields.name = imie;
    if (biggest_category) mlFields.diagnostyka_top_cat = biggest_category;
    if (fields) Object.assign(mlFields, fields);

    // 1. MailerLite — dodaj do grupy diagnostyka-leads
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

    if (!mlRes.ok) {
      const err = await mlRes.text();
      console.error('MailerLite error:', err);
      // Nie blokujemy — próbujemy webhook dalej
    }

    // 2. n8n webhook - forward pelnego payloadu (jesli URL ustawiony)
    const webhookUrl = process.env.N8N_DIAGNOSTYKA_WEBHOOK;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            instagram_handle: instagram_handle || '',
            imie: imie || '',
            wynik_kwota: wynik_kwota || String(totalCost ?? ''),
            wynik_score: wynik_score || String(score ?? ''),
            biggest_category: biggest_category || '',
            timestamp: timestamp || new Date().toISOString(),
            source: source || 'diagnostyka',
            odpowiedzi: odpowiedzi || {},
          }),
        });
      } catch (whErr) {
        console.error('n8n webhook error:', whErr);
      }
    }

    // 3. Telegram - powiadomienie z danymi leada do domykania
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_CHAT_ID;
    if (tgToken && tgChatId) {
      try {
        const finalScore = wynik_score ?? score ?? '?';
        const finalCost = wynik_kwota ?? totalCost ?? '?';
        const ig = instagram_handle || 'brak';
        const name = imie || 'brak';
        const topCat = biggest_category || '?';
        const odp = odpowiedzi || {};

        // Buduj czytelna wiadomosc
        let msg = `🔔 NOWY LEAD - DIAGNOSTYKA\n\n`;
        msg += `👤 ${name}\n`;
        msg += `📧 ${email}\n`;
        msg += `📱 IG: @${ig.replace('@', '')}\n\n`;
        msg += `📊 Score: ${finalScore}/100\n`;
        msg += `💰 Koszt: ${Number(finalCost).toLocaleString('pl-PL')} zł / 6 mies.\n`;
        msg += `🏷 Top kategoria: ${topCat}\n\n`;

        // Kluczowe odpowiedzi do domykania
        if (odp.sleep) msg += `😴 Sen: ${odp.sleep}h\n`;
        if (odp.drinks) msg += `🍺 Drinki: ${odp.drinks}\n`;
        if (odp.subs > 0) msg += `💊 Substancje: ${odp.subs} zł/mies.\n`;
        if (odp.wknd) msg += `🎉 Weekendy: ${odp.wknd}/mies.\n`;
        if (odp.plan) msg += `🏋️ Treningi: ${odp.plan}/tyg. (miss: ${odp.miss || 0})\n`;
        if (odp.tags && odp.tags.length > 0) msg += `⚠️ Sygnały: ${odp.tags.join(', ')}\n`;

        msg += `\n⏰ ${new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })}`;

        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgChatId,
            text: msg,
            parse_mode: 'HTML',
          }),
        });
      } catch (tgErr) {
        console.error('Telegram error:', tgErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
