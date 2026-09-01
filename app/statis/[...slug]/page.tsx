import type { Metadata } from 'next';
import App from '../../../src/App';

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;
  const slugArray = params?.slug || [];
  const rawTitle = slugArray[slugArray.length - 1] || 'Halaman';
  const cleanTitle = rawTitle.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const title = `${cleanTitle} – SinPo.id`;
  const description = `Informasi resmi ${cleanTitle} portal berita SinPo.id Matahari Indonesia.`;
  const canonicalUrl = `https://sinpo.id/statis/${slugArray.join('/')}`;

  return {
    metadataBase: new URL('https://sinpo.id'),
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'SinPo.id',
      locale: 'id_ID',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      site: '@sinpotv',
      title,
      description,
    },
    icons: {
      icon: 'https://sinpo.id/sinpo-favicon.png',
      shortcut: 'https://sinpo.id/sinpo-favicon.png',
    },
  };
}

export default function StatisCatchAllPage() {
  return <App />;
}
