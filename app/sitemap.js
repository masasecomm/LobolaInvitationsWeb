import { getPublishedBlogPosts, getPublicCatalog, isFirebaseConfigured } from '@/lib/firebase/catalog';

export const dynamic = 'force-dynamic';

const siteUrl = 'https://lobolainvitation.co.za';

function lastModified(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime()) ? date : undefined;
}

export default async function sitemap() {
  const entries = [
    { url: `${siteUrl}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/blog`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/about-us`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/contact-us`, changeFrequency: 'monthly', priority: 0.5 }
  ];
  if (!isFirebaseConfigured) return entries;

  const [catalog, posts] = await Promise.all([getPublicCatalog(), getPublishedBlogPosts()]);
  entries.push(
    ...catalog.categories
      .filter((category) => category.slug && catalog.products.some((product) => product.categoryId === category.id))
      .map((category) => ({
        url: `${siteUrl}/category/${category.slug}`,
        changeFrequency: 'weekly',
        priority: 0.7,
        ...(lastModified(category.updatedAt) ? { lastModified: lastModified(category.updatedAt) } : {})
      })),
    ...catalog.products.map((product) => ({
      url: `${siteUrl}/product/${product.slug}`,
      changeFrequency: 'monthly',
      priority: 0.8,
      ...(lastModified(product.updatedAt) ? { lastModified: lastModified(product.updatedAt) } : {})
    })),
    ...posts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      changeFrequency: 'monthly',
      priority: 0.7,
      ...(lastModified(post.updatedAt) ? { lastModified: lastModified(post.updatedAt) } : {})
    }))
  );
  return entries;
}
