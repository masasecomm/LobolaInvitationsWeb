'use client';

import { useState } from 'react';
import Link from 'next/link';

const logoUrl = 'https://scontent-jnb2-1.xx.fbcdn.net/v/t39.30808-1/284088209_104493135614872_3978818778956920310_n.jpg?stp=dst-jpg_tt6&cstp=mx1154x1154&ctp=s200x200&_nc_cat=104&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=ENEKrX1DM9cQ7kNvwGkf2_o&_nc_oc=Adq_gO_ZqLS97sTeYycWqPiwxwkmPTg4HcoeG1rud5G_WX23LRtL4ybAS67B__nA8fw&_nc_zt=24&_nc_ht=scontent-jnb2-1.xx&_nc_gid=fXKYgnKTf0nKccF_cBYDEg&_nc_ss=7b2a8&oh=00_AQN2ox7Rbe65ag-KXq4yjIpuZgJ4KQsi8CEySRFopO6_yQ&oe=6AD6D1C5';

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="home-site-header">
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
        <a href="#about" onClick={closeMenu}>About us</a>
        <a href="#contact" onClick={closeMenu}>Contact us</a>
        <Link href="/admin" className="admin-link" onClick={closeMenu}>Admin</Link>
      </nav>
      <Link className="home-brand" href="/" aria-label="Lobola Invitation home">
        <img className="home-brand-logo" src={logoUrl} alt="Lobola Invitation logo" />
        <span className="home-brand-tagline">Editable Digital Templates</span>
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
      </div>
    </header>
  );
}
