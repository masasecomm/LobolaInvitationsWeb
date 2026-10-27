'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';

const turnstileSiteKey = '0x4AAAAAAFbXDbZY4AJ5gGSD';

export default function SignInForm() {
  const router = useRouter();
  const captcha = useRef(null);
  const widgetId = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    function renderWidget() {
      if (!active || !captcha.current || !window.turnstile || widgetId.current !== null) return;
      widgetId.current = window.turnstile.render(captcha.current, {
        sitekey: turnstileSiteKey,
        callback: (token) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(''),
        'error-callback': () => {
          setCaptchaToken('');
          setError('The security check could not load. Refresh the page and try again.');
          return true;
        }
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      script.onerror = () => setError('The security check could not load. Check your connection and refresh the page.');
      document.head.appendChild(script);
    }
    return () => {
      active = false;
      if (widgetId.current !== null && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, []);

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!captchaToken) throw new Error('Complete the security check before signing in.');
      const response = await fetch('/api/admin/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, token: captchaToken })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Administrator sign-in failed.');
      await signInWithCustomToken(getFirebaseAuth(), result.customToken);
      router.replace('/admin');
      router.refresh();
    } catch (caught) {
      setError(caught.message);
      setCaptchaToken('');
      if (widgetId.current !== null) window.turnstile?.reset(widgetId.current);
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
      <div className="turnstile-widget" ref={captcha} />
      {error && <p className="message error" role="alert">{error}</p>}
      <button className="button" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}
