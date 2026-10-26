import { getPublicCatalog, isFirebaseConfigured } from '@/lib/firebase/catalog';
import CategoryGallery from './category-gallery';
import SiteHeader from './site-header';

export const dynamic = 'force-dynamic';

const siteUrl = 'https://lobolainvitation.co.za';
const homeTitle = 'Lobola Invitation Cards & Templates | Editable Designs';
const homeDescription = 'Explore editable lobola invitation cards and templates for your celebration. Browse published designs, including Umembeso and Mahlabiso invitations when available.';

export const metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Lobola Invitation',
    title: homeTitle,
    description: homeDescription,
    locale: 'en_ZA'
  },
  twitter: {
    card: 'summary',
    title: homeTitle,
    description: homeDescription
  }
};

export default async function HomePage() {
  const catalog = isFirebaseConfigured ? await getPublicCatalog() : null;
  const categories = catalog?.categories || [];
  const products = catalog?.products || [];
  const categoryGroups = categories
    .map((category) => ({
      ...category,
      products: products.filter((product) => product.categoryId === category.id)
    }))
    .filter((category) => category.products.length > 0);
  const uncategorizedProducts = products.filter((product) =>
    !categories.some((category) => category.id === product.categoryId)
  );
  if (uncategorizedProducts.length) {
    categoryGroups.push({ id: 'other-products', name: 'More designs', products: uncategorizedProducts });
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Lobola Invitation',
            url: siteUrl,
            description: homeDescription,
            inLanguage: 'en-ZA'
          })
        }}
      />
      <div className="home-page">
        <SiteHeader />
        <main>
          <section className="home-intro" aria-labelledby="home-title">
            <p className="section-label">Editable digital invitation templates</p>
            <h1 id="home-title">Lobola Invitation Cards &amp; Templates</h1>
            <p>
              Browse digital invitation designs for your lobola celebration. Explore editable lobola
              invitation cards and templates, and find published designs for occasions such as Umembeso
              and Mahlabiso when available.
            </p>
            <a className="text-link" href="#categories">Browse lobola invitation templates</a>
          </section>

          <CategoryGallery categories={categoryGroups} />

          <section className="details" id="about">
            <div>
              <p className="section-label">About us</p>
              <h2>About Lobola Invitation</h2>
            </div>
            <div className="details-copy">
              <p>
                Lobola Invitation is a digital collection of editable invitation templates for lobola
                celebrations and meaningful family occasions. Browse the available designs to find an
                invitation style that suits your special day.
              </p>
              <p>
                Open a published template to preview it, personalize the wording and add your own photos
                in the browser. Designs for Umembeso, Mahlabiso and related occasions appear when they
                are available in the collection.
              </p>
              <a className="text-link" href="#categories">Explore invitation templates</a>
            </div>
          </section>

          <section className="contact-section" id="contact" aria-labelledby="contact-title">
            <div className="contact-heading">
              <p className="section-label">Contact us</p>
              <h2 id="contact-title">Contact Lobola Invitation</h2>
              <p>
                Have a question about an editable lobola invitation template, a published design or the
                online editor? Get in touch using one of the options below.
              </p>
            </div>
            <div className="contact-options">
              <a className="contact-option" href="mailto:hello@lobolainvitation.co.za?subject=Lobola%20Invitation%20enquiry">
                <span className="contact-option-label">Email</span>
                <span>hello@lobolainvitation.co.za</span>
              </a>
              <a className="contact-option" href="https://www.instagram.com/lobolainvitation/" target="_blank" rel="noopener noreferrer">
                <span className="contact-option-label">Instagram</span>
                <span>@lobolainvitation</span>
              </a>
              <a className="contact-option" href="https://www.facebook.com/lobolainvitation/" target="_blank" rel="noopener noreferrer">
                <span className="contact-option-label">Facebook</span>
                <span>Lobola Invitation</span>
              </a>
            </div>
            <p className="contact-note">
              For a question about a specific invitation, include the design name or page link. For
              editor help, describe what you were trying to do.
            </p>
          </section>
        </main>
        <footer className="home-site-footer">
          <span>© {new Date().getFullYear()} Lobola Invitation</span>
          <span>Editable digital templates for your special day</span>
          <nav className="footer-links" aria-label="Footer navigation">
            <a href="#categories">Templates</a>
            <a href="/blog">Blog</a>
            <a href="#about">About us</a>
            <a href="#contact">Contact us</a>
            <a href="/admin">Admin</a>
          </nav>
        </footer>
      </div>
    </>
  );
}
