import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { invalidateServerArticle, markTakedown, unmarkTakedown } from '../../../src/lib/serverArticleCache';
import { timingSafeEqual } from 'crypto';

/**
 * On-Demand Revalidation API for SinPo.id
 *
 * Called by CMS (api.sinpo.id) webhook when an article is updated / image changed /
 * takedown / published. It:
 *   1. Marks runtime takedown / untakedown status
 *   2. Evicts the article from the shared server memory cache
 *   3. Revalidates Next.js tag cache & route caches for detail page and homepage
 *
 * Usage:
 *   POST /api/revalidate
 *   Headers: x-revalidate-secret: <secret>
 *   Body:    { "articleId": "129394", "action": "delete" }
 *
 *   GET /api/revalidate?articleId=129394&action=delete&secret=<secret>
 */

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || 'sinpo-revalidate-2026';

function validSecret(s?: string | null) {
  if (!s) return false;
  const a = Buffer.from(s);
  const b = Buffer.from(REVALIDATE_SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

function runRevalidation(articleId?: string | number | null, action: string = 'update') {
  const evicted = invalidateServerArticle(articleId ?? null);

  if (articleId) {
    const rawStr = String(articleId).trim();
    const cleanId = rawStr.match(/\d+/)?.[0] || rawStr;

    if (['delete', 'deleted', 'takedown', 'unpublish', 'unpublished', 'draft', 'drafted'].includes(action)) {
      markTakedown(cleanId);          // tombstone (draft / takedown)
      if (rawStr !== cleanId) markTakedown(rawStr);
      // Path dinamis hanya dibuang saat aksi delete/takedown untuk menghemat server render
      revalidatePath('/detail/[...slug]', 'page');
    } else if (['publish', 'published', 'update', 'updated'].includes(action)) {
      unmarkTakedown(cleanId);        // publish ulang (bukan draft lagi)
      if (rawStr !== cleanId) unmarkTakedown(rawStr);
    }

    revalidateTag(`article-${cleanId}`);
    if (rawStr !== cleanId) {
      revalidateTag(`article-${rawStr}`);
    }
  }

  revalidatePath('/', 'page');                         // beranda
  revalidatePath('/', 'layout');                       // kanal/list ikut segar

  return NextResponse.json({
    revalidated: true,
    articleId: articleId || 'all',
    action,
    evictedCacheEntries: evicted,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = request.headers.get('x-revalidate-secret') || searchParams.get('secret');
  const articleId = searchParams.get('articleId');
  const action = String(searchParams.get('action') || searchParams.get('event') || 'update').toLowerCase();

  if (!validSecret(secret)) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    return runRevalidation(articleId, action);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Revalidation failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const secret = request.headers.get('x-revalidate-secret') || body?.secret;
    const articleId = body?.articleId ?? body?.id_berita ?? body?.id ?? null;
    const action = String(body?.action ?? body?.event ?? 'update').toLowerCase();

    if (!validSecret(secret)) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    return runRevalidation(articleId, action);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Revalidation failed' }, { status: 500 });
  }
}
