'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase/client';

export default function SiteHeader() {
  const header = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    function closeMenuOnOutsideClick(event) {
      if (!header.current?.contains(event.target)) setMenuOpen(false);
    }

    document.addEventListener('pointerdown', closeMenuOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeMenuOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;
    return onAuthStateChanged(
      getFirebaseAuth(),
      (user) => setSignedIn(Boolean(user?.emailVerified)),
      (error) => console.error('Could not check the customer sign-in status:', error)
    );
  }, []);

  return (
    <header className="home-site-header" ref={header}>
      <button
        className="home-menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="home-site-menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M2 4h16M2 10h16M2 16h16" stroke="currentColor" strokeWidth="2.5" />
        </svg>
        Menu
      </button>
      <nav className={`home-menu-panel${menuOpen ? ' is-open' : ''}`} id="home-site-menu" aria-label="Main navigation">
        <a href="#categories" onClick={closeMenu}>The collection</a>
        <Link href="/blog" onClick={closeMenu}>Blog</Link>
        <a href="#about" onClick={closeMenu}>About us</a>
        <a href="#contact" onClick={closeMenu}>Contact us</a>
        <Link href="/admin" className="admin-link" onClick={closeMenu}>Admin</Link>
      </nav>
      <Link className="home-brand" href="/" aria-label="Lobola Invitation home" onClick={closeMenu}>
        <img className="home-brand-logo" src="/lobola-invitation-logo.jpg" alt="Lobola Invitation logo" />
      </Link>
      <div className="home-header-note" aria-label="Social media and contact links">
        <a className="home-social-link" href="https://www.facebook.com/lobolainvitation/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M13.6 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.2v2.2H7.8V13h2.7v8h3.1Z" />
          </svg>
        </a>
        <a className="home-social-link" href="https://www.instagram.com/lobolainvitation/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="17.7" cy="6.5" r="1.1" fill="currentColor" />
          </svg>
        </a>
        <a className="home-social-link" href="#contact" aria-label="Contact us">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="2.5" y="4.5" width="19" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
            <path d="m4 6 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        {signedIn && <p className="home-auth-status" role="status">You are signed in</p>}
      </div>
    </header>
  );
}
