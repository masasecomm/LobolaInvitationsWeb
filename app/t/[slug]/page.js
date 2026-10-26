import { permanentRedirect } from 'next/navigation';

export default async function LegacyTemplatePage({ params }) {
  const { slug } = await params;
  permanentRedirect(`/product/${slug}`);
}
