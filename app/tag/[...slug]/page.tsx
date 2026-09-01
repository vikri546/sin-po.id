import type { Metadata } from 'next';
import App from '../../../src/App';

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;
  const slugArray = params?.slug || [];
  const rawTag = slugArray[0] || 'Berita';
  const cleanTag = rawTag.replace(/-/g, ' ');
  const title = `Berita Tag #${cleanTag} – SinPo.id`;
  const description = `Kumpulan berita terkini dan topik hangat seputar #${cleanTag} di SinPo.id Matahari Indonesia.`;
  const canonicalUrl = `https://sinpo.id/tag/${slugArray.join('/')}`;

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

export default function TagCatchAllPage() {
  return <App />;
}
