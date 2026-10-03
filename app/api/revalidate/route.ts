import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { invalidateServerArticle } from '../../../src/lib/serverArticleCache';

/**
 * On-Demand Revalidation API for SinPo.id
 *
 * Called by CMS (api.sinpo.id) webhook when an article is updated / image changed /
 * takedown / published. It:
 *   1. Evicts the article from the shared server memory cache (so the next SSR
 *      request fetches fresh data incl. the new image & OG meta immediately)
 *   2. Revalidates Next.js route caches for the detail page and homepage
 *
 * Usage:
 *   POST /api/revalidate
 *   Headers: x-revalidate-secret: <secret>          (recommended)
 *   Body:    { "articleId": "129394" }               (secret may also be in body)
 *
 *   GET /api/revalidate?articleId=129394&secret=<secret>
 */

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || 'sinpo-revalidate-2026';

function runRevalidation(articleId?: string | number | null) {
  const evicted = invalidateServerArticle(articleId ?? null);
  if (articleId) {
    revalidatePath(`/detail/${articleId}`, 'page');
  }
  // Always revalidate the homepage (article listings)
  revalidatePath('/', 'page');

  return NextResponse.json({
    revalidated: true,
    articleId: articleId || 'all',
    evictedCacheEntries: evicted,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = request.headers.get('x-revalidate-secret') || searchParams.get('secret');
  const articleId = searchParams.get('articleId');

  if (secret !== REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    return runRevalidation(articleId);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Revalidation failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const secret = request.headers.get('x-revalidate-secret') || body?.secret;
    const articleId = body?.articleId ?? body?.id_berita ?? body?.id ?? null;

    if (secret !== REVALIDATE_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    return runRevalidation(articleId);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Revalidation failed' }, { status: 500 });
  }
}
