import Link from 'next/link';

const siteUrl = 'https://lobolainvitation.co.za';
const pageTitle = 'Contact Lobola Invitation | Invitation Template Enquiries';
const pageDescription = 'Contact Lobola Invitation with questions about editable lobola invitation templates, published designs or using the online editor.';
const contactEmail = 'hello@lobolainvitation.co.za';
const instagramUrl = 'https://www.instagram.com/lobolainvitation/';
const facebookUrl = 'https://www.facebook.com/lobolainvitation/';

export const metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: '/contact-us' },
  openGraph: {
    type: 'website',
    url: '/contact-us',
    siteName: 'Lobola Invitation',
    title: pageTitle,
    description: pageDescription,
    locale: 'en_ZA'
  },
  twitter: {
    card: 'summary',
    title: pageTitle,
    description: pageDescription
  }
};

export default function ContactUsPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: pageTitle,
    description: pageDescription,
    url: `${siteUrl}/contact-us`,
    inLanguage: 'en-ZA',
    mainEntity: {
      '@type': 'Organization',
      name: 'Lobola Invitation',
      url: siteUrl,
      email: contactEmail,
      sameAs: [instagramUrl, facebookUrl],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: contactEmail,
        availableLanguage: 'English'
      }
    }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <header className="site-header">
        <Link className="brand" href="/">Lobola Invitation</Link>
        <nav className="header-links" aria-label="Main navigation">
          <Link href="/">Invitation templates</Link>
          <Link href="/about-us">About us</Link>
          <Link href="/contact-us" aria-current="page">Contact us</Link>
        </nav>
      </header>
      <main className="page-wrap info-page">
        <article>
          <span className="eyebrow">We’re here to help</span>
          <h1>Contact Lobola Invitation</h1>
          <p className="info-page-intro">
            Have a question about a lobola invitation template, a published design or the online
            editor? Choose a contact option below.
          </p>

          <section className="contact-options" aria-label="Contact options">
            <div>
              <h2>Email</h2>
              <p>Send your enquiry to Lobola Invitation by email.</p>
              <a className="button" href={`mailto:${contactEmail}?subject=${encodeURIComponent('Lobola Invitation enquiry')}`}>
                {contactEmail}
              </a>
            </div>
            <div>
              <h2>Social media</h2>
              <p>Connect with Lobola Invitation on social media.</p>
              <p className="contact-social-links">
                <a href={instagramUrl} target="_blank" rel="noreferrer">Instagram</a>
                <a href={facebookUrl} target="_blank" rel="noreferrer">Facebook</a>
              </p>
            </div>
          </section>

          <section aria-labelledby="helpful-details-heading">
            <h2 id="helpful-details-heading">What to include in your enquiry</h2>
            <p>
              If your question is about a specific design, include its template name or page link.
              For help using the editor, describe what you were trying to do and what happened.
            </p>
          </section>

          <p className="info-page-actions">
            <Link className="button secondary" href="/">Browse lobola invitation templates</Link>
            <Link href="/about-us">Learn about Lobola Invitation</Link>
          </p>
        </article>
      </main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Lobola Invitation</span>
        <nav className="footer-links" aria-label="Footer navigation">
          <Link href="/">Templates</Link>
          <Link href="/about-us">About us</Link>
          <Link href="/contact-us">Contact us</Link>
        </nav>
      </footer>
    </>
  );
}
