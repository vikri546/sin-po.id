import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Article } from '../types';
import Skeleton from './skeletons/Skeleton';
import { apiFetch, transformLaravelPostToArticle } from '../lib/apiClient';
import { getArticleUrl } from '@/lib/urlHelpers';

interface BongkarSectionProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  isLoading?: boolean;
}

export default function BongkarSection({ articles, onSelectArticle, isLoading = false }: BongkarSectionProps) {
  const [visibleCount, setVisibleCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Dedicated articles state for BONGKAR & SIN PO DULU from live API
  const [bongkarArticles, setBongkarArticles] = useState<Article[]>([]);
  const [sinpoDuluArticles, setSinpoDuluArticles] = useState<Article[]>([]);

  // Index state for shuffle rotation
  const [bongkarIdx, setBongkarIdx] = useState(0);
  const [sinpoDuluIdx, setSinpoDuluIdx] = useState(0);

  // Dedicated Fallback Articles specifically for BONGKAR category
  const FALLBACK_BONGKAR_ARTICLES: Article[] = useMemo(() => [
    {
      id: 'bongkar-1',
      slug: 'bongkar-dugaan-kebocoran-anggaran-transportasi',
      title: 'BONGKAR: Menelusuri Dugaan Kebocoran Anggaran Daerah Senilai Ratusan Miliar di Sektor Transportasi',
      subtitle: 'Investigasi mendalam mengenai kejanggalan dokumen kontrak ganda pembangunan fasilitas publik.',
      summary: 'Investigasi mendalam mengenai kejanggalan dokumen kontrak ganda pembangunan fasilitas publik.',
      content: 'Tim Investigasi BONGKAR SinPo.id memperoleh salinan dokumen kontrak ganda pembangunan fasilitas publik...',
      category: 'BONGKAR',
      imageUrl: 'https://sinpo.id/storage/2026/08/bongkar-investigasi.jpg',
      date: '1 Jam yang lalu',
      author: 'Tim BONGKAR SinPo',
      readTime: '4 Menit Baca',
      tags: ['BONGKAR', 'INVESTIGASI', 'KORUPSI'],
      comments: [],
      isHero: false
    },
    {
      id: 'bongkar-2',
      slug: 'bongkar-aliran-dana-siluman-proyek-infrastruktur',
      title: 'BONGKAR: Jejak Aliran Dana Siluman Proyek Infrastruktur Publik yang Mangkrak',
      subtitle: 'Penelusuran transaksi keuangan mencurigakan yang mengalir ke rekening konsorsium pelaksana.',
      summary: 'Penelusuran transaksi keuangan mencurigakan yang mengalir ke rekening konsorsium pelaksana.',
      content: 'Temuan baru mengungkapkan skema pengalihan dana proyek infrastruktur ke perusahaan cangkang...',
      category: 'BONGKAR',
      imageUrl: 'https://sinpo.id/storage/2026/08/bongkar-infrastruktur.jpg',
      date: '3 Jam yang lalu',
      author: 'Tim BONGKAR SinPo',
      readTime: '5 Menit Baca',
      tags: ['BONGKAR', 'INVESTIGASI'],
      comments: [],
      isHero: false
    }
  ], []);

  // Dedicated Fallback Articles specifically for SIN PO DULU category
  const FALLBACK_SINPO_DULU_ARTICLES: Article[] = useMemo(() => [
    {
      id: 'sinpo-dulu-1',
      slug: 'sin-po-dulu-sejarah-surat-kabar-sin-po-1910',
      title: 'SIN PO DULU: Jejak Sejarah Koran Sin Po 1910 dalam Perjuangan Kemerdekaan Indonesia',
      subtitle: 'Mengenang peran sejarah peloporan lagu Indonesia Raya pertama kali dimuat di surat kabar Sin Po.',
      summary: 'Mengenang peran sejarah peloporan lagu Indonesia Raya pertama kali dimuat di surat kabar Sin Po.',
      content: 'Surat kabar Sin Po yang terbit awal abad ke-20 menjadi saksi sejarah penting perjuangan bangsa...',
      category: 'SIN PO DULU',
      imageUrl: 'https://sinpo.id/storage/2026/08/sinpo-dulu-sejarah.jpg',
      date: 'Kemarin',
      author: 'Redaksi SinPo Dulu',
      readTime: '5 Menit Baca',
      tags: ['SIN PO DULU', 'SEJARAH', 'ARSIP'],
      comments: [],
      isHero: false
    },
    {
      id: 'sin-po-dulu-2',
      slug: 'sin-po-dulu-arsip-foto-jakarta-tempo-doeloe',
      title: 'SIN PO DULU: Menengok Arsip Foto Eksklusif Wajah Jakarta Tempo Doeloe',
      subtitle: 'Koleksi dokumentasi langka suasana ibu kota masa lampau dari ruang arsip Sin Po.',
      summary: 'Koleksi dokumentasi langka suasana ibu kota masa lampau dari ruang arsip Sin Po.',
      content: 'Potret kehidupan masyarakat dan arsitektur kota Jakarta abad lalu terekam dalam arsip langka...',
      category: 'SIN PO DULU',
      imageUrl: 'https://sinpo.id/storage/2026/08/sinpo-dulu-jakarta.jpg',
      date: '2 Hari yang lalu',
      author: 'Redaksi SinPo Dulu',
      readTime: '4 Menit Baca',
      tags: ['SIN PO DULU', 'ARSIP', 'TEMPO DOELOE'],
      comments: [],
      isHero: false
    }
  ], []);

  // Fetch dedicated BONGKAR and SIN PO DULU category articles on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchBannerArticles() {
      try {
        const resBongkar = await apiFetch('/berita?channel=21&limit=15');
        if (isMounted && resBongkar.success && Array.isArray(resBongkar.data) && resBongkar.data.length > 0) {
          const mapped = resBongkar.data.map(transformLaravelPostToArticle);
          mapped.forEach(a => a.category = 'BONGKAR');
          setBongkarArticles(mapped);
        }
      } catch (err) {
        console.log('Bongkar category fetch notice:', err);
      }

      try {
        const resSinpoDulu = await apiFetch('/berita?channel=24&limit=15');
        if (isMounted && resSinpoDulu.success && Array.isArray(resSinpoDulu.data) && resSinpoDulu.data.length > 0) {
          const mapped = resSinpoDulu.data.map(transformLaravelPostToArticle);
          mapped.forEach(a => a.category = 'SIN PO DULU');
          setSinpoDuluArticles(mapped);
        }
      } catch (err) {
        console.log('Sin Po Dulu category fetch notice:', err);
      }
    }

    fetchBannerArticles();
    return () => {
      isMounted = false;
    };
  }, []);

  // Strictly filter articles for BONGKAR ONLY (never show general politics/law news)
  const activeBongkarList = useMemo(() => {
    if (bongkarArticles.length > 0) return bongkarArticles;
    const match = articles.filter(a => a.category.toUpperCase() === 'BONGKAR' || a.isInvestigative);
    return match.length > 0 ? match : FALLBACK_BONGKAR_ARTICLES;
  }, [bongkarArticles, articles, FALLBACK_BONGKAR_ARTICLES]);

  // Strictly filter articles for SIN PO DULU ONLY (never show general politics/law news)
  const activeSinpoDuluList = useMemo(() => {
    if (sinpoDuluArticles.length > 0) return sinpoDuluArticles;
    const match = articles.filter(a => 
      a.category.toUpperCase().includes('SIN PO DULU') || 
      a.category.toUpperCase().includes('SINPO DULU') ||
      a.category.toUpperCase().includes('DULU')
    );
    return match.length > 0 ? match : FALLBACK_SINPO_DULU_ARTICLES;
  }, [sinpoDuluArticles, articles, FALLBACK_SINPO_DULU_ARTICLES]);

  // Current item based on shuffle index
  const bongkarItem = activeBongkarList[bongkarIdx % activeBongkarList.length] || null;
  const sinpoDuluItem = activeSinpoDuluList[sinpoDuluIdx % activeSinpoDuluList.length] || null;

  // Single refresh button rotates both banners to next articles seamlessly
  const handleRefreshBoth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBongkarIdx(prev => prev + 1);
    setSinpoDuluIdx(prev => prev + 1);
  };

  // Check if article was published within 24 hours (not "Kemarin" or "X Hari yang lalu")
  const isWithin24Hours = (dateStr: string): boolean => {
    if (!dateStr) return true;
    const str = String(dateStr).trim();
    if (str.includes('Hari yang lalu') || str === 'Kemarin') {
      return false;
    }
    if (str.includes('Jam yang lalu')) {
      const hrs = parseInt(str, 10) || 0;
      return hrs <= 24;
    }
    return true;
  };

  const allBeritaLainnya = useMemo(() => {
    const list = articles.length > 7 ? articles.slice(7) : articles;
    return list.filter(art => isWithin24Hours(art.date));
  }, [articles]);

  const displayArticles = useMemo(() => {
    return allBeritaLainnya.slice(0, visibleCount);
  }, [allBeritaLainnya, visibleCount]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => prev + 10);
      setIsLoadingMore(false);
    }, 400);
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
      {/* Left Column: BONGKAR & SIN PO DULU BANNER */}
      <div 
        className="hidden md:flex w-full md:sticky md:top-20 bg-slate-900 text-white rounded-[5px] border-[3px] border-brand-red-600 dark:border-brand-red-500 shadow-xl p-5 flex-col gap-4 relative overflow-hidden select-none"
        style={{ minHeight: '600px' }}
      >
        {/* BONGKAR Header */}
        <div className="flex items-center justify-between border-b-2 border-brand-red-600/40 pb-2 mb-1">
          <div className="flex flex-col">
            <h2 className="font-sans text-3xl font-extrabold tracking-tighter text-brand-red-600 dark:text-brand-red-500 mt-1 leading-none">
              BONGKAR
            </h2>
          </div>
          
          {/* Circle Refresh Button (Rotates Bongkar & Sin Po Dulu articles) */}
          <button
            onClick={handleRefreshBoth}
            className="w-8 h-8 rounded-full bg-brand-red-600 hover:bg-brand-red-700 text-white flex items-center justify-center cursor-pointer transition-all duration-300 hover:rotate-180 active:scale-90 shadow-md"
            title="Segarkan Tampilan"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Animated BONGKAR item */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`bongkar-${bongkarIdx}`}
            initial={{ scale: 0.93, opacity: 0, y: 12 }}
            animate={{ scale: [0.93, 1.03, 1], opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-4 justify-center"
          >
            {/* 1. BONGKAR Item ONLY */}
            {bongkarItem && (
              <a
                href={getArticleUrl(bongkarItem)}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button !== undefined && e.button !== 0)) return;
                  e.preventDefault();
                  onSelectArticle(bongkarItem);
                }}
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
              </a>
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
            key={`sinpodulu-${sinpoDuluIdx}`}
            initial={{ scale: 0.93, opacity: 0, y: 12 }}
            animate={{ scale: [0.93, 1.03, 1], opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col gap-4 justify-center"
          >
            {/* 2. SIN PO DULU Item ONLY */}
            {sinpoDuluItem && (
              <a
                href={getArticleUrl(sinpoDuluItem)}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button !== undefined && e.button !== 0)) return;
                  e.preventDefault();
                  onSelectArticle(sinpoDuluItem);
                }}
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
              </a>
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
            <a
              key={`other-${article.id}`}
              href={getArticleUrl(article)}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button !== undefined && e.button !== 0)) return;
                e.preventDefault();
                onSelectArticle(article);
              }}
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
            </a>
          ))}
        </div>

        {/* Muat Lebih Banyak Button */}
        <div className="mt-4 flex justify-center">
          {visibleCount < allBeritaLainnya.length ? (
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
          ) : (
            allBeritaLainnya.length > 0 && (
              <p className="text-[11px] font-sans font-medium text-slate-400 dark:text-slate-500 py-2 italic">
                Telah menampilkan seluruh berita 24 jam terakhir.
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
