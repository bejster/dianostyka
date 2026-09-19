import { NextRequest, NextResponse } from 'next/server';
import { buildDecisionResult, cleanAnswers, DECISION_VERSION, FIT_OPTIONS, isComplete, OBJECTION_OPTIONS, resultAsText } from '../../lib/decision-diagnostic';

// Explicit contact request only. The public result is local and never depends on delivery.
// No synthetic score, severity, budget proxy, inferred libido or automatic sales script.
export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (text.length > 12000) return NextResponse.json({ ok: false, reason: 'too_large' }, { status: 413 });
    const body = JSON.parse(text) as Record<string, unknown>;
    const answers = cleanAnswers(body.answers);
    const ig = typeof body.instagram === 'string' ? body.instagram.trim().replace(/^@/, '') : '';
    const fit = typeof body.fit === 'string' && FIT_OPTIONS.some(o => o.id === body.fit) ? body.fit : '';
    const objection = typeof body.objection === 'string' && OBJECTION_OPTIONS.some(o => o.id === body.objection) ? body.objection : '';
    if (body.version !== DECISION_VERSION || body.consent !== true || fit !== 'coaching' || !isComplete(answers) || !/^[A-Za-z0-9._]{2,30}$/.test(ig)) {
      return NextResponse.json({ ok: false, reason: 'invalid_request' }, { status: 400 });
    }
    const result = buildDecisionResult(answers);
    const brief = resultAsText(answers);
    const payload = {
      event: 'diagnostyka_complete', assessment_version: DECISION_VERSION,
      instagram: `@${ig}`, raw_answers: answers, diagnostyka_brief: brief,
      primary_goal: answers.goal, intencja: 'in_zobacz', wants_help: true,
      followup_priority: false, priority_lead: false,
      fit, objection, experiment_id: result.experiment.id,
      consent: { purpose: 'instagram_contact_about_coaching', granted: true, at: new Date().toISOString() },
      derived_signals: { certainty: result.certainty, experiment_id: result.experiment.id },
    };
    const webhook = (process.env.N8N_DIAGNOSTYKA_WEBHOOK || '').trim();
    const token = (process.env.TELEGRAM_LEADS_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const chat = (process.env.TELEGRAM_LEADS_CHAT_ID || '-1004328603395').trim();
    const request = (url: string, body: unknown) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) }).then(r => r.ok).catch(() => false);
    const [n8n, telegram] = await Promise.all([
      webhook ? request(webhook, payload) : Promise.resolve(false),
      token && chat ? request(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chat,
        text: [`DIAGNOSTYKA 168 · ${DECISION_VERSION}`, `@${ig} prosi o kontakt w sprawie prowadzenia.`, 'Jawna prośba o kontakt. Bez oceny gotowości ani budżetu.', '', `Potrzeba: ${FIT_OPTIONS.find(o => o.id === fit)?.label}`, objection ? `Przed decyzją: ${OBJECTION_OPTIONS.find(o => o.id === objection)?.label}` : '', '', brief].filter(Boolean).join('\n').slice(0, 4000),
        disable_web_page_preview: true,
      }) : Promise.resolve(false),
    ]);
    return NextResponse.json({ ok: n8n || telegram, n8n, telegram }, { status: n8n || telegram ? 200 : 503 });
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_request' }, { status: 400 });
  }
}
