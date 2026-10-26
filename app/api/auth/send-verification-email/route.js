import { NextResponse } from 'next/server';
import { getFirebaseAdminServices, reserveVerificationEmail } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

function jsonError(message, status, headers = {}) {
  return NextResponse.json({ error: message }, { status, headers });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) throw new Error('NEXT_PUBLIC_SITE_URL is not configured.');

  const parsedUrl = new URL(siteUrl);
  if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
    throw new Error('NEXT_PUBLIC_SITE_URL must use HTTPS outside local development.');
  }
  return parsedUrl;
}

export async function POST(request) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const sender = process.env.RESEND_FROM_EMAIL;
  if (!resendApiKey || !sender) {
    return jsonError('Custom verification email is not configured yet. Add RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel.', 503);
  }

  const authorization = request.headers.get('authorization') || '';
  const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!idToken) return jsonError('Sign in before requesting an email confirmation link.', 401);

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 2048) return jsonError('The verification email request was too large.', 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('The verification email request was invalid.', 400);
  }

  const slug = body?.slug;
  if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return jsonError('The template link is invalid. Refresh the page and try again.', 400);
  }

  try {
    const { auth } = getFirebaseAdminServices();
    const decodedToken = await auth.verifyIdToken(idToken, true);
    const user = await auth.getUser(decodedToken.uid);
    if (!user.email) return jsonError('This account does not have an email address.', 400);
    if (user.emailVerified) return jsonError('This email is already confirmed. Sign in again to continue.', 409);

    const siteUrl = getSiteUrl();
    const continueUrl = new URL(`/product/${encodeURIComponent(slug)}`, siteUrl).toString();
    const verificationLink = await auth.generateEmailVerificationLink(user.email, {
      url: continueUrl,
      handleCodeInApp: false
    });

    const reservation = await reserveVerificationEmail(user.uid);
    if (!reservation.allowed) {
      if (reservation.retryAfter > 0) {
        return jsonError(
          `Please wait ${reservation.retryAfter} seconds before requesting another confirmation email.`,
          429,
          { 'Retry-After': String(reservation.retryAfter) }
        );
      }
      return jsonError('You have reached the daily limit of 5 confirmation emails. Please try again tomorrow.', 429);
    }

    const safeLink = escapeHtml(verificationLink);
    let response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: sender,
          to: [user.email],
          subject: 'Confirm your email for Lobola Invitation',
          html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#33251f;max-width:560px;margin:0 auto;padding:24px"><h1 style="color:#713d32">Lobola Invitation</h1><p>Confirm your email address to edit your invitation template.</p><p><a href="${safeLink}" style="display:inline-block;background:#713d32;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px">Confirm my email</a></p><p>If the button does not work, copy and paste this link into your browser:</p><p style="word-break:break-all">${safeLink}</p><p>If you did not create this account, you can ignore this message.</p></div>`,
          text: `Confirm your email address to edit your Lobola Invitation template.\n\nOpen this link to confirm: ${verificationLink}\n\nIf you did not create this account, you can ignore this message.`
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15000)
      });
    } catch (error) {
      console.error('Resend request failed while sending a verification email.', error);
      return jsonError('The email service could not be reached. Please try again in a minute.', 502);
    }

    if (!response.ok) {
      console.error(`Resend rejected a verification email with HTTP ${response.status}.`);
      return jsonError('The email service could not send the confirmation message. Please try again later.', 502);
    }

    return NextResponse.json({
      message: 'The confirmation email was accepted by the email service. Check your inbox and spam folder.'
    });
  } catch (error) {
    if (error?.code === 'auth/argument-error' || error?.code === 'auth/id-token-expired' || error?.code === 'auth/invalid-id-token') {
      return jsonError('Your sign-in expired. Sign in again and request a new confirmation email.', 401);
    }

    console.error('Could not generate or send a custom verification email.', error);
    return jsonError('Could not prepare the confirmation email. Please try again later.', 502);
  }
}
