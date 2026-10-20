import { NextRequest, NextResponse } from 'next/server';
import { validEmail, validInstagram, validLegacyDiagnosticAnswers } from '../../lib/lead-integrity';

export async function POST(req: NextRequest) {
  try {
    const parsed: unknown = await req.json().catch(() => null);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Nieprawidłowe zgłoszenie' }, { status: 400 });
    }
    const body = parsed as Record<string, unknown>;
    const {
      email: rawEmail,
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

    const email = typeof rawEmail === 'string' ? rawEmail.trim() : rawEmail;
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
    if (!validLegacyDiagnosticAnswers(odpowiedzi)
      || wynik_score === null || wynik_score === undefined || (typeof wynik_score === 'string' && !wynik_score.trim())
      || !Number.isFinite(Number(wynik_score)) || Number(wynik_score) < 0 || Number(wynik_score) > 100) {
      return NextResponse.json({ error: 'Niekompletny wynik diagnostyki' }, { status: 422 });
    }
    if (!['dziala_sam', 'chce_zobaczyc_pomoc', 'napisz_mi', 'nie_wie'].includes(intent)) {
      return NextResponse.json({ error: 'Wybierz, jak chcesz dalej działać' }, { status: 422 });
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
            wynik_kwota: wynik_kwota ?? String(totalCost ?? ''),
            wynik_score: wynik_score ?? String(score ?? ''),
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

    if (!mlOk && !webhookOk) {
      return NextResponse.json({ ok: false, mailerlite: mlOk, webhook: webhookOk, telegram: false }, { status: 503 });
    }

    // 3. Telegram BEZPOŚREDNIO (niezależnie od n8n) — spersonalizowany wynik leada do Michała
    let tgOk = false;
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChat = process.env.TELEGRAM_CHAT_ID;
    if (tgToken && tgChat) {
      try {
        const o = (odpowiedzi || {}) as Record<string, unknown>;
        const v = (value: unknown) => typeof value === 'string' ? value.trim() : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
        const q = (value: unknown) => v(value) ? `„${v(value).slice(0, 160)}”` : '';
        const stan = v(body.wynik_stan);
        const stanIco = stan === 'dobry' ? '🟢' : stan === 'średni' ? '🟡' : stan ? '🔴' : '📩';
        const resultScore = v(wynik_score ?? score);
        const who = [v(imie), instagram_handle ? `IG: @${String(instagram_handle).trim().replace(/^@/, '')}` : '', v(email)].filter(Boolean).join(' · ');
        const details = [
          o.sleep == null ? '' : `sen ${v(o.sleep)}h`,
          o.workHours == null ? '' : `praca ${v(o.workHours)}h`,
          o.lost == null ? '' : `pół mocy ${v(o.lost)}h`,
          o.plan == null ? '' : `treningi ${v(o.plan)}/tydz`,
          o.miss == null ? '' : `wypada ${v(o.miss)}`,
        ].filter(Boolean).join(' · ');
        // Nie wyświetlaj „?”, „—”, „brak IG” ani innych atrap przy opcjonalnych polach.
        const lines = [
          `${stanIco} DIAGNOSTYKA${resultScore ? ` — ${resultScore}/100` : ''}${stan ? ` (tydzień ${stan})` : ''}`,
          who,
          v(body.wynik_godzina) ? `Pęka: ${v(body.wynik_godzina)}` : '',
          v(body.wynik_typ) ? `Typ: ${v(body.wynik_typ)}` : '',
          v(biggest_category) ? `Hamulec: ${v(biggest_category)}` : '',
          v(body.intencja) ? `Intencja: ${v(body.intencja)}` : '',
          v(body.kiedy_start) ? `Start: ${v(body.kiedy_start)}` : '',
          q(body.warunek_decyzji) ? `Warunek decyzji: ${q(body.warunek_decyzji)}` : '',
          q(o.pain) ? `Wkurza: ${q(o.pain)}` : '',
          q(o.trigger) ? `Dlaczego teraz: ${q(o.trigger)}` : '',
          q(o.selfDx) ? `Próbował: ${q(o.selfDx)}` : '',
          details ? `Dane: ${details}` : '',
        ].filter(Boolean);
        const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: tgChat, text: lines.join('\n') }),
        });
        const tgBody = await tgRes.json().catch(() => null);
        tgOk = tgRes.ok && tgBody?.ok === true;
        if (!tgRes.ok) console.error('Telegram error:', tgRes.status, await tgRes.text());
      } catch (tgErr) {
        console.error('Telegram fetch error:', tgErr);
      }
    }

    // Nie ogłaszaj zapisu, jeśli żaden kanał nie przyjął danych.
    const saved = mlOk || webhookOk;
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
