import { createHash } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { logger } from '@/libs/Logger';
import { rateLimit } from '@/libs/RateLimit';
import { leadSchema } from '@/models/Schema';

const MAX_BODY_BYTES = 8_192;

const leadInput = z.object({
  email: z.string().email().max(320).toLowerCase().trim(),
  company: z.string().max(200).optional().nullable(),
  role: z.string().max(100).optional().nullable(),
  useCase: z.string().max(1000).optional().nullable(),
  source: z.string().max(100),
  utm: z.record(z.string().max(200)).optional().nullable(),
});

function hashIp(ip: string): string {
  return createHash('sha256')
    .update(`${ip}|strix-lead-salt|${Env.CLERK_SECRET_KEY}`)
    .digest('hex')
    .slice(0, 32);
}

function getIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'
  );
}

export async function POST(req: Request) {
  // Content-length guard — reject obviously oversized bodies before parsing.
  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
  }

  const ip = getIp(req);
  const ipHash = hashIp(ip);

  // Rate limit: 5 submissions per IP per 10 minutes.
  const limit = rateLimit(`lead:${ipHash}`, { limit: 5, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    const retryAfterSecs = Math.ceil(limit.retryAfterMs / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please wait before submitting again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSecs),
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = leadInput.safeParse(body);
  if (!parsed.success) {
    // Don't leak internal field names or schema structure.
    return NextResponse.json({ error: 'Invalid submission. Check your email address and try again.' }, { status: 400 });
  }

  const input = parsed.data;
  const userAgent = req.headers.get('user-agent')?.slice(0, 512) ?? null;
  const referrer = req.headers.get('referer')?.slice(0, 512) ?? null;

  try {
    await db.insert(leadSchema).values({
      email: input.email,
      company: input.company ?? null,
      role: input.role ?? null,
      useCase: input.useCase ?? null,
      source: input.source,
      referrer,
      utm: input.utm ? JSON.stringify(input.utm) : null,
      userAgent,
      ipHash,
    });

    logger.info({ source: input.source, hasCompany: Boolean(input.company) }, 'lead.captured');

    // Fire-and-forget Slack/webhook notification.
    const webhook = Env.LEAD_WEBHOOK_URL;
    if (webhook) {
      fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: `New Strix lead · ${input.source} · ${input.email}${input.company ? ` (${input.company})` : ''}`,
          email: input.email,
          company: input.company ?? null,
          role: input.role ?? null,
          useCase: input.useCase ?? null,
          source: input.source,
        }),
      }).catch(err => logger.warn({ err }, 'lead.webhook_failed'));
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    // Postgres unique-violation code 23505 — treat as success so we don't
    // leak whether an email already exists.
    const code = (err as { code?: string })?.code;
    if (code === '23505') {
      logger.info({ source: input.source }, 'lead.duplicate_suppressed');
      return NextResponse.json({ ok: true });
    }

    logger.error({ err }, 'lead.persist_failed');
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
