import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';
import { parseChannel, relaySend, resolveRelayTarget } from '../../lib/hit-relay';

const TEAM_SLUG = 'michals-projects-20fc032f';
const LANDING_PROJECT = 'landing-pages';
const ALLOWED_ENVIRONMENTS = new Set(['preview', 'production']);
const GLOBAL_ISSUER = 'https://oidc.vercel.com';
const TEAM_ISSUER = `${GLOBAL_ISSUER}/${TEAM_SLUG}`;
const AUDIENCE = `https://vercel.com/${TEAM_SLUG}`;

async function verifyLandingCaller(token: string) {
  const decoded = decodeJwt(token);
  const issuer = decoded.iss;
  if (issuer !== GLOBAL_ISSUER && issuer !== TEAM_ISSUER) {
    throw new Error('unexpected issuer');
  }

  const jwksUrl = issuer === GLOBAL_ISSUER
    ? `${GLOBAL_ISSUER}/.well-known/jwks`
    : `${TEAM_ISSUER}/.well-known/jwks`;
  const jwks = createRemoteJWKSet(new URL(jwksUrl));
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience: AUDIENCE,
  });

  if (
    payload.owner !== TEAM_SLUG ||
    payload.project !== LANDING_PROJECT ||
    typeof payload.environment !== 'string' ||
    !ALLOWED_ENVIRONMENTS.has(payload.environment)
  ) {
    throw new Error('caller is not allowed');
  }

  const expectedSubject =
    `owner:${TEAM_SLUG}:project:${LANDING_PROJECT}:environment:${payload.environment}`;
  if (payload.sub !== expectedSubject) {
    throw new Error('unexpected subject');
  }
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  if (!token) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    await verifyLandingCaller(token);
  } catch {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad payload' }, { status: 400 });
  }

  const text =
    body && typeof body === 'object' && 'text' in body
      ? (body as { text?: unknown }).text
      : null;
  if (typeof text !== 'string' || text.trim().length < 1 || text.length > 4000) {
    return NextResponse.json({ ok: false, error: 'bad payload' }, { status: 400 });
  }

  // Kanał HiT (CARE / SALES / OPS). Brak pola = SALES, jak dotąd.
  const channel = parseChannel(
    body && typeof body === 'object' && 'channel' in body ? (body as { channel?: unknown }).channel : undefined,
  );
  if (!channel) {
    return NextResponse.json({ ok: false, error: 'bad payload' }, { status: 400 });
  }

  const target = resolveRelayTarget(channel, process.env);
  if (!target) {
    console.error('telegram relay unavailable: missing configuration');
    return NextResponse.json(
      { ok: false, error: 'telegram unavailable' },
      { status: 503 },
    );
  }

  const result = await relaySend(target, text.trim(), channel);
  if (!result.ok) {
    console.error('telegram relay failed', result.http);
    return NextResponse.json(
      { ok: false, error: 'telegram failed' },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
