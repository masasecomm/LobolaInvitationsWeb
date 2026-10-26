import { NextResponse } from 'next/server';

export async function POST(request) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: 'Turnstile verification is not configured on the server.' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid verification request.' }, { status: 400 });
  }
  if (typeof body.token !== 'string' || body.token.length < 1 || body.token.length > 2048) {
    return NextResponse.json({ error: 'Complete the security check and try again.' }, { status: 400 });
  }

  const form = new URLSearchParams({ secret, response: body.token });

  let result;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      cache: 'no-store'
    });
    if (!response.ok) {
      console.error(`Turnstile verification service returned HTTP ${response.status}.`);
      return NextResponse.json({ error: 'Could not verify the security check. Please try again.' }, { status: 502 });
    }
    result = await response.json();
  } catch (error) {
    console.error('Turnstile verification request failed.', error);
    return NextResponse.json({ error: 'Could not verify the security check. Please try again.' }, { status: 502 });
  }

  if (!result.success || result.hostname !== 'lobolainvitation.co.za' && result.hostname !== 'www.lobolainvitation.co.za' && result.hostname !== 'localhost') {
    return NextResponse.json({ error: 'Security check failed. Please try again.' }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
