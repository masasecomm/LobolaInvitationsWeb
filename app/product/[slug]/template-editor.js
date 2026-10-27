'use client';

import { useEffect, useRef, useState } from 'react';
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  createUserWithEmailAndPassword, onAuthStateChanged,
  sendPasswordResetEmail, signInWithEmailAndPassword, signOut
} from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase/client';

const exportActions = ['download-png', 'download-jpg', 'download-pdf-print', 'download-mp4'];

export default function TemplateEditor({ product, autoOpenEditor = false }) {
  const frame = useRef(null);
  const profileLookupId = useRef(0);
  const [accountState, setAccountState] = useState('checking');
  const [account, setAccount] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [accountMode, setAccountMode] = useState('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMessage, setAccountMessage] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [reviewNotice, setReviewNotice] = useState('');
  const [reviewAction, setReviewAction] = useState('');
  const [rating, setRating] = useState(0);
  const [reviewerName, setReviewerName] = useState('');
  const [comment, setComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [editorExpanded, setEditorExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      const lookupId = ++profileLookupId.current;
      if (user && !user.emailVerified) {
        setAccount(null);
        setProfileUser(null);
        setAccountState('ready');
        setAccountMessage('Confirm your email using the link we sent, then sign in here.');
        return;
      }
      if (!user) {
        setAccount(null);
        setProfileUser(null);
        setAccountState('ready');
        return;
      }

      setAccountState('checking-profile');
      try {
        const snapshot = await getDoc(doc(getFirebaseDb(), 'customerProfiles', user.uid));
        if (!active || lookupId !== profileLookupId.current) return;
        const profile = snapshot.data();
        if (snapshot.exists() && typeof profile.name === 'string' && typeof profile.phoneNumber === 'string') {
          setAccount(user);
          setProfileUser(null);
        } else {
          setAccount(null);
          setProfileUser(user);
        }
        setAccountState('ready');
      } catch (caught) {
        if (active && lookupId === profileLookupId.current) {
          setError(`Could not load your customer details: ${caught.message}`);
          setAccountState('error');
        }
      }
    }, (caught) => {
      setError(`Could not verify your sign-in: ${caught.message}`);
      setAccountState('error');
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (accountState !== 'ready' || !account) return undefined;
    async function receive(event) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'lobola-editor-ready') {
        frame.current.contentWindow.postMessage({
          type: 'lobola-load-template',
          slug: product.slug,
          title: product.title,
          canvasFormat: product.canvasFormat || product.design_json?.canvasFormat || 'standard',
          design: product.design_json,
          elements: product.elements || [],
          customerPhotoUploads: true
        }, window.location.origin);
      }
      if (event.data?.type === 'lobola-template-loaded') {
        setReady(true);
        setEditorExpanded(true);
      }
      if (event.data?.type === 'lobola-editor-closed') setEditorExpanded(false);
      if (event.data?.type === 'lobola-template-reset') {
        setAccountMessage('This invitation has been reset to the original template design.');
      }
      if (event.data?.type === 'lobola-editor-error') setError(event.data.message);
      if (event.data?.type === 'lobola-review-required' && exportActions.includes(event.data.action)) {
        setReviewAction(event.data.action);
        setReviewNotice('');
      }
    }
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [product, accountState, account]);

  async function sendVerificationLink(user, auth) {
    try {
      const response = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ slug: product.slug })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The email service could not send the confirmation message.');
    } catch (caught) {
      await signOut(auth);
      throw new Error(caught.message);
    }
    await signOut(auth);
  }

  async function submitAccount(event) {
    event.preventDefault();
    setAccountBusy(true);
    setAccountMessage('');
    setError('');
    let accountWasCreated = false;
    try {
      const auth = getFirebaseAuth();
      if (accountMode === 'create') {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        accountWasCreated = true;
        await sendVerificationLink(credential.user, auth);
        setAccountMessage('The confirmation email was accepted for delivery. Check your inbox and spam folder, then sign in here after confirming.');
        setAccountMode('sign-in');
      } else {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        await credential.user.reload();
        if (!credential.user.emailVerified) {
          await sendVerificationLink(credential.user, auth);
          throw new Error('Confirm your email using the link we just sent, then sign in again.');
        }
        setAccountMessage('Email confirmed. Checking your customer details…');
        const lookupId = ++profileLookupId.current;
        setAccountState('checking-profile');
        const profileSnapshot = await getDoc(doc(getFirebaseDb(), 'customerProfiles', credential.user.uid));
        if (lookupId === profileLookupId.current) {
          const profile = profileSnapshot.data();
          if (profileSnapshot.exists() && typeof profile.name === 'string' && typeof profile.phoneNumber === 'string') {
            setAccount(credential.user);
            setProfileUser(null);
          } else {
            setAccount(null);
            setProfileUser(credential.user);
          }
          setAccountState('ready');
        }
      }
    } catch (caught) {
      setAccountState('ready');
      if (accountWasCreated) {
        setAccountMode('sign-in');
        setError(`Your account was created, but we could not send its confirmation email: ${caught.message}`);
      } else if (accountMode === 'create' && caught.code === 'auth/email-already-in-use') {
        setAccountMode('sign-in');
        setError('This email address is already registered. Sign in, or use the lost-password option below.');
      } else {
        setError(`Could not ${accountMode === 'create' ? 'create account' : 'sign in'}: ${caught.message}`);
      }
    } finally {
      setAccountBusy(false);
    }
  }

  async function submitCustomerProfile(event) {
    event.preventDefault();
    const name = customerName.trim();
    const phoneNumber = customerPhone.trim();
    if (!name || name.length > 100) {
      setError('Enter your name using 1 to 100 characters.');
      return;
    }
    if (!/^[0-9+() .-]{7,24}$/.test(phoneNumber)) {
      setError('Enter a valid phone number using 7 to 24 digits or common phone symbols.');
      return;
    }

    setAccountBusy(true);
    setError('');
    try {
      await setDoc(doc(getFirebaseDb(), 'customerProfiles', profileUser.uid), {
        name,
        phoneNumber,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setAccount(profileUser);
      setProfileUser(null);
      setAccountMessage('Thank you. Your details are saved and you can now edit this invitation.');
    } catch (caught) {
      setError(`Could not save your customer details: ${caught.message}`);
    } finally {
      setAccountBusy(false);
    }
  }

  async function sendPasswordReset() {
    setAccountBusy(true);
    setError('');
    setAccountMessage('');
    try {
      const auth = getFirebaseAuth();
      try {
        await sendPasswordResetEmail(auth, email.trim());
      } catch (caught) {
        if (caught.code !== 'auth/user-not-found') throw caught;
      }
      setAccountMessage('If an account exists for this email address, a password-reset link will arrive shortly.');
    } catch (caught) {
      setError(`Could not send a password-reset email: ${caught.message}`);
    } finally {
      setAccountBusy(false);
    }
  }

  useEffect(() => {
    if (!autoOpenEditor) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('editor-open');
    window.history.replaceState({}, '', url);
  }, [autoOpenEditor]);

  function openEditor() {
    setEditorExpanded(true);
    frame.current?.contentWindow?.postMessage({ type: 'lobola-open-editor' }, window.location.origin);
  }

  function resetEditorToOriginal() {
    if (!window.confirm('Reset all edits and restore the original template design?')) return;
    frame.current?.contentWindow?.postMessage({
      type: 'lobola-reset-template',
      canvasFormat: product.canvasFormat || product.design_json?.canvasFormat || 'standard',
      design: product.design_json || null
    }, window.location.origin);
  }

  async function signOutEditor() {
    try {
      await signOut(getFirebaseAuth());
      setAccount(null);
      setReady(false);
      setAccountMessage('You have signed out.');
    } catch (caught) {
      setError(`Could not sign out: ${caught.message}`);
    }
  }

  async function submitReview(event) {
    event.preventDefault();
    if (!reviewAction) return;
    setSavingReview(true);
    setError('');
    try {
      const review = {
        productId: product.id,
        productSlug: product.slug,
        rating,
        reviewerName: reviewerName.trim() || 'Anonymous',
        comment: comment.trim(),
        createdAt: serverTimestamp()
      };
      await addDoc(collection(getFirebaseDb(), 'reviews'), review);
      frame.current?.contentWindow?.postMessage({
        type: 'lobola-review-approved',
        action: reviewAction
      }, window.location.origin);
      setReviewAction('');
      setRating(0);
      setReviewerName('');
      setComment('');
      setReviewNotice('Thank you. Your review was submitted and the requested export is continuing.');
    } catch (caught) {
      setError(`Could not submit your review: ${caught.message}`);
    } finally {
      setSavingReview(false);
    }
  }

  if (accountState === 'checking') {
    return <section className="panel"><p role="status">Checking email confirmation…</p></section>;
  }

  if (accountState === 'checking-profile') {
    return <section className="panel"><p role="status">Checking your customer details…</p></section>;
  }

  if (profileUser) {
    return (
      <section className="panel template-account">
        <h2>Complete your customer details</h2>
        <p>Your email is confirmed. Please provide your name and phone number before continuing to the invitation editor.</p>
        <form className="form-grid" onSubmit={submitCustomerProfile}>
          <label className="field">Your name
            <input autoComplete="name" required maxLength={100} value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
          </label>
          <label className="field">Phone number
            <input type="tel" autoComplete="tel" required minLength={7} maxLength={24} value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
          </label>
          {error && <p className="message error" role="alert">{error}</p>}
          <button className="button" type="submit" disabled={accountBusy}>{accountBusy ? 'Saving…' : 'Save details and continue'}</button>
        </form>
      </section>
    );
  }

  if (!account) {
    return (
      <section className="panel template-account">
        <h2>{accountMode === 'create' ? 'Create an account to edit' : 'Sign in to edit'}</h2>
        <p>Confirm your email and provide your name and phone number to edit this invitation. Your edits and uploaded photos stay in this browser only. Photos are removed the next time you open the editor after five days; clearing this browser's site data removes them sooner.</p>
        {accountMessage && <p className="message success" role="status">{accountMessage}</p>}
        <form className="form-grid" onSubmit={submitAccount}>
          <label className="field">Email
            <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="field">Password
            <input type="password" autoComplete={accountMode === 'create' ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <p className="message error" role="alert">{error}</p>}
          <button className="button" type="submit" disabled={accountBusy}>
            {accountBusy ? 'Please wait…' : accountMode === 'create' ? 'Create account and send confirmation email' : 'Sign in'}
          </button>
        </form>
          {accountMode === 'sign-in' && (
            <button className="text-button template-account-switch" type="button" disabled={accountBusy || !email.trim()} onClick={sendPasswordReset}>
              Forgot or lost your password?
            </button>
          )}
          <button className="text-button template-account-switch" type="button" onClick={() => { setAccountMode(accountMode === 'create' ? 'sign-in' : 'create'); setError(''); setAccountMessage(''); }}>
          {accountMode === 'create' ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
      </section>
    );
  }

  return (
    <div className={editorExpanded ? 'customer-editor-fullscreen' : undefined}>
      <div className="template-account-status">
        <p>Email confirmed: {account.email}</p>
        <button className="text-button" type="button" onClick={signOutEditor}>Sign out</button>
      </div>
      {accountMessage && <p className="message success" role="status">{accountMessage}</p>}
      <button className="button editor-launch" type="button" onClick={openEditor} disabled={!ready}>
        {ready ? 'Edit this invitation' : 'Loading editor…'}
      </button>
      <button className="button secondary customer-editor-reset" type="button" onClick={resetEditorToOriginal} disabled={!ready}>
        Reset to original design
      </button>
      {error && <p className="message error" role="alert">{error}</p>}
      {reviewNotice && <p className="message success" role="status">{reviewNotice}</p>}
      <div className="template-frame-wrap">
        <iframe
          className={`template-frame${editorExpanded ? ' customer-editor-frame' : ''}`}
          ref={frame}
          src="/invitation-editor.html"
          title={`${product.title} invitation editor`}
          onLoad={() => {
            setReady(false);
            frame.current?.contentWindow?.postMessage({ type: 'lobola-parent-ready' }, window.location.origin);
          }}
        />
      </div>
      {reviewAction && (
        <div className="editor-overlay" role="presentation">
          <section className="panel review-dialog" role="dialog" aria-modal="true" aria-labelledby="review-title">
            <h2 id="review-title">Review this invitation</h2>
            <p>Leave a rating and comment before downloading or printing. Your review will be shown on this template page.</p>
            <form className="form-grid" onSubmit={submitReview}>
              <fieldset className="field review-rating">
                <legend>Your rating</legend>
                {[1, 2, 3, 4, 5].map((value) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="rating"
                      value={value}
                      required
                      checked={rating === value}
                      onChange={() => setRating(value)}
                    />
                    <span aria-hidden="true">{value <= rating ? '★' : '☆'}</span>
                    <span className="visually-hidden">{value} {value === 1 ? 'star' : 'stars'}</span>
                  </label>
                ))}
              </fieldset>
              <label className="field">Your name (optional)
                <input maxLength={80} value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} />
              </label>
              <label className="field">Your review
                <textarea required minLength={8} maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} />
              </label>
              {error && <p className="message error" role="alert">{error}</p>}
              <div className="form-actions">
                <button className="button" type="submit" disabled={savingReview || !rating}>
                  {savingReview ? 'Submitting…' : 'Submit review and continue'}
                </button>
                <button className="button secondary" type="button" disabled={savingReview} onClick={() => setReviewAction('')}>Cancel</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
