import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, X, Loader2, Search, Filter } from 'lucide-react';
import { Article } from '../types';
import Skeleton from './skeletons/Skeleton';

interface IndeksPageViewProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  isDarkMode: boolean;
  isLoading?: boolean;
}

export default function IndeksPageView({ articles, onSelectArticle, isDarkMode, isLoading = false }: IndeksPageViewProps) {
  if (isLoading) {
    return (
      <div className="w-full flex flex-col gap-6 text-left animate-fade-in">
        {/* Title & Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-7 w-40 md:w-52 rounded-sm" />
            <Skeleton className="h-3 w-64 md:w-80 rounded-xs" />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <Skeleton className="h-[38px] flex-1 rounded-[5px]" />
          <Skeleton className="h-[38px] w-36 rounded-[5px]" />
          <Skeleton className="h-[38px] w-44 rounded-[5px]" />
        </div>

        {/* Articles Stream */}
        <div className="flex flex-col">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-row gap-4 py-5 border-b border-slate-200 dark:border-slate-800/60 last:border-b-0">
              <div className="relative w-24 h-18 sm:w-44 sm:h-24 shrink-0 overflow-hidden rounded-[5px]">
                <Skeleton className="w-full h-full rounded-[5px]" />
              </div>
              <div className="flex flex-col flex-1 justify-between py-1 min-w-0">
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-3 w-16 rounded-xs" />
                  <Skeleton className="h-4 w-full rounded-sm" />
                  <Skeleton className="h-4 w-4/5 rounded-sm" />
                </div>
                <div className="flex items-center gap-x-1.5">
                  <Skeleton className="h-3 w-20 rounded-xs" />
                  <Skeleton className="h-3 w-24 rounded-xs" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchDate, setSearchDate] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [tempSelectedCategories, setTempSelectedCategories] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(10);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const AVAILABLE_CATEGORIES = [
    "POLITIK", 
    "PERISTIWA", 
    "HUKUM", 
    "EKBIS", 
    "BONGKAR", 
    "SIN PO DULU", 
    "OLAHRAGA", 
    "BUDAYA", 
    "GALERI", 
    "OPINI"
  ];

  // Open modal and clone existing selection
  const openModal = () => {
    setTempSelectedCategories([...selectedCategories]);
    setIsModalOpen(true);
  };

  const toggleTempCategory = (cat: string) => {
    setTempSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleApplyFilters = () => {
    setSelectedCategories([...tempSelectedCategories]);
    setIsModalOpen(false);
  };

  const handleResetFilters = () => {
    setTempSelectedCategories([]);
  };

  // Reset pagination when filter changes
  useEffect(() => {
    setVisibleCount(10);
  }, [searchQuery, searchDate, selectedCategories]);

  // Disable body scroll when category filter modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isModalOpen]);

  const parseIndonesianDate = (dateStr: string): Date => {
    try {
      let cleanStr = dateStr;
      if (dateStr.includes(',')) {
        cleanStr = dateStr.split(',')[1].trim();
      }
      const parts = cleanStr.trim().split(/\s+/);
      if (parts.length < 3) return new Date(0);
      
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1].toLowerCase();
      const year = parseInt(parts[2], 10);
      
      const months: Record<string, number> = {
        januari: 0, jan: 0,
        februari: 1, feb: 1,
        maret: 2, mar: 2,
        april: 3, apr: 3,
        mei: 4,
        juni: 5, jun: 5,
        juli: 6, jul: 6,
        agustus: 7, agt: 7, ags: 7,
        september: 8, sep: 8,
        oktober: 9, okt: 9,
        november: 10, nov: 10,
        desember: 11, des: 11
      };
      
      const month = months[monthStr] !== undefined ? months[monthStr] : 0;
      return new Date(year, month, day);
    } catch (e) {
      return new Date(0);
    }
  };

  // Filter and sort articles (newest to oldest)
  const filteredAndSortedArticles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    
    const result = articles.filter((art) => {
      // 1. Text Search Filter (title or subtitle)
      if (q && !art.title.toLowerCase().includes(q) && !art.subtitle?.toLowerCase().includes(q)) {
        return false;
      }

      // 2. Date Filter
      if (searchDate) {
        try {
          const [sYear, sMonth, sDay] = searchDate.split('-').map(num => parseInt(num, 10));
          const artDate = parseIndonesianDate(art.date);
          if (
            artDate.getFullYear() !== sYear ||
            (artDate.getMonth() + 1) !== sMonth ||
            artDate.getDate() !== sDay
          ) {
            return false;
          }
        } catch (e) {
          // ignore parsing error
        }
      }

      // 3. Category Filter (Multiple)
      if (selectedCategories.length > 0) {
        const artCatUpper = art.category.toUpperCase();
        if (!selectedCategories.includes(artCatUpper)) {
          return false;
        }
      }

      return true;
    });

    // Sort newest first
    return [...result].sort((a, b) => {
      const dateA = parseIndonesianDate(a.date);
      const dateB = parseIndonesianDate(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [articles, searchQuery, searchDate, selectedCategories]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + 5);
      setIsLoadingMore(false);
    }, 600);
  };

  // Format the Indonesian date representation for UI label
  const formattedSearchDate = useMemo(() => {
    if (!searchDate) return "";
    try {
      const [year, month, day] = searchDate.split('-').map(num => parseInt(num, 10));
      const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      return `${day} ${months[month - 1]} ${year}`;
    } catch (e) {
      return searchDate;
    }
  }, [searchDate]);

  return (
    <div className="w-full flex flex-col gap-6 text-left animate-fade-in">
      {/* Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="font-sans text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Indeks Berita
          </h2>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cari semua arsip dan konten berita dari yang terbaru hingga terlama.
          </p>
        </div>
      </div>

      {/* Modern Compact Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Keyword Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Cari judul atau kata kunci berita..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[5px] text-xs font-sans text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-red-500 focus:border-brand-red-500 dark:focus:ring-red-500 dark:focus:border-red-500 transition-all"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Selector Button */}
        <button
          onClick={openModal}
          className="flex items-center justify-between gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-[5px] py-1.5 px-3 h-[38px] cursor-pointer text-left text-xs font-sans text-slate-700 dark:text-slate-300"
        >
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 shrink-0">
            <Filter className="h-3.5 w-3.5 text-brand-red-600 dark:text-red-500" />
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider">
              Kategori:
            </span>
            <span className="font-sans text-[11px] font-bold text-slate-900 dark:text-white">
              {selectedCategories.length === 0 
                ? "Semua" 
                : `${selectedCategories.length} Terpilih`}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 shrink-0 ml-1">▼</span>
        </button>

        {/* Date Selector Filter */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-[5px] py-1.5 px-3 h-[38px]">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 shrink-0">
            <Calendar className="h-3.5 w-3.5 text-brand-red-600 dark:text-red-500" />
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider">
              Tanggal:
            </span>
          </div>
          
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3px] text-[11px] font-sans text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-red-500 focus:border-brand-red-500 dark:focus:ring-red-500 dark:focus:border-red-500 transition-all cursor-pointer"
            style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
          />
          {searchDate && (
            <button
              onClick={() => setSearchDate("")}
              className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-[3px] text-[10px] font-sans font-medium transition-all cursor-pointer border border-slate-200/50 dark:border-slate-700"
              title="Hapus filter tanggal"
            >
              <X className="h-2.5 w-2.5 text-slate-500 dark:text-slate-400" />
              <span>Hapus</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          {/* Backdrop Click */}
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
          
          {/* Modal Container */}
          <div className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[8px] w-full max-w-sm shadow-2xl overflow-hidden flex flex-col animate-slide-up max-h-[85vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 text-left">
              <div>
                <h3 className="font-sans text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider">
                  Saring Kategori
                </h3>
                <p className="font-sans text-[10px] text-slate-500 dark:text-slate-400">
                  Pilih kategori berita (multi-seleksi)
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* List Body with radio-button styling */}
            <div className="overflow-y-auto p-2 flex flex-col gap-0.5">
              {AVAILABLE_CATEGORIES.map((cat) => {
                const isSelected = tempSelectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleTempCategory(cat)}
                    className="flex items-center gap-3 w-full p-2.5 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-[4px] transition-colors text-left cursor-pointer"
                  >
                    {/* Visual Radio Button */}
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                      isSelected 
                        ? "border-brand-red-600 dark:border-red-500 bg-brand-red-50 dark:bg-red-950/20" 
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    }`}>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-brand-red-600 dark:bg-red-500 animate-scale-in" />
                      )}
                    </div>

                    <span className={`font-sans text-xs uppercase tracking-wider transition-colors ${
                      isSelected 
                        ? "font-black text-brand-red-600 dark:text-red-500" 
                        : "font-bold text-slate-700 dark:text-slate-300"
                    }`}>
                      {cat}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Footer Controls */}
            <div className="flex items-center justify-between gap-4 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <button
                onClick={handleResetFilters}
                className="font-sans text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-brand-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
              >
                Reset Pilihan
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-[4px] text-slate-600 dark:text-slate-400 font-sans text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-1.5 bg-brand-red-600 dark:bg-red-600 hover:bg-brand-red-700 dark:hover:bg-red-700 text-white rounded-[4px] font-sans text-xs font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
                >
                  Terapkan ({tempSelectedCategories.length})
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Articles Stream */}
      {filteredAndSortedArticles.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-[5px]">
          <p className="font-sans text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Berita tidak ditemukan untuk pencarian Anda.
            {searchDate && (
              <>
                {" "}pada tanggal <strong className="text-slate-900 dark:text-white">"{formattedSearchDate}"</strong>
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {filteredAndSortedArticles.slice(0, visibleCount).map((art) => (
            <article
              key={art.id}
              onClick={() => onSelectArticle(art)}
              className="group flex flex-row gap-4 py-5 px-0 border-b border-slate-200 dark:border-slate-800/60 last:border-b-0 transition-all cursor-pointer text-left"
            >
              {/* Image Frame */}
              <div className="relative w-24 h-18 sm:w-44 sm:h-24 shrink-0 overflow-hidden rounded-[5px] bg-slate-100 dark:bg-slate-900">
                <img
                  src={art.imageUrl}
                  alt={art.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover rounded-[5px]"
                />
              </div>

              {/* Content Frame */}
              <div className="flex flex-col flex-1 justify-between py-1 min-w-0">
                <div className="flex flex-col">
                  <span className="text-[9px] font-sans font-black uppercase tracking-wider text-brand-red-600 leading-none">
                    {art.category}
                  </span>
                  
                  <h4 className="font-sans text-xs sm:text-sm md:text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-brand-red-600 dark:group-hover:text-red-500 transition-colors my-1.5 line-clamp-3">
                    {art.title}
                  </h4>
                </div>

                <div className="flex flex-nowrap items-center gap-x-1.5 text-[9px] md:text-xs text-slate-500 dark:text-slate-400 font-sans whitespace-nowrap overflow-hidden">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {art.author}
                  </span>
                  <span className="text-slate-300 dark:text-slate-800 font-normal shrink-0">•</span>
                  <span className="shrink-0">{art.date}</span>
                </div>
              </div>
            </article>
          ))}

          {/* Load More Button matching search results styling */}
          {filteredAndSortedArticles.length > visibleCount && (
            <div className="flex justify-center items-center py-6 mt-4">
              {isLoadingMore ? (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-sans text-xs font-bold uppercase tracking-wider">
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
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
