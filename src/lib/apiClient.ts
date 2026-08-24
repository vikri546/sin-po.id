import { ApiResponse } from '@/types/api';
import { Article } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const STORAGE_BASE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || 'http://localhost:8000/storage';

export { API_BASE_URL, STORAGE_BASE_URL };

export interface FetchOptions extends RequestInit {
  token?: string;
  revalidate?: number | false;
}

/**
 * Core fetch wrapper for SinPo.id Laravel REST API
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { token, revalidate = 60, headers, ...customConfig } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  const fetchConfig: RequestInit = {
    ...customConfig,
    headers: requestHeaders,
  };

  // Configure Next.js caching / ISR if specified
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
export function getStorageUrl(path?: string): string {
  if (!path) return '/images/placeholder.jpg';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${STORAGE_BASE_URL}${cleanPath}`;
}

/**
 * Transform Laravel API post item to Next.js Article interface
 */
export function transformLaravelPostToArticle(item: any): Article {
  const title = item.judul || item.title || 'Tanpa Judul';
  const categoryName = (item.kategori?.nama || item.category?.name || 'NASIONAL').toUpperCase();
  const rawImage = item.gambar || item.image || '';
  const imageUrl = getStorageUrl(rawImage);
  const authorName = item.penulis?.nama || item.author?.name || 'Redaksi Sinpo';
  const summaryText = item.ringkasan || item.excerpt || item.subtitle || '';
  
  const rawTags = item.tag || item.tags || '';
  const tagsList = typeof rawTags === 'string' 
    ? rawTags.split(',').map((t: string) => t.trim().toUpperCase()).filter(Boolean)
    : (Array.isArray(rawTags) ? rawTags.map((t: any) => (t.name || t).toUpperCase()) : []);

  return {
    id: `laravel-${item.id}`,
    title,
    subtitle: summaryText,
    summary: summaryText,
    content: item.isi || item.content || summaryText,
    category: categoryName,
    imageUrl: imageUrl.includes('/storage/') && !rawImage ? 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80' : imageUrl,
    date: item.tanggal_tayang || item.published_at || 'Terbaru',
    author: authorName,
    readTime: '3 Menit Baca',
    tags: tagsList.length > 0 ? tagsList : [categoryName, 'SINPO MEDIA'],
    comments: [],
    isHero: item.is_hero || false,
    isInvestigative: categoryName === 'BONGKAR',
  };
}
