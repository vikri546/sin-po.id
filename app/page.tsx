import type { Metadata } from 'next';
import App from '../src/App';
import { transformLaravelPostToArticle, isTakedownArticle } from '@/lib/apiClient';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL('https://sinpo.id'),
    title: 'SinPo.id - Matahari Indonesia',
    description: 'Portal berita politik terpercaya yang mengulas berita politik nasional, hukum, ekonomi, peristiwa terkini, dan informasi aktual dari seluruh Indonesia secara tajam dan berimbang.',
    alternates: {
      canonical: 'https://sinpo.id',
    },
    openGraph: {
      title: 'SinPo.id - Matahari Indonesia',
      description: 'Portal berita politik terpercaya yang mengulas berita politik nasional, hukum, ekonomi, peristiwa terkini, dan informasi aktual dari Indonesia.',
      url: 'https://sinpo.id',
      siteName: 'SinPo.id',
      images: [
        {
          url: 'https://sinpo.id/sinpo-og-banner.png',
          secureUrl: 'https://sinpo.id/sinpo-og-banner.png',
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: 'SinPo.id - Matahari Indonesia',
        },
      ],
      locale: 'id_ID',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@sinpotv',
      creator: '@sinpotv',
      title: 'SinPo.id - Matahari Indonesia',
      description: 'Portal berita politik terpercaya yang mengulas berita politik nasional, hukum, ekonomi, peristiwa terkini, dan informasi aktual dari Indonesia.',
      images: [
        {
          url: 'https://sinpo.id/sinpo-og-banner.png',
          alt: 'SinPo.id - Matahari Indonesia',
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

async function fetchHomepageArticlesSSR() {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.sinpo.id/api';

    const [headlineRes, newsRes] = await Promise.all([
      fetch(`${API_BASE}/headline?limit=1`, { next: { revalidate: 60 } }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/berita?limit=100`, { next: { revalidate: 60 } }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    if (newsRes && newsRes.success && Array.isArray(newsRes.data)) {
      const rawNews = newsRes.data.filter((item: any) => item && !isTakedownArticle(item));
      let liveArticles = rawNews.map(transformLaravelPostToArticle).filter((a: any) => a && a.id && !isTakedownArticle(a));

      if (liveArticles.length > 0) {
        liveArticles.sort((a: any, b: any) => (b.publishedAtMs || 0) - (a.publishedAtMs || 0));

        let headlineArt: any = null;
        if (headlineRes && headlineRes.success && Array.isArray(headlineRes.data) && headlineRes.data.length > 0) {
          const cleanHeadlines = headlineRes.data.filter((item: any) => item && !isTakedownArticle(item));
          if (cleanHeadlines.length > 0) {
            const transformedHeadlines = cleanHeadlines.map(transformLaravelPostToArticle).filter((a: any) => a && a.id && !isTakedownArticle(a));
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
