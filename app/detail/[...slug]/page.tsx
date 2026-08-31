import type { Metadata } from 'next';
import App from '../../../src/App';

const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || 'LMyrBrMUP8zpYV5d';

async function fetchArticleDetailFromApi(articleIdOrSlug: string) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`,
  };

  // 1. Try standard REST endpoint: /api/berita/${articleIdOrSlug}
  try {
    const res = await fetch(`https://api.sinpo.id/api/berita/${articleIdOrSlug}`, {
      next: { revalidate: 60 },
      headers,
    });
    if (res.ok) {
      const json = await res.json();
      const item = json?.data || json?.result || json;
      if (item && (item.judul || item.title)) return item;
    }
  } catch (e) {}

  // 2. Try fallback query: /api/berita/detail?id=${articleIdOrSlug}
  try {
    const res = await fetch(`https://api.sinpo.id/api/berita/detail?id=${articleIdOrSlug}`, {
      next: { revalidate: 60 },
      headers,
    });
    if (res.ok) {
      const json = await res.json();
      const item = json?.data || json?.result || json;
      if (item && (item.judul || item.title)) return item;
    }
  } catch (e) {}

  return null;
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;
  const slugArray = params?.slug || [];
  const articleId = slugArray[0];

  if (!articleId) {
    return {
      title: 'SinPo.id - Matahari Indonesia',
      description: 'SinPo.id adalah portal berita politik terpercaya yang mengulas berita politik nasional, hukum, ekonomi, peristiwa terkini, dan informasi aktual dari seluruh Indonesia secara tajam dan berimbang.',
    };
  }

  const item = await fetchArticleDetailFromApi(articleId);

  if (item && (item.judul || item.title)) {
    const cleanTitle = (item.judul || item.title || '').replace(/<[^>]*>?/gm, '').trim();
    const rawSummary = item.ringkasan || item.excerpt || item.sub_judul || item.subtitle || item.isi || '';
    const cleanSummary = rawSummary.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim().slice(0, 180);
    const rawImage = item.gambar_detail || item.gambar || item.image || item.cover || item.thumbnail || item.foto || '';
    const imageUrl = rawImage.startsWith('http')
      ? rawImage
      : `https://sinpo.id/storage/${rawImage.replace(/^\/+/, '')}`;
    const canonicalUrl = `https://sinpo.id/detail/${slugArray.join('/')}`;
    const authorName = item.datawartawan?.nama_wartawan || (typeof item.penulis === 'object' ? item.penulis.nama : item.penulis) || (typeof item.wartawan === 'object' ? item.wartawan.nama_wartawan : item.wartawan) || item.author || 'Redaksi SinPo';

    return {
      title: cleanTitle,
      description: cleanSummary,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: cleanTitle,
        description: cleanSummary,
        url: canonicalUrl,
        siteName: 'SinPo.id',
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: cleanTitle,
          },
        ],
        locale: 'id_ID',
        type: 'article',
        publishedTime: item.tanggal_tayang || item.published_at || item.created_at,
        authors: [typeof authorName === 'string' ? authorName : 'Redaksi SinPo'],
      },
      twitter: {
        card: 'summary_large_image',
        site: '@sinpotv',
        title: cleanTitle,
        description: cleanSummary,
        images: [imageUrl],
      },
    };
  }

  return {
    title: 'SinPo.id - Matahari Indonesia',
    description: 'Portal berita politik terpercaya yang mengulas berita politik nasional, hukum, ekonomi, peristiwa terkini, dan informasi aktual dari Indonesia.',
  };
}

export default async function DetailCatchAllPage(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const slugArray = params?.slug || [];
  const articleId = slugArray[0];

  let jsonLdNewsArticle: Record<string, any> | null = null;

  if (articleId) {
    const item = await fetchArticleDetailFromApi(articleId);

    if (item && (item.judul || item.title)) {
      const cleanTitle = (item.judul || item.title || '').replace(/<[^>]*>?/gm, '').trim();
      const rawSummary = item.ringkasan || item.excerpt || item.sub_judul || item.subtitle || item.isi || '';
      const cleanSummary = rawSummary.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim().slice(0, 200);
      const rawImage = item.gambar_detail || item.gambar || item.image || item.cover || item.thumbnail || item.foto || '';
      const imageUrl = rawImage.startsWith('http')
        ? rawImage
        : `https://sinpo.id/storage/${rawImage.replace(/^\/+/, '')}`;
      const canonicalUrl = `https://sinpo.id/detail/${slugArray.join('/')}`;
      const authorName = item.datawartawan?.nama_wartawan || (typeof item.penulis === 'object' ? item.penulis.nama : item.penulis) || (typeof item.wartawan === 'object' ? item.wartawan.nama_wartawan : item.wartawan) || item.author || 'Redaksi SinPo';
      const channelName = item.datachannel?.nama || item.datakategori?.nama || item.kanal?.nama || item.kategori?.nama || item.category || 'POLITIK';
      const pubDate = item.tanggal_tayang || item.published_at || item.created_at || new Date().toISOString();

      jsonLdNewsArticle = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        'mainEntityOfPage': {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
        'headline': cleanTitle,
        'description': cleanSummary,
        'articleSection': String(channelName).toUpperCase(),
        'image': [imageUrl],
        'datePublished': pubDate,
        'dateModified': item.updated_at || pubDate,
        'author': [
          {
            '@type': 'Person',
            'name': typeof authorName === 'string' ? authorName : 'Redaksi SinPo',
            'jobTitle': 'Jurnalis',
            'url': 'https://sinpo.id',
          },
        ],
        'publisher': {
          '@type': 'Organization',
          'name': 'SinPo.id',
          'url': 'https://sinpo.id',
          'logo': {
            '@type': 'ImageObject',
            'url': 'https://sinpo.id/sinpo-favicon.png',
            'width': 512,
            'height': 512,
          },
        },
        'isAccessibleForFree': true,
        'inLanguage': 'id-ID',
      };
    }
  }

  return (
    <>
      {jsonLdNewsArticle && (
        <script
          id="newsarticle-jsonld-ssr"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdNewsArticle) }}
        />
      )}
      <App />
    </>
  );
}
