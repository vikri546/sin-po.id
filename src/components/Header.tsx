"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Instagram, X, Lock, Tv, Sun, Moon, Search, Facebook } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import gsap from 'gsap';
import { Article } from '../types';
import Logo from './Logo';

interface HeaderProps {
  bookmarkCount: number;
  showBookmarksOnly: boolean;
  onToggleBookmarksOnly: () => void;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  articles?: Article[];
  onSelectArticle?: (article: Article) => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
}

const CATEGORIES = ["SEMUA", "POLITIK", "PERISTIWA", "HUKUM", "EKBIS", "BONGKAR", "SIN PO DULU"];
const EXTRA_CATEGORIES = ["OLAHRAGA", "BUDAYA", "GALERI", "OPINI", "INDEKS"];

export default function Header({ 
  bookmarkCount, 
  showBookmarksOnly, 
  onToggleBookmarksOnly,
  selectedCategory = "SEMUA",
  onSelectCategory,
  articles,
  onSelectArticle,
  isDrawerOpen,
  setIsDrawerOpen,
  isDarkMode,
  onToggleTheme,
  searchQuery = "",
  onSearchChange,
  onSearchSubmit
}: HeaderProps) {
  const [isDrawerLainnyaOpen, setIsDrawerLainnyaOpen] = useState(false);
  const [showMobileSearchInput, setShowMobileSearchInput] = useState(false);
  const drawerDropdownRef = useRef<HTMLDivElement>(null);
  const toggleKnobRef = useRef<HTMLDivElement>(null);

  const filteredLiveArticles = React.useMemo(() => {
    if (!searchQuery.trim() || !articles) return [];
    const q = searchQuery.toLowerCase();
    return articles.filter(art => 
      art.title.toLowerCase().includes(q) || 
      art.category.toLowerCase().includes(q) || 
      art.tags.some(t => t.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [searchQuery, articles]);

  const isLainnyaActive = EXTRA_CATEGORIES.includes(selectedCategory.toUpperCase());

  useEffect(() => {
    const handleAnimate = () => {
      if (toggleKnobRef.current) {
        const isMobile = window.innerWidth < 768;
        const xDistance = isDarkMode ? (isMobile ? 24 : 32) : 0;
        gsap.to(toggleKnobRef.current, {
          x: xDistance,
          duration: 0.25,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }
    };

    handleAnimate();
    window.addEventListener('resize', handleAnimate);
    return () => window.removeEventListener('resize', handleAnimate);
  }, [isDarkMode]);

  useEffect(() => {
    if (drawerDropdownRef.current) {
      if (isDrawerLainnyaOpen) {
        gsap.fromTo(drawerDropdownRef.current, 
          { height: 0, opacity: 0, y: -10, display: 'block' },
          { height: 'auto', opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', overwrite: 'auto' }
        );
      } else {
        gsap.to(drawerDropdownRef.current, {
          height: 0,
          opacity: 0,
          y: -10,
          duration: 0.25,
          ease: 'power2.in',
          overwrite: 'auto',
          onComplete: () => {
            if (drawerDropdownRef.current) {
              drawerDropdownRef.current.style.display = 'none';
            }
          }
        });
      }
    }
  }, [isDrawerLainnyaOpen]);

  useEffect(() => {
    if (isDrawerOpen || showMobileSearchInput) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen, showMobileSearchInput]);

  const isOverlayActive = isDrawerOpen;

  return (
    <header 
      id="main-editorial-header" 
      className={`bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 py-3 md:py-5 transition-colors relative ${isOverlayActive ? 'z-[60]' : 'z-40'}`}
    >
      {/* Mobile Search Overlay - Fullscreen Modal */}
      <AnimatePresence>
        {showMobileSearchInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md z-[100] md:hidden flex flex-col justify-start pt-24 pb-8 overflow-y-auto px-6"
          >
            {/* Large Close Button at Top Right */}
            <button
              onClick={() => setShowMobileSearchInput(false)}
              className="absolute top-6 right-6 p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer focus:outline-none rounded-full hover:bg-slate-100 dark:hover:bg-slate-900"
              title="Tutup Pencarian"
            >
              <X className="h-8 w-8 stroke-[1.5]" />
            </button>

            {/* Centered Search Container */}
            <div className="w-full max-w-lg mx-auto flex flex-col items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (onSearchSubmit && searchQuery.trim()) {
                      onSearchSubmit(searchQuery);
                      setShowMobileSearchInput(false);
                    }
                  }
                }}
                placeholder="Ketik kata kunci berita..."
                className="w-full bg-transparent border-b-[3px] border-brand-red-600 text-center text-xl sm:text-2xl font-sans font-medium tracking-wide focus:outline-none pb-4 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                autoFocus
              />
              {/* Automatic Search Results */}
              {searchQuery.trim() !== "" ? (
                <div className="w-full mt-4 flex flex-col gap-3">
                  {filteredLiveArticles.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 font-sans">
                      Tidak ada berita yang cocok
                    </div>
                  ) : (
                    <div className="w-full bg-white dark:bg-slate-900 rounded-[5px] border border-slate-100 dark:border-slate-800/80 p-1 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[45vh] overflow-y-auto custom-scrollbar shadow-none">
                      {filteredLiveArticles.map((art) => (
                        <a
                          key={art.id}
                          href={`?article=${encodeURIComponent(art.slug || art.id)}`}
                          onClick={(e) => {
                            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                            e.preventDefault();
                            if (onSelectArticle) {
                              onSelectArticle(art);
                            }
                            setShowMobileSearchInput(false);
                          }}
                          className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
                        >
                          {art.imageUrl && (
                            <img 
                              src={art.imageUrl} 
                              alt={art.title} 
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded object-cover shrink-0 border border-slate-100 dark:border-slate-800"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[9px] font-sans font-bold text-brand-red-600 dark:text-red-500 uppercase tracking-wider">
                                {art.category}
                              </span>
                              <span className="text-[9px] font-sans text-slate-400 dark:text-slate-500">
                                {art.date}
                              </span>
                            </div>
                            <h4 className="font-sans text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                              {art.title}
                            </h4>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-sans tracking-wide text-center">
                  Tekan Enter untuk mencari
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-row items-center justify-between gap-3 md:gap-4">
        
        {/* Left: Social Media Networks */}
        <div className="flex items-center gap-2 sm:gap-4 text-slate-500 dark:text-slate-400 order-1 w-auto justify-start">
          <a href="https://x.com/sinpotv" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red-600 transition-colors flex items-center justify-center" title="X (Twitter) SinPo TV">
            <svg className="h-3.5 w-3.5 md:h-4 md:w-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a href="https://www.instagram.com/sinpotv" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red-600 transition-colors" title="Instagram SinPo TV">
            <Instagram className="h-4 w-4 md:h-5 md:w-5" />
          </a>
          <a href="https://www.facebook.com/people/SIN-PO-TV/61552603735655/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red-600 transition-colors" title="Facebook SinPo TV">
            <Facebook className="h-4 w-4 md:h-5 md:w-5" />
          </a>
        </div>

        {/* Center: Iconic Central Editorial Branding */}
        <div className="text-center order-2 flex flex-col items-center flex-1 min-w-0">
          <button 
            onClick={() => onSelectCategory && onSelectCategory("SEMUA")}
            className="flex items-center justify-center cursor-pointer group active:scale-95 transition-transform focus:outline-none py-1"
            title="Kembali ke Beranda"
          >
            <Logo 
              isDarkMode={isDarkMode} 
              heightClass="h-7 sm:h-9 md:h-12 lg:h-14" 
            />
          </button>
        </div>

        {/* Right: Premium Mode Toggle Button & Mobile Search */}
        <div className="order-3 w-auto flex items-center justify-end gap-2 md:gap-3">
          {/* Mobile Only Search Button */}
          <button
            onClick={() => setShowMobileSearchInput(!showMobileSearchInput)}
            className="flex md:hidden p-1.5 text-slate-700 dark:text-slate-300 hover:text-brand-red-600 dark:hover:text-red-500 bg-transparent border-none outline-none cursor-pointer focus:outline-none"
            title="Cari Berita"
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            id="theme-toggle"
            onClick={onToggleTheme}
            className="w-12 h-6 md:w-16 md:h-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 relative cursor-pointer p-0.5 md:p-1 flex items-center transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-red-600 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
            title={isDarkMode ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
            aria-label="Toggle theme"
          >
            {/* GSAP animated slide/rotate knob */}
            <div 
              ref={toggleKnobRef}
              className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-white dark:bg-slate-950 shadow-md flex items-center justify-center relative z-10 select-none border border-slate-200 dark:border-slate-800"
            >
              {isDarkMode ? (
                <Moon className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 text-white stroke-[2.5]" />
              ) : (
                <Sun className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 text-black stroke-[2.5]" />
              )}
            </div>
          </button>
        </div>

      </div>

      {/* Modern Side Drawer Navigation (Size 1/4 or standard responsive drawer width) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 cursor-pointer"
            />

            {/* Sidebar Container */}
            <motion.div
              key="drawer-sidebar"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full sm:w-80 md:w-96 lg:w-[25vw] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col transition-colors overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-900 shrink-0">
                <button
                  onClick={() => {
                    if (onSelectCategory) onSelectCategory("SEMUA");
                    setIsDrawerOpen(false);
                  }}
                  className="cursor-pointer group active:scale-95 transition-transform focus:outline-none flex items-center"
                  title="Kembali ke Beranda"
                >
                  <Logo 
                    isDarkMode={isDarkMode} 
                    heightClass="h-7 md:h-8" 
                  />
                </button>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer"
                  title="Tutup Menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                
                {/* 1. Category Section */}
                <div className="space-y-4">
                  <h3 className="font-sans text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-slate-900 pb-2">
                    Kategori Berita
                  </h3>
                  <div className="flex flex-col gap-1">
                    {CATEGORIES.map((cat) => {
                      const isActive = selectedCategory === cat;
                      const isSpecial = cat === "BONGKAR" || cat === "SIN PO DULU";
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            if (onSelectCategory) onSelectCategory(cat);
                            setIsDrawerOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md font-sans text-xs font-bold tracking-wider transition-all uppercase flex items-center justify-between cursor-pointer ${
                            isActive
                              ? "bg-brand-red-600 text-white shadow-md shadow-brand-red-600/10"
                              : isSpecial
                                ? "text-amber-600 dark:text-brand-gold hover:bg-amber-500/10"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {cat}
                          </span>
                          {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </button>
                      );
                    })}

                    {/* Lainnya Collapsible Accordion inside Drawer */}
                    <div 
                      className="relative mt-1"
                      onMouseEnter={() => setIsDrawerLainnyaOpen(true)}
                      onMouseLeave={() => setIsDrawerLainnyaOpen(false)}
                    >
                      <button
                        onClick={() => setIsDrawerLainnyaOpen(!isDrawerLainnyaOpen)}
                        className={`w-full text-left px-3 py-2 rounded-md font-sans text-xs font-bold tracking-wider transition-all uppercase flex items-center justify-between cursor-pointer ${
                          isLainnyaActive
                            ? "bg-brand-red-600 text-white shadow-md shadow-brand-red-600/10"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          Lainnya
                        </span>
                        {isDrawerLainnyaOpen ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M6 15l6 -6l6 6" /></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M6 9l6 6l6 -6" /></svg>
                        )}
                      </button>

                      {/* GSAP Collapsible Content */}
                      <div
                        ref={drawerDropdownRef}
                        className="pl-3 mt-1 border-l-2 border-slate-100 dark:border-slate-800 space-y-1"
                        style={{ display: 'none' }}
                      >
                        {EXTRA_CATEGORIES.map((cat) => {
                          const isActive = selectedCategory.toUpperCase() === cat;
                          return (
                            <button
                              key={cat}
                              onClick={() => {
                                if (onSelectCategory) onSelectCategory(cat);
                                setIsDrawerOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 rounded font-sans text-xs font-bold tracking-wider transition-all uppercase flex items-center justify-between cursor-pointer ${
                                isActive
                                  ? "text-brand-red-600 dark:text-brand-red-500 font-black"
                                  : "text-slate-500 dark:text-slate-400 hover:text-brand-red-600 dark:hover:text-brand-red-500 hover:bg-slate-50 dark:hover:bg-slate-900/45"
                              }`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Latest News Section */}
                <div className="space-y-4">
                  <h3 className="font-sans text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-slate-900 pb-2">
                    Berita Terbaru
                  </h3>
                  <div className="flex flex-col gap-4">
                    {articles && articles.slice(0, 5).map((art) => (
                      <a
                        key={art.id}
                        href={`?article=${encodeURIComponent(art.slug || art.id)}`}
                        onClick={(e) => {
                          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                          e.preventDefault();
                          if (onSelectArticle) onSelectArticle(art);
                          setIsDrawerOpen(false);
                        }}
                        className="group cursor-pointer space-y-1 block"
                      >
                        <span className="font-sans text-[9px] font-bold text-brand-red-600 uppercase tracking-wider">
                          {art.category}
                        </span>
                        <h4 className="font-sans text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-brand-red-600 transition-colors line-clamp-2">
                          {art.title}
                        </h4>
                        <span className="block font-sans text-[9px] text-slate-400 dark:text-slate-500 font-normal">
                          {art.date}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* 3. Redaksi Info Short */}
                <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-900">
                  <h4 className="font-sans text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    PT Catra Media Nusantara
                  </h4>
                  <p className="font-sans text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Portal berita politik & peristiwa terpercaya di Indonesia. Menyajikan fakta objektif dan investigasi mendalam tanpa kompromi.
                  </p>
                  <span className="block font-sans text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                    Email: redaksi@sinpo.id
                  </span>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
