import App from '../src/App';
import { transformLaravelPostToArticle } from '@/lib/apiClient';

export const revalidate = 60;

async function fetchHomepageArticlesSSR() {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.sinpo.id/api';

    const [headlineRes, newsRes] = await Promise.all([
      fetch(`${API_BASE}/headline?limit=1`, { next: { revalidate: 60 } }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/berita?limit=100`, { next: { revalidate: 60 } }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    if (newsRes && newsRes.success && Array.isArray(newsRes.data)) {
      const rawNews = newsRes.data.filter((item: any) => item && item.status !== 0 && item.status !== '0');
      let liveArticles = rawNews.map(transformLaravelPostToArticle).filter((a: any) => a && a.id);

      if (liveArticles.length > 0) {
        liveArticles.sort((a: any, b: any) => (b.publishedAtMs || 0) - (a.publishedAtMs || 0));

        let headlineArt: any = null;
        if (headlineRes && headlineRes.success && Array.isArray(headlineRes.data) && headlineRes.data.length > 0) {
          const cleanHeadlines = headlineRes.data.filter((item: any) => item && item.status !== 0 && item.status !== '0');
          if (cleanHeadlines.length > 0) {
            const transformedHeadlines = cleanHeadlines.map(transformLaravelPostToArticle);
            if (transformedHeadlines.length > 0) {
              headlineArt = transformedHeadlines[0];
            }
          }
        }

        if (!headlineArt) {
          headlineArt = liveArticles.find((a: any) => a.isHeadline || a.headline === '1' || a.headline === 1) || liveArticles[0];
        }

        if (headlineArt) {
          const remaining = liveArticles.filter((a: any) => a.id !== headlineArt.id);
          return [{ ...headlineArt, isHero: true }, ...remaining.map((a: any) => ({ ...a, isHero: false }))];
        }

        return liveArticles;
      }
    }
  } catch (err) {
    console.log('Homepage SSR fetch notice:', err);
  }
  return [];
}

export default async function Page() {
  const initialMasterArticles = await fetchHomepageArticlesSSR();
  return <App initialMasterArticles={initialMasterArticles} />;
}
