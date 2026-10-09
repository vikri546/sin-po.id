import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import App from '../../../src/App';
import { transformLaravelPostToArticle, isTakedownArticle } from '../../../src/lib/apiClient';
import { createSlug } from '../../../src/lib/urlHelpers';
import { Article } from '../../../src/types';

// ISR Configuration: Revalidate article detail page every 60 seconds
export const revalidate = 60;

const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || 'LMyrBrMUP8zpYV5d';

// Node.js Server-side In-Memory Cache
import { serverArticleCache as serverArticleMemoryCache, SERVER_ARTICLE_CACHE_TTL_MS as CACHE_TTL_MS, markTakedown } from '../../../src/lib/serverArticleCache';

function extractNumericId(idOrSlug: string): string {
  if (!idOrSlug) return '';
  const str = String(idOrSlug).trim();
  if (/^\d+$/.test(str)) return str;

  // PERBAIKAN: Cari format ID spesifik di ujung akhir slug dengan tanda hubung (misal: -123456)
  const endMatch = str.match(/-(\d{4,8})$/);
  if (endMatch) return endMatch[1];

  // PERBAIKAN: Fallback cari 5-8 digit terisolasi (menghindari salah ambil angka '20' dari 'g20')
  const boundaryMatch = str.match(/\b(\d{5,8})\b/);
  if (boundaryMatch) return boundaryMatch[1];

  return str; // Kembalikan string utuh jika tidak ditemukan ID angka yang valid
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

/**
 * 6-Tier Robust Article Fetcher for SinPo.id
 */
async function fetchArticleDetailFromApi(articleIdOrSlug: string) {
  if (!articleIdOrSlug) return null;

  const cacheKey = articleIdOrSlug.trim();
  const cleanNumericId = extractNumericId(articleIdOrSlug);
  const now = Date.now();

  // Tier 6 Gate Pre-check: Check known hardcoded takedown blacklist
  if (
    (cleanNumericId && isTakedownArticle(Number(cleanNumericId))) ||
    isTakedownArticle(articleIdOrSlug)
  ) {
    serverArticleMemoryCache.delete(cacheKey);
    if (cleanNumericId && cleanNumericId !== cacheKey) {
      serverArticleMemoryCache.delete(cleanNumericId);
    }
    return { isTakedown: true };
  }

  // TIER 1: Instant 0ms Server Memory Cache Hit
  if (serverArticleMemoryCache.has(cacheKey)) {
    const cached = serverArticleMemoryCache.get(cacheKey)!;
    if (now - cached.timestamp < CACHE_TTL_MS) {
      if (isTakedownArticle(cached.data)) {
        serverArticleMemoryCache.delete(cacheKey);
        return { isTakedown: true };
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

  // TIER 2: Direct Single-Detail API Query
  if (cleanNumericId || /^\d+$/.test(targetId)) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);

      try {
        const res = await fetch(`https://api.sinpo.id/api/berita/${targetId}`, {
          next: { revalidate: 60, tags: [`article-${targetId}`] },
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        // CMS menghapus berita → 404/410 = takedown untuk request ini (hanya jika targetId angka murni)
        if ((res.status === 404 || res.status === 410) && /^\d+$/.test(targetId)) {
          serverArticleMemoryCache.delete(cacheKey);
          if (cleanNumericId && cleanNumericId !== cacheKey) {
            serverArticleMemoryCache.delete(cleanNumericId);
          }
          return { isTakedown: true };
        }

        if (res.ok) {
          const json = await res.json();
          const item = json?.data || json?.result || json;
          if (item && (item.judul || item.title)) {
            if (isTakedownArticle(item)) {
              serverArticleMemoryCache.delete(cacheKey);
              return { isTakedown: true };
            }
            serverArticleMemoryCache.set(cacheKey, { data: item, timestamp: now });
            return item;
          }
        }
      } catch (e) {
        clearTimeout(timeoutId);
      }
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }

  // TIER 3: Latest Channel Pool API
  try {
    const poolController = new AbortController();
    const poolTimeoutId = setTimeout(() => poolController.abort(), 5000);
    const poolRes = await fetch(`https://api.sinpo.id/api/berita?limit=100`, {
      next: { revalidate: 60 },
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
        const itSlug = it.slug || createSlug(it.judul || '');
        return (
          (cleanNumericId && itNumId === cleanNumericId) ||
          itId === articleIdOrSlug ||
          itSlug === articleIdOrSlug ||
          (itSlug.length > 5 && articleIdOrSlug.includes(itSlug))
        );
      });

      if (matchedItem && (matchedItem.judul || matchedItem.title)) {
        if (isTakedownArticle(matchedItem)) return { isTakedown: true };
        serverArticleMemoryCache.set(cacheKey, { data: matchedItem, timestamp: now });
        return matchedItem;
      }
    }
  } catch (e) {}

  // TIER 4: Keyword Search Query API
  try {
    const rawWords = articleIdOrSlug.replace(/-/g, ' ').replace(/[^\w\s]/g, '').trim().split(/\s+/).filter(w => w.length >= 4);
    const firstKeyword = rawWords[0] || articleIdOrSlug;

    if (firstKeyword && firstKeyword.length >= 3) {
      const searchController = new AbortController();
      const searchTimeoutId = setTimeout(() => searchController.abort(), 5000);
      const searchRes = await fetch(`https://api.sinpo.id/api/berita?q=${encodeURIComponent(firstKeyword)}&limit=30`, {
        next: { revalidate: 60 },
        headers,
        signal: searchController.signal,
      });
      clearTimeout(searchTimeoutId);

      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        const items = Array.isArray(searchJson?.data) ? searchJson.data : [];
        const matchedItem = items.find((it: any) => {
          const itId = String(it.id_berita || it.id || '').trim();
          const itNumId = extractNumericId(itId);
          const itSlug = it.slug || createSlug(it.judul || '');
          return (
            (cleanNumericId && itNumId === cleanNumericId) ||
            itId === articleIdOrSlug ||
            itSlug === articleIdOrSlug ||
            (itSlug.length > 5 && articleIdOrSlug.includes(itSlug))
          );
        });

        if (matchedItem && (matchedItem.judul || matchedItem.title)) {
          if (isTakedownArticle(matchedItem)) return { isTakedown: true };
          serverArticleMemoryCache.set(cacheKey, { data: matchedItem, timestamp: now });
          return matchedItem;
        }
      }
    }
  } catch (e) {}

  // TIER 5: Emergency Stale Server Memory Cache Fallback
  if (serverArticleMemoryCache.has(cacheKey)) {
    const cached = serverArticleMemoryCache.get(cacheKey)!;
    if (isTakedownArticle(cached.data)) return { isTakedown: true };
    return cached.data;
  }

  // PERBAIKAN: Jangan memicu 404 hanya karena semua fetch gagal, biarkan nilainya null untuk dihandle Skeleton
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

  if (!articleId) notFound();

  const cleanNumId = extractNumericId(articleId);
  if ((cleanNumId && isTakedownArticle(Number(cleanNumId))) || isTakedownArticle(articleId)) {
    notFound();
  }

  const item = await fetchArticleDetailFromApi(articleId);

  // PERBAIKAN: Jika item adalah objek takedown explicitly
  if (item && item.isTakedown) {
    notFound();
  }

  // PERBAIKAN: Jika item gagal diload (NULL/Timeout) - Jangan Tampilkan 404! 
  // Berikan metadadata fallback agar NextJS bisa melanjutkan render dan client fetcher mengambil datanya.
  if (!item || (!item.judul && !item.title)) {
    const rawSlugText = slugArray.map(s => s.replace(/-\d+$/, '')).join(' ');
    const fallbackTitle = rawSlugText
      ? rawSlugText.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim()
      : 'Berita SinPo.id';
    const canonicalUrl = `https://sinpo.id/detail/${slugArray.join('/')}`;
    return {
      metadataBase: new URL('https://sinpo.id'),
      title: `${fallbackTitle} - SinPo.id`,
      description: `Informasi terkini mengenai ${fallbackTitle} di SinPo.id`,
      alternates: { canonical: canonicalUrl },
      robots: { index: false, follow: true },
    };
  }

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
  if (!articleId) notFound();

  const cleanNumId = extractNumericId(articleId);
  if ((cleanNumId && isTakedownArticle(Number(cleanNumId))) || isTakedownArticle(articleId)) {
    notFound();
  }

  const fetchedItem = await fetchArticleDetailFromApi(articleId);

  // Jika item eksplisit mengkonfirmasi ini adalah takedown
  if (fetchedItem && fetchedItem.isTakedown) {
    notFound();
  }

  // PERBAIKAN PENTING: Jangan buat halaman error 404 jika API SSR sekadar timeout (NULL)! 
  // Generate Fake Skeleton Item untuk menjebatani client-side React merender Skeleton.
  let itemToProcess = fetchedItem;
  let isFallback = false;

  if (!fetchedItem || (!fetchedItem.judul && !fetchedItem.title)) {
    isFallback = true;

    // Generasi Judul Manusiawi dari Slug URL agar GA & SEO tidak mencatat "Sedang memuat konten..."
    const rawSlugText = slugArray.map(s => s.replace(/-\d+$/, '')).join(' ');
    const readableTitleFromSlug = rawSlugText
      ? rawSlugText.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim()
      : 'Berita SinPo.id';

    itemToProcess = {
      id_berita: cleanNumId || articleId,
      slug: slugArray.join('/'),
      judul: readableTitleFromSlug,
      ringkasan: 'Mengambil data dari server...',
      isi: '<p>Memuat berita...</p>',
      kategori: { nama: 'BERITA' },
      tanggal_tayang: new Date().toISOString(),
      author: 'Redaksi SinPo',
      gambar_detail: ''
    };
  }

  const initialArticle = transformLaravelPostToArticle(itemToProcess);
  
  // Tag property khusus untuk memberi sinyal ke komponen Client
  if (isFallback) {
    (initialArticle as any).isFallback = true;
  }

  const cleanTitle = (itemToProcess.judul || itemToProcess.title || '').replace(/<[^>]*>?/gm, '').trim();
  const rawSummary = itemToProcess.ringkasan || itemToProcess.excerpt || itemToProcess.sub_judul || itemToProcess.subtitle || itemToProcess.isi || '';
  let cleanSummary = rawSummary.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  if (cleanSummary.length > 180) {
    cleanSummary = cleanSummary.slice(0, 177).trim() + '...';
  }
  const rawImage = itemToProcess.gambar_detail || itemToProcess.gambar || itemToProcess.image || itemToProcess.cover || itemToProcess.thumbnail || itemToProcess.foto || '';
  const imageUrl = resolveStorageUrl(rawImage);
  const canonicalUrl = `https://sinpo.id/detail/${slugArray.join('/')}`;
  const authorName = itemToProcess.datawartawan?.nama_wartawan || (typeof itemToProcess.penulis === 'object' ? itemToProcess.penulis.nama : itemToProcess.penulis) || (typeof itemToProcess.wartawan === 'object' ? itemToProcess.wartawan.nama_wartawan : itemToProcess.wartawan) || itemToProcess.author || 'Redaksi SinPo';
  const channelName = itemToProcess.datachannel?.nama || itemToProcess.datakategori?.nama || itemToProcess.kanal?.nama || itemToProcess.kategori?.nama || itemToProcess.category || 'POLITIK';
  const pubDate = itemToProcess.tanggal_tayang || itemToProcess.published_at || itemToProcess.created_at || new Date().toISOString();

  const jsonLdNewsArticle = {
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
    'dateModified': itemToProcess.updated_at || pubDate,
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

  return (
    <>
      <script
        id="newsarticle-jsonld-ssr"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdNewsArticle) }}
      />
      <App initialArticle={initialArticle} />
    </>
  );
}