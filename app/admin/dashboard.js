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
import BlogManager from './blog-manager';
import SignInForm from './login/sign-in-form';

function makeSlug(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function documentSize(value) {
  return new Blob([JSON.stringify(value)]).size;
}

function DesignModal({ product, onClose, onSave, onSaveElements }) {
  const frame = useRef(null);
  const onSaveRef = useRef(onSave);
  const elementsRef = useRef(product.elements || []);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [elements, setElements] = useState(product.elements || []);
  const [elementName, setElementName] = useState('');
  const [elementCategory, setElementCategory] = useState('decorations');
  const [elementFile, setElementFile] = useState(null);
  const [savingElement, setSavingElement] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

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
          design: product.design_json,
          elements: elementsRef.current
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

  async function saveElementAsset(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!elementFile || !elementName.trim()) {
      setError('Choose an image and enter a name for this element.');
      return;
    }

    setSavingElement(true);
    setError('');
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sign in again before uploading template elements.');

      const elementId = crypto.randomUUID();
      const uploadForm = new FormData();
      uploadForm.set('file', elementFile);
      uploadForm.set('slug', product.slug);
      uploadForm.set('kind', 'element');
      uploadForm.set('elementId', elementId);

      const response = await fetch('/api/admin/cover-upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        body: uploadForm
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The element image could not be uploaded.');

      const nextElements = [...elements, {
        id: elementId,
        name: elementName.trim(),
        category: elementCategory,
        url: result.elementImageUrl
      }];
      await onSaveElements(nextElements);
      elementsRef.current = nextElements;
      setElements(nextElements);
      frame.current?.contentWindow?.postMessage({ type: 'lobola-set-elements', elements: nextElements }, window.location.origin);
      setElementName('');
      setElementFile(null);
      formElement.reset();
    } catch (caught) {
      setError(`Could not save template element: ${caught.message}`);
    } finally {
      setSavingElement(false);
    }
  }

  async function removeElement(elementId) {
    const nextElements = elements.filter((element) => element.id !== elementId);
    setSavingElement(true);
    setError('');
    try {
      await onSaveElements(nextElements);
      elementsRef.current = nextElements;
      setElements(nextElements);
      frame.current?.contentWindow?.postMessage({ type: 'lobola-set-elements', elements: nextElements }, window.location.origin);
    } catch (caught) {
      setError(`Could not remove template element: ${caught.message}`);
    } finally {
      setSavingElement(false);
    }
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
        <details className="admin-elements-manager">
          <summary>Elements ({elements.length})</summary>
          <p>Upload reusable images for this template. They are stored in the website’s Elements folder.</p>
          <form className="form-grid" onSubmit={saveElementAsset}>
            <label className="field">Element name
              <input required maxLength={80} value={elementName} onChange={(event) => setElementName(event.target.value)} />
            </label>
            <label className="field">Section
              <select value={elementCategory} onChange={(event) => setElementCategory(event.target.value)}>
                <option value="frames">Frames</option>
                <option value="stickers">Stickers</option>
                <option value="decorations">Decorations</option>
                <option value="backgrounds">Backgrounds</option>
              </select>
            </label>
            <label className="field">Image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                disabled={savingElement}
                onChange={(event) => setElementFile(event.target.files?.[0] || null)}
              />
              <small>JPEG, PNG, or WebP; up to 4 MB.</small>
            </label>
            <button className="button" type="submit" disabled={savingElement}>
              {savingElement ? 'Saving element…' : 'Upload element'}
            </button>
          </form>
          {elements.length > 0 && (
            <ul className="admin-element-list">
              {elements.map((element) => (
                <li key={element.id}>
                  <img src={element.url} alt="" />
                  <span>{element.name} · {element.category}</span>
                  <button className="text-button" type="button" disabled={savingElement} onClick={() => removeElement(element.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </details>
        <iframe
          ref={frame}
          className="editor-frame"
          src="/invitation-editor.html"
          title={`Design ${product.title}`}
          onLoad={() => {
            setReady(false);
            frame.current?.contentWindow?.postMessage({ type: 'lobola-parent-ready', adminEditor: true }, window.location.origin);
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
    seoDescription: '', categorySeoTitle: '', categorySeoDescription: '',
    status: 'draft', coverImageUrl: '', canvasFormat: '', price: '', salePrice: ''
  });
  const [coverFile, setCoverFile] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [busy, setBusy] = useState(false);
  const [designProduct, setDesignProduct] = useState(null);
  const [designs, setDesigns] = useState({});
  const [contentMode, setContentMode] = useState('');

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
        const [membership, primaryAdmin] = await Promise.all([
          getDoc(doc(db, 'admins', user.uid)),
          getDoc(doc(db, 'adminConfig', 'primary'))
        ]);
        if (!membership.exists() || primaryAdmin.data()?.uid !== user.uid) {
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
      if (field === 'categoryName') {
        const category = categories.find((item) => makeSlug(item.name) === makeSlug(value.trim()));
        updated.categorySeoTitle = category?.seoTitle || '';
        updated.categorySeoDescription = category?.seoDescription || '';
      }
      return updated;
    });
  }

  function editProduct(product) {
    setContentMode('template');
    setCoverFile(null);
    setForm({
      id: product.id,
      title: product.title,
      slug: product.slug,
      excerpt: product.excerpt || '',
      categoryName: product.category?.name || '',
      seoTitle: product.seoTitle || product.title,
      seoDescription: product.seoDescription || '',
      categorySeoTitle: product.category?.seoTitle || '',
      categorySeoDescription: product.category?.seoDescription || '',
      status: product.status,
      coverImageUrl: product.coverImageUrl || '',
      canvasFormat: product.canvasFormat || product.design_json?.canvasFormat || 'standard',
      price: product.priceCents ? (product.priceCents / 100).toFixed(2) : '',
      salePrice: product.salePriceCents ? (product.salePriceCents / 100).toFixed(2) : ''
    });
    setSlugTouched(true);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setCoverFile(null);
    setForm({
      id: '', title: '', slug: '', excerpt: '', categoryName: '', seoTitle: '',
      seoDescription: '', categorySeoTitle: '', categorySeoDescription: '',
      status: 'draft', coverImageUrl: '', canvasFormat: '', price: '', salePrice: ''
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
      const price = Number(form.price);
      if (!Number.isFinite(price) || price <= 0 || Math.round(price * 100) <= 0) {
        throw new Error('Enter a template price greater than R 0.00.');
      }
      const salePrice = form.salePrice.trim() ? Number(form.salePrice) : null;
      if (salePrice !== null && (
        !Number.isFinite(salePrice)
        || salePrice <= 0
        || Math.round(salePrice * 100) <= 0
        || Math.round(salePrice * 100) >= Math.round(price * 100)
      )) {
        throw new Error('A sale price must be greater than R 0.00 and lower than the original price.');
      }
      if (form.seoDescription.length > 160) throw new Error('SEO description must be 160 characters or fewer.');
      if (form.categorySeoTitle.length > 70) throw new Error('Category SEO title must be 70 characters or fewer.');
      if (form.categorySeoDescription.length > 160) throw new Error('Category SEO description must be 160 characters or fewer.');

      let coverImageUrl = form.coverImageUrl.trim() || null;
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
          seoTitle: form.categorySeoTitle.trim() || categoryName,
          seoDescription: form.categorySeoDescription.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        await updateDoc(doc(db, 'categories', categoryId), {
          name: categoryName,
          seoTitle: form.categorySeoTitle.trim() || categoryName,
          seoDescription: form.categorySeoDescription.trim(),
          updatedAt: new Date().toISOString()
        });
      }

      const productId = form.id || crypto.randomUUID();
      const oldProduct = products.find((product) => product.id === productId);
      const payload = {
        categoryId,
        categorySlug,
        title: form.title.trim(),
        slug,
        priceCents: Math.round(price * 100),
        salePriceCents: salePrice === null ? null : Math.round(salePrice * 100),
        priceCurrency: 'ZAR',
        canvasFormat: form.canvasFormat,
        excerpt: form.excerpt.trim(),
        coverImageUrl,
        seoTitle: form.seoTitle.trim() || form.title.trim(),
        seoDescription: form.seoDescription.trim(),
        design_json: designs[productId] || oldProduct?.design_json || { version: 1, canvasFormat: form.canvasFormat, pages: [] },
        status: form.status,
        updatedAt: new Date().toISOString(),
        ...(oldProduct ? {} : { createdAt: new Date().toISOString() })
      };
      if (documentSize(payload) > 800 * 1024) {
        throw new Error('This template design is too large for Firestore. Reduce embedded images to fit within the document size limit.');
      }
      if (coverFile) {
        const user = getFirebaseAuth().currentUser;
        if (!user) throw new Error('Sign in again before uploading a cover image.');

        setMessage('Uploading cover image to Admin Template Covers…');
        const uploadForm = new FormData();
        uploadForm.set('file', coverFile);
        uploadForm.set('slug', slug);
        const response = await fetch('/api/admin/cover-upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
          body: uploadForm
        });
        const uploadResult = await response.json();
        if (!response.ok) throw new Error(uploadResult.error || 'Could not upload the cover image.');
        coverImageUrl = uploadResult.coverImageUrl;
        payload.coverImageUrl = coverImageUrl;
      }
      await setDoc(doc(db, 'products', productId), payload);

      const savedMessage = form.id ? 'Template updated.' : 'Template created. You can now design it from the product list.';
      resetForm();
      setMessageType('success');
      setMessage(coverFile
        ? `${savedMessage} The cover image was committed to GitHub and will deploy automatically.`
        : savedMessage);
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
      throw new Error('This design is too large for Firestore. Reduce embedded images to fit within the document size limit.');
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

  const persistElements = async (product, elements) => {
    await updateDoc(doc(getFirebaseDb(), 'products', product.id), {
      elements,
      updatedAt: new Date().toISOString()
    });
    setProducts((current) => current.map((item) => item.id === product.id
      ? { ...item, elements, updatedAt: new Date().toISOString() }
      : item));
    setDesignProduct((current) => current?.id === product.id ? { ...current, elements } : current);
    setMessageType('success');
    setMessage(`Elements saved for ${product.title}.`);
    router.refresh();
  };

  if (authState === 'unconfigured') {
    return <main className="page-wrap admin-wrap"><div className="setup-notice"><Link className="button secondary" href="/">Home</Link><h1>Connect Firebase</h1><p>Set the Firebase web app values in <code>.env.local</code>, then restart the development server. See <code>SETUP.md</code>.</p></div></main>;
  }
  if (authState === 'loading') {
    return <main className="page-wrap admin-wrap"><Link className="button secondary" href="/">Home</Link><p role="status">Checking administrator access…</p></main>;
  }
  if (authState === 'signed-out') {
    return (
      <main className="signin-wrap">
        <section className="signin-card">
          <Link href="/" className="brand">Lobola Invitation</Link>
          <h1>Admin sign in</h1>
          <p className="help">Sign in with an administrator account to manage invitation templates.</p>
          <SignInForm />
          <Link className="button secondary" href="/">Home</Link>
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
            ? <p>Only the configured primary administrator can manage content. Set <code>adminConfig/primary</code> to the intended administrator UID in Firestore.</p>
            : <p className="message error" role="alert">{message}</p>}
          <div className="form-actions">
            <Link href="/" className="button secondary">Home</Link>
            <button className="button" type="button" onClick={handleSignOut}>Sign out</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-wrap admin-wrap">
      <div className="admin-heading">
        <div><span className="eyebrow">Template and blog management</span><h1>Your content</h1><p className="help">Signed in as {userEmail}</p></div>
        <div className="form-actions"><Link className="button secondary" href="/">Home</Link><button className="button secondary" type="button" onClick={handleSignOut}>Sign out</button></div>
      </div>
      {message && <p className={`message ${messageType}`} role="status">{message}</p>}
      {contentMode && (
        <div className="form-actions content-type-actions">
          <button className="button secondary" type="button" onClick={() => { setContentMode(''); resetForm(); }}>Choose post type</button>
          <button className={`button${contentMode === 'template' ? '' : ' secondary'}`} type="button" onClick={() => { setContentMode('template'); if (contentMode !== 'template') resetForm(); }}>Template posts</button>
          <button className={`button${contentMode === 'blog' ? '' : ' secondary'}`} type="button" onClick={() => setContentMode('blog')}>Blog posts</button>
        </div>
      )}
      {contentMode === 'blog' ? <BlogManager /> : contentMode === 'template' ? (
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
            <label className="field">Category SEO title
              <input maxLength={70} value={form.categorySeoTitle} onChange={(event) => updateField('categorySeoTitle', event.target.value)} placeholder="Search result title for this category" />
              <small>{form.categorySeoTitle.length}/70 characters</small>
            </label>
            <label className="field">Category SEO description
              <textarea maxLength={160} value={form.categorySeoDescription} onChange={(event) => updateField('categorySeoDescription', event.target.value)} placeholder="Describe this category for search results." />
              <small>{form.categorySeoDescription.length}/160 characters</small>
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
            <label className="field">Cover image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setCoverFile(file);
                }}
              />
              <small>
                {coverFile
                  ? `${coverFile.name} selected. It will be saved to Admin Template Covers when you save this template.`
                  : 'Choose a JPEG, PNG, or WebP image (4 MB maximum). When you save, it is added to the website repository and Vercel deploys it automatically.'}
                {form.coverImageUrl && !coverFile ? ' Leave blank to keep the current cover.' : ''}
              </small>
              {form.coverImageUrl && (
                <img className="admin-cover-preview" src={form.coverImageUrl} alt="Current template cover" />
              )}
            </label>
            <label className="field">Price (South African rand)
              <input type="number" required min="0.01" max="999999.99" step="0.01" value={form.price} onChange={(event) => updateField('price', event.target.value)} placeholder="e.g. 99.00" />
              <small>Enter the regular/original price. Payment processing is not connected yet.</small>
            </label>
            <label className="field">Sale price (optional)
              <input type="number" min="0.01" max="999999.99" step="0.01" value={form.salePrice} onChange={(event) => updateField('salePrice', event.target.value)} placeholder="e.g. 79.00" />
              <small>Leave blank to show the regular price. A sale price must be lower than the original price.</small>
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
                <thead><tr><th>Cover</th><th>Template</th><th>Price</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.coverImageUrl ? <img src={product.coverImageUrl} alt="" /> : <span className="cover-placeholder" />}</td>
                      <td><strong>{product.title}</strong><br /><small>/product/{product.slug}</small></td>
                      <td>
                        {product.priceCents ? (
                          product.salePriceCents > 0 && product.salePriceCents < product.priceCents
                            ? <><del>{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(product.priceCents / 100)}</del><br /><strong>{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(product.salePriceCents / 100)}</strong></>
                            : new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(product.priceCents / 100)
                        ) : 'Set price'}
                      </td>
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
      ) : (
        <section className="panel">
          <h2>What would you like to create?</h2>
          <p>Choose a post type to open its form.</p>
          <div className="form-actions">
            <button className="button" type="button" onClick={() => { setContentMode('template'); resetForm(); }}>Create a template post</button>
            <button className="button secondary" type="button" onClick={() => setContentMode('blog')}>Create a blog post</button>
          </div>
        </section>
      )}
      {designProduct && (
        <DesignModal
          product={designProduct}
          onClose={() => setDesignProduct(null)}
          onSave={(design) => persistDesign(designProduct, design)}
          onSaveElements={(elements) => persistElements(designProduct, elements)}
        />
      )}
    </main>
  );
}
