'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getTemplateFormat } from '@/lib/template-formats';

export default function CategoryGallery({ categories }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  return (
    <section className={`categories${selectedCategoryId ? ' is-expanded' : ''}`} id="categories" aria-label="Invitation categories">
      {categories.map((category) => {
        const coverImage = category.products.find((product) => product.coverImageUrl)?.coverImageUrl
          || category.fallbackCoverUrl
          || 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=900&q=85';
        return (
          <button
            className="category-card"
            key={category.id}
            type="button"
            onClick={() => setSelectedCategoryId(category.id)}
            aria-expanded={selectedCategoryId === category.id}
            aria-controls={`products-${category.id}`}
          >
            <img src={coverImage} alt="Bride holding a bouquet on her wedding day" />
            <span className="category-button">{category.name}</span>
          </button>
        );
      })}

      {categories.map((category) => (
        <div
          className="product-list"
          id={`products-${category.id}`}
          key={category.id}
          aria-label={`Products in ${category.name}`}
          hidden={selectedCategoryId !== category.id}
        >
          <div className="product-list-heading">
            <button className="text-link category-back" type="button" onClick={() => setSelectedCategoryId('')}>
              ← All categories
            </button>
            <h2>{category.name}</h2>
            <p>Browse invitation designs in this category.</p>
          </div>
          {category.products.length ? (
            <div className="instagram-gallery">
              {category.products.map((product) => {
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
                      <span className="template-format">{format.label} · {format.dimensions}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="empty-category">There are no published invitation designs in this category yet. Please check back soon.</p>
          )}
        </div>
      ))}
    </section>
  );
}
