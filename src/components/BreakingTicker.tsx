"use client";

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { Article } from '../types';
import { apiFetch, transformLaravelPostToArticle } from '../lib/apiClient';
import { stripHtml } from '../lib/htmlRenderer';
import { getArticleUrl } from '@/lib/urlHelpers';

interface TickerItem {
  text: string;
  article?: Article;
}

interface BreakingTickerProps {
  items?: string[];
  articles?: Article[];
  onSelectArticle?: (article: Article) => void;
}

export default function BreakingTicker({ items, articles, onSelectArticle }: BreakingTickerProps) {
  const [fetchedArticles, setFetchedArticles] = React.useState<Article[]>([]);

  React.useEffect(() => {
    if ((!items || items.length === 0) && (!articles || articles.length === 0)) {
      async function fetchTickerData() {
        try {
          const res = await apiFetch('/populer?limit=5');
          if (res.success && Array.isArray(res.data)) {
            const transformed = res.data.slice(0, 5).map(transformLaravelPostToArticle);
            setFetchedArticles(transformed);
          }
        } catch (e) {
          // offline fallback
        }
      }
      fetchTickerData();
    }
  }, [items, articles]);

  const rawTickerItems = React.useMemo<TickerItem[]>(() => {
    // 1. If explicit Article objects are passed, build TickerItems directly from them
    const articleList = (articles && articles.length > 0) 
      ? articles.slice(0, 5) 
      : (fetchedArticles.length > 0 ? fetchedArticles.slice(0, 5) : []);

    if (articleList.length > 0) {
      return articleList.map(a => ({
        text: `${a.category}: ${a.title}`,
        article: a,
      }));
    }

    // 2. If raw string items passed
    if (items && items.length > 0) {
      return items.slice(0, 5).map(str => ({
        text: str,
      }));
    }

    return [];
  }, [items, articles, fetchedArticles]);

  const newsItems = React.useMemo<TickerItem[]>(() => {
    if (rawTickerItems.length === 0) {
      return [{ text: 'SINPO MEDIA: Berita Terkini & Terpopuler' }];
    }
    if (rawTickerItems.length === 1) {
      return [rawTickerItems[0], rawTickerItems[0], rawTickerItems[0], rawTickerItems[0]];
    }
    if (rawTickerItems.length === 2) {
      return [rawTickerItems[0], rawTickerItems[1], rawTickerItems[0], rawTickerItems[1]];
    }
    return rawTickerItems;
  }, [rawTickerItems]);

  const [showDate, setShowDate] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [isPaused, setIsPaused] = React.useState(false);

  // Update current time every second
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Flip state every 10 seconds
  React.useEffect(() => {
    const flipTimer = setInterval(() => {
      setShowDate(prev => !prev);
    }, 10000);
    return () => clearInterval(flipTimer);
  }, []);

  // Format current date in high-fidelity Indonesian style
  const getIndonesianDay = (date: Date) => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return `${days[date.getDay()]},`;
  };

  const getIndonesianDateOnly = (date: Date) => {
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getFormattedTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const handleItemClick = (item: TickerItem) => {
    if (item.article && onSelectArticle) {
      onSelectArticle(item.article);
    }
  };

  return (
    <div id="breaking-news-bar" className="bg-slate-900 text-white text-xs border-b border-slate-800 flex items-center h-10 px-4 md:px-8 justify-between select-none">
      {/* Left Label & Running Marquee */}
      <div className="flex items-center gap-3 overflow-hidden flex-1 mr-1 md:mr-2">
        <a
          href="https://youtube.com/@sinpotv?si=hiaKrjanN5Zh1GFe"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-brand-red-600 hover:bg-brand-red-700 transition-colors px-2.5 py-1 text-[10px] font-bold font-sans tracking-wider flex items-center gap-1.5 shrink-0 uppercase rounded-sm text-white cursor-pointer"
          title="SIN PO TV (Buka di Tab Baru)"
        >
          <span className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          SIN PO TV
        </a>
        
        {/* Hardware-accelerated CSS marquee with hover pause */}
        <div className="w-full overflow-hidden text-slate-300 font-sans tracking-wide relative flex items-center">
          {/* Left Gradient Fade */}
          <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none z-10" />
          
          <div 
            className="animate-marquee-scroll cursor-pointer flex whitespace-nowrap"
            style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Track 1 */}
            <div className="flex shrink-0">
              {newsItems.map((item, idx) => {
                const url = item.article ? getArticleUrl(item.article) : '#';
                return (
                  <a
                    key={`t1-${idx}`}
                    href={url}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button !== undefined && e.button !== 0)) return;
                      e.preventDefault();
                      handleItemClick(item);
                    }}
                    className="mx-8 hover:text-brand-gold transition-colors font-medium shrink-0 cursor-pointer text-white no-underline"
                    title={item.article ? `Baca: ${item.article.title}` : undefined}
                  >
                    • {item.text}
                  </a>
                );
              })}
            </div>
            {/* Track 2 (seamless clone) */}
            <div className="flex shrink-0">
              {newsItems.map((item, idx) => {
                const url = item.article ? getArticleUrl(item.article) : '#';
                return (
                  <a
                    key={`t2-${idx}`}
                    href={url}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button !== undefined && e.button !== 0)) return;
                      e.preventDefault();
                      handleItemClick(item);
                    }}
                    className="mx-8 hover:text-brand-gold transition-colors font-medium shrink-0 cursor-pointer text-white no-underline"
                    title={item.article ? `Baca: ${item.article.title}` : undefined}
                  >
                    • {item.text}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Right Gradient Fade */}
          <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none z-10" />
        </div>
      </div>

      {/* Right Date and Toggle */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="font-sans tracking-wide font-medium text-slate-300 hidden sm:flex items-center h-5 overflow-hidden justify-start gap-1.5">
          <span className="text-slate-400 font-bold shrink-0">{getIndonesianDay(currentTime)}</span>
          <div className="relative h-5 overflow-hidden flex items-center justify-start">
            <AnimatePresence mode="wait">
              <motion.span
                key={showDate ? 'date' : 'time'}
                initial={{ rotateX: -90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                exit={{ rotateX: 90, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="inline-block origin-center whitespace-nowrap text-left"
              >
                {showDate ? getIndonesianDateOnly(currentTime) : getFormattedTime(currentTime)}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
