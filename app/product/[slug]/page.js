import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublishedProduct, isFirebaseConfigured } from '@/lib/firebase/catalog';
import { getTemplateFormat } from '@/lib/template-formats';
import TemplateEditor from './template-editor';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (!isFirebaseConfigured) return { title: 'Template setup required' };
  const product = await getPublishedProduct(slug);
  if (!product) return { title: 'Template not found' };
  return {
    title: product.seoTitle,
    description: product.seoDescription,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: 'website',
      title: product.seoTitle,
      description: product.seoDescription,
      ...(product.coverImageUrl ? { images: [product.coverImageUrl] } : {})
    },
    twitter: {
      card: product.coverImageUrl ? 'summary_large_image' : 'summary',
      title: product.seoTitle,
      description: product.seoDescription,
      ...(product.coverImageUrl ? { images: [product.coverImageUrl] } : {})
    }
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  if (!isFirebaseConfigured) {
    return <main className="page-wrap admin-wrap"><div className="setup-notice">Configure Firebase to publish template pages. See <code>SETUP.md</code>.</div></main>;
  }
  const product = await getPublishedProduct(slug);
  if (!product) notFound();
  const format = getTemplateFormat(product.canvasFormat || product.design_json?.canvasFormat);

  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">Lobola Invitation</Link>
        <nav className="header-links">
          <Link href="/">All templates</Link>
          <Link href="/about-us">About us</Link>
          <Link href="/contact-us">Contact us</Link>
        </nav>
      </header>
      <main className="page-wrap template-layout">
        <section className="template-copy">
          <span className="eyebrow">{product.category?.name}</span>
          <h1>{product.title}</h1>
          <p>{product.excerpt}</p>
          <p className="template-format">{format.label} · {format.dimensions}</p>
          {product.coverImageUrl && <img className="template-cover" src={product.coverImageUrl} alt={`Preview of ${product.title}`} />}
          <p className="help">Make a personal copy by editing the text and adding your own photos. Your changes stay in this browser.</p>
        </section>
        <TemplateEditor product={product} />
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
