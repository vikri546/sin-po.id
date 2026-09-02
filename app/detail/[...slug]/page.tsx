import type { Metadata } from 'next';
import App from '../../../src/App';
import { transformLaravelPostToArticle } from '../../../src/lib/apiClient';
import { Article } from '../../../src/types';

const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || 'LMyrBrMUP8zpYV5d';

// Node.js Server-side In-Memory Cache for ultra-fast SSR responses (< 10ms)
const serverArticleMemoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

function extractNumericId(idOrSlug: string): string {
  if (!idOrSlug) return '';
  const str = String(idOrSlug).trim();
  const match = str.match(/\d+/);
  return match ? match[0] : str;
}

async function fetchArticleDetailFromApi(articleIdOrSlug: string) {
  if (!articleIdOrSlug) return null;

  const cacheKey = articleIdOrSlug.trim();
  const now = Date.now();

  // 1. Instant 0ms memory cache hit
  if (serverArticleMemoryCache.has(cacheKey)) {
    const cached = serverArticleMemoryCache.get(cacheKey)!;
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const cleanNumericId = extractNumericId(articleIdOrSlug);
  const targetId = cleanNumericId || articleIdOrSlug;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`,
  };

  // Fast AbortController to limit HTTP request duration to 1200ms max
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);

  try {
    const res = await fetch(`https://api.sinpo.id/api/berita/${targetId}`, {
      next: { revalidate: 600 },
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      const item = json?.data || json?.result || json;
      if (item && (item.judul || item.title)) {
        serverArticleMemoryCache.set(cacheKey, { data: item, timestamp: now });
        if (cleanNumericId && cleanNumericId !== cacheKey) {
          serverArticleMemoryCache.set(cleanNumericId, { data: item, timestamp: now });
        }
        return item;
      }
    }
  } catch (e) {
    clearTimeout(timeoutId);
  }

  // 2. Fast Fallback Query
  if (cleanNumericId && cleanNumericId !== articleIdOrSlug) {
    const fallbackController = new AbortController();
    const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 800);
    try {
      const res = await fetch(`https://api.sinpo.id/api/berita/${articleIdOrSlug}`, {
        next: { revalidate: 600 },
        headers,
        signal: fallbackController.signal,
      });
      clearTimeout(fallbackTimeoutId);
      if (res.ok) {
        const json = await res.json();
        const item = json?.data || json?.result || json;
        if (item && (item.judul || item.title)) {
          serverArticleMemoryCache.set(cacheKey, { data: item, timestamp: now });
          return item;
        }
      }
    } catch (e) {
      clearTimeout(fallbackTimeoutId);
    }
  }

  return null;
}

function resolveStorageUrl(path?: string | null): string {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    return 'https://sinpo.id/sinpo-og-banner.png';
  }

  let cleanPath = path.trim();

  if (cleanPath.includes('localhost:8000') || cleanPath.includes('127.0.0.1:8000') || cleanPath.includes('api.sinpo.id')) {
    try {
      const urlObj = new URL(cleanPath);
      cleanPath = urlObj.pathname;
    } catch {
      cleanPath = cleanPath.replace(/^https?:\/\/[^\/]+/, '');
    }
  }

  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return cleanPath;
  }

  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1);
  }

  if (
    cleanPath.startsWith('storage/') ||
    cleanPath.startsWith('uploads/') ||
    cleanPath.startsWith('gambar/') ||
    cleanPath.startsWith('foto/') ||
    cleanPath.startsWith('asset/') ||
    cleanPath.startsWith('assets/')
  ) {
    return `https://sinpo.id/${cleanPath}`;
  }

  if (!cleanPath.includes('/')) {
    const dateMatch = cleanPath.match(/(\d{2})(\d{2})(\d{4})-\d+\.(?:jpg|png|jpeg|webp|gif)$/i);
    if (dateMatch) {
      const month = dateMatch[2];
      const year = dateMatch[3];
      cleanPath = `${year}/${month}/${cleanPath}`;
    }
  }

  return `https://sinpo.id/storage/${cleanPath}`;
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
    let cleanSummary = rawSummary.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
    if (cleanSummary.length > 140) {
      cleanSummary = cleanSummary.slice(0, 137).trim() + '...';
    }
    const rawImage = item.gambar_detail || item.gambar || item.image || item.cover || item.thumbnail || item.foto || '';
    const imageUrl = resolveStorageUrl(rawImage);
    const canonicalUrl = `https://sinpo.id/detail/${slugArray.join('/')}`;
    const authorName = item.datawartawan?.nama_wartawan || (typeof item.penulis === 'object' ? item.penulis.nama : item.penulis) || (typeof item.wartawan === 'object' ? item.wartawan.nama_wartawan : item.wartawan) || item.author || 'Redaksi SinPo';

    let imageMimeType = 'image/jpeg';
    const lowerImg = imageUrl.toLowerCase();
    if (lowerImg.endsWith('.png')) imageMimeType = 'image/png';
    else if (lowerImg.endsWith('.webp')) imageMimeType = 'image/webp';
    else if (lowerImg.endsWith('.gif')) imageMimeType = 'image/gif';

    return {
      metadataBase: new URL('https://sinpo.id'),
      title: cleanTitle,
      description: cleanSummary,
      alternates: {
        canonical: canonicalUrl,
      },
      icons: {
        icon: [
          { url: 'https://sinpo.id/sinpo-favicon.png', type: 'image/png' },
          { url: 'https://sinpo.id/favicon.ico', sizes: 'any' },
        ],
        shortcut: 'https://sinpo.id/sinpo-favicon.png',
        apple: 'https://sinpo.id/sinpo-favicon.png',
      },
      openGraph: {
        title: cleanTitle,
        description: cleanSummary,
        url: canonicalUrl,
        siteName: 'SinPo.id',
        images: [
          {
            url: imageUrl,
            secureUrl: imageUrl,
            width: 1200,
            height: 630,
            type: imageMimeType,
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
    metadataBase: new URL('https://sinpo.id'),
    title: 'SinPo.id - Matahari Indonesia',
    description: 'Portal berita politik terpercaya yang mengulas berita politik nasional, hukum, ekonomi, peristiwa terkini, dan informasi aktual dari Indonesia.',
    icons: {
      icon: 'https://sinpo.id/sinpo-favicon.png',
      shortcut: 'https://sinpo.id/sinpo-favicon.png',
    },
  };
}

export default async function DetailCatchAllPage(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const slugArray = params?.slug || [];
  const articleId = slugArray[0];

  let jsonLdNewsArticle: Record<string, any> | null = null;
  let initialArticle: Article | null = null;

  if (articleId) {
    const item = await fetchArticleDetailFromApi(articleId);

    if (item && (item.judul || item.title)) {
      initialArticle = transformLaravelPostToArticle(item);

      const cleanTitle = (item.judul || item.title || '').replace(/<[^>]*>?/gm, '').trim();
      const rawSummary = item.ringkasan || item.excerpt || item.sub_judul || item.subtitle || item.isi || '';
      let cleanSummary = rawSummary.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
      if (cleanSummary.length > 180) {
        cleanSummary = cleanSummary.slice(0, 177).trim() + '...';
      }
      const rawImage = item.gambar_detail || item.gambar || item.image || item.cover || item.thumbnail || item.foto || '';
      const imageUrl = resolveStorageUrl(rawImage);
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
    } else {
      const cleanId = extractNumericId(articleId);
      initialArticle = transformLaravelPostToArticle({ id: cleanId || articleId, judul: '' });
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
      <App initialArticle={initialArticle} />
    </>
  );
}
