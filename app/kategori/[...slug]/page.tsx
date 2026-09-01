import type { Metadata } from 'next';
import App from '../../../src/App';

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;
  const slugArray = params?.slug || [];
  const rawKat = slugArray[0] || 'Berita';
  const cleanKat = rawKat.replace(/-/g, ' ').toUpperCase();
  const title = `Berita ${cleanKat} Terkini – SinPo.id`;
  const description = `Kumpulan berita politik, hukum, ekonomi, dan peristiwa terkini kategori ${cleanKat} di SinPo.id Matahari Indonesia.`;
  const canonicalUrl = `https://sinpo.id/kategori/${slugArray.join('/')}`;

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

export default function KategoriCatchAllPage() {
  return <App />;
}
