import React, { useRef } from 'react';
import gsap from 'gsap';
import { Bookmark, Clock, User, ArrowRight, Eye, Calendar } from 'lucide-react';
import { Article } from '../types';
import { POPULAR_NEWS } from '../data/newsData';
import Skeleton from './skeletons/Skeleton';
import { getArticleUrl } from '@/lib/urlHelpers';

interface NewsGridProps {
  articles: Article[];
  bookmarkedIds: string[];
  onToggleBookmark: (id: string) => void;
  onSelectArticle: (article: Article) => void;
  selectedCategory: string;
  popularArticles?: Article[];
  onSelectPopular?: (popularId: string) => void;
  isLoading?: boolean;
}

export default function NewsGrid({ 
  articles, 
  bookmarkedIds, 
  onToggleBookmark, 
  onSelectArticle, 
  selectedCategory,
  popularArticles,
  onSelectPopular,
  isLoading = false
}: NewsGridProps) {
  const heroLineRef = useRef<HTMLDivElement>(null);
  const heroArrowRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full animate-fade-in">
        {/* A. Hero Article Skeleton — matches actual hero: h-[480px] md:h-[580px] image with bottom overlay box */}
        <div className="relative rounded-[5px] overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-lg">
          <div className="relative h-[480px] md:h-[580px] w-full overflow-hidden rounded-[5px]">
            <Skeleton className="w-full h-full rounded-[5px]" />
            {/* Overlay box skeleton at bottom — matches the red overlay */}
            <div className="absolute bottom-3 inset-x-3 py-3 px-4 md:p-6 bg-slate-200/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-[5px] flex flex-col gap-1.5 md:gap-3">
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 md:w-7 h-[2px]" />
                <Skeleton className="h-3 w-24 rounded-xs" />
              </div>
              <Skeleton className="h-6 sm:h-8 md:h-10 w-full rounded-sm" />
              <Skeleton className="h-6 sm:h-8 md:h-10 w-4/5 rounded-sm" />
              <div className="h-[1px] w-full bg-slate-300/30 dark:bg-slate-700/30 my-0.5 md:my-1" />
              <div className="flex flex-nowrap items-center gap-x-2">
                <Skeleton className="h-3 w-20 rounded-xs" />
                <Skeleton className="h-3 w-24 rounded-xs" />
                <Skeleton className="h-3 w-20 rounded-xs" />
              </div>
              <div className="flex items-center justify-between w-full mt-1 md:mt-2">
                <Skeleton className="h-3 w-36 rounded-xs" />
                <Skeleton className="h-3 w-28 rounded-xs" />
              </div>
            </div>
          </div>
        </div>

        {/* B. BERITA TERKINI — vertical list of horizontal rows (image left + text right) */}
        <div className="flex flex-col gap-1 mt-2">
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
            <Skeleton className="h-6 w-40 md:w-48 rounded-sm" />
          </div>
          <div className="flex flex-col">
            {/* First item: full-width image on mobile, side-by-side on desktop */}
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="relative shrink-0 overflow-hidden rounded-[5px] w-full h-48 sm:h-60 md:w-44 md:h-28">
                <Skeleton className="w-full h-full rounded-[5px]" />
              </div>
              <div className="flex flex-col flex-1 min-w-0 justify-between py-1.5 md:py-1 gap-1 md:gap-0">
                <Skeleton className="h-3 w-20 rounded-xs" />
                <Skeleton className="h-5 w-full rounded-sm" />
                <Skeleton className="h-5 w-4/5 rounded-sm" />
                <div className="flex items-center gap-x-1.5">
                  <Skeleton className="h-3 w-24 rounded-xs" />
                  <Skeleton className="h-3 w-28 rounded-xs" />
                </div>
              </div>
            </div>
            {/* Remaining items: horizontal rows */}
            {Array.from({ length: 6 }).map((_, i) => (
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

  const handleHeroMouseEnter = () => {
    if (heroLineRef.current) {
      gsap.killTweensOf(heroLineRef.current);
      gsap.fromTo(heroLineRef.current, 
        { scaleX: 0, transformOrigin: 'left' }, 
        { scaleX: 1, duration: 0.45, ease: 'power2.out' }
      );
    }
    if (heroArrowRef.current) {
      gsap.killTweensOf(heroArrowRef.current);
      gsap.fromTo(heroArrowRef.current,
        { x: -12, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
      );
    }
  };

  const handleHeroMouseLeave = () => {
    if (heroLineRef.current) {
      gsap.killTweensOf(heroLineRef.current);
      gsap.to(heroLineRef.current, { 
        scaleX: 0, 
        transformOrigin: 'right', 
        duration: 0.45, 
        ease: 'power2.inOut' 
      });
    }
    if (heroArrowRef.current) {
      gsap.killTweensOf(heroArrowRef.current);
      gsap.to(heroArrowRef.current, {
        x: 12,
        opacity: 0,
        duration: 0.35,
        ease: 'power2.in',
        onComplete: () => {
          gsap.fromTo(heroArrowRef.current,
            { x: -12, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
          );
        }
      });
    }
  };

  const heroArticle = articles.find(a => a.isHero) || articles[0];
  const gridArticles = articles.filter(a => a.id !== heroArticle?.id).slice(0, 6);

  if (articles.length === 0) {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-6 w-full animate-fade-in">
          <div className="relative rounded-[5px] overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-lg">
            <div className="relative h-[480px] md:h-[580px] w-full overflow-hidden rounded-[5px]">
              <Skeleton className="w-full h-full rounded-[5px]" />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div id="empty-news-state" className="text-center py-12 px-4 border border-slate-200 dark:border-slate-800 rounded-[5px] bg-white dark:bg-slate-950">
        <h4 className="font-sans text-sm md:text-base font-bold text-slate-800 dark:text-slate-200">Tidak Ada Berita Ditemukan</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1.5 font-sans leading-relaxed">
          Belum ada berita yang tersedia untuk kategori atau pencarian ini.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Category Indicator Badge for User */}
      {selectedCategory !== "SEMUA" && (
        <div className="flex items-center gap-2 pb-1">
          <span className="h-5 w-1.5 bg-brand-red-600 rounded-xs" />
          <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            KATEGORI: {selectedCategory}
          </h2>
        </div>
      )}

      {/* A. Hero Unit: Grand Featured Showcase */}
      {heroArticle && (
        <a
          id={`hero-showcase-${heroArticle.id}`}
          href={getArticleUrl(heroArticle)}
          className="group relative block rounded-[5px] overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            onSelectArticle(heroArticle);
          }}
          onMouseEnter={handleHeroMouseEnter}
          onMouseLeave={handleHeroMouseLeave}
        >
          {/* Main Hero Image */}
          <div className="relative h-[480px] md:h-[580px] w-full overflow-hidden rounded-[5px]">
            <img
              src={heroArticle.imageUrl}
              alt={heroArticle.title}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover rounded-[5px]"
            />
            {/* Soft gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent rounded-[5px]" />
            
            {/* Content Absolute Container with aesthetic red background box */}
            <div className="absolute bottom-3 inset-x-3 py-3 px-4 md:p-6 bg-red-600/95 backdrop-blur-sm rounded-[5px] shadow-2xl flex flex-col gap-1.5 md:gap-3 border border-red-500/20">
              <div className="flex items-center gap-2 font-sans text-[9px] md:text-[11px] uppercase tracking-wider text-white">
                <span className="w-5 md:w-7 h-[1.5px] bg-white" />
                <span className="font-extrabold">
                  KATEGORI : {heroArticle.category}
                </span>
              </div>

              <h3 className="font-sans text-base sm:text-xl md:text-3.5xl font-extrabold tracking-tight leading-tight text-white transition-colors">
                {heroArticle.title}
              </h3>

              <div className="h-[1px] w-full bg-white/30 my-0.5 md:my-1" />

              <div className="flex flex-nowrap items-center gap-x-2 text-white text-[9px] md:text-xs font-sans font-medium whitespace-nowrap overflow-x-auto no-scrollbar">
                <span className="flex items-center gap-1 shrink-0">
                  <User className="h-3 w-3 md:h-3.5 md:w-3.5 text-white hidden md:block" />
                  <span>{heroArticle.author}</span>
                </span>
                <span className="text-white/40 shrink-0">•</span>
                <span className="flex items-center gap-1 shrink-0">
                  <Calendar className="h-3 w-3 md:h-3.5 md:w-3.5 text-white hidden md:block" /> 
                  <span>{heroArticle.date}</span>
                </span>
                <span className="text-white/40 shrink-0">•</span>
                <span className="flex items-center gap-1 shrink-0">
                  <Eye className="h-3 w-3 md:h-3.5 md:w-3.5 text-white hidden md:block" /> 
                  <span>{(heroArticle.views ?? heroArticle.dilihat ?? 0).toLocaleString('id-ID')} dilihat</span>
                </span>
              </div>

              <div className="flex items-center justify-between w-full mt-1 md:mt-2 gap-2 md:gap-3">
                <div className="relative inline-flex flex-col self-start shrink-0 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-sans font-bold uppercase tracking-widest text-white whitespace-nowrap">
                    <span className="whitespace-nowrap">BACA SELENGKAPNYA</span>
                    <div ref={heroArrowRef} className="inline-flex items-center shrink-0">
                      <ArrowRight className="h-3 w-3 md:h-3.5 md:w-3.5 text-white filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
                    </div>
                  </div>
                  <div 
                    ref={heroLineRef} 
                    className="absolute bottom-[-3px] left-0 right-0 h-[2px] md:h-[2.5px] bg-white rounded-full" 
                    style={{ transform: 'scaleX(0)', transformOrigin: 'left' }}
                  />
                </div>

                <p className="text-[10px] md:text-[11px] font-sans italic text-white/80 text-right line-clamp-2 ml-auto leading-tight">
                  {heroArticle.caption ? `Foto: ${heroArticle.caption}` : 'Foto: Dok. Istimewa / Ilustrasi'}
                </p>
              </div>
            </div>
          </div>
        </a>
      )}

      {/* B. Mobile Only: Berita Terpopuler (Placed directly after headline news) */}
      <section id="mobile-popular-news" className="md:hidden bg-white dark:bg-slate-950 p-5 mt-4 rounded-[5px] border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
          <h3 className="font-sans text-lg font-black tracking-wider text-slate-900 dark:text-white uppercase">
            BERITA TERPOPULER
          </h3>
        </div>

        <div className="flex flex-col gap-4">
          {(popularArticles && popularArticles.length > 0 ? popularArticles : articles.slice(0, 5)).slice(0, 5).map((pop, index) => {
            const numStr = String(index + 1).padStart(2, '0');
            return (
              <a
                key={pop.id}
                href={getArticleUrl(pop)}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  if (onSelectArticle) {
                    onSelectArticle(pop);
                  } else if (onSelectPopular) {
                    onSelectPopular(pop.id);
                  }
                }}
                className="flex gap-3 items-start group cursor-pointer border-b border-slate-100 dark:border-slate-900/50 pb-3 last:border-b-0 last:pb-0 active:scale-[0.99] transition-transform"
              >
                {/* Large high-contrast red numbers */}
                <span className="font-sans font-extrabold text-3xl text-brand-red-600 tracking-tight leading-none shrink-0 opacity-50 group-hover:opacity-100 transition-opacity select-none w-9 tabular-nums">
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
          })}
        </div>
      </section>

      {/* C. News Grid Stream: Elegant Cards Column */}
      {gridArticles.length > 0 && (
        <div className="flex flex-col gap-1 mt-2">
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
            <h3 className="font-sans text-lg md:text-xl font-black tracking-wider text-slate-900 dark:text-white uppercase">
              BERITA TERKINI
            </h3>
          </div>
          <div className="flex flex-col">
            {gridArticles.map((article, idx) => {
              const isFirst = idx === 0;
              return (
                <a
                  key={article.id}
                  id={`article-card-${article.id}`}
                  href={getArticleUrl(article)}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    onSelectArticle(article);
                  }}
                  className={`group flex cursor-pointer bg-transparent last:border-b-0 ${
                    isFirst 
                      ? "flex-col md:flex-row gap-3 md:gap-4 py-4 border-b border-slate-200 dark:border-slate-800" 
                      : "flex flex-row gap-4 py-4 border-b border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {/* Image */}
                  <div className={`relative shrink-0 overflow-hidden rounded-[5px] ${
                    isFirst 
                      ? "w-full h-48 sm:h-60 md:w-44 md:h-28" 
                      : "w-28 h-20 md:w-44 md:h-28"
                  }`}>
                    <img
                      src={article.imageUrl}
                      alt={article.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Content: Category, Title, Author & Date */}
                  <div className={`flex flex-col flex-1 min-w-0 justify-between ${
                    isFirst ? "py-1.5 md:py-1 gap-1 md:gap-0" : "py-1"
                  }`}>
                    {/* Category */}
                    <span className="text-[10px] md:text-xs font-sans font-black uppercase tracking-wider text-brand-red-600">
                      {article.category}
                    </span>

                    {/* Title */}
                    <h4 className={`font-sans font-bold leading-snug text-slate-900 dark:text-white group-hover:text-brand-red-600 transition-colors my-auto py-1 ${
                      isFirst ? "text-sm sm:text-base md:text-base" : "text-xs sm:text-sm md:text-base"
                    }`}>
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
                </a>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
