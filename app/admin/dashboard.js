'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, limit, query, setDoc, updateDoc, where
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase/client';
import { templateFormats } from '@/lib/template-formats';
import SignInForm from './login/sign-in-form';

function makeSlug(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function documentSize(value) {
  return new Blob([JSON.stringify(value)]).size;
}

function DesignModal({ product, onClose, onSave }) {
  const frame = useRef(null);
  const onSaveRef = useRef(onSave);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    let active = true;
    async function receive(event) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'lobola-editor-ready') {
        frame.current.contentWindow.postMessage({
          type: 'lobola-load-template',
          slug: product.slug,
          title: product.title,
          canvasFormat: product.canvasFormat || product.design_json?.canvasFormat || 'standard',
          design: product.design_json
        }, window.location.origin);
      }
      if (event.data?.type === 'lobola-template-loaded') setReady(true);
      if (event.data?.type === 'lobola-editor-error') setError(event.data.message);
      if (event.data?.type === 'lobola-editor-export') {
        setSaving(true);
        setError('');
        try {
          await onSaveRef.current(event.data.design);
          if (active) setError('');
        } catch (caught) {
          if (active) setError(`Could not save template design: ${caught.message}`);
        } finally {
          if (active) setSaving(false);
        }
      }
    }
    window.addEventListener('message', receive);
    return () => {
      active = false;
      window.removeEventListener('message', receive);
    };
  }, [product]);

  function saveDesign() {
    frame.current?.contentWindow?.postMessage({ type: 'lobola-export-template' }, window.location.origin);
  }

  return (
    <div className="editor-overlay" role="dialog" aria-modal="true" aria-label={`Design ${product.title}`}>
      <div className="editor-modal">
        <div className="modal-bar">
          <strong>{ready ? `Design: ${product.title}` : 'Loading invitation editor…'}</strong>
          <div className="form-actions">
            <button className="button" type="button" onClick={saveDesign} disabled={!ready || saving}>
              {saving ? 'Saving…' : 'Save template'}
            </button>
            <button className="button secondary" type="button" onClick={onClose}>Close</button>
          </div>
        </div>
        {error && <p className="message error" role="alert">{error}</p>}
        <iframe
          ref={frame}
          className="editor-frame"
          src="/invitation-editor.html?mode=admin"
          title={`Design ${product.title}`}
          onLoad={() => {
            setReady(false);
            frame.current?.contentWindow?.postMessage({ type: 'lobola-parent-ready' }, window.location.origin);
          }}
        />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [authState, setAuthState] = useState('loading');
  const [userEmail, setUserEmail] = useState('');
  const [form, setForm] = useState({
    id: '', title: '', slug: '', excerpt: '', categoryName: '', seoTitle: '',
    seoDescription: '', status: 'draft', coverImageUrl: '', canvasFormat: ''
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [busy, setBusy] = useState(false);
  const [designProduct, setDesignProduct] = useState(null);
  const [designs, setDesigns] = useState({});

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthState('unconfigured');
      return undefined;
    }
    let active = true;
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      if (!user) {
        setAuthState('signed-out');
        setUserEmail('');
        setCategories([]);
        setProducts([]);
        return;
      }
      setAuthState('loading');
      setUserEmail(user.email || '');
      try {
        const membership = await getDoc(doc(db, 'admins', user.uid));
        if (!membership.exists()) {
          if (active) setAuthState('unauthorized');
          return;
        }
        const [categorySnapshot, productSnapshot] = await Promise.all([
          getDocs(collection(db, 'categories')),
          getDocs(collection(db, 'products'))
        ]);
        if (!active) return;
        const loadedCategories = categorySnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        const categoryById = new Map(loadedCategories.map((category) => [category.id, category]));
        setCategories(loadedCategories);
        setProducts(productSnapshot.docs
          .map((item) => {
            const data = item.data();
            return { id: item.id, ...data, category: categoryById.get(data.categoryId) || null };
          })
          .sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || '')));
        setAuthState('authorized');
      } catch (caught) {
        if (active) {
          setMessage(`Could not load administrator data: ${caught.message}`);
          setMessageType('error');
          setAuthState('error');
        }
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  function updateField(field, value) {
    setForm((current) => {
      const updated = { ...current, [field]: value };
      if (field === 'title') {
        if (!current.id && !slugTouched) updated.slug = makeSlug(value);
        if (!current.seoTitle || current.seoTitle === current.title) updated.seoTitle = value;
        if (!current.seoDescription || current.seoDescription === current.excerpt) updated.seoDescription = updated.excerpt;
      }
      if (field === 'excerpt' && (!current.seoDescription || current.seoDescription === current.excerpt)) {
        updated.seoDescription = value;
      }
      return updated;
    });
  }

  function editProduct(product) {
    setForm({
      id: product.id,
      title: product.title,
      slug: product.slug,
      excerpt: product.excerpt || '',
      categoryName: product.category?.name || '',
      seoTitle: product.seoTitle || product.title,
      seoDescription: product.seoDescription || '',
      status: product.status,
      coverImageUrl: product.coverImageUrl || '',
      canvasFormat: product.canvasFormat || product.design_json?.canvasFormat || 'standard'
    });
    setSlugTouched(true);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setForm({
      id: '', title: '', slug: '', excerpt: '', categoryName: '', seoTitle: '',
      seoDescription: '', status: 'draft', coverImageUrl: '', canvasFormat: ''
    });
    setSlugTouched(false);
    setMessage('');
  }

  async function saveProduct(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const db = getFirebaseDb();
      const slug = makeSlug(form.slug);
      const categoryName = form.categoryName.trim();
      if (!form.title.trim()) throw new Error('Enter a template name.');
      if (!categoryName) throw new Error('Enter a category name for this template.');
      if (!Object.prototype.hasOwnProperty.call(templateFormats, form.canvasFormat)
        || (!form.id && form.canvasFormat === 'standard')) {
        throw new Error('Choose HD Mobile or HD Landscape for this template.');
      }
      if (!slug) throw new Error('Enter a valid template title and URL slug.');
      if (form.seoDescription.length > 160) throw new Error('SEO description must be 160 characters or fewer.');
      if (form.coverImageUrl && !/^https?:\/\//i.test(form.coverImageUrl.trim())) {
        throw new Error('Cover image must be a public http or https URL.');
      }

      const existingProduct = await getDocs(query(
        collection(db, 'products'), where('slug', '==', slug), limit(1)
      ));
      if (existingProduct.docs.some((item) => item.id !== form.id)) {
        throw new Error('That URL slug is already used by another template.');
      }

      const categorySlug = makeSlug(categoryName);
      const categorySnapshot = await getDocs(query(
        collection(db, 'categories'), where('slug', '==', categorySlug), limit(1)
      ));
      let categoryId = categorySnapshot.docs[0]?.id;
      if (!categoryId) {
        categoryId = crypto.randomUUID();
        await setDoc(doc(db, 'categories', categoryId), {
          name: categoryName,
          slug: categorySlug,
          createdAt: new Date().toISOString()
        });
      } else if (categorySnapshot.docs[0].data().name !== categoryName) {
        await updateDoc(doc(db, 'categories', categoryId), { name: categoryName });
      }

      const productId = form.id || crypto.randomUUID();
      const oldProduct = products.find((product) => product.id === productId);
      const payload = {
        categoryId,
        categorySlug,
        title: form.title.trim(),
        slug,
        canvasFormat: form.canvasFormat,
        excerpt: form.excerpt.trim(),
        coverImageUrl: form.coverImageUrl.trim() || null,
        seoTitle: form.seoTitle.trim() || form.title.trim(),
        seoDescription: form.seoDescription.trim(),
        design_json: designs[productId] || oldProduct?.design_json || { version: 1, canvasFormat: form.canvasFormat, pages: [] },
        status: form.status,
        updatedAt: new Date().toISOString(),
        ...(oldProduct ? {} : { createdAt: new Date().toISOString() })
      };
      if (documentSize(payload) > 800 * 1024) {
        throw new Error('This template design is too large for Firestore on the current setup. Reduce embedded images or use image URLs; Firebase Storage requires a paid-plan upgrade.');
      }
      await setDoc(doc(db, 'products', productId), payload);

      const savedMessage = form.id ? 'Template updated.' : 'Template created. You can now design it from the product list.';
      resetForm();
      setMessageType('success');
      setMessage(savedMessage);
      router.refresh();
      const [categorySnapshotAfterSave, productSnapshotAfterSave] = await Promise.all([
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'products'))
      ]);
      const loadedCategories = categorySnapshotAfterSave.docs.map((item) => ({ id: item.id, ...item.data() }));
      const categoryById = new Map(loadedCategories.map((category) => [category.id, category]));
      setCategories(loadedCategories);
      setProducts(productSnapshotAfterSave.docs.map((item) => {
        const data = item.data();
        return { id: item.id, ...data, category: categoryById.get(data.categoryId) || null };
      }));
    } catch (caught) {
      setMessageType('error');
      setMessage(`Could not save template: ${caught.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut(getFirebaseAuth());
      router.replace('/admin/login');
      router.refresh();
    } catch (caught) {
      setMessageType('error');
      setMessage(`Could not sign out: ${caught.message}`);
    }
  }

  const persistDesign = async (product, design) => {
    const nextPayload = { ...product, design_json: design };
    delete nextPayload.id;
    delete nextPayload.category;
    if (documentSize(nextPayload) > 800 * 1024) {
      throw new Error('This design is too large for Firestore. Reduce embedded images or use image URLs; Firebase Storage requires a paid-plan upgrade.');
    }
    await updateDoc(doc(getFirebaseDb(), 'products', product.id), {
      design_json: design,
      updatedAt: new Date().toISOString()
    });
    setDesigns((current) => ({ ...current, [product.id]: design }));
    setProducts((current) => current.map((item) => item.id === product.id
      ? { ...item, design_json: design, updatedAt: new Date().toISOString() }
      : item));
    setDesignProduct(null);
    setMessageType('success');
    setMessage(`Design saved for ${product.title}.`);
    router.refresh();
  };

  if (authState === 'unconfigured') {
    return <main className="page-wrap admin-wrap"><div className="setup-notice"><h1>Connect Firebase</h1><p>Set the Firebase web app values in <code>.env.local</code>, then restart the development server. See <code>SETUP.md</code>.</p></div></main>;
  }
  if (authState === 'loading') {
    return <main className="page-wrap admin-wrap"><p role="status">Checking administrator access…</p></main>;
  }
  if (authState === 'signed-out') {
    return (
      <main className="signin-wrap">
        <section className="signin-card">
          <Link href="/" className="brand">Lobola Invitation</Link>
          <h1>Admin sign in</h1>
          <p className="help">Sign in with an administrator account to manage invitation templates.</p>
          <SignInForm />
        </section>
      </main>
    );
  }
  if (authState === 'unauthorized' || authState === 'error') {
    return (
      <main className="page-wrap admin-wrap">
        <div className="setup-notice">
          <h1>{authState === 'unauthorized' ? 'Admin access is not enabled for this account.' : 'Could not verify administrator access.'}</h1>
          {authState === 'unauthorized'
            ? <p>Add a document with this user’s UID at <code>admins/{getFirebaseAuth().currentUser?.uid}</code> in Firestore.</p>
            : <p className="message error" role="alert">{message}</p>}
          <div className="form-actions">
            <Link href="/" className="button secondary">Return to storefront</Link>
            <button className="button" type="button" onClick={handleSignOut}>Sign out</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-wrap admin-wrap">
      <div className="admin-heading">
        <div><span className="eyebrow">Template management</span><h1>Your products</h1><p className="help">Signed in as {userEmail}</p></div>
        <div className="form-actions"><Link className="button secondary" href="/">View storefront</Link><button className="button secondary" type="button" onClick={handleSignOut}>Sign out</button></div>
      </div>
      {message && <p className={`message ${messageType}`} role="status">{message}</p>}
      <div className="admin-layout">
        <section className="panel">
          <h2>{form.id ? 'Edit template post' : 'Create a template post'}</h2>
          <form className="form-grid" onSubmit={saveProduct}>
            <label className="field">Template name
              <input required maxLength={120} value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="e.g. Modern Terracotta" />
            </label>
            <label className="field">URL slug
              <input required maxLength={140} value={form.slug} onChange={(event) => { setSlugTouched(true); updateField('slug', event.target.value); }} placeholder="modern-terracotta" />
              <small>Public product URL: /product/{makeSlug(form.slug) || 'your-product'}</small>
            </label>
            <label className="field">Category name
              <input required maxLength={80} list="existing-categories" value={form.categoryName} onChange={(event) => updateField('categoryName', event.target.value)} placeholder="e.g. Lobola Invitation Template" />
              <datalist id="existing-categories">{categories.map((category) => <option value={category.name} key={category.id} />)}</datalist>
              <small>Choose an existing category or type a new one.</small>
            </label>
            <label className="field">Template format
              <select
                required
                value={form.canvasFormat}
                onChange={(event) => updateField('canvasFormat', event.target.value)}
                disabled={Boolean(form.id)}
              >
                {!form.canvasFormat && <option value="" disabled>Choose a format</option>}
                {Object.entries(templateFormats)
                  .filter(([format]) => format !== 'standard' || Boolean(form.id))
                  .map(([format, details]) => (
                    <option value={format} key={format}>{details.label} — {details.dimensions}</option>
                  ))}
              </select>
              <small>{form.id ? 'Existing template dimensions are kept unchanged.' : 'Choose the HD canvas size before creating the template.'}</small>
            </label>
            <label className="field">Short description
              <textarea maxLength={300} value={form.excerpt} onChange={(event) => updateField('excerpt', event.target.value)} placeholder="Describe this invitation design." />
            </label>
            <label className="field">Cover image URL
              <input type="url" maxLength={2048} value={form.coverImageUrl} onChange={(event) => updateField('coverImageUrl', event.target.value)} placeholder="https://…" />
              <small>Firebase Storage uploads are unavailable on the current Spark plan; use a public image URL.</small>
            </label>
            <h3 className="form-subheading">Search engine details</h3>
            <label className="field">SEO title
              <input required maxLength={70} value={form.seoTitle} onChange={(event) => updateField('seoTitle', event.target.value)} placeholder="Search result title" />
            </label>
            <label className="field">SEO description
              <textarea required maxLength={160} value={form.seoDescription} onChange={(event) => updateField('seoDescription', event.target.value)} placeholder="A concise description for search results." />
              <small>{form.seoDescription.length}/160 characters</small>
            </label>
            <label className="field">Publishing status
              <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                <option value="draft">Draft — only visible to admins</option>
                <option value="published">Published — visible in the storefront</option>
              </select>
            </label>
            <div className="form-actions">
              <button className="button" type="submit" disabled={busy}>{busy ? 'Saving…' : form.id ? 'Save changes' : 'Create template'}</button>
              {form.id && <button className="button secondary" type="button" onClick={resetForm}>Cancel editing</button>}
            </div>
          </form>
        </section>
        <section className="panel">
          <h2>Products ({products.length})</h2>
          {products.length === 0 ? <p className="empty-state">No products yet. Create your first template post.</p> : (
            <div className="table-scroll">
              <table className="product-table">
                <thead><tr><th>Cover</th><th>Template</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.coverImageUrl ? <img src={product.coverImageUrl} alt="" /> : <span className="cover-placeholder" />}</td>
                      <td><strong>{product.title}</strong><br /><small>/product/{product.slug}</small></td>
                      <td>{product.category?.name || product.categorySlug}</td>
                      <td><span className={`status-pill ${product.status}`}>{product.status}</span></td>
                      <td>
                        <div className="product-actions">
                          <button className="text-button" type="button" onClick={() => editProduct(product)}>Edit</button>
                          <button className="text-button" type="button" onClick={() => setDesignProduct({ ...product, design_json: designs[product.id] || product.design_json })}>Design</button>
                          {product.status === 'published' && <Link className="text-button" href={`/product/${product.slug}`} target="_blank">View</Link>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {designProduct && <DesignModal product={designProduct} onClose={() => setDesignProduct(null)} onSave={(design) => persistDesign(designProduct, design)} />}
    </main>
  );
}
