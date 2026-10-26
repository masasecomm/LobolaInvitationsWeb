import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductReviews, getPublishedProduct, isFirebaseConfigured } from '@/lib/firebase/catalog';
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
  const reviews = await getProductReviews(product.id);
  const format = getTemplateFormat(product.canvasFormat || product.design_json?.canvasFormat);
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : null;
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.seoDescription || product.excerpt || product.title,
    url: `https://lobolainvitation.co.za/product/${product.slug}`,
    ...(product.coverImageUrl ? { image: [product.coverImageUrl] } : {}),
    ...(product.priceCents > 0 ? {
      offers: {
        '@type': 'Offer',
        priceCurrency: 'ZAR',
        price: (product.priceCents / 100).toFixed(2),
        availability: 'https://schema.org/InStock',
        url: `https://lobolainvitation.co.za/product/${product.slug}`
      }
    } : {}),
    ...(reviews.length ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: averageRating.toFixed(1),
        reviewCount: reviews.length,
        ratingCount: reviews.length,
        bestRating: 5,
        worstRating: 1
      },
      review: reviews.map((review) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: review.reviewerName || 'Visitor' },
        reviewBody: review.comment,
        datePublished: review.createdAt,
        reviewRating: {
          '@type': 'Rating',
          ratingValue: review.rating,
          bestRating: 5,
          worstRating: 1
        }
      }))
    } : {})
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema).replace(/</g, '\\u003c') }}
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
      <main className="page-wrap template-layout">
        <section className="template-copy">
          <span className="eyebrow">{product.category?.name}</span>
          <h1>{product.title}</h1>
          <p>{product.excerpt}</p>
          {product.priceCents > 0 && (
            <p className="template-price">{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(product.priceCents / 100)}</p>
          )}
          <p className="template-format">{format.label} · {format.dimensions}</p>
          {product.coverImageUrl && <img className="template-cover" src={product.coverImageUrl} alt={`Preview of ${product.title}`} />}
          {reviews.length ? (
            <section aria-label="Customer reviews">
              <h2>{averageRating.toFixed(1)} out of 5 · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</h2>
              {reviews.map((review) => (
                <blockquote className="product-review" key={review.id}>
                  <p aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
                  <p>{review.comment}</p>
                  <footer>{review.reviewerName || 'Visitor'}</footer>
                </blockquote>
              ))}
            </section>
          ) : <p>No reviews yet. Be the first to review this template.</p>}
          <p className="help">Make a personal copy by editing the text and adding your own photos. Your changes stay in this browser.</p>
        </section>
        <TemplateEditor key={product.id} product={product} />
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
