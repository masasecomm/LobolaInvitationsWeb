import { NextResponse } from 'next/server';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid verification request.' }, { status: 400 });
  }
  if (typeof body.token !== 'string' || body.token.length < 1 || body.token.length > 2048) {
    return NextResponse.json({ error: 'Complete the security check and try again.' }, { status: 400 });
  }
  const verification = await verifyTurnstileToken(body.token);
  if (!verification.success) {
    return NextResponse.json({ error: verification.error }, { status: verification.status });
  }
  return NextResponse.json({ success: true });
}
