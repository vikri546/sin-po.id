import { generateRssXml, fetchRawArticles } from '@/lib/rssGenerator';

export async function GET(
  req: Request,
  props: { params: Promise<{ slug?: string[] }> }
) {
  const params = await props.params;
  const slugArray = params?.slug || [];
  const articleId = slugArray[0];

  if (!articleId) {
    return new Response('Artikel tidak ditemukan', { status: 404 });
  }

  // Fetch article metadata for title and description
  const articles = await fetchRawArticles({ articleId });
  const article = articles[0];

  const title = article ? `${article.title || article.judul || 'Berita'} - SinPo.id` : 'SinPo.id - Detail Berita';
  const description = article
    ? article.summary || article.ringkasan || 'Detail berita terkini dari SinPo.id Matahari Indonesia.'
    : 'Detail berita terkini dari SinPo.id Matahari Indonesia.';

  const xml = await generateRssXml({
    title,
    description,
    feedUrl: `https://sinpo.id/detail/${slugArray.join('/')}/feed`,
    articleId,
    limit: 1,
  });

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}
