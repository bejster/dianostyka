import { NextRequest, NextResponse } from 'next/server';
import { validEmail, validInstagram } from '../../lib/lead-integrity';

export async function POST(req: NextRequest) {
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Nieprawidłowe zgłoszenie' }, { status: 400 });
    }
    const body = parsed as Record<string, unknown>;
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
      // Nowe pola — priority lead routing
      priority_lead,
      commitment_proxy,
      budget_proxy,
      path,
      timestamp,
      source,
      odpowiedzi,
      // Stary format (backward compatibility)
      score,
      totalCost,
      fields,
    } = body;

    if (!validEmail(email)) {
      return NextResponse.json({ error: 'Podaj poprawny email' }, { status: 422 });
    }
    const intent = typeof body.intencja === 'string' ? body.intencja : '';
    const needsDm = intent === 'napisz_mi' || intent === 'chce_zobaczyc_pomoc';
    if ((needsDm || Boolean(instagram_handle)) && !validInstagram(instagram_handle)) {
      return NextResponse.json({ error: 'Podaj poprawny Instagram do kontaktu w DM' }, { status: 422 });
    }
    if (needsDm && !['7dni', '30dni', '2-3mies', 'tylko_sprawdza'].includes(String(body.kiedy_start || ''))) {
      return NextResponse.json({ error: 'Podaj termin planowanego startu' }, { status: 422 });
    }
    if (intent === 'napisz_mi' && (typeof body.warunek_decyzji !== 'string' || body.warunek_decyzji.trim().length < 12)) {
      return NextResponse.json({ error: 'Uzupełnij oczekiwania wobec współpracy' }, { status: 422 });
    }
    // Nie dopuszczaj puste rekordy do handoffu; klient może publikować tylko komplet z diagnostyki.
    if (source === 'diagnostyka_hit' && (!odpowiedzi || typeof odpowiedzi !== 'object' || Array.isArray(odpowiedzi)
      || !Number.isFinite(Number(wynik_score)) || Number(wynik_score) < 0 || Number(wynik_score) > 100)) {
      return NextResponse.json({ error: 'Niekompletny wynik diagnostyki' }, { status: 422 });
    }
    const declaredPriority = needsDm
      && ['7dni', '30dni'].includes(String(body.kiedy_start || ''))
      && Number(wynik_score) >= 40;

    const apiKey = process.env.MAILERLITE_API_KEY;
    const groupId = process.env.MAILERLITE_GROUP_ID;

    // Buduj pola MailerLite — wszystkie dane z diagnostyki
    const mlFields: Record<string, string> = {
      diagnostyka_score: String(wynik_score ?? score ?? ''),
      diagnostyka_cost: String(wynik_kwota ?? totalCost ?? ''),
    };
    if (instagram_handle) mlFields.diagnostyka_ig = String(instagram_handle);
    if (imie) mlFields.name = String(imie);
    if (biggest_category) mlFields.diagnostyka_top_cat = String(biggest_category);
    // Nowe pola — potencjał, hamulce, badania
    if (wynik_potencjal) mlFields.diagnostyka_blocked = String(wynik_potencjal);
    if (wynik_niewykorzystany) mlFields.diagnostyka_usable = String(wynik_niewykorzystany);
    if (wynik_hamulce) mlFields.diagnostyka_brakes = String(wynik_hamulce);
    if (wynik_badania_count) mlFields.diagnostyka_tests_count = String(wynik_badania_count);
    if (wynik_badania_priorytet) mlFields.diagnostyka_tests_priority = String(wynik_badania_priorytet);
    // Whitelist nowych pól — routing i scoring lead
    if (priority_lead !== undefined) mlFields.diagnostyka_priority_lead = String(declaredPriority);
    if (commitment_proxy !== undefined) mlFields.diagnostyka_commitment = String(commitment_proxy);
    // Brak jawnego pytania o budżet — nie zapisuj wydatków z weekendu jako budżetu klienta.
    if (path) mlFields.diagnostyka_path = String(path);
    // Nie przyjmuj arbitralnego nadpisania budżetu ani priorytetu przez przeglądarkę.
    if (fields && source !== 'diagnostyka_hit' && typeof fields === 'object' && !Array.isArray(fields)) {
      Object.assign(mlFields, fields);
    }

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
        // Forward CAŁEGO payloadu - żadne pole nie ginie po drodze do n8n/Telegram/Notion.
        // Spread najpierw, potem fallbacki dla starego formatu i pól wymaganych przez workflow.
        const whRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...body,
            email,
            instagram_handle: instagram_handle || '',
            imie: imie || '',
            wynik_kwota: wynik_kwota || String(totalCost ?? ''),
            wynik_score: wynik_score || String(score ?? ''),
            priority_lead: declaredPriority,
            budget_proxy: null,
            path: path || 'general',
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

    // 3. Telegram BEZPOŚREDNIO (niezależnie od n8n) — spersonalizowany wynik leada do Michała
    let tgOk = false;
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChat = process.env.TELEGRAM_CHAT_ID;
    if (tgToken && tgChat) {
      try {
        const o = (odpowiedzi || {}) as Record<string, unknown>;
        const stan = String(body.wynik_stan || '');
        const stanIco = stan === 'dobry' ? '🟢' : stan === 'średni' ? '🟡' : '🔴';
        const q = (v: unknown) => { const s = String(v ?? '').trim(); return s ? `„${s.slice(0, 160)}"` : '—'; };
        const lines = [
          `${stanIco} DIAGNOSTYKA — ${String(body.wynik_score ?? '?')}/100 (tydzień ${stan || '?'})`,
          `${imie || 'bez imienia'} · ${instagram_handle || 'brak IG'} · ${email}`,
          ``,
          `Pęka: ${String(body.wynik_godzina || '—')} · Typ: ${String(body.wynik_typ || '—')}`,
          `Hamulec: ${String(biggest_category || '—')} · Intencja: ${String(body.intencja || '—')}${body.kiedy_start ? ` · start: ${String(body.kiedy_start)}` : ''}`,
          body.warunek_decyzji ? `Warunek decyzji: ${q(body.warunek_decyzji)}` : '',
          ``,
          `Wkurza: ${q(o.pain)}`,
          `Dlaczego teraz: ${q(o.trigger)}`,
          `Próbował: ${q(o.selfDx)}`,
          ``,
          `Sen ${String(o.sleep ?? '?')}h · praca ${String(o.workHours ?? '?')}h · pół mocy ${String(o.lost ?? '?')}h · treningi ${String(o.plan ?? '?')}/tydz (wypada ${String(o.miss ?? '?')})`,
        ].filter(l => l !== '');
        const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: tgChat, text: lines.join('\n') }),
        });
        tgOk = tgRes.ok;
        if (!tgRes.ok) console.error('Telegram error:', tgRes.status, await tgRes.text());
      } catch (tgErr) {
        console.error('Telegram fetch error:', tgErr);
      }
    }

    // Nie ogłaszaj zapisu, jeśli żaden kanał nie przyjął danych.
    const saved = mlOk || webhookOk || tgOk;
    return NextResponse.json({
      ok: saved,
      mailerlite: mlOk,
      webhook: webhookOk,
      telegram: tgOk,
    }, { status: saved ? 200 : 503 });
  } catch (e) {
    console.error('Subscribe API error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
