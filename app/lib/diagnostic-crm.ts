// Existing Make -> canonical CRM contract (restored from 4af60fb, 2026-09-21).
// A 2xx is transport acceptance, never proof of a record in CloserOS.
export interface DiagnosticLead {
  lead_ref: string;
  instagram: string;
  imie: string;
  score: number;
  severity_band: string;
  archetyp: string;
  archetypKey: string;
  followup_priority: boolean;
  wants_help: boolean;
  intencja: string;
  kiedy_start: string;
  pain: string;
  raw_answers: Record<string, unknown>;
  derived_signals: Record<string, unknown>;
  diagnostyka_brief: string;
}
function chunks(value: unknown, count: number): string[] {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  // Never silently truncate the diagnostic. Reject before I/O instead.
  if (text.length > 1900 * count) throw new Error('diagnostic_payload_too_large');
  return Array.from({length:count}, (_,i)=>JSON.stringify(text.slice(i*1900,(i+1)*1900)));
}
export async function persistDiagnosticLead(lead: DiagnosticLead) {
  const makeUrl = process.env.MAKE_DIAGNOSTYKA_WEBHOOK?.trim();
  const n8nUrl = process.env.N8N_DIAGNOSTYKA_WEBHOOK?.trim();
  const raw = chunks(lead.raw_answers,4);
  const derived = chunks(lead.derived_signals,2);
  const brief = chunks(lead.diagnostyka_brief,3);
  const makeBody = {
    event:'diagnostyka_complete', ...lead, qa_synthetic:false,
    lead_ref_json:JSON.stringify(lead.lead_ref), instagram_json:JSON.stringify(lead.instagram),
    name_json:JSON.stringify(lead.imie || lead.instagram), pain_json:JSON.stringify(lead.pain),
    record_type_json:JSON.stringify('REAL'), exclude_kpi_json:'false',
    // An assessment or curiosity is not consent for unsolicited sales outreach.
    do_not_contact_json:lead.wants_help ? 'false' : 'true',
    ...Object.fromEntries(raw.map((v,i)=>[`raw_${i+1}_json`,v])),
    ...Object.fromEntries(derived.map((v,i)=>[`derived_${i+1}_json`,v])),
    ...Object.fromEntries(brief.map((v,i)=>[`brief_${i+1}_json`,v])),
  };
  async function post(url: string, body: unknown) {
    try {
      const r = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
      return {ok:r.ok,status:r.status};
    } catch { return {ok:false,status:null}; }
  }
  let make: {ok:boolean;status:number|null} | null = null;
  if(makeUrl) make = await post(makeUrl,makeBody);
  // Historical conflict guard: do not bypass an identity conflict with a second writer.
  let n8n: {ok:boolean;status:number|null} | null = null;
  if(!make?.ok && make?.status!==409 && n8nUrl) {
    n8n = await post(n8nUrl,{event:'diagnostyka_complete',...lead,priority_lead:lead.followup_priority,segment:lead.severity_band,received_at:new Date().toISOString()});
  }
  return {accepted:make?.ok===true||n8n?.ok===true,configured:Boolean(makeUrl||n8nUrl),make:make?.ok??null,makeStatus:make?.status??null,n8n:n8n?.ok??null};
}
