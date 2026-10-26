'use client';

import Link from 'next/link';
import { getTemplateFormat } from '@/lib/template-formats';

export default function CategoryGallery({ categories }) {
  const products = categories.flatMap((category) => category.products);

  return (
    <section className="categories" id="categories" aria-label="Invitation templates">
      <div className="product-list-heading">
        <h2>Products</h2>
      </div>
      {products.length ? (
        <div className="instagram-gallery">
          {products.map((product) => {
            const format = getTemplateFormat(product.canvasFormat || product.design_json?.canvasFormat);
            const coverImage = product.coverImageUrl
              || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85';
            return (
              <Link
                className="product-card"
                href={`/product/${product.slug}`}
                key={product.id}
                aria-label={`${product.title}${product.excerpt ? `: ${product.excerpt}` : ''}`}
              >
                <img src={coverImage} alt={product.title} loading="lazy" />
                <span className="product-overlay" aria-hidden="true">Preview &amp; edit</span>
                <span className="product-info">
                  <span className="product-name">{product.title}</span>
                  <span className="product-description">{product.excerpt || 'Personalize the invitation in the editor.'}</span>
                {product.priceCents > 0 && (
                  <span className="template-format">{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(product.priceCents / 100)}</span>
                )}
                <span className="template-format">{format.label} · {format.dimensions}</span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="empty-category">There are no published invitation designs yet. Please check back soon.</p>
      )}
    </section>
  );
}
