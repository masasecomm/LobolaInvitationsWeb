import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const appName = 'lobola-verification-mail';

function getAdminApp() {
  const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT is not configured.');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT must contain valid JSON.');
  }

  if (
    serviceAccount.project_id !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    || typeof serviceAccount.client_email !== 'string'
    || typeof serviceAccount.private_key !== 'string'
  ) {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT does not match the configured Firebase project.');
  }

  return getApps().find((app) => app.name === appName) || initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, '\n')
    })
  }, appName);
}

export function getFirebaseAdminServices() {
  const app = getAdminApp();
  return {
    auth: getAuth(app),
    firestore: getFirestore(app)
  };
}

export async function getPrimaryAdminUid() {
  const { firestore } = getFirebaseAdminServices();
  const snapshot = await firestore.collection('adminConfig').doc('primary').get();
  const uid = snapshot.get('uid');
  if (typeof uid !== 'string' || !uid) {
    throw new Error('Create adminConfig/primary with the primary administrator UID.');
  }
  return uid;
}

export async function reserveVerificationEmail(uid) {
  const { firestore } = getFirebaseAdminServices();
  const reference = firestore.collection('emailVerificationLimits').doc(uid);
  const now = Date.now();
  const windowKey = new Date(now).toISOString().slice(0, 10);

  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const lastSentAt = snapshot.get('lastSentAt')?.toMillis() || 0;
    const sentWindow = snapshot.get('sentWindow');
    const sentCount = sentWindow === windowKey ? snapshot.get('sentCount') || 0 : 0;

    if (now - lastSentAt < 60_000) {
      return { allowed: false, retryAfter: Math.ceil((60_000 - (now - lastSentAt)) / 1000) };
    }
    if (sentCount >= 5) return { allowed: false, retryAfter: 0 };

    transaction.set(reference, {
      lastSentAt: Timestamp.fromMillis(now),
      sentWindow: windowKey,
      sentCount: sentCount + 1
    });
    return { allowed: true, retryAfter: 0 };
  });
}
