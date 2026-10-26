import Link from 'next/link';
import SignInForm from './sign-in-form';
import { isFirebaseConfigured } from '@/lib/firebase/config';

export const metadata = { title: 'Admin sign in | Lobola Invitation' };

export default function AdminLoginPage() {
  return (
    <main className="signin-wrap">
      <section className="signin-card">
        <Link href="/" className="brand">Lobola Invitation</Link>
        <h1>Admin sign in</h1>
        <p className="help">Sign in with an administrator account to manage invitation templates.</p>
        {!isFirebaseConfigured
          ? <p className="message error">Firebase is not configured. Follow the setup instructions in <code>SETUP.md</code>.</p>
          : <SignInForm />}
      </section>
    </main>
  );
}
