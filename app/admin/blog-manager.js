'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, doc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/client';

function makeSlug(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const emptyForm = {
  id: '', title: '', slug: '', excerpt: '', content: '', coverImageUrl: '',
  seoTitle: '', seoDescription: '', status: 'draft'
};

export default function BlogManager() {
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    let active = true;
    getDocs(collection(getFirebaseDb(), 'blogPosts'))
      .then((snapshot) => {
        if (active) {
          setPosts(snapshot.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))));
        }
      })
      .catch((error) => {
        if (active) {
          setMessage(`Could not load blog posts: ${error.message}`);
          setMessageType('error');
        }
      });
    return () => { active = false; };
  }, []);

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'title') {
        if (!current.id && !slugTouched) next.slug = makeSlug(value);
        if (!current.seoTitle || current.seoTitle === current.title) next.seoTitle = value;
        if (!current.seoDescription || current.seoDescription === current.excerpt) next.seoDescription = next.excerpt;
      }
      if (field === 'excerpt' && (!current.seoDescription || current.seoDescription === current.excerpt)) {
        next.seoDescription = value;
      }
      return next;
    });
  }

  function editPost(post) {
    setForm({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      content: post.content || '',
      coverImageUrl: post.coverImageUrl || '',
      seoTitle: post.seoTitle || post.title,
      seoDescription: post.seoDescription || '',
      status: post.status
    });
    setSlugTouched(true);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setForm(emptyForm);
    setSlugTouched(false);
    setMessage('');
  }

  async function savePost(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const slug = makeSlug(form.slug);
      const title = form.title.trim();
      const excerpt = form.excerpt.trim();
      const content = form.content.trim();
      const seoTitle = form.seoTitle.trim() || title;
      const seoDescription = form.seoDescription.trim();
      const coverImageUrl = form.coverImageUrl.trim();

      if (!title) throw new Error('Enter a blog post title.');
      if (!slug) throw new Error('Enter a valid blog URL slug.');
      if (excerpt.length < 30 || excerpt.length > 300) throw new Error('The summary must be between 30 and 300 characters.');
      if (content.length < 100) throw new Error('Add at least 100 characters of article content.');
      if (seoTitle.length > 70) throw new Error('SEO title must be 70 characters or fewer.');
      if (seoDescription.length < 50 || seoDescription.length > 160) {
        throw new Error('SEO description must be between 50 and 160 characters.');
      }
      if (coverImageUrl && !/^https?:\/\//i.test(coverImageUrl)) {
        throw new Error('Cover image must be a public http or https URL.');
      }
      if (form.status === 'published' && !coverImageUrl) {
        throw new Error('Add a cover image URL before publishing so article previews and structured data have an image.');
      }

      const existingPost = await getDocs(query(
        collection(getFirebaseDb(), 'blogPosts'),
        where('slug', '==', slug),
        limit(1)
      ));
      if (existingPost.docs.some((item) => item.id !== form.id)) {
        throw new Error('That blog URL is already used by another post.');
      }

      const postId = form.id || crypto.randomUUID();
      const existing = posts.find((post) => post.id === postId);
      const now = new Date().toISOString();
      const post = {
        title,
        slug,
        excerpt,
        content,
        coverImageUrl: coverImageUrl || null,
        seoTitle,
        seoDescription,
        status: form.status,
        updatedAt: now,
        ...(existing ? {} : { createdAt: now })
      };
      await setDoc(doc(getFirebaseDb(), 'blogPosts', postId), post);
      setPosts((current) => [
        { id: postId, ...post },
        ...current.filter((item) => item.id !== postId)
      ]);
      setForm(emptyForm);
      setSlugTouched(false);
      setMessageType('success');
      setMessage(form.id ? 'Blog post updated.' : 'Blog post created.');
    } catch (error) {
      setMessageType('error');
      setMessage(`Could not save blog post: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-layout">
      <section className="panel">
        <h2>{form.id ? 'Edit blog post' : 'Create a blog post'}</h2>
        {message && <p className={`message ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>{message}</p>}
        <form className="form-grid" onSubmit={savePost}>
          <label className="field">Post title
            <input required maxLength={120} value={form.title} onChange={(event) => updateField('title', event.target.value)} />
          </label>
          <label className="field">URL slug
            <input required maxLength={140} value={form.slug} onChange={(event) => { setSlugTouched(true); updateField('slug', event.target.value); }} />
            <small>Public blog URL: /blog/{makeSlug(form.slug) || 'your-post'}</small>
          </label>
          <label className="field">Short summary
            <textarea required minLength={30} maxLength={300} value={form.excerpt} onChange={(event) => updateField('excerpt', event.target.value)} />
            <small>{form.excerpt.length}/300 characters; use at least 30.</small>
          </label>
          <label className="field">Article content
            <textarea required minLength={100} rows={12} value={form.content} onChange={(event) => updateField('content', event.target.value)} />
            <small>Write at least 100 characters. Each paragraph becomes a separate paragraph on the post page.</small>
          </label>
          <label className="field">Cover image URL
            <input type="url" maxLength={2048} value={form.coverImageUrl} onChange={(event) => updateField('coverImageUrl', event.target.value)} placeholder="https://…" />
          </label>
          <h3 className="form-subheading">Search and social sharing</h3>
          <label className="field">SEO title
            <input required maxLength={70} value={form.seoTitle} onChange={(event) => updateField('seoTitle', event.target.value)} />
            <small>{form.seoTitle.length}/70 characters</small>
          </label>
          <label className="field">SEO description
            <textarea required minLength={50} maxLength={160} value={form.seoDescription} onChange={(event) => updateField('seoDescription', event.target.value)} />
            <small>{form.seoDescription.length}/160 characters; use at least 50.</small>
          </label>
          <label className="field">Publishing status
            <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
              <option value="draft">Draft — only visible to admins</option>
              <option value="published">Published — visible on the blog</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="button" type="submit" disabled={busy}>{busy ? 'Saving…' : form.id ? 'Save changes' : 'Create blog post'}</button>
            {form.id && <button className="button secondary" type="button" onClick={resetForm}>Cancel editing</button>}
          </div>
        </form>
      </section>
      <section className="panel">
        <h2>Blog posts ({posts.length})</h2>
        {posts.length ? (
          <div className="table-scroll">
            <table className="product-table">
              <thead><tr><th>Post</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td><strong>{post.title}</strong><br /><small>/blog/{post.slug}</small></td>
                    <td><span className={`status-pill ${post.status}`}>{post.status}</span></td>
                    <td>
                      <div className="product-actions">
                        <button className="text-button" type="button" onClick={() => editPost(post)}>Edit</button>
                        {post.status === 'published' && <Link className="text-button" href={`/blog/${post.slug}`} target="_blank">View</Link>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="empty-state">No blog posts yet.</p>}
      </section>
    </div>
  );
}
