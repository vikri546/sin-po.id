import { Article } from '@/types';

/**
 * Creates a clean URL-friendly slug from string
 */
export function createSlug(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with single hyphen
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
}

/**
 * Extracts pure numeric ID from article ID (e.g. 'laravel-127287' -> '127287')
 */
export function getNumericId(id: string | number): string {
  if (!id) return '';
  const strId = String(id).trim();
  const match = strId.match(/\d+/);
  return match ? match[0] : strId;
}

/**
 * Returns article slug or generates one from title
 */
export function getArticleSlug(article: Article): string {
  if (article.slug && article.slug.trim()) {
    return article.slug.trim();
  }
  return createSlug(article.title || '');
}

/**
 * Generates official clean article detail URL: /detail/[id]/[slug]
 * Example: /detail/127287/850-buruh-tekstil-kendal-khawatir-phk-pemerintah-janji-cari-solusi
 */
export function getArticleUrl(article: Article): string {
  if (!article) return '/';
  const numericId = getNumericId(article.id);
  const slug = getArticleSlug(article);
  if (!slug) {
    return `/detail/${numericId}`;
  }
  return `/detail/${numericId}/${slug}`;
}
