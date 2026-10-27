'use client';

import Link from 'next/link';
import { getTemplateFormat } from '@/lib/template-formats';
import { getProductPricing } from '@/lib/product-pricing';

export default function CategoryGallery({ categories }) {
  const products = categories.flatMap((category) => category.products);

  return (
    <section className="categories" id="categories" aria-label="Invitation templates">
      <div className="product-list-heading">
        <h2>Products</h2>
      </div>
      {categories.some((category) => category.slug) && (
        <nav className="category-links" aria-label="Browse invitation categories">
          {categories.filter((category) => category.slug).map((category) => (
            <Link href={`/category/${category.slug}`} key={category.id}>{category.name}</Link>
          ))}
        </nav>
      )}
      {products.length ? (
        <div className="instagram-gallery">
          {products.map((product) => {
            const format = getTemplateFormat(product.canvasFormat || product.design_json?.canvasFormat);
            const pricing = getProductPricing(product);
            const coverImage = product.coverImageUrl
              || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85';
            return (
              <Link
                className="product-card"
                href={`/product/${product.slug}`}
                key={product.id}
                aria-label={product.title}
              >
                <img src={coverImage} alt={product.title} loading="lazy" />
                <span className="product-overlay" aria-hidden="true">Preview &amp; edit</span>
                <span className="product-info">
                  <span className="product-name">{product.title}</span>
                  {pricing.originalPriceCents > 0 && (
                    <span className={`template-format product-card-price${pricing.isOnSale ? ' is-on-sale' : ''}`}>
                      {pricing.isOnSale && <del aria-label="Original price">{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(pricing.originalPriceCents / 100)}</del>}
                      <strong aria-label={pricing.isOnSale ? 'Sale price' : undefined}>{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(pricing.currentPriceCents / 100)}</strong>
                      {pricing.isOnSale && <span className="sale-label">Sale</span>}
                    </span>
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
