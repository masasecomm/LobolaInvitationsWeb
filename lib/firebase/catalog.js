import { collection, getDocs, getFirestore, limit, query, where } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { firebaseConfig, isFirebaseConfigured } from './config';

export { isFirebaseConfigured };

function getPublicDb() {
  if (!isFirebaseConfigured) throw new Error('Firebase is not configured. Check the Firebase settings.');
  const app = getApps().find((candidate) => candidate.name === 'lobola-public-catalog')
    || initializeApp(firebaseConfig, 'lobola-public-catalog');
  return getFirestore(app);
}

export async function getPublicCatalog() {
  const db = getPublicDb();
  const [categorySnapshot, productSnapshot] = await Promise.all([
    getDocs(collection(db, 'categories')),
    getDocs(query(collection(db, 'products'), where('status', '==', 'published')))
  ]);
  const categories = categorySnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  const products = productSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  return { categories, products };
}

export async function getPublishedProduct(slug) {
  const db = getPublicDb();
  const snapshot = await getDocs(query(
    collection(db, 'products'),
    where('slug', '==', slug),
    where('status', '==', 'published'),
    limit(1)
  ));
  const product = snapshot.docs[0];
  if (!product) return null;
  const data = product.data();
  const categorySnapshot = await getDocs(query(collection(db, 'categories'), where('slug', '==', data.categorySlug), limit(1)));
  const category = categorySnapshot.docs[0];
  return { id: product.id, ...data, category: category ? { id: category.id, ...category.data() } : null };
}

export async function getProductReviews(productId) {
  const db = getPublicDb();
  const snapshot = await getDocs(query(
    collection(db, 'reviews'),
    where('productId', '==', productId)
  ));
  return snapshot.docs
    .map((item) => {
      const data = item.data();
      return {
        id: item.id,
        ...data,
        createdAt: data.createdAt?.toDate?.().toISOString() || String(data.createdAt || '')
      };
    })
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export async function getPublishedBlogPosts() {
  const db = getPublicDb();
  const snapshot = await getDocs(query(
    collection(db, 'blogPosts'),
    where('status', '==', 'published')
  ));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

export async function getPublishedBlogPost(slug) {
  const db = getPublicDb();
  const snapshot = await getDocs(query(
    collection(db, 'blogPosts'),
    where('slug', '==', slug),
    where('status', '==', 'published'),
    limit(1)
  ));
  const post = snapshot.docs[0];
  return post ? { id: post.id, ...post.data() } : null;
}
