import Link from 'next/link';
import { getPublicCatalog, isFirebaseConfigured } from '@/lib/firebase/catalog';
import CategoryGallery from './category-gallery';

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

const logoUrl = 'https://scontent-jnb2-1.xx.fbcdn.net/v/t39.30808-1/284088209_104493135614872_3978818778956920310_n.jpg?stp=dst-jpg_tt6&cstp=mx1154x1154&ctp=s200x200&_nc_cat=104&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=ENEKrX1DM9cQ7kNvwGkf2_o&_nc_oc=Adq_gO_ZqLS97sTeYycWqPiwxwkmPTg4HcoeG1rud5G_WX23LRtL4ybAS67B__nA8fw&_nc_zt=24&_nc_ht=scontent-jnb2-1.xx&_nc_gid=fXKYgnKTf0nKccF_cBYDEg&_nc_ss=7b2a8&oh=00_AQN2ox7Rbe65ag-KXq4yjIpuZgJ4KQsi8CEySRFopO6_yQ&oe=6AD6D1C5';

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
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Lobola Invitation home">
          <img src={logoUrl} alt="" />
          <span>Lobola Invitation<br /><small>Editable Digital Templates</small></span>
        </Link>
        <nav className="header-links" aria-label="Main navigation">
          <a href="#templates">Templates</a>
          <a href="https://www.instagram.com/lobolainvitation/" target="_blank" rel="noreferrer">Instagram</a>
          <Link href="/about-us">About us</Link>
          <Link href="/contact-us">Contact us</Link>
        </nav>
      </header>
      <main className="page-wrap storefront">
        <section className="store-profile" aria-label="Lobola Invitation profile">
          <div className="store-avatar">
            <img src={logoUrl} alt="Lobola Invitation logo" />
          </div>
          <div className="store-profile-content">
            <div className="store-profile-heading">
              <h1>Lobola Invitation Cards &amp; Templates</h1>
              <Link className="button secondary" href="/admin">Create a template</Link>
            </div>
            <div className="store-profile-stats" aria-label="Store statistics">
              <span><strong>{products.length}</strong> templates</span>
              <span><strong>{categories.length}</strong> categories</span>
            </div>
            <p><strong>Editable digital invitation designs</strong><br />Find a template for your lobola celebration and make the invitation your own.</p>
          </div>
        </section>

        <section className="home-introduction" aria-labelledby="home-introduction-heading">
          <h2 id="home-introduction-heading">Shop editable lobola invitation cards</h2>
          <p>
            Browse digital invitation templates for lobola celebrations. Check the published
            collection for Umembeso and Mahlabiso designs. Open a template to preview it,
            personalize the wording and add your own photos in the browser.
          </p>
        </section>

        <section className="category-section" id="templates">
          <div className="collection-heading">
            <span className="eyebrow">The collection</span>
            <h2 className="section-heading">Lobola invitation templates</h2>
          </div>
          {!isFirebaseConfigured ? (
            <div className="setup-notice">Connect Firebase to publish and display your invitation templates. The setup guide is in <code>SETUP.md</code>.</div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <h3>Your first template goes here</h3>
              <p>Create a template post in the admin, design it, and publish it to see it appear on this page.</p>
              <Link className="button" href="/admin">Create your first template</Link>
            </div>
          ) : <CategoryGallery categories={categoryGroups} />}
        </section>

        <section className="home-guidance" aria-labelledby="invitation-guidance-heading">
          <h2 id="invitation-guidance-heading">Plan your lobola celebration invitation</h2>
          <p>
            A clear invitation helps guests know when and where to join your celebration. Include
            the names of the hosts or couple, the event date and time, the venue, and RSVP details.
            Check with your family about any additional information or wording they would like
            included.
          </p>
          <h3>Looking for an Umembeso or Mahlabiso invitation?</h3>
          <p>
            Browse the published designs above and use the category links to find available
            styles. Each invitation page includes its own preview and editing options.
          </p>
          <a href="#templates">Browse invitation cards</a>
        </section>
      </main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Lobola Invitation · Editable digital templates for your special day</span>
        <nav className="footer-links" aria-label="Footer navigation">
          <Link href="/">Templates</Link>
          <Link href="/about-us">About us</Link>
          <Link href="/contact-us">Contact us</Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </footer>
    </>
  );
}
