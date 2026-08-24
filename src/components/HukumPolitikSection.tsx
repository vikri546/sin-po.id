import React, { useMemo } from 'react';
import { Article } from '../types';
import Skeleton from './skeletons/Skeleton';

interface HukumPolitikSectionProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  isLoading?: boolean;
}

export default function HukumPolitikSection({ articles, onSelectArticle, isLoading = false }: HukumPolitikSectionProps) {
  if (isLoading) {
    return (
      <section className="mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[5px] p-6 transition-colors w-full animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Left Column: HUKUM */}
          <div className="flex flex-col">
            <div className="flex items-center border-b-2 border-brand-red-600 dark:border-brand-red-500 pb-2 mb-4">
              <Skeleton className="h-6 w-24 rounded-sm" />
            </div>
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-row gap-4 py-4">
                  <div className="relative w-20 h-16 md:w-28 md:h-20 shrink-0 overflow-hidden rounded-[3px]">
                    <Skeleton className="w-full h-full rounded-[3px]" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 justify-between py-0.5">
                    <Skeleton className="h-4 w-full rounded-sm" />
                    <Skeleton className="h-4 w-4/5 rounded-sm" />
                    <div className="flex items-center gap-x-1.5 mt-1">
                      <Skeleton className="h-3 w-20 rounded-xs" />
                      <Skeleton className="h-3 w-24 rounded-xs" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Right Column: POLITIK */}
          <div className="flex flex-col">
            <div className="flex items-center border-b-2 border-brand-red-600 dark:border-brand-red-500 pb-2 mb-4">
              <Skeleton className="h-6 w-24 rounded-sm" />
            </div>
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-row gap-4 py-4">
                  <div className="relative w-20 h-16 md:w-28 md:h-20 shrink-0 overflow-hidden rounded-[3px]">
                    <Skeleton className="w-full h-full rounded-[3px]" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 justify-between py-0.5">
                    <Skeleton className="h-4 w-full rounded-sm" />
                    <Skeleton className="h-4 w-4/5 rounded-sm" />
                    <div className="flex items-center gap-x-1.5 mt-1">
                      <Skeleton className="h-3 w-20 rounded-xs" />
                      <Skeleton className="h-3 w-24 rounded-xs" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }
  // Get 5 articles for HUKUM category
  const hukumArticles = useMemo(() => {
    return articles
      .filter((article) => article.category.toUpperCase() === 'HUKUM')
      .slice(0, 5);
  }, [articles]);

  // Get 5 articles for POLITIK category
  const politikArticles = useMemo(() => {
    return articles
      .filter((article) => article.category.toUpperCase() === 'POLITIK')
      .slice(0, 5);
  }, [articles]);

  return (
    <section className="mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[5px] p-6 transition-colors w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        
        {/* Left Column: HUKUM */}
        <div className="flex flex-col">
          <div className="flex items-center border-b-2 border-brand-red-600 dark:border-brand-red-500 pb-2 mb-4">
            <h3 className="font-sans text-lg md:text-xl font-black tracking-wider text-slate-900 dark:text-white uppercase">
              HUKUM
            </h3>
          </div>
          
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {hukumArticles.length > 0 ? (
              hukumArticles.map((article) => (
                <article
                  key={`hukum-${article.id}`}
                  onClick={() => onSelectArticle(article)}
                  className="group flex flex-row gap-4 py-4 cursor-pointer bg-transparent"
                >
                  {/* Image Left */}
                  <div className="relative w-20 h-16 md:w-28 md:h-20 shrink-0 overflow-hidden rounded-[3px] bg-slate-100 dark:bg-slate-800">
                    <img
                      src={article.imageUrl}
                      alt={article.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Title & Info Right */}
                  <div className="flex flex-col flex-1 min-w-0 justify-between py-0.5">
                    <h4 className="font-sans text-[11px] sm:text-xs md:text-sm font-bold leading-snug text-slate-900 dark:text-white group-hover:text-brand-red-600 dark:group-hover:text-brand-red-500 transition-colors">
                      {article.title}
                    </h4>
                    
                    <div className="flex flex-nowrap items-center gap-x-1.5 text-[9px] md:text-xs text-slate-500 dark:text-slate-400 font-sans mt-1 whitespace-nowrap overflow-hidden">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {article.author}
                      </span>
                      <span className="text-slate-200 dark:text-slate-800 font-normal shrink-0">•</span>
                      <span className="shrink-0">
                        {article.date}
                      </span>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm font-sans text-slate-400 dark:text-slate-500 py-4 italic">
                Belum ada berita Hukum saat ini.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: POLITIK */}
        <div className="flex flex-col">
          <div className="flex items-center border-b-2 border-brand-red-600 dark:border-brand-red-500 pb-2 mb-4">
            <h3 className="font-sans text-lg md:text-xl font-black tracking-wider text-slate-900 dark:text-white uppercase">
              POLITIK
            </h3>
          </div>

          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {politikArticles.length > 0 ? (
              politikArticles.map((article) => (
                <article
                  key={`politik-${article.id}`}
                  onClick={() => onSelectArticle(article)}
                  className="group flex flex-row gap-4 py-4 cursor-pointer bg-transparent"
                >
                  {/* Image Left */}
                  <div className="relative w-20 h-16 md:w-28 md:h-20 shrink-0 overflow-hidden rounded-[3px] bg-slate-100 dark:bg-slate-800">
                    <img
                      src={article.imageUrl}
                      alt={article.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Title & Info Right */}
                  <div className="flex flex-col flex-1 min-w-0 justify-between py-0.5">
                    <h4 className="font-sans text-[11px] sm:text-xs md:text-sm font-bold leading-snug text-slate-900 dark:text-white group-hover:text-brand-red-600 dark:group-hover:text-brand-red-500 transition-colors">
                      {article.title}
                    </h4>
                    
                    <div className="flex flex-nowrap items-center gap-x-1.5 text-[9px] md:text-xs text-slate-500 dark:text-slate-400 font-sans mt-1 whitespace-nowrap overflow-hidden">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {article.author}
                      </span>
                      <span className="text-slate-200 dark:text-slate-800 font-normal shrink-0">•</span>
                      <span className="shrink-0">
                        {article.date}
                      </span>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm font-sans text-slate-400 dark:text-slate-500 py-4 italic">
                Belum ada berita Politik saat ini.
              </p>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
