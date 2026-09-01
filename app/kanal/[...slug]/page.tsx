import type { Metadata } from 'next';
import App from '../../../src/App';

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;
  const slugArray = params?.slug || [];
  const rawKanal = slugArray[0] || 'Berita';
  const cleanKanal = rawKanal.replace(/-/g, ' ').toUpperCase();
  const title = `Berita ${cleanKanal} Terkini – SinPo.id`;
  const description = `Kumpulan berita politik, hukum, ekonomi, dan peristiwa terkini kanal ${cleanKanal} di SinPo.id Matahari Indonesia.`;
  const canonicalUrl = `https://sinpo.id/kanal/${slugArray.join('/')}`;

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
      images: [
        {
          url: 'https://sinpo.id/sinpo-favicon.png',
          secureUrl: 'https://sinpo.id/sinpo-favicon.png',
          width: 512,
          height: 512,
          type: 'image/png',
          alt: 'SinPo.id Logo',
        },
      ],
      locale: 'id_ID',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@sinpotv',
      title,
      description,
      images: ['https://sinpo.id/sinpo-favicon.png'],
    },
    icons: {
      icon: 'https://sinpo.id/sinpo-favicon.png',
      shortcut: 'https://sinpo.id/sinpo-favicon.png',
    },
  };
}

export default function KanalCatchAllPage() {
  return <App />;
}
