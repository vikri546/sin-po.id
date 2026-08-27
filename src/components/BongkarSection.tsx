import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Article } from '../types';
import Skeleton from './skeletons/Skeleton';

interface BongkarSectionProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  isLoading?: boolean;
}

export default function BongkarSection({ articles, onSelectArticle, isLoading = false }: BongkarSectionProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [visibleCount, setVisibleCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Reset count if articles list changes
  useEffect(() => {
    setVisibleCount(10);
    setIsLoadingMore(false);
  }, [articles]);

  const bongkarItem = useMemo(() => {
    if (!articles || articles.length === 0) return null;
    return articles.find(a => a.category.toUpperCase() === 'BONGKAR' || a.isInvestigative) || articles[0];
  }, [articles]);

  const sinpoDuluItem = useMemo(() => {
    if (!articles || articles.length === 0) return null;
    return articles.find(a => a.category.toUpperCase() === 'SIN PO DULU') || articles[1] || articles[0];
  }, [articles]);

  const allBeritaLainnya = useMemo(() => {
    if (articles.length > 7) {
      return articles.slice(7);
    }
    return [];
  }, [articles]);

  const displayArticles = useMemo(() => {
    return allBeritaLainnya.slice(0, visibleCount);
  }, [allBeritaLainnya, visibleCount]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => prev + 10);
      setIsLoadingMore(false);
    }, 600);
  };

  if (isLoading) {
    return (
      <div id="bongkar-section" className="mt-8 grid grid-cols-1 md:grid-cols-[350px_1fr] gap-8 items-start w-full animate-fade-in">
        {/* Left Column: BONGKAR BANNER Skeleton */}
        <div className="hidden md:flex w-full bg-slate-900 rounded-[5px] border-[3px] border-slate-700/40 p-5 flex-col gap-4 relative overflow-hidden" style={{ minHeight: '600px' }}>
          <div className="flex items-center justify-between border-b-2 border-slate-700/40 pb-2 mb-1">
            <Skeleton className="h-9 w-32 rounded-sm" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[3px]">
                <Skeleton className="w-full h-full rounded-[3px]" />
              </div>
              <Skeleton className="h-3 w-16 rounded-xs" />
              <Skeleton className="h-4 w-full rounded-sm" />
              <Skeleton className="h-4 w-4/5 rounded-sm" />
            </div>
            <div className="border-t border-slate-700/40 pt-3">
              <Skeleton className="h-7 w-32 rounded-sm mb-3" />
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[3px]">
                <Skeleton className="w-full h-full rounded-[3px]" />
              </div>
              <Skeleton className="h-4 w-full rounded-sm mt-2" />
              <Skeleton className="h-4 w-4/5 rounded-sm" />
            </div>
          </div>
        </div>

        {/* Right Column: BERITA LAINNYA Skeleton */}
        <div className="flex flex-col gap-1 w-full">
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
            <Skeleton className="h-6 w-40 md:w-48 rounded-sm" />
          </div>
          <div className="flex flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-row gap-4 py-4 border-b border-slate-200 dark:border-slate-800 last:border-b-0">
                <div className="relative w-28 h-20 md:w-44 md:h-28 shrink-0 overflow-hidden rounded-[5px]">
                  <Skeleton className="w-full h-full rounded-[5px]" />
                </div>
                <div className="flex flex-col flex-1 min-w-0 justify-between py-1">
                  <Skeleton className="h-3 w-16 rounded-xs" />
                  <Skeleton className="h-4 w-full rounded-sm" />
                  <Skeleton className="h-4 w-4/5 rounded-sm" />
                  <div className="flex items-center gap-x-1.5">
                    <Skeleton className="h-3 w-20 rounded-xs" />
                    <Skeleton className="h-3 w-24 rounded-xs" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="bongkar-section" className="mt-8 grid grid-cols-1 md:grid-cols-[350px_1fr] gap-8 items-start w-full">
      {/* Left Column: BONGKAR BANNER */}
      <div 
        className="hidden md:flex w-full md:sticky md:top-20 bg-slate-900 text-white rounded-[5px] border-[3px] border-brand-red-600 dark:border-brand-red-500 shadow-xl p-5 flex-col gap-4 relative overflow-hidden select-none"
        style={{ minHeight: '600px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-brand-red-600/40 pb-2 mb-1">
          <div className="flex flex-col">
            <h2 className="font-sans text-3xl font-extrabold tracking-tighter text-brand-red-600 dark:text-brand-red-500 mt-1 leading-none">
              BONGKAR
            </h2>
          </div>
          
          {/* Circle Refresh Button */}
          <button
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="w-8 h-8 rounded-full bg-brand-red-600 hover:bg-brand-red-700 text-white flex items-center justify-center cursor-pointer transition-all duration-300 hover:rotate-180 active:scale-90 shadow-md"
            title="Segarkan Tampilan"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Animated BONGKAR item */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`bongkar-${refreshKey}`}
            initial={{ scale: 0.93, opacity: 0, y: 12 }}
            animate={{ scale: [0.93, 1.03, 1], opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-4 justify-center"
          >
            {/* 1. BONGKAR Item */}
            {bongkarItem && (
              <div
                onClick={() => onSelectArticle(bongkarItem)}
                className="group cursor-pointer flex flex-col gap-2 transition-all duration-300 py-1"
              >
                {/* Landscape Image */}
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[3px]">
                  <img
                    src={bongkarItem.imageUrl}
                    alt={bongkarItem.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                </div>

                {/* Title Only */}
                <h4 className="font-sans text-xs md:text-sm font-bold text-slate-200 group-hover:text-brand-red-500 transition-colors leading-snug line-clamp-2">
                  {bongkarItem.title}
                </h4>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Static Title of SIN PO DULU */}
        <div className="flex items-center justify-between border-b-2 border-brand-red-600/40 pb-2 mt-4 mb-1">
          <div className="flex flex-col">
            <h2 className="font-sans text-3xl font-extrabold tracking-tighter text-brand-red-600 dark:text-brand-red-500 mt-1 leading-none">
              SIN PO DULU
            </h2>
          </div>
        </div>

        {/* Animated SIN PO DULU item */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`sinpodulu-${refreshKey}`}
            initial={{ scale: 0.93, opacity: 0, y: 12 }}
            animate={{ scale: [0.93, 1.03, 1], opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col gap-4 justify-center"
          >
            {/* 2. SIN PO DULU Item */}
            {sinpoDuluItem && (
              <div
                onClick={() => onSelectArticle(sinpoDuluItem)}
                className="group cursor-pointer flex flex-col gap-2 transition-all duration-300 py-1"
              >
                {/* Landscape Image */}
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[3px]">
                  <img
                    src={sinpoDuluItem.imageUrl}
                    alt={sinpoDuluItem.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                </div>

                {/* Title Only */}
                <h4 className="font-sans text-xs md:text-sm font-bold text-slate-200 group-hover:text-brand-red-500 transition-colors leading-snug line-clamp-2">
                  {sinpoDuluItem.title}
                </h4>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right Column: BERITA LAINNYA */}
      <div className="flex flex-col gap-1 w-full">
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
          <h3 className="font-sans text-lg md:text-xl font-black tracking-wider text-slate-900 dark:text-white uppercase">
            BERITA LAINNYA
          </h3>
        </div>
        <div className="flex flex-col">
          {displayArticles.map((article) => (
            <article
              key={`other-${article.id}`}
              onClick={() => onSelectArticle(article)}
              className="group flex flex-row gap-4 py-4 border-b border-slate-200 dark:border-slate-800 cursor-pointer bg-transparent last:border-b-0"
            >
              {/* Left Side: Image */}
              <div className="relative w-28 h-20 md:w-44 md:h-28 shrink-0 overflow-hidden rounded-[5px]">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Right Side: Category, Title, Author & Date */}
              <div className="flex flex-col flex-1 min-w-0 justify-between py-1">
                {/* Category */}
                <span className="text-[10px] md:text-xs font-sans font-black uppercase tracking-wider text-brand-red-600">
                  {article.category}
                </span>

                {/* Title */}
                <h4 className="font-sans text-xs sm:text-sm md:text-base font-bold leading-snug text-slate-900 dark:text-white group-hover:text-brand-red-600 transition-colors my-auto py-1">
                  {article.title}
                </h4>

                {/* Wartawan (Author) & Tanggal (Date) */}
                <div className="flex flex-nowrap items-center gap-x-1.5 text-[9px] md:text-xs text-slate-500 dark:text-slate-400 font-sans whitespace-nowrap overflow-hidden">
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
          ))}
        </div>

        {/* Muat Lebih Banyak Button */}
        <div className="mt-4 flex justify-center">
          {allBeritaLainnya.length > visibleCount && (
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
                Muat Lebih Banyak
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
