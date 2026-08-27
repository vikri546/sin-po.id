import { ApiResponse } from '@/types/api';
import { Article } from '@/types';
import { stripHtml } from './htmlRenderer';
import { formatRelativeDate } from './dateFormatter';

const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  // Default directly to SinPo Live REST API
  return 'https://api.sinpo.id/api';
};

const getApiToken = () => {
  return process.env.NEXT_PUBLIC_API_TOKEN || 'LMyrBrMUP8zpYV5d';
};

const getStorageBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_STORAGE_URL;
  if (envUrl && envUrl.trim() !== '') return envUrl;
  return 'https://sinpo.id/storage';
};

const API_BASE_URL = getApiBaseUrl();
const API_TOKEN = getApiToken();
const STORAGE_BASE_URL = getStorageBaseUrl();

export { API_BASE_URL, API_TOKEN, STORAGE_BASE_URL };

export interface FetchOptions extends RequestInit {
  token?: string;
  revalidate?: number | false;
}

/**
 * Core fetch wrapper for SinPo.id REST API
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { token = API_TOKEN, revalidate = 60, headers, ...customConfig } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
    requestHeaders['X-Api-Key'] = token;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  const fetchConfig: RequestInit = {
    ...customConfig,
    headers: requestHeaders,
  };

  if (revalidate !== undefined) {
    (fetchConfig as any).next = { revalidate };
  }

  const res = await fetch(url, fetchConfig);
  const data: ApiResponse<T> = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || `HTTP error! status: ${res.status}`);
  }

  return data;
}

/**
 * Format image URL from backend storage path
 */
export function getStorageUrl(path?: string | null): string {
  if (!path) return 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  let cleanPath = path.startsWith('/') ? path.substring(1) : path;
  if (cleanPath.startsWith('storage/') || cleanPath.startsWith('uploads/')) {
    return `https://sinpo.id/${cleanPath}`;
  }
  
  return `${STORAGE_BASE_URL}/${cleanPath}`;
}

/**
 * Transform SinPo API post item (legacy or new Laravel format) to Next.js Article interface
 */
export function transformLaravelPostToArticle(item: any): Article {
  if (!item) {
    return {
      id: 'laravel-0',
      title: 'Tanpa Judul',
      subtitle: '',
      summary: '',
      content: '',
      category: 'NASIONAL',
      imageUrl: getStorageUrl(null),
      date: '',
      author: 'Redaksi SinPo',
      readTime: '3 Menit Baca',
      tags: ['NASIONAL', 'SINPO MEDIA'],
      comments: [],
    };
  }

  const rawId = item.id || item.id_berita || 0;
  const title = stripHtml(item.judul || item.title || 'Tanpa Judul');
  
  // Category / Channel resolution
  const channelName = item.datachannel?.nama || item.kanal?.nama || item.channel?.name || '';
  const categoryNameRaw = item.datakategori?.nama || item.kategori?.nama || item.category?.name || channelName || 'NASIONAL';
  const categoryName = stripHtml(categoryNameRaw).toUpperCase() || 'NASIONAL';

  // Image resolution
  const rawImage = item.gambar_detail || item.gambar || item.image || item.cover || '';
  const imageUrl = getStorageUrl(rawImage);

  // Author resolution
  let authorName = 'Redaksi SinPo';
  if (item.datawartawan?.nama_wartawan) {
    authorName = stripHtml(item.datawartawan.nama_wartawan);
  } else if (item.penulis) {
    authorName = typeof item.penulis === 'object' ? stripHtml(item.penulis.nama || item.penulis.name || '') : stripHtml(item.penulis);
  } else if (item.author) {
    authorName = typeof item.author === 'object' ? stripHtml(item.author.name || item.author.nama || '') : stripHtml(item.author);
  } else if (item.wartawan) {
    authorName = typeof item.wartawan === 'object' ? stripHtml(item.wartawan.name || item.wartawan.nama_wartawan || '') : stripHtml(item.wartawan);
  }
  // Clean unicode non-breaking spaces if any
  authorName = authorName.replace(/\u00a0/g, ' ').trim();
  if (!authorName) authorName = 'Redaksi SinPo';

  // Summary & Content resolution
  const rawContent = item.isi || item.content || '';
  const rawSummary = item.ringkasan || item.excerpt || item.sub_judul || item.subtitle || '';
  const cleanSummary = stripHtml(rawSummary) || (rawContent ? stripHtml(rawContent).slice(0, 180) : '');

  // Tags resolution
  const rawTags = item.tag || item.tags || '';
  let tagsList: string[] = [];
  if (typeof rawTags === 'string') {
    tagsList = rawTags.split(',').map((t: string) => t.trim().toUpperCase()).filter(Boolean);
  } else if (Array.isArray(rawTags)) {
    tagsList = rawTags.map((t: any) => (typeof t === 'string' ? t.toUpperCase() : (t.name || '').toUpperCase())).filter(Boolean);
  }

  // Views resolution
  const viewsCount = typeof item.counter === 'number'
    ? item.counter
    : (typeof item.dilihat === 'number'
        ? item.dilihat
        : (typeof item.views === 'number'
            ? item.views
            : (parseInt(item.counter || item.dilihat || item.views || '0', 10) || 0)));

  const rawDate = item.tanggal_tayang || item.published_at || item.created_at || '';
  const captionText = stripHtml(item.caption || item.image_caption || item.caption_gambar || '');
  const isHero = Boolean(item.is_hero || item.is_headline || item.headline === '1' || item.headline === 1);

  return {
    id: `laravel-${rawId}`,
    slug: item.slug || '',
    title,
    subtitle: cleanSummary,
    summary: cleanSummary,
    content: rawContent,
    category: categoryName,
    imageUrl,
    date: formatRelativeDate(rawDate),
    author: authorName,
    readTime: '3 Menit Baca',
    tags: tagsList.length > 0 ? tagsList : [categoryName, 'SINPO MEDIA'],
    comments: [],
    isHero,
    isInvestigative: categoryName === 'BONGKAR',
    views: viewsCount,
    dilihat: viewsCount,
    caption: captionText,
  };
}
