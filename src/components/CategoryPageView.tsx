import React, { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Article } from '../types';
import Skeleton from './skeletons/Skeleton';
import { stripHtml } from '../lib/htmlRenderer';
import { parseAnyDate } from '../lib/dateFormatter';

interface CategoryPageViewProps {
  category: string;
  articles: Article[];
  allCategoryArticles?: Article[];
  onSelectArticle: (article: Article) => void;
  isLoading?: boolean;
  onLoadMoreRemote?: () => Promise<void>;
  hasMoreRemote?: boolean;
}

export default function CategoryPageView({ 
  category, 
  articles, 
  allCategoryArticles, 
  onSelectArticle, 
  isLoading = false,
  onLoadMoreRemote,
  hasMoreRemote = true
}: CategoryPageViewProps) {
  const [visibleCount, setVisibleCount] = useState<number>(10);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Reset count whenever category prop changes
  useEffect(() => {
    setVisibleCount(10);
    setIsLoadingMore(false);
  }, [category]);

  // Sort articles strictly newest to oldest using high-precision publishedAtMs
  const sortedArticles = useMemo(() => {
    if (!articles || articles.length === 0) return [];
    return [...articles].sort((a, b) => (b.publishedAtMs || parseAnyDate(b.date).getTime()) - (a.publishedAtMs || parseAnyDate(a.date).getTime()));
  }, [articles]);

  const finalAllArticles = useMemo(() => {
    const pool = allCategoryArticles || articles;
    if (!pool || pool.length === 0) return [];
    return [...pool].sort((a, b) => (b.publishedAtMs || parseAnyDate(b.date).getTime()) - (a.publishedAtMs || parseAnyDate(a.date).getTime()));
  }, [allCategoryArticles, articles]);

  // Display category articles strictly newest first:
  // Column 1: Featured Image (#1 in body = Article #6 overall)
  const col1Article = sortedArticles[0] || null;
  
  // Column 2: List (#2 to #5 in body = Articles #7 to #10 overall)
  const col2Articles = sortedArticles.length > 1 
    ? sortedArticles.slice(1, 5) 
    : [];

  // Track article IDs rendered in the top 3-column section
  const topSectionArticleIds = useMemo(() => {
    const ids = new Set<string>();
    if (col1Article) ids.add(col1Article.id);
    col2Articles.forEach((art) => ids.add(art.id));
    return ids;
  }, [col1Article, col2Articles]);

  // Get maximum 5 latest articles of the category for the "Berita Terkini" sidebar ("tetapkan berita terkini")
  const latestNews = finalAllArticles.slice(0, 5);

  // Exclude top 3-column section articles so they NEVER repeat in "Berita Lainnya"
  const beritaLainnyaPool = useMemo(() => {
    return sortedArticles.filter((art) => !topSectionArticleIds.has(art.id));
  }, [sortedArticles, topSectionArticleIds]);

  // Paginated "Berita Lainnya" list (sliced to visibleCount)
  const displayedBeritaLainnya = beritaLainnyaPool.slice(0, visibleCount);

  if (isLoading || !articles || articles.length === 0) {
    return (
      <div className="w-full mt-2 animate-fade-in flex flex-col gap-8">
        {/* Top 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Column 1: Featured Image + Author/Date + Title */}
          <div className="flex flex-col gap-3">
            <div className="relative w-full h-[280px] sm:h-[320px] overflow-hidden rounded-[5px]">
              <Skeleton className="w-full h-full rounded-[5px]" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-24 rounded-xs" />
              <Skeleton className="h-3 w-28 rounded-xs" />
            </div>
            <Skeleton className="h-5 w-full rounded-sm" />
            <Skeleton className="h-5 w-4/5 rounded-sm" />
          </div>

          {/* Column 2: List with small square images */}
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800/40 last:border-0 last:pb-0">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 overflow-hidden rounded-[5px]">
                  <Skeleton className="w-full h-full rounded-[5px]" />
                </div>
                <div className="flex flex-col flex-1 gap-1.5">
                  <Skeleton className="h-4 w-full rounded-sm" />
                  <Skeleton className="h-4 w-5/6 rounded-sm" />
                  <div className="flex items-center gap-1.5 mt-auto">
                    <Skeleton className="h-3 w-16 rounded-xs" />
                    <Skeleton className="h-3 w-20 rounded-xs" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Column 3: ADS Placeholder */}
          <div className="flex flex-col gap-4 h-full">
            <div className="w-full h-[280px] sm:h-[320px] md:h-full min-h-[280px] flex items-center justify-center bg-slate-50 dark:bg-slate-900/40 rounded-[5px] border border-slate-300 dark:border-slate-800">
              <Skeleton className="h-4 w-10 rounded-xs" />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-full border-t border-slate-200/60 dark:border-slate-800/40" />

        {/* Bottom 2-Column Grid: Berita Lainnya + Berita Terkini sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Berita Lainnya (lg:col-span-2) */}
          <div className="lg:col-span-2 flex flex-col gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-4 border-b border-slate-100 dark:border-slate-800/40 last:border-0 items-center">
                <div className="relative w-24 h-16 sm:w-28 sm:h-20 shrink-0 overflow-hidden rounded-[5px]">
                  <Skeleton className="w-full h-full rounded-[5px]" />
                </div>
                <div className="flex flex-col flex-1 gap-1.5">
                  <Skeleton className="h-4 w-full rounded-sm" />
                  <Skeleton className="h-4 w-4/5 rounded-sm" />
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-3 w-16 rounded-xs" />
                    <Skeleton className="h-3 w-20 rounded-xs" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Berita Terkini sidebar (lg:col-span-1) */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
              <Skeleton className="h-5 w-32 rounded-sm" />
            </div>
            <div className="flex flex-col gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col py-3.5 border-b border-slate-100 dark:border-slate-900/40 last:border-0">
                  <Skeleton className="h-3 w-20 rounded-xs" />
                  <Skeleton className="h-4 w-full rounded-sm mt-2" />
                  <Skeleton className="h-4 w-4/5 rounded-sm" />
                  <Skeleton className="h-3 w-24 rounded-xs mt-1.5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleLoadMore = async () => {
    setIsLoadingMore(true);

    // If local pool already has unshown articles, reveal them immediately!
    if (visibleCount < beritaLainnyaPool.length) {
      const newVisible = visibleCount + 10;
      setVisibleCount(newVisible);
      setIsLoadingMore(false);

      // If running low on local pool articles, prefetch remote items in background (fire & forget)
      if (newVisible + 5 >= beritaLainnyaPool.length && onLoadMoreRemote && hasMoreRemote !== false) {
        onLoadMoreRemote().catch(() => {});
      }
      return;
    }

    // Otherwise, fetch remote page
    if (onLoadMoreRemote && hasMoreRemote !== false) {
      try {
        await onLoadMoreRemote();
      } catch (err) {
        console.log('Remote category load notice:', err);
      }
    }

    setVisibleCount(prev => prev + 10);
    setIsLoadingMore(false);
  };

  return (
    <div className="w-full mt-2 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* COLUMN 1: Portrait Featured News (aligned height with column 2 list, no zoom, no shadow) */}
        <div className="flex flex-col gap-4">
          {col1Article && (
            <a 
              href={`?article=${encodeURIComponent(col1Article.slug || col1Article.id)}`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                onSelectArticle(col1Article);
              }}
              className="flex flex-col gap-3 group cursor-pointer h-full justify-between"
            >
              <div className="relative w-full h-[280px] sm:h-[320px] md:h-[280px] lg:h-[320px] xl:h-[340px] overflow-hidden rounded-[5px] bg-slate-100 dark:bg-slate-900">
                <img 
                  src={col1Article.imageUrl} 
                  alt={col1Article.title} 
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.src = 'https://placehold.co/800x600/1e293b/ffffff?text=SinPo+Media'; }}
                  className="h-full w-full object-cover rounded-[5px]" 
                />
              </div>
              <div className="flex flex-col gap-2 text-left">
                <div className="flex justify-between items-center w-full text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-sans">
                  <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{col1Article.author}</span>
                  <span>{col1Article.date}</span>
                </div>
                <h4 className="font-sans text-sm md:text-base lg:text-lg font-bold text-slate-900 dark:text-white leading-snug group-hover:text-brand-red-600 dark:group-hover:text-red-500 transition-colors">
                  {col1Article.title}
                </h4>
                <p className="font-sans text-xs md:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mt-0.5">
                  {stripHtml(col1Article.summary || col1Article.subtitle || col1Article.content) || `Simak ulasan lengkap dan kabar berita terkini mengenai ${col1Article.title} selengkapnya di SinPo.id.`}
                </p>
              </div>
            </a>
          )}
        </div>

        {/* COLUMN 2: List of Articles (small 1:1 image on left, metadata + title on right, max 4 items) */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            {col2Articles.length === 0 ? (
              <p className="text-xs text-slate-400 font-sans italic">Tidak ada rekomendasi tambahan.</p>
            ) : (
              col2Articles.map((art) => (
                <a 
                  key={art.id} 
                  href={`?article=${encodeURIComponent(art.slug || art.id)}`}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    onSelectArticle(art);
                  }}
                  className="flex items-start gap-3 cursor-pointer group pb-3.5 border-b border-slate-100 dark:border-slate-800/40 last:border-0 last:pb-0"
                >
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 overflow-hidden rounded-[5px] bg-slate-100 dark:bg-slate-900">
                    <img 
                      src={art.imageUrl} 
                      alt={art.title} 
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x300/1e293b/ffffff?text=SinPo'; }}
                      className="h-full w-full object-cover rounded-[5px]" 
                    />
                  </div>
                  <div className="flex flex-col justify-between h-16 sm:h-20 min-w-0 flex-1 text-left">
                    <h5 className="font-sans text-xs md:text-[13px] font-bold text-slate-900 dark:text-white leading-snug line-clamp-3 group-hover:text-brand-red-600 dark:group-hover:text-red-500 transition-colors py-0.5">
                      {art.title}
                    </h5>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500 dark:text-slate-400 font-sans">
                      <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                        {art.author}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span>
                        {art.date}
                      </span>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: Portrait Advertisement (clean, extremely minimalist with just "ADS") */}
        <div className="flex flex-col gap-4 h-full">
          <div className="w-full h-[280px] sm:h-[320px] md:h-full min-h-[280px] flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/40 rounded-[5px] border border-slate-300 dark:border-slate-800 relative overflow-hidden select-none">
            <span className="font-sans text-xs font-bold tracking-widest text-slate-400 dark:text-slate-600 uppercase">
              ADS
            </span>
          </div>
        </div>

      </div>

      {/* Horizontal Divider */}
      {finalAllArticles.length > 0 && (
        <>
          <div className="w-full border-t border-slate-200/60 dark:border-slate-800/40 my-8" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* COLUMN 1: Berita Lainnya List (lg:col-span-2) */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                {displayedBeritaLainnya.map((art) => (
                  <a
                    key={art.id}
                    href={`?article=${encodeURIComponent(art.slug || art.id)}`}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                      e.preventDefault();
                      onSelectArticle(art);
                    }}
                    className="group flex gap-4 py-4 border-b border-slate-100 dark:border-slate-800/40 last:border-0 cursor-pointer text-left items-center"
                  >
                    {/* Thumbnail Image */}
                    <div className="relative w-24 h-16 sm:w-28 sm:h-20 shrink-0 overflow-hidden rounded-[5px] bg-slate-100 dark:bg-slate-900">
                      <img
                        src={art.imageUrl}
                        alt={art.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x300/1e293b/ffffff?text=SinPo'; }}
                        className="h-full w-full object-cover rounded-[5px]"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex flex-col justify-between h-16 sm:h-20 min-w-0 flex-1">
                      <h4 className="font-sans text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-3 group-hover:text-brand-red-600 dark:group-hover:text-red-500 transition-colors py-0.5">
                        {art.title}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-500 dark:text-slate-400 font-sans">
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                          {art.author}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span>
                          {art.date}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {/* LIHAT LEBIH BANYAK Button */}
              <div className="mt-6 flex justify-center pb-8">
                {visibleCount < beritaLainnyaPool.length || hasMoreRemote !== false ? (
                  isLoadingMore ? (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-sans text-xs font-bold uppercase tracking-wider py-2">
                      <Loader2 className="h-4.5 w-4.5 animate-spin text-brand-red-600 dark:text-red-500" />
                      <span>Memuat berita...</span>
                    </div>
                  ) : (
                    <button 
                      onClick={handleLoadMore}
                      className="px-6 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-white hover:bg-brand-red-600 dark:hover:bg-red-600 hover:border-brand-red-600 dark:hover:border-red-600 rounded-[5px] text-xs font-sans font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 shadow-sm"
                    >
                      Lihat Lebih Banyak
                    </button>
                  )
                ) : (
                  finalAllArticles.length > 0 && (
                    <p className="text-[11px] font-sans font-medium text-slate-400 dark:text-slate-500 py-2 italic">
                      Telah menampilkan seluruh berita kategori ini.
                    </p>
                  )
                )}
              </div>
            </div>

            {/* COLUMN 2: Berita Terkini List (lg:col-span-1, sticky, transparent) */}
            <div className="lg:col-span-1 lg:sticky lg:top-24 flex flex-col gap-4 text-left">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
                <h3 className="font-sans text-sm md:text-base font-black uppercase tracking-wider text-slate-900 dark:text-white relative inline-block">
                  Berita Terkini
                  <span className="absolute left-0 bottom-[-8px] w-8 h-[2.5px] bg-brand-red-600 dark:bg-red-500"></span>
                </h3>
              </div>
              
              <div className="flex flex-col gap-1">
                {latestNews.map((art) => (
                  <a
                    key={art.id}
                    href={`?article=${encodeURIComponent(art.slug || art.id)}`}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                      e.preventDefault();
                      onSelectArticle(art);
                    }}
                    className="group flex flex-col py-3.5 border-b border-slate-100 dark:border-slate-900/40 last:border-0 cursor-pointer text-left"
                  >
                    <span className="font-sans text-[9px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider leading-none">
                      {art.author}
                    </span>
                    <h4 className="font-sans text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white leading-snug group-hover:text-brand-red-600 dark:group-hover:text-red-500 transition-colors mt-2 mb-1.5 line-clamp-3">
                      {art.title}
                    </h4>
                    <span className="font-sans text-[9px] text-slate-400 dark:text-slate-500 font-normal leading-none">
                      {art.date}
                    </span>
                  </a>
                ))}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
