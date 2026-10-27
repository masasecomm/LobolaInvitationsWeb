import Link from 'next/link';
import { notFound } from 'next/navigation';
import CategoryGallery from '@/app/category-gallery';
import { getPublishedCategory, isFirebaseConfigured } from '@/lib/firebase/catalog';

export const dynamic = 'force-dynamic';

const siteUrl = 'https://lobolainvitation.co.za';

function getCategoryDescription(category) {
  return category.seoDescription || `Browse editable invitation templates in ${category.name}.`;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (!isFirebaseConfigured) return { title: 'Category setup required' };
  const category = await getPublishedCategory(slug);
  if (!category) return { title: 'Category not found' };

  const title = category.seoTitle || category.name;
  const description = getCategoryDescription(category);
  return {
    title,
    description,
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/category/${category.slug}`
    },
    twitter: { card: 'summary', title, description }
  };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  if (!isFirebaseConfigured) {
    return <main className="page-wrap admin-wrap"><div className="setup-notice">Configure Firebase to publish category pages. See <code>SETUP.md</code>.</div></main>;
  }
  const category = await getPublishedCategory(slug);
  if (!category) notFound();

  const description = getCategoryDescription(category);
  const url = `${siteUrl}/category/${category.slug}`;
  const categorySchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.seoTitle || category.name,
    description,
    url,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: category.name, item: url }
      ]
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: category.products.length,
      itemListElement: category.products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: product.title,
        url: `${siteUrl}/product/${product.slug}`
      }))
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categorySchema).replace(/</g, '\\u003c') }}
      />
      <header className="site-header">
        <Link className="brand" href="/">Lobola Invitation</Link>
        <nav className="header-links">
          <Link href="/">All templates</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/about-us">About us</Link>
          <Link href="/contact-us">Contact us</Link>
        </nav>
      </header>
      <main className="page-wrap category-page">
        <Link className="text-link" href="/">All templates</Link>
        <h1>{category.name}</h1>
        <p className="category-description">{description}</p>
        <CategoryGallery categories={[category]} />
      </main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Lobola Invitation</span>
        <nav className="footer-links" aria-label="Footer navigation">
          <Link href="/">Templates</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/about-us">About us</Link>
          <Link href="/contact-us">Contact us</Link>
        </nav>
      </footer>
    </>
  );
}
