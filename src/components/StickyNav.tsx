"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import gsap from 'gsap';
import { Article } from '../types';

interface StickyNavProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isDrawerOpen: boolean;
  onToggleDrawer: (open: boolean) => void;
  articles?: Article[];
  onSelectArticle?: (article: Article) => void;
  onSearchSubmit?: (query: string) => void;
}

const CATEGORIES = ["SEMUA", "POLITIK", "PERISTIWA", "HUKUM", "EKBIS", "BONGKAR", "SIN PO DULU"];
const EXTRA_CATEGORIES = ["OLAHRAGA", "BUDAYA", "GALERI", "OPINI", "INDEKS"];
const ALL_CATEGORIES = [...CATEGORIES, ...EXTRA_CATEGORIES];

const highlightText = (text: string, query: string) => {
  if (!query.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <span key={i} className="text-brand-red-600 dark:text-red-500 font-extrabold">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

export default function StickyNav({ 
  selectedCategory, 
  onSelectCategory, 
  searchQuery, 
  onSearchChange,
  isDrawerOpen,
  onToggleDrawer,
  articles,
  onSelectArticle,
  onSearchSubmit
}: StickyNavProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const isLainnyaActive = EXTRA_CATEGORIES.includes(selectedCategory.toUpperCase());

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (dropdownRef.current) {
      if (isHovered) {
        // Slide down reveal using GSAP
        gsap.fromTo(dropdownRef.current, 
          { 
            height: 0, 
            opacity: 0, 
            y: -10, 
            display: 'block' 
          }, 
          { 
            height: 'auto', 
            opacity: 1, 
            y: 0, 
            duration: 0.3, 
            ease: 'power2.out',
            overwrite: 'auto'
          }
        );
      } else {
        // Slide up hide using GSAP
        gsap.to(dropdownRef.current, {
          height: 0,
          opacity: 0,
          y: -10,
          duration: 0.2,
          ease: 'power2.in',
          overwrite: 'auto',
          onComplete: () => {
            if (dropdownRef.current) {
              dropdownRef.current.style.display = 'none';
            }
          }
        });
      }
    }
  }, [isHovered]);

  return (
    <nav id="sticky-editorial-nav" className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-3 py-1.5 md:py-2">
        
        {/* Left: Scrollable horizontal category links with foggy edge fades */}
        <div className="relative w-full md:w-auto overflow-hidden md:overflow-visible -mx-4 md:mx-0">
          
          {/* Left Fog Overlay */}
          <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-white dark:from-slate-950 to-transparent pointer-events-none z-10 md:hidden" />
          
          {/* Right Fog Overlay - Desktop Only */}
          <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-gradient-to-l from-white/10 dark:from-slate-950/10 to-transparent pointer-events-none z-10 hidden md:block" />

          {/* Right Fog Overlay - Mobile Only (cutoff before hamburger menu) */}
          <div className="absolute right-12 top-0 bottom-0 w-2.5 bg-gradient-to-l from-white/80 dark:from-slate-950/80 to-transparent pointer-events-none z-10 md:hidden" />

          {/* Stationary Hamburger Menu for Mobile only */}
          <div className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center bg-white dark:bg-slate-950 z-20 md:hidden select-none">
            <label className="burger scale-[0.75] origin-center" htmlFor="burger-mobile" title="Buka Menu">
              <input 
                type="checkbox" 
                id="burger-mobile" 
                checked={isDrawerOpen}
                onChange={(e) => onToggleDrawer(e.target.checked)}
              />
              <span />
              <span />
              <span />
            </label>
          </div>

          {/* Scrollable Container */}
          <div className="w-full md:w-auto overflow-x-auto md:overflow-x-visible no-scrollbar flex items-center gap-1.5 py-1 pl-3 pr-0 md:px-0 scroll-smooth">
            
            {/* Mobile-Only flat categories list (no dropdown) */}
            <div className="flex md:hidden items-center gap-1 pr-0">
              {ALL_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                const isSpecial = cat === "BONGKAR" || cat === "SIN PO DULU";
                
                return (
                  <button
                    key={cat}
                    onClick={() => onSelectCategory(cat)}
                    className={`px-2 py-0.5 rounded-full font-sans text-[9px] uppercase font-bold tracking-wider transition-all duration-150 shrink-0 select-none cursor-pointer ${
                      isActive
                        ? "bg-brand-red-600 text-white shadow-sm"
                        : isSpecial
                          ? "bg-brand-gold/15 text-amber-700 dark:text-brand-gold hover:bg-brand-gold/25"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
              {/* Spacer matching the width of the mobile hamburger menu with a clean margin */}
              <div className="w-24 shrink-0" />
            </div>

            {/* Desktop-Only categories list with "Lainnya" Dropdown */}
            <div className="hidden md:flex items-center gap-1.5">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                const isSpecial = cat === "BONGKAR" || cat === "SIN PO DULU";
                
                return (
                  <button
                    key={cat}
                    onClick={() => onSelectCategory(cat)}
                    className={`px-3 py-1.5 rounded-full font-sans text-xs uppercase font-bold tracking-wider transition-all duration-150 shrink-0 select-none cursor-pointer ${
                      isActive
                        ? "bg-brand-red-600 text-white shadow-sm"
                        : isSpecial
                          ? "bg-brand-gold/15 text-amber-700 dark:text-brand-gold hover:bg-brand-gold/25"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}

              {/* Lainnya Dropdown Container */}
              <div 
                className="relative shrink-0"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <button
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-sans text-xs uppercase font-bold tracking-wider transition-all duration-150 select-none cursor-pointer ${
                    isLainnyaActive
                      ? "bg-brand-red-600 text-white shadow-sm"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  <span>Lainnya</span>
                  {isHovered ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M6 15l6 -6l6 6" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M6 9l6 6l6 -6" /></svg>
                  )}
                </button>

                {/* GSAP dropdown list wrapper to prevent hover flicker by bridging the gap */}
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 pt-1.5 z-50 min-w-[150px]"
                  style={{ display: 'none' }}
                >
                  <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[5px] shadow-xl overflow-hidden flex flex-col py-1.5 divide-y divide-slate-100 dark:divide-slate-900">
                    {EXTRA_CATEGORIES.map((cat) => {
                      const isCatActive = selectedCategory.toUpperCase() === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            onSelectCategory(cat);
                            setIsHovered(false);
                          }}
                          className={`w-full text-left px-4 py-2 font-sans text-xs uppercase font-extrabold tracking-wider transition-colors cursor-pointer ${
                            isCatActive
                              ? "bg-brand-red-600 text-white"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-brand-red-600 dark:hover:text-brand-red-500"
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

          </div>
        </div>

        {/* Right: Live Interactive Search Bar & Hamburger Menu */}
        <div className="hidden md:flex items-center gap-4 w-full md:w-auto justify-between md:justify-end shrink-0">
          <div ref={searchContainerRef} className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="news-search-input"
              type="text"
              value={searchQuery}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (onSearchSubmit && searchQuery.trim()) {
                    onSearchSubmit(searchQuery);
                    setShowSuggestions(false);
                  }
                }
              }}
              placeholder="Cari berita politik & peristiwa..."
              className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs font-sans focus:outline-none focus:ring-2 focus:ring-brand-red-600 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  onSearchChange("");
                  setShowSuggestions(false);
                }}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Bersihkan Pencarian"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Auto Search suggestions dropdown */}
            {showSuggestions && searchQuery.trim().length > 0 && (() => {
              const suggestions = articles
                ? articles.filter(art => 
                    art.title.toLowerCase().includes(searchQuery.toLowerCase())
                  ).slice(0, 5)
                : [];
              if (suggestions.length === 0) {
                return (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl rounded-[5px] overflow-hidden z-50 p-4 text-center">
                    <p className="font-sans text-xs text-slate-500 dark:text-slate-400">
                      Tidak ada berita dengan judul "{searchQuery}"
                    </p>
                  </div>
                );
              }
              return (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl rounded-[5px] overflow-hidden z-50 max-h-64 overflow-y-auto">
                  <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-900">
                    {suggestions.map((art) => (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() => {
                          onSelectArticle?.(art);
                          setShowSuggestions(false);
                          onSearchChange("");
                        }}
                        className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors focus:outline-none flex flex-col gap-0.5"
                      >
                        <span className="font-sans text-[8px] font-black text-brand-red-600 uppercase tracking-wider leading-none">
                          {art.category}
                        </span>
                        <h5 className="font-sans text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">
                          {highlightText(art.title, searchQuery)}
                        </h5>
                        <span className="font-sans text-[9px] text-slate-400 dark:text-slate-500 font-normal leading-none mt-0.5">
                          {art.date}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Elegant Checkbox Hamburger Menu */}
          <div className="flex items-center text-slate-900 dark:text-white shrink-0 select-none">
            <label className="burger" htmlFor="burger" title="Buka Menu">
              <input 
                type="checkbox" 
                id="burger" 
                checked={isDrawerOpen}
                onChange={(e) => onToggleDrawer(e.target.checked)}
              />
              <span />
              <span />
              <span />
            </label>
          </div>
        </div>

      </div>
    </nav>
  );
}
