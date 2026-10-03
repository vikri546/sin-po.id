import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import App from '../../../src/App';
import { transformLaravelPostToArticle } from '../../../src/lib/apiClient';
import { Article } from '../../../src/types';

// Force dynamic SSR — never serve stale ISR cache for OG meta
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || 'LMyrBrMUP8zpYV5d';

// Node.js Server-side In-Memory Cache (shared with /api/revalidate webhook for instant invalidation)
import { serverArticleCache as serverArticleMemoryCache, SERVER_ARTICLE_CACHE_TTL_MS as CACHE_TTL_MS } from '../../../src/lib/serverArticleCache';

function extractNumericId(idOrSlug: string): string {
  if (!idOrSlug) return '';
  const str = String(idOrSlug).trim();
  if (/^\d+$/.test(str)) return str;

  // Look for SinPo article numeric ID format (5-7 digits) anywhere in the string
  const fivePlusMatch = str.match(/\b\d{5,7}\b/) || str.match(/(\d{5,7})/);
  if (fivePlusMatch) return fivePlusMatch[1] || fivePlusMatch[0];

  // Fallback: match the last digit sequence in the string
  const lastDigitMatch = str.match(/(\d+)(?:[^\d]*)$/);
  return lastDigitMatch ? lastDigitMatch[1] : str;
}

function getArticleIdFromSlugArray(slugArray: string[]): string {
  if (!slugArray || slugArray.length === 0) return '';
  for (const part of slugArray) {
    const extracted = extractNumericId(part);
    if (/^\d{5,7}$/.test(extracted)) {
      return extracted;
    }
  }
  return extractNumericId(slugArray[0]);
}

async function fetchArticleDetailFromApi(articleIdOrSlug: string) {
  if (!articleIdOrSlug) return null;

  const cacheKey = articleIdOrSlug.trim();
  const cleanNumericId = extractNumericId(articleIdOrSlug);
  const now = Date.now();

  // 1. Instant 0ms memory cache hit (10-minute TTL)
  if (serverArticleMemoryCache.has(cacheKey)) {
    const cached = serverArticleMemoryCache.get(cacheKey)!;
    if (now - cached.timestamp < CACHE_TTL_MS) {
      const cachedPub = String(cached.data?.publish ?? '').trim();
      const cachedStat = String(cached.data?.status ?? '').trim();
      if (cachedPub === '0' || cachedStat === '0') {
        serverArticleMemoryCache.delete(cacheKey);
      } else {
        return cached.data;
      }
    }
  }

  const targetId = cleanNumericId || articleIdOrSlug;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SinPoBot/1.0',
  };

  // Tier 1: Single detail query with 5000ms timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`https://api.sinpo.id/api/berita/${targetId}`, {
      cache: 'no-store',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      const item = json?.data || json?.result || json;
      if (item && (item.judul || item.title)) {
        const publishVal = String(item.publish ?? '').trim();
        const statusVal = String(item.status ?? '').trim();
        if (publishVal === '0' || statusVal === '0') {
          serverArticleMemoryCache.delete(cacheKey);
          if (cleanNumericId && cleanNumericId !== cacheKey) {
            serverArticleMemoryCache.delete(cleanNumericId);
          }
          return null;
        }
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

  // Tier 2: Search in Channel pool (/api/berita?limit=100) to bypass 60 req/min single-detail API rate limits
  try {
    const poolController = new AbortController();
    const poolTimeoutId = setTimeout(() => poolController.abort(), 4000);
    const poolRes = await fetch(`https://api.sinpo.id/api/berita?limit=100`, {
      cache: 'no-store',
      headers,
      signal: poolController.signal,
    });
    clearTimeout(poolTimeoutId);

    if (poolRes.ok) {
      const poolJson = await poolRes.json();
      const items = Array.isArray(poolJson?.data) ? poolJson.data : [];
      const matchedItem = items.find((it: any) => {
        const itId = String(it.id_berita || it.id || '').trim();
        const itNumId = extractNumericId(itId);
        return (cleanNumericId && itNumId === cleanNumericId) || itId === articleIdOrSlug || it.slug === articleIdOrSlug;
      });

      if (matchedItem && (matchedItem.judul || matchedItem.title)) {
        const pubVal = String(matchedItem.publish ?? '').trim();
        const statVal = String(matchedItem.status ?? '').trim();
        if (pubVal !== '0' && statVal !== '0') {
          serverArticleMemoryCache.set(cacheKey, { data: matchedItem, timestamp: now });
          if (cleanNumericId && cleanNumericId !== cacheKey) {
            serverArticleMemoryCache.set(cleanNumericId, { data: matchedItem, timestamp: now });
          }
          return matchedItem;
        }
      }
    }
  } catch (e) {}

  // Tier 3: Emergency Stale Cache fallback (returns last cached version instead of falling back to default site metadata)
  if (serverArticleMemoryCache.has(cacheKey)) {
    const cached = serverArticleMemoryCache.get(cacheKey)!;
    const cachedPub = String(cached.data?.publish ?? '').trim();
    const cachedStat = String(cached.data?.status ?? '').trim();
    if (cachedPub !== '0' && cachedStat !== '0') {
      return cached.data;
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
  const articleId = getArticleIdFromSlugArray(slugArray);

  if (!articleId) {
    return getSlugFallbackMetadata(slugArray);
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
    // Use clean static image URL (without ?v= query) for 100% WhatsApp / Facebook scraper compatibility
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
      description: cleanSummary || cleanTitle,
      robots: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
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
        description: cleanSummary || cleanTitle,
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
        creator: '@sinpotv',
        title: cleanTitle,
        description: cleanSummary || cleanTitle,
        images: [
          {
            url: imageUrl,
            alt: cleanTitle,
            width: 1200,
            height: 630,
          },
        ],
      },
    };
  }

  return getSlugFallbackMetadata(slugArray);
}

function getSlugFallbackMetadata(slugArray: string[]): Metadata {
  const rawSlug = slugArray.slice(1).join(' ') || slugArray[0] || '';
  const fallbackTitle = rawSlug
    ? rawSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Berita SinPo.id';
  const canonicalUrl = `https://sinpo.id/detail/${slugArray.join('/')}`;

  return {
    metadataBase: new URL('https://sinpo.id'),
    title: fallbackTitle,
    description: fallbackTitle,
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
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
      title: fallbackTitle,
      description: fallbackTitle,
      url: canonicalUrl,
      siteName: 'SinPo.id',
      images: [
        {
          url: 'https://sinpo.id/sinpo-og-banner.png',
          secureUrl: 'https://sinpo.id/sinpo-og-banner.png',
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: fallbackTitle,
        },
      ],
      locale: 'id_ID',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@sinpotv',
      creator: '@sinpotv',
      title: fallbackTitle,
      description: fallbackTitle,
      images: [
        {
          url: 'https://sinpo.id/sinpo-og-banner.png',
          alt: fallbackTitle,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function DetailCatchAllPage(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const slugArray = params?.slug || [];

  if (slugArray.includes('feed')) {
    const articleId = getArticleIdFromSlugArray(slugArray);
    redirect(`/rss?articleId=${encodeURIComponent(articleId)}`);
  }

  const articleId = getArticleIdFromSlugArray(slugArray);

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
