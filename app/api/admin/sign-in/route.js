import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { firebaseConfig } from '@/lib/firebase/config';
import { getFirebaseAdminServices, getPrimaryAdminUid } from '@/lib/firebase/admin';
import { verifyTurnstileToken } from '@/lib/turnstile';

export const runtime = 'nodejs';

const lockoutMilliseconds = 24 * 60 * 60 * 1000;
const lockoutLimit = 3;

function jsonError(message, status, retryAfter) {
  return NextResponse.json(
    { error: message },
    { status, headers: retryAfter ? { 'Retry-After': String(retryAfter) } : {} }
  );
}

function getClientIp(request) {
  const forwardedIp = request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || '';
  return isIP(forwardedIp) ? forwardedIp : 'unknown';
}

function getAttemptReference(firestore, ip) {
  const ipHash = createHash('sha256').update(ip).digest('hex');
  return firestore.collection('adminSignInAttempts').doc(ipHash);
}

async function getActiveBlock(firestore, reference) {
  const now = Date.now();
  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const blockedUntil = snapshot.get('blockedUntil')?.toMillis() || 0;
    if (blockedUntil > now) return blockedUntil;
    if (blockedUntil && snapshot.exists) {
      transaction.set(reference, { failedAttempts: 0, blockedUntil: Timestamp.fromMillis(0) }, { merge: true });
    }
    return 0;
  });
}

async function recordFailure(firestore, reference) {
  const now = Date.now();
  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const blockedUntil = snapshot.get('blockedUntil')?.toMillis() || 0;
    if (blockedUntil > now) return blockedUntil;
    const failedAttempts = (blockedUntil ? 0 : snapshot.get('failedAttempts') || 0) + 1;
    const nextBlockedUntil = failedAttempts >= lockoutLimit ? now + lockoutMilliseconds : 0;
    transaction.set(reference, {
      failedAttempts,
      blockedUntil: Timestamp.fromMillis(nextBlockedUntil),
    }, { merge: true });
    return nextBlockedUntil;
  });
}

async function clearFailures(firestore, reference) {
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (snapshot.exists) transaction.delete(reference);
  });
}

export async function POST(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 10 * 1024) return jsonError('The sign-in request was too large.', 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('The sign-in request was invalid.', 400);
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const token = typeof body.token === 'string' ? body.token : '';
  if (!email || email.length > 254 || !password || password.length > 4096 || !token || token.length > 2048) {
    return jsonError('Enter your administrator email and password, and complete the security check.', 400);
  }
  if (!firebaseConfig.apiKey) return jsonError('Firebase sign-in is not configured on the server.', 503);

  let services;
  let attemptReference;
  try {
    services = getFirebaseAdminServices();
    attemptReference = getAttemptReference(services.firestore, getClientIp(request));
    const blockedUntil = await getActiveBlock(services.firestore, attemptReference);
    if (blockedUntil) {
      return jsonError(
        'Too many unsuccessful sign-in attempts from this IP. Try again after 24 hours.',
        429,
        Math.ceil((blockedUntil - Date.now()) / 1000)
      );
    }
  } catch (error) {
    console.error('Could not check the administrator sign-in lockout.', error);
    return jsonError('Administrator sign-in is temporarily unavailable. Please try again.', 503);
  }

  const turnstile = await verifyTurnstileToken(token);
  if (!turnstile.success) return jsonError(turnstile.error, turnstile.status);

  let adminUid;
  let adminUser;
  try {
    adminUid = await getPrimaryAdminUid();
    adminUser = await services.auth.getUser(adminUid);
    const membership = await services.firestore.collection('admins').doc(adminUid).get();
    if (!membership.exists) throw new Error('Create admins/{uid} for the configured primary administrator.');
  } catch (error) {
    console.error('Could not load the configured primary administrator.', error);
    return jsonError('Administrator sign-in is not configured. Contact the site administrator.', 503);
  }

  if (!adminUser.email || adminUser.email.toLowerCase() !== email) {
    try {
      const blockedUntil = await recordFailure(services.firestore, attemptReference);
      if (blockedUntil) {
        return jsonError(
          'Too many unsuccessful sign-in attempts from this IP. Try again after 24 hours.',
          429,
          Math.ceil((blockedUntil - Date.now()) / 1000)
        );
      }
    } catch (error) {
      console.error('Could not record an unsuccessful administrator sign-in.', error);
      return jsonError('Administrator sign-in is temporarily unavailable. Please try again.', 503);
    }
    return jsonError('The administrator email or password is incorrect.', 401);
  }

  let authResponse;
  try {
    authResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
        cache: 'no-store',
        signal: AbortSignal.timeout(10000)
      }
    );
  } catch (error) {
    console.error('Firebase Authentication sign-in request failed.', error);
    return jsonError('Could not reach Firebase Authentication. Please try again.', 502);
  }

  let credentials;
  try {
    credentials = await authResponse.json();
  } catch (error) {
    console.error('Firebase Authentication returned an invalid sign-in response.', error);
    return jsonError('Firebase Authentication returned an invalid response.', 502);
  }
  if (!authResponse.ok) {
    if (authResponse.status >= 500) {
      console.error(`Firebase Authentication returned HTTP ${authResponse.status} during administrator sign-in.`);
      return jsonError('Firebase Authentication is temporarily unavailable. Please try again.', 502);
    }
    try {
      const blockedUntil = await recordFailure(services.firestore, attemptReference);
      if (blockedUntil) {
        return jsonError(
          'Too many unsuccessful sign-in attempts from this IP. Try again after 24 hours.',
          429,
          Math.ceil((blockedUntil - Date.now()) / 1000)
        );
      }
    } catch (error) {
      console.error('Could not record an unsuccessful administrator sign-in.', error);
      return jsonError('Administrator sign-in is temporarily unavailable. Please try again.', 503);
    }
    return jsonError('The administrator email or password is incorrect.', 401);
  }

  let signedInUser;
  try {
    signedInUser = await services.auth.getUser(credentials.localId);
  } catch (error) {
    console.error('Could not confirm the authenticated administrator record.', error);
    return jsonError('Could not verify the administrator account. Please try again.', 502);
  }
  if (credentials.localId !== adminUid || signedInUser.disabled) {
    try {
      const blockedUntil = await recordFailure(services.firestore, attemptReference);
      if (blockedUntil) {
        return jsonError(
          'Too many unsuccessful sign-in attempts from this IP. Try again after 24 hours.',
          429,
          Math.ceil((blockedUntil - Date.now()) / 1000)
        );
      }
    } catch (error) {
      console.error('Could not record an unauthorized administrator sign-in.', error);
      return jsonError('Administrator sign-in is temporarily unavailable. Please try again.', 503);
    }
    return jsonError('This account is not permitted to access the administrator area.', 403);
  }

  if (!signedInUser.emailVerified) {
    return NextResponse.json({
      error: 'Verify the primary administrator email before signing in.',
      code: 'ADMIN_EMAIL_NOT_VERIFIED',
      uid: adminUid
    }, { status: 403 });
  }

  try {
    const customToken = await services.auth.createCustomToken(adminUid);
    await clearFailures(services.firestore, attemptReference);
    return NextResponse.json({ customToken }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not complete the administrator sign-in.', error);
    return jsonError('Could not complete administrator sign-in. Please try again.', 502);
  }
}
