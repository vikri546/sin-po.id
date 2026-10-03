/**
 * Shared server-side article cache for SSR detail pages.
 *
 * Stored on `globalThis` so the detail page (app/detail) and the CMS webhook
 * route (app/api/revalidate) share the SAME Map instance inside one Node process.
 * Module-level Maps can be duplicated across Next.js route bundles/layers, which
 * would make webhook invalidation silently ineffective.
 *
 * Note: with PM2 cluster mode (multiple processes) each process has its own cache;
 * the short TTL bounds staleness for processes that did not receive the webhook.
 */

type CacheEntry = { data: any; timestamp: number };

const globalForCache = globalThis as unknown as {
  __sinpoServerArticleCache?: Map<string, CacheEntry>;
};

export const serverArticleCache: Map<string, CacheEntry> =
  globalForCache.__sinpoServerArticleCache ?? (globalForCache.__sinpoServerArticleCache = new Map());

// 10-minute TTL: dedupes generateMetadata + page render + social media crawler bursts,
// while CMS webhooks instantly evict edited/takedown articles.
export const SERVER_ARTICLE_CACHE_TTL_MS = 10 * 60 * 1000;

/** Remove every cache key belonging to an article (numeric id or slug variants). */
export function invalidateServerArticle(articleIdOrSlug?: string | number | null): number {
  if (articleIdOrSlug === undefined || articleIdOrSlug === null || articleIdOrSlug === '') {
    const size = serverArticleCache.size;
    serverArticleCache.clear();
    return size;
  }
  const raw = String(articleIdOrSlug).trim();
  const numeric = raw.match(/\d+/)?.[0] || '';
  let removed = 0;
  for (const key of Array.from(serverArticleCache.keys())) {
    const keyNumeric = key.match(/\d+/)?.[0] || '';
    if (key === raw || (numeric && keyNumeric === numeric)) {
      serverArticleCache.delete(key);
      removed++;
    }
  }
  return removed;
}
