import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Article } from '../types';
import Skeleton from './skeletons/Skeleton';
import { apiFetch, transformLaravelPostToArticle } from '../lib/apiClient';
import { getArticleUrl } from '@/lib/urlHelpers';

interface SidebarProps {
  onSelectPopular: (popularId: string) => void;
  hideExtraWidgets?: boolean;
  variant?: 'home' | 'detail';
  showSearchBanners?: boolean;
  articles?: Article[];
  popularArticles?: Article[];
  onSelectArticle?: (article: Article) => void;
  isLoading?: boolean;
}

export default function Sidebar({ 
  onSelectPopular, 
  variant = 'home',
  showSearchBanners = false,
  articles = [],
  popularArticles = [],
  onSelectArticle,
  isLoading = false
}: SidebarProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [fetchedPopular, setFetchedPopular] = useState<Article[]>([]);

  useEffect(() => {
    if (!popularArticles || popularArticles.length === 0) {
      async function fetchPopularData() {
        try {
          const res = await apiFetch('/populer');
          if (res.success && Array.isArray(res.data)) {
            setFetchedPopular(res.data.map(transformLaravelPostToArticle));
          }
        } catch (e) {
          // offline fallback
        }
      }
      fetchPopularData();
    }
  }, [popularArticles]);

  if (isLoading) {
    return (
      <aside className="flex flex-col gap-8 w-full animate-fade-in">
        {/* BONGKAR Banner Skeleton (hidden on mobile, dark bg) */}
        {showSearchBanners && (
          <div className="hidden md:flex w-full bg-slate-900 rounded-[5px] border-[3px] border-slate-700/40 p-5 flex-col gap-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-slate-700/40 pb-2 mb-1">
              <Skeleton className="h-8 w-28 rounded-sm" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="flex flex-col gap-3">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[3px]">
                <Skeleton className="w-full h-full rounded-[3px]" />
              </div>
              <Skeleton className="h-3 w-16 rounded-xs" />
              <Skeleton className="h-4 w-full rounded-sm" />
              <Skeleton className="h-4 w-4/5 rounded-sm" />
            </div>
          </div>
        )}

        {/* SIN PO DULU Banner Skeleton (hidden on mobile) */}
        {showSearchBanners && (
          <div className="hidden md:flex w-full bg-slate-900 rounded-[5px] border-[3px] border-slate-700/40 p-5 flex-col gap-4 relative overflow-hidden">
            <div className="flex items-center border-b-2 border-slate-700/40 pb-2 mb-1">
              <Skeleton className="h-7 w-32 rounded-sm" />
            </div>
            <div className="flex flex-col gap-3">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[3px]">
                <Skeleton className="w-full h-full rounded-[3px]" />
              </div>
              <Skeleton className="h-4 w-full rounded-sm" />
            </div>
          </div>
        )}

        {/* BERITA TERPOPULER Section Skeleton */}
        <section className="hidden md:block bg-white dark:bg-slate-950 p-6 rounded-[5px] border border-slate-200 dark:border-slate-800">
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
            <Skeleton className="h-6 w-44 rounded-sm" />
          </div>
          <div className="flex flex-col gap-4">
            {/* Home variant: numbered list */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-start pb-3 border-b border-slate-100 dark:border-slate-900/50 last:border-b-0 last:pb-0">
                {/* Number */}
                <Skeleton className="w-9 md:w-11 h-9 rounded-xs shrink-0" />
                {/* Content */}
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <Skeleton className="h-3 w-16 rounded-xs" />
                  <Skeleton className="h-4 w-full rounded-sm" />
                  <Skeleton className="h-4 w-4/5 rounded-sm" />
                  <Skeleton className="h-3 w-24 rounded-xs" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </aside>
    );
  }

  return (
    <aside id="editorial-sidebar" className="flex flex-col gap-8">

      {showSearchBanners && (
        <div 
          className="hidden md:flex w-full bg-slate-900 text-white rounded-[5px] border-[3px] border-brand-red-600 dark:border-brand-red-500 shadow-xl p-5 flex-col gap-4 relative overflow-hidden select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-brand-red-600/40 pb-2 mb-1">
            <div className="flex flex-col">
              <h2 className="font-sans text-2xl font-extrabold tracking-tighter text-brand-red-600 dark:text-brand-red-500 mt-1 leading-none">
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
              key={`bongkar-search-${refreshKey}`}
              initial={{ scale: 0.93, opacity: 0, y: 12 }}
              animate={{ scale: [0.93, 1.03, 1], opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-4 justify-center"
            >
              {(() => {
                const bongkarArticle = articles.find(a => a.category.toUpperCase() === 'BONGKAR' || a.isInvestigative) || articles[0];
                if (!bongkarArticle) return null;
                return (
                  <a
                    href={getArticleUrl(bongkarArticle)}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                      e.preventDefault();
                      onSelectArticle?.(bongkarArticle);
                    }}
                    className="group cursor-pointer flex flex-col gap-2 transition-all duration-300 py-1"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[3px]">
                      <img
                        src={bongkarArticle.imageUrl}
                        alt={bongkarArticle.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                    </div>
                    <h4 className="font-sans text-xs md:text-sm font-bold text-slate-200 group-hover:text-brand-red-500 transition-colors leading-snug line-clamp-2">
                      {bongkarArticle.title}
                    </h4>
                  </a>
                );
              })()}
            </motion.div>
          </AnimatePresence>

          {/* Static Title of SIN PO DULU */}
          <div className="flex items-center justify-between border-b-2 border-brand-red-600/40 pb-2 mt-4 mb-1">
            <div className="flex flex-col">
              <h2 className="font-sans text-2xl font-extrabold tracking-tighter text-brand-red-600 dark:text-brand-red-500 mt-1 leading-none">
                SIN PO DULU
              </h2>
            </div>
          </div>

          {/* Animated SIN PO DULU item */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`sinpodulu-search-${refreshKey}`}
              initial={{ scale: 0.93, opacity: 0, y: 12 }}
              animate={{ scale: [0.93, 1.03, 1], opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-4 justify-center"
            >
              {(() => {
                const sinpoDuluArticle = articles.find(a => a.category.toUpperCase() === 'SIN PO DULU') || articles[1] || articles[0];
                if (!sinpoDuluArticle) return null;
                return (
                  <a
                    href={getArticleUrl(sinpoDuluArticle)}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                      e.preventDefault();
                      onSelectArticle?.(sinpoDuluArticle);
                    }}
                    className="group cursor-pointer flex flex-col gap-2 transition-all duration-300 py-1"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[3px]">
                      <img
                        src={sinpoDuluArticle.imageUrl}
                        alt={sinpoDuluArticle.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                    </div>
                    <h4 className="font-sans text-xs md:text-sm font-bold text-slate-200 group-hover:text-brand-red-500 transition-colors leading-snug line-clamp-2">
                      {sinpoDuluArticle.title}
                    </h4>
                  </a>
                );
              })()}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* 1. TERPOPULER (Most Popular List) */}
      <section id="sidebar-popular-news" className="hidden md:block bg-white dark:bg-slate-950 p-6 rounded-[5px] border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
          <h3 className="font-sans text-lg md:text-xl font-black tracking-wider text-slate-900 dark:text-white uppercase">
            BERITA TERPOPULER
          </h3>
        </div>

        <div className="flex flex-col gap-4">
          {(() => {
            const rawList = (popularArticles && popularArticles.length > 0)
              ? popularArticles
              : (fetchedPopular.length > 0)
              ? fetchedPopular
              : (articles && articles.length > 0)
              ? articles
              : [];
            const listToRender = rawList.slice(0, 5);

            if (listToRender.length === 0) {
              return (
                <p className="text-xs text-slate-400 font-sans italic py-2">
                  Belum ada berita terpopuler.
                </p>
              );
            }

            return listToRender.map((pop, index) => {
              const numStr = String(index + 1).padStart(2, '0');
              const imageUrl = pop.imageUrl || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80";
              const targetUrl = getArticleUrl(pop);

              const handleClick = (e: React.MouseEvent) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                if (onSelectArticle) {
                  onSelectArticle(pop);
                } else {
                  onSelectPopular(pop.id);
                }
              };

              if (variant === 'detail') {
                if (index === 0) {
                  return (
                    <a
                      key={pop.id}
                      href={targetUrl}
                      onClick={handleClick}
                      className="group cursor-pointer flex flex-col gap-2.5 border-b border-slate-100 dark:border-slate-900/50 pb-4"
                    >
                      <div className="w-full aspect-[16/9] overflow-hidden rounded-[5px] bg-slate-100 dark:bg-slate-900">
                        <img
                          src={imageUrl}
                          alt={pop.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <h4 className="font-sans text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-brand-red-600 transition-colors">
                          {pop.title}
                        </h4>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-sans text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                            {pop.category}
                          </span>
                          <span className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                            {pop.date}
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                }

                return (
                  <a
                    key={pop.id}
                    href={targetUrl}
                    onClick={handleClick}
                    className="flex gap-3 items-center group cursor-pointer border-b border-slate-100 dark:border-slate-900/50 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="w-16 h-16 shrink-0 aspect-square overflow-hidden rounded-[5px] bg-slate-100 dark:bg-slate-900">
                      <img
                        src={imageUrl}
                        alt={pop.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="font-sans text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase leading-none">
                        {pop.category}
                      </span>
                      <h4 className="font-sans text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-brand-red-600 transition-colors line-clamp-2">
                        {pop.title}
                      </h4>
                      <span className="font-sans text-[9px] text-slate-400 dark:text-slate-500 font-normal leading-none mt-0.5">
                        {pop.date}
                      </span>
                    </div>
                  </a>
                );
              }

              // Otherwise, variant === 'home' style
              return (
                <a
                  key={pop.id}
                  href={targetUrl}
                  onClick={handleClick}
                  className="flex gap-3 items-start group cursor-pointer border-b border-slate-100 dark:border-slate-900/50 pb-3 last:border-b-0 last:pb-0"
                >
                  <span className="font-sans font-extrabold text-3xl md:text-4xl text-brand-red-600 tracking-tight leading-none shrink-0 opacity-50 group-hover:opacity-100 transition-opacity select-none w-9 md:w-11 tabular-nums">
                    {numStr}
                  </span>

                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <span className="font-sans text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                      {pop.category}
                    </span>
                    <h4 className="font-sans text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-brand-red-600 transition-colors">
                      {pop.title}
                    </h4>
                    <span className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      {pop.date}
                    </span>
                  </div>
                </a>
              );
            });
          })()}
        </div>
      </section>

    </aside>
  );
}
