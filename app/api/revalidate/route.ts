import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * On-Demand ISR Revalidation API for SinPo.id
 * 
 * Called by CMS (api.sinpo.id) webhook when an article is updated/takedown/published.
 * This forces Next.js to regenerate the SSR page with fresh OG meta tags.
 * 
 * Usage:
 *   POST /api/revalidate
 *   Body: { "articleId": "129394", "secret": "sinpo-revalidate-2026" }
 * 
 * Or via URL param:
 *   GET /api/revalidate?articleId=129394&secret=sinpo-revalidate-2026
 */

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || 'sinpo-revalidate-2026';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const articleId = searchParams.get('articleId');

  if (secret !== REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    if (articleId) {
      // Revalidate specific article detail page
      revalidatePath(`/detail/${articleId}`, 'page');
    }
    // Always revalidate the homepage (article listings)
    revalidatePath('/', 'page');

    return NextResponse.json({
      revalidated: true,
      articleId: articleId || 'all',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Revalidation failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, articleId } = body;

    if (secret !== REVALIDATE_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    if (articleId) {
      revalidatePath(`/detail/${articleId}`, 'page');
    }
    revalidatePath('/', 'page');

    return NextResponse.json({
      revalidated: true,
      articleId: articleId || 'all',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Revalidation failed' }, { status: 500 });
  }
}
