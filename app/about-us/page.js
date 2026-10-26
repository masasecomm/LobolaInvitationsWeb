import Link from 'next/link';

const siteUrl = 'https://lobolainvitation.co.za';
const pageTitle = 'About Lobola Invitation | Editable Invitation Templates';
const pageDescription = 'Learn about Lobola Invitation, a digital collection of editable invitation templates for lobola celebrations and related traditional ceremonies.';

export const metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: '/about-us' },
  openGraph: {
    type: 'website',
    url: '/about-us',
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

export default function AboutUsPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: pageTitle,
    description: pageDescription,
    url: `${siteUrl}/about-us`,
    inLanguage: 'en-ZA',
    mainEntity: {
      '@type': 'Organization',
      name: 'Lobola Invitation',
      url: siteUrl,
      description: 'A digital collection of editable invitation templates for lobola celebrations.'
    }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <header className="site-header">
        <Link className="brand" href="/">Lobola Invitation</Link>
        <nav className="header-links" aria-label="Main navigation">
          <Link href="/">Invitation templates</Link>
          <Link href="/about-us" aria-current="page">About us</Link>
          <Link href="/contact-us">Contact us</Link>
        </nav>
      </header>
      <main className="page-wrap info-page">
        <article>
          <span className="eyebrow">Our story</span>
          <h1>About Lobola Invitation</h1>
          <p className="info-page-intro">
            Lobola Invitation is a digital collection of editable invitation templates for
            lobola celebrations and meaningful family occasions.
          </p>

          <section aria-labelledby="purpose-heading">
            <h2 id="purpose-heading">Invitations for your celebration</h2>
            <p>
              Choosing an invitation is one of the ways families share the details of a special
              day with the people they care about. Our collection brings invitation designs
              together in one place so you can browse the published options and find a style
              that suits your occasion.
            </p>
          </section>

          <section aria-labelledby="editable-heading">
            <h2 id="editable-heading">Make an invitation your own</h2>
            <p>
              Open a published template to preview it, personalize the wording and add your own
              photos in the browser. Template details and available editing options are shown on
              each design page.
            </p>
          </section>

          <section aria-labelledby="ceremonies-heading">
            <h2 id="ceremonies-heading">Lobola, Umembeso and related occasions</h2>
            <p>
              The collection is centred on lobola invitation cards and templates. Related
              designs for occasions such as Umembeso or Mahlabiso appear when they are available
              in the published collection.
            </p>
          </section>

          <p className="info-page-actions">
            <Link className="button" href="/">Browse invitation templates</Link>
            <Link href="/contact-us">Contact Lobola Invitation</Link>
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
