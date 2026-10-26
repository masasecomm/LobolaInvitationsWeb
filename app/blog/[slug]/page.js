import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublishedBlogPost, isFirebaseConfigured } from '@/lib/firebase/catalog';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (!isFirebaseConfigured) return { title: 'Blog post setup required' };
  const post = await getPublishedBlogPost(slug);
  if (!post) return { title: 'Blog post not found' };
  return {
    title: post.seoTitle,
    description: post.seoDescription,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.seoTitle,
      description: post.seoDescription,
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
      ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {})
    },
    twitter: {
      card: post.coverImageUrl ? 'summary_large_image' : 'summary',
      title: post.seoTitle,
      description: post.seoDescription,
      ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {})
    }
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  if (!isFirebaseConfigured) {
    return <main className="page-wrap info-page"><p>Configure Firebase to publish blog posts.</p></main>;
  }
  const post = await getPublishedBlogPost(slug);
  if (!post) notFound();
  const paragraphs = post.content.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const postUrl = `https://lobolainvitation.co.za/blog/${post.slug}`;
  const postSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seoDescription,
    articleBody: post.content,
    wordCount: post.content.trim().split(/\s+/).length,
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
    author: { '@type': 'Organization', name: 'Lobola Invitation', url: 'https://lobolainvitation.co.za/' },
    publisher: {
      '@type': 'Organization',
      name: 'Lobola Invitation',
      url: 'https://lobolainvitation.co.za/',
      logo: {
        '@type': 'ImageObject',
        url: 'https://lobolainvitation.co.za/lobola-invitation-logo.jpg'
      }
    },
    ...(post.coverImageUrl ? { image: [post.coverImageUrl] } : {})
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postSchema).replace(/</g, '\\u003c') }}
      />
      <header className="site-header">
        <Link className="brand" href="/">Lobola Invitation</Link>
        <nav className="header-links">
          <Link href="/">Templates</Link>
          <Link href="/blog">All blog posts</Link>
        </nav>
      </header>
      <main className="page-wrap info-page blog-article">
        <article>
          <p className="eyebrow"><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString('en-ZA')}</time></p>
          <h1>{post.title}</h1>
          <p className="info-page-intro">{post.excerpt}</p>
          {post.coverImageUrl && <img className="blog-cover" src={post.coverImageUrl} alt="" />}
          <div className="blog-content">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
          <Link className="text-link" href="/blog">Back to the blog</Link>
        </article>
      </main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Lobola Invitation</span>
        <nav className="footer-links"><Link href="/">Templates</Link><Link href="/contact-us">Contact us</Link></nav>
      </footer>
    </>
  );
}
