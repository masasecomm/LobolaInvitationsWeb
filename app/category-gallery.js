'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getTemplateFormat } from '@/lib/template-formats';

export default function CategoryGallery({ categories }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  return (
    <div className="catalog-browser">
      <div className="category-tile-grid" hidden={Boolean(selectedCategoryId)}>
        {categories.map((category) => {
          const coverImage = category.products.find((product) => product.coverImageUrl)?.coverImageUrl;
          return (
            <button
              className="category-tile"
              key={category.id}
              type="button"
              onClick={() => setSelectedCategoryId(category.id)}
              aria-expanded={selectedCategoryId === category.id}
            >
              <span className="category-tile-cover">
                {coverImage
                  ? <img src={coverImage} alt="" loading="lazy" />
                  : <span className="category-tile-placeholder" aria-hidden="true">{category.name}</span>}
                <span className="category-tile-overlay" aria-hidden="true">View {category.products.length} {category.products.length === 1 ? 'design' : 'designs'}</span>
              </span>
              <span className="category-tile-name">{category.name}</span>
            </button>
          );
        })}
      </div>

      {categories.map((category) => (
        <section
          className="instagram-category"
          key={category.id}
          aria-labelledby={`category-${category.id}`}
          hidden={selectedCategoryId !== category.id}
        >
          <div className="instagram-category-heading">
            <button
              className="text-button"
              type="button"
              onClick={() => setSelectedCategoryId('')}
            >
              ← All categories
            </button>
            <h3 id={`category-${category.id}`}>{category.name}</h3>
            <span>{category.products.length} {category.products.length === 1 ? 'template' : 'templates'}</span>
          </div>
          <div className="product-grid product-grid--instagram">
            {category.products.map((product) => {
              const format = getTemplateFormat(product.canvasFormat || product.design_json?.canvasFormat);
              return (
                <Link
                  className="instagram-card"
                  href={`/product/${product.slug}`}
                  key={product.id}
                  aria-label={`${product.title}${product.excerpt ? `: ${product.excerpt}` : ''}`}
                >
                  <div className="instagram-card-cover">
                    {product.coverImageUrl
                      ? <img src={product.coverImageUrl} alt="" loading="lazy" />
                      : <div className="product-cover-placeholder" aria-hidden="true"><span>{product.title}</span></div>}
                    <div className="instagram-card-overlay" aria-hidden="true">
                      <span>View invitation</span>
                    </div>
                  </div>
                  <div className="instagram-card-info">
                    <strong>{product.title}</strong>
                    {product.excerpt && <p>{product.excerpt}</p>}
                    <span className="template-format">{format.label} · {format.dimensions}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
