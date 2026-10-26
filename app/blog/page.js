import Link from 'next/link';
import { getPublishedBlogPosts, isFirebaseConfigured } from '@/lib/firebase/catalog';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Lobola Invitation Blog',
  description: 'Ideas, planning advice, and inspiration for lobola invitations and celebrations.',
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    title: 'Lobola Invitation Blog',
    description: 'Ideas, planning advice, and inspiration for lobola invitations and celebrations.'
  }
};

export default async function BlogIndexPage() {
  const posts = isFirebaseConfigured ? await getPublishedBlogPosts() : [];

  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">Lobola Invitation</Link>
        <nav className="header-links">
          <Link href="/">Templates</Link>
          <Link href="/blog">Blog</Link>
        </nav>
      </header>
      <main className="page-wrap info-page">
        <p className="eyebrow">Ideas and inspiration</p>
        <h1>Lobola Invitation Blog</h1>
        <p className="info-page-intro">Helpful ideas for planning your celebration and choosing an invitation that feels like yours.</p>
        {posts.length ? (
          <div className="blog-post-list">
            {posts.map((post) => (
              <article className="blog-card" key={post.id}>
                {post.coverImageUrl && <img src={post.coverImageUrl} alt="" loading="lazy" />}
                <div>
                  <p className="eyebrow">{new Date(post.updatedAt || post.createdAt).toLocaleDateString('en-ZA')}</p>
                  <h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>
                  <p>{post.excerpt}</p>
                  <Link className="text-link" href={`/blog/${post.slug}`}>Read article</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>{isFirebaseConfigured ? 'No blog posts have been published yet. Please check back soon.' : 'Blog posts will appear here after the site is connected to Firebase.'}</p>
        )}
      </main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Lobola Invitation</span>
        <nav className="footer-links"><Link href="/">Templates</Link><Link href="/contact-us">Contact us</Link></nav>
      </footer>
    </>
  );
}
