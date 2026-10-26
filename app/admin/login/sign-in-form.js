'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';

export default function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      router.replace('/admin');
      router.refresh();
    } catch (caught) {
      setError(`Could not sign in: ${caught.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={signIn}>
      <label className="field">Email
        <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className="field">Password
        <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      {error && <p className="message error" role="alert">{error}</p>}
      <button className="button" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}
