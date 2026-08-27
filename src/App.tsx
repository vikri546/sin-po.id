"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Calendar, X, Loader2, ChevronRight, Instagram, Facebook, Youtube, RefreshCw } from 'lucide-react';
import BreakingTicker from './components/BreakingTicker';
import Header from './components/Header';
import StickyNav from './components/StickyNav';
import NewsGrid from './components/NewsGrid';
import Sidebar from './components/Sidebar';
import BongkarSection from './components/BongkarSection';
import HukumPolitikSection from './components/HukumPolitikSection';
import ArticleDetailView from './components/ArticleDetailView';
import CategoryPageView from './components/CategoryPageView';
import IndeksPageView from './components/IndeksPageView';
import Skeleton from './components/skeletons/Skeleton';
import Toast from './components/Toast';
import Logo from './components/Logo';
import { Article, Comment } from './types';
import { apiFetch, transformLaravelPostToArticle } from './lib/apiClient';
import { parseAnyDate } from './lib/dateFormatter';
import { stripHtml } from './lib/htmlRenderer';
import StaticPageModal from './components/StaticPageModal';




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

export default function App() {
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('sinpo_theme');
    return saved === 'dark';
  });

  // Category and Search Filtering States
  const [selectedCategory, setSelectedCategory] = useState<string>("SEMUA");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchDate, setSearchDate] = useState<string>("");

  // Load More / Pagination States for Search and Tag pages
  const [visibleSearchCount, setVisibleSearchCount] = useState<number>(10);
  const [isSearchingMore, setIsSearchingMore] = useState<boolean>(false);

  useEffect(() => {
    setVisibleSearchCount(10);
    setIsSearchingMore(false);
  }, [selectedTag, submittedSearchQuery, searchDate]);

  // Bookmarks State
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('sinpo_bookmarks_v1');
    return saved ? JSON.parse(saved) : [];
  });
  const [showBookmarksOnly, setShowBookmarksOnly] = useState<boolean>(false);

  // Live State from Laravel REST API
  const [articlesState, setArticlesState] = useState<Article[]>([]);
  const [breakingNewsList, setBreakingNewsList] = useState<string[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [popularNewsList, setPopularNewsList] = useState<Article[]>([]);
  const [staticModalSlug, setStaticModalSlug] = useState<string | null>(null);

  // Fetch all live data exclusively from Laravel REST API
  useEffect(() => {
    async function fetchAllLiveData() {
      // 1. Fetch main news & headline
      try {
        const response = await apiFetch('/berita');
        if (response.success && Array.isArray(response.data)) {
          const liveArticles = response.data.map(transformLaravelPostToArticle);
          setArticlesState(liveArticles);
        }
      } catch (err) {
        console.log('Laravel REST API /berita: offline');
        setArticlesState([]);
      }

      // 1b. Fetch headline news specifically
      try {
        const headlineRes = await apiFetch('/headline');
        if (headlineRes.success && headlineRes.data) {
          const rawHeadline = Array.isArray(headlineRes.data) ? headlineRes.data[0] : headlineRes.data;
          if (rawHeadline) {
            const headlineArticle = transformLaravelPostToArticle(rawHeadline);
            headlineArticle.isHero = true;
            setArticlesState(prev => {
              const filtered = prev.filter(a => a.id !== headlineArticle.id);
              return [headlineArticle, ...filtered];
            });
          }
        }
      } catch (err) {
        console.log('Laravel REST API /headline: offline');
      }

      // 2. Fetch categories
      try {
        const catRes = await apiFetch('/kategori');
        if (catRes.success && Array.isArray(catRes.data)) {
          const catNames = catRes.data.map((c: any) => (c.nama || c.name || '').toUpperCase());
          setCategoriesList(['SEMUA', ...catNames]);
        }
      } catch (err) {
        console.log('Laravel REST API /kategori: offline');
      }

      // 3. Fetch popular news for sidebar & breaking news ticker (max 5)
      try {
        const popRes = await apiFetch('/populer?limit=5');
        if (popRes.success && Array.isArray(popRes.data)) {
          const popArticles = popRes.data.map(transformLaravelPostToArticle).slice(0, 5);
          setPopularNewsList(popArticles);
          
          const popularTickerItems = popArticles.map(a => `${a.category}: ${a.title}`);
          if (popularTickerItems.length > 0) {
            setBreakingNewsList(popularTickerItems);
          }
        }
      } catch (err) {
        console.log('Laravel REST API /populer: offline');
      }
    }
    fetchAllLiveData();
  }, []);

  // Refetch news from Laravel API whenever category, search query, or tag changes
  useEffect(() => {
    let isMounted = true;
    async function fetchFilteredNews() {
      try {
        let endpoint = '/berita';
        const params = new URLSearchParams();

        if (submittedSearchQuery && submittedSearchQuery.trim()) {
          params.append('q', submittedSearchQuery.trim());
        }

        if (selectedCategory && selectedCategory !== 'SEMUA' && selectedCategory !== 'INDEKS') {
          let catQuery = selectedCategory.toLowerCase();
          if (catQuery === 'ekonomi & bisnis') catQuery = 'ekbis';
          params.append('kategori', catQuery);
        }

        if (selectedTag && selectedTag.trim()) {
          params.append('tag', selectedTag.trim());
        }

        params.append('limit', '20');

        const queryString = params.toString();
        if (queryString) {
          endpoint += `?${queryString}`;
        }

        const res = await apiFetch(endpoint);
        if (isMounted && res.success && Array.isArray(res.data)) {
          const articles = res.data.map(transformLaravelPostToArticle);
          setArticlesState(articles);
        }
      } catch (err) {
        console.log('Filtered news API fetch notice:', err);
      }
    }

    fetchFilteredNews();

    return () => {
      isMounted = false;
    };
  }, [submittedSearchQuery, selectedCategory, selectedTag]);

  // Loading & Skeleton State (automatic initial load, reload & navigation transition)
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(true);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerLoading = useCallback((durationMs: number = 600) => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
    setIsLoadingContent(true);
    loadingTimerRef.current = setTimeout(() => {
      setIsLoadingContent(false);
    }, durationMs);
  }, []);

  // Initial page load / refresh skeleton loading effect (800ms)
  useEffect(() => {
    triggerLoading(800);
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, [triggerLoading]);

  // Selected Article for the Reader Modal
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const homeScrollPosRef = React.useRef<number>(0);

  const handleSelectArticle = (article: Article | null, forceScrollToTop: boolean = false) => {
    if (article) {
      if (!selectedArticle) {
        homeScrollPosRef.current = window.scrollY;
      }
      setSelectedArticle(article);
      triggerLoading(600);
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      setSelectedArticle(null);
      if (forceScrollToTop) {
        homeScrollPosRef.current = 0;
      }
      setTimeout(() => {
        window.scrollTo({ top: homeScrollPosRef.current, behavior: 'auto' });
      }, 0);
    }
  };

  // User's own comments list for deletion permission
  const [myCommentIds, setMyCommentIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('sinpo_my_comment_ids_v1');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync myCommentIds changes with localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('sinpo_my_comment_ids_v1', JSON.stringify(myCommentIds));
  }, [myCommentIds]);

  // Drawer Side Panel State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Toast Messaging System
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<'success' | 'info'>('success');

  // Trigger Toast helper
  const triggerToast = (_message: string, _type: 'success' | 'info' = 'success') => {
    // Disabled as requested
  };

  // Sync theme changes with DOM documentElement for Tailwind dark: utility classes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('sinpo_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('sinpo_theme', 'light');
    }
  }, [isDarkMode]);

  // Sync bookmarks changes with localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('sinpo_bookmarks_v1', JSON.stringify(bookmarkedIds));
  }, [bookmarkedIds]);

  // Toggle Bookmark Handler
  const handleToggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        triggerToast("Berita dihapus dari Penanda Anda", "info");
        return prev.filter((item) => item !== id);
      } else {
        triggerToast("Berita berhasil disimpan ke Penanda!", "success");
        return [...prev, id];
      }
    });
  };

  // Add Comment Handler (Post to /api/komentar)
  const handleAddComment = async (articleId: string, name: string, commentText: string) => {
    const newCommentId = `comment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Submit comment to Laravel REST API backend
    try {
      const numericId = parseInt(articleId.replace('laravel-', ''), 10);
      if (!isNaN(numericId)) {
        await apiFetch('/komentar', {
          method: 'POST',
          body: JSON.stringify({
            berita_id: numericId,
            nama: name,
            email: `${name.toLowerCase().replace(/\s+/g, '')}@pembaca.sinpo.id`,
            komentar: commentText,
          }),
        });
        triggerToast("Komentar Anda berhasil dikirim ke server!", "success");
      }
    } catch (err: any) {
      console.log('API komentar notice:', err?.message);
    }

    setArticlesState((prevArticles) => {
      return prevArticles.map((art) => {
        if (art.id === articleId) {
          const newComment: Comment = {
            id: newCommentId,
            name,
            commentText,
            date: new Date().toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) + " WIB"
          };
          return {
            ...art,
            comments: [newComment, ...art.comments] // Prepend new comments
          };
        }
        return art;
      });
    });
    setMyCommentIds((prev) => [...prev, newCommentId]);
    triggerToast("Opini Anda berhasil dikirim!", "success");
  };

  // Delete Comment Handler
  const handleDeleteComment = (articleId: string, commentId: string) => {
    setArticlesState((prevArticles) => {
      return prevArticles.map((art) => {
        if (art.id === articleId) {
          return {
            ...art,
            comments: art.comments.filter((c) => c.id !== commentId)
          };
        }
        return art;
      });
    });
    setMyCommentIds((prev) => prev.filter((id) => id !== commentId));
    triggerToast("Opini Anda berhasil dihapus!", "success");
  };

  // Handle clicking on popular items in the right sidebar
  const handleSelectPopular = (popularId: string) => {
    let matched: Article | undefined;
    if (popularId === "pop-1") {
      matched = articlesState.find((a) => a.id === "art-1" || a.id === "art-6");
    } else if (popularId === "pop-2") {
      matched = articlesState.find((a) => a.id === "art-3");
    } else if (popularId === "pop-3") {
      matched = articlesState.find((a) => a.id === "art-4" || a.id === "art-7");
    } else if (popularId === "pop-4") {
      matched = articlesState.find((a) => a.id === "art-5");
    } else if (popularId === "pop-5") {
      matched = articlesState.find((a) => a.id === "art-2");
    }

    if (matched) {
      handleSelectArticle(matched);
    } else {
      triggerToast("Artikel terpopuler sedang dimuat...", "info");
    }
  };

  // Keep the active modal article in sync with the live state of comments
  const activeModalArticle = useMemo(() => {
    if (!selectedArticle) return null;
    return articlesState.find((a) => a.id === selectedArticle.id) || selectedArticle;
  }, [articlesState, selectedArticle]);

  // Dynamic Document Title based on current page / modal state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (activeModalArticle) {
      document.title = `${stripHtml(activeModalArticle.title)} – SinPo.id`;
    } else if (staticModalSlug) {
      const staticTitleMap: Record<string, string> = {
        'tentang-kami': 'Tentang Kami',
        'redaksi': 'Susunan Redaksi',
        'hak-jawab': 'Hak Jawab & Koreksi',
        'hubungi-kami': 'Hubungi Kami',
        'kebijakan-privasi': 'Kebijakan Privasi',
        'pedoman-siber': 'Pedoman Pemberitaan Media Siber',
      };
      const pageTitle = staticTitleMap[staticModalSlug] || 'Halaman';
      document.title = `${pageTitle} – SinPo.id`;
    } else if (submittedSearchQuery && submittedSearchQuery.trim()) {
      document.title = `Pencarian: "${submittedSearchQuery.trim()}" – SinPo.id`;
    } else if (selectedTag && selectedTag.trim()) {
      document.title = `Tag: #${selectedTag.trim()} – SinPo.id`;
    } else if (selectedCategory === 'INDEKS') {
      document.title = `Indeks Berita – SinPo.id`;
    } else if (selectedCategory && selectedCategory !== 'SEMUA') {
      document.title = `${selectedCategory.toUpperCase()} – SinPo.id`;
    } else {
      document.title = `SinPo.id – Matahari Indonesia`;
    }
  }, [activeModalArticle, staticModalSlug, submittedSearchQuery, selectedTag, selectedCategory]);

  // Cooperative Search & Category Filtering
  const filteredArticles = useMemo(() => {
    return articlesState.filter((article) => {
      // 1. Bookmarks toggle constraint
      if (showBookmarksOnly && !bookmarkedIds.includes(article.id)) {
        return false;
      }
      
      // 2. Category selection constraint
      if (selectedCategory !== "SEMUA") {
        if (article.category.toUpperCase() !== selectedCategory.toUpperCase()) {
          return false;
        }
      }

      return true;
    });
  }, [articlesState, selectedCategory, bookmarkedIds, showBookmarksOnly]);

  // Filter articles based on title search submit query and sort by newest first
  const searchMatchedArticles = useMemo(() => {
    if (!submittedSearchQuery) return [];
    const query = submittedSearchQuery.toLowerCase();
    
    const filtered = articlesState.filter(art => {
      const matchQuery = art.title.toLowerCase().includes(query);
      if (!matchQuery) return false;
      if (!searchDate) return true;

      try {
        const [sYear, sMonth, sDay] = searchDate.split('-').map(num => parseInt(num, 10));
        const artDate = parseAnyDate(art.date);
        return artDate.getFullYear() === sYear && 
               (artDate.getMonth() + 1) === sMonth && 
               artDate.getDate() === sDay;
      } catch (e) {
        return true;
      }
    });

    // Sort by date descending (newest first)
    return [...filtered].sort((a, b) => {
      const dateA = parseAnyDate(a.date);
      const dateB = parseAnyDate(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [articlesState, submittedSearchQuery, searchDate]);

  // Filter articles based on selected tag and sort by newest first
  const tagMatchedArticles = useMemo(() => {
    if (!selectedTag) return [];
    const tagQuery = selectedTag.toLowerCase();

    const filtered = articlesState.filter(art => {
      const matchTag = art.tags.some(t => t.toLowerCase() === tagQuery);
      if (!matchTag) return false;
      if (!searchDate) return true;

      try {
        const [sYear, sMonth, sDay] = searchDate.split('-').map(num => parseInt(num, 10));
        const artDate = parseAnyDate(art.date);
        return artDate.getFullYear() === sYear && 
               (artDate.getMonth() + 1) === sMonth && 
               artDate.getDate() === sDay;
      } catch (e) {
        return true;
      }
    });

    // Sort by date descending (newest first)
    return [...filtered].sort((a, b) => {
      const dateA = parseAnyDate(a.date);
      const dateB = parseAnyDate(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [articlesState, selectedTag, searchDate]);

  const activeMatchedArticles = useMemo(() => {
    return selectedTag ? tagMatchedArticles : searchMatchedArticles;
  }, [selectedTag, tagMatchedArticles, searchMatchedArticles]);

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
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 ${isDarkMode ? 'dark' : ''}`}>
      
      {/* A. Top Editorial Bar & Breaking News Ticker */}
      <BreakingTicker 
        items={breakingNewsList} 
        articles={popularNewsList.length > 0 ? popularNewsList : articlesState}
        onSelectArticle={handleSelectArticle}
      />

      {/* B. Central Brand Header */}
      <Header
        bookmarkCount={bookmarkedIds.length}
        showBookmarksOnly={showBookmarksOnly}
        onToggleBookmarksOnly={() => setShowBookmarksOnly(!showBookmarksOnly)}
        selectedCategory={(submittedSearchQuery || selectedTag || activeModalArticle) ? "" : selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          setShowBookmarksOnly(false);
          handleSelectArticle(null, true);
          setSubmittedSearchQuery(null);
          setSelectedTag(null);
          setSearchQuery("");
          triggerLoading(600);
        }}
        articles={articlesState}
        onSelectArticle={(art) => {
          handleSelectArticle(art);
          setSubmittedSearchQuery(null);
          setSelectedTag(null);
          setSearchQuery("");
        }}
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={(query) => {
          setSubmittedSearchQuery(query);
          handleSelectArticle(null, true);
          setSelectedTag(null);
          setSearchDate("");
          triggerLoading(600);
        }}
      />

      {/* C. Sticky Navigation Category & Live Search */}
      <StickyNav
        selectedCategory={(submittedSearchQuery || selectedTag || activeModalArticle) ? "" : selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          // Auto-disable Bookmarks Only filter if they specifically change categories to avoid confusion
          setShowBookmarksOnly(false);
          handleSelectArticle(null, true);
          setSubmittedSearchQuery(null);
          setSelectedTag(null);
          setSearchQuery("");
          setSearchDate("");
          triggerLoading(600);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={setIsDrawerOpen}
        articles={articlesState}
        onSelectArticle={(art) => {
          handleSelectArticle(art);
          setSubmittedSearchQuery(null);
          setSelectedTag(null);
          setSearchQuery("");
          setSearchDate("");
        }}
        onSearchSubmit={(query) => {
          setSubmittedSearchQuery(query);
          handleSelectArticle(null, true);
          setSelectedTag(null);
          setSearchDate("");
          triggerLoading(600);
        }}
      />

      {activeModalArticle ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Column 1 & 2: Main News Detail (2/3 width) */}
            <section className="lg:col-span-2 flex flex-col gap-8">
              <ArticleDetailView
                article={activeModalArticle}
                onBack={() => handleSelectArticle(null)}
                bookmarkedIds={bookmarkedIds}
                onToggleBookmark={handleToggleBookmark}
                onAddComment={handleAddComment}
                onDeleteComment={handleDeleteComment}
                myCommentIds={myCommentIds}
                onShare={(msg) => triggerToast(msg, 'success')}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                  setShowBookmarksOnly(false);
                  triggerLoading(600);
                }}
                articles={articlesState}
                onSelectArticle={handleSelectArticle}
                onSelectTag={(tag) => {
                  setSelectedTag(tag);
                  handleSelectArticle(null);
                  triggerLoading(600);
                }}
                isLoading={isLoadingContent}
              />
            </section>

            {/* Column 3: Sidebar widgets (1/3 width) */}
            <section className="lg:col-span-1 lg:sticky lg:top-20 self-start">
              <Sidebar 
                onSelectPopular={handleSelectPopular} 
                hideExtraWidgets={true} 
                variant="detail" 
                articles={articlesState}
                popularArticles={popularNewsList}
                onSelectArticle={handleSelectArticle}
                isLoading={isLoadingContent}
              />
            </section>

          </div>
        </main>
      ) : (submittedSearchQuery || selectedTag) ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Column 1 & 2: Search Results List (2/3 width) */}
            <section className="lg:col-span-2 flex flex-col gap-5">
              <IndeksPageView
                articles={activeMatchedArticles}
                onSelectArticle={handleSelectArticle}
                isDarkMode={isDarkMode}
                isLoading={isLoadingContent}
              />
            </section>

            {/* Column 3: Sidebar (1/3 width) */}
            <section className="lg:col-span-1 lg:sticky lg:top-20 self-start">
              <Sidebar 
                onSelectPopular={handleSelectPopular} 
                variant="home" 
                showSearchBanners={true}
                articles={articlesState}
                popularArticles={popularNewsList}
                onSelectArticle={handleSelectArticle}
                isLoading={isLoadingContent}
              />
            </section>

          </div>
        </main>
      ) : selectedCategory === "INDEKS" ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Column 1 & 2: Indeks View (2/3 width) */}
            <section className="lg:col-span-2 flex flex-col gap-5">
              <IndeksPageView
                articles={articlesState}
                onSelectArticle={handleSelectArticle}
                isDarkMode={isDarkMode}
                isLoading={isLoadingContent}
              />
            </section>

            {/* Column 3: Sidebar (1/3 width) */}
            <section className="lg:col-span-1 lg:sticky lg:top-20 self-start">
              <Sidebar 
                onSelectPopular={handleSelectPopular} 
                variant="home" 
                showSearchBanners={true}
                articles={articlesState}
                popularArticles={popularNewsList}
                onSelectArticle={handleSelectArticle}
                isLoading={isLoadingContent}
              />
            </section>

          </div>
        </main>
      ) : selectedCategory !== "SEMUA" ? (
        <>
          {/* Category Hero Banner - Edge to edge, 16:9, touching StickyNav */}
          {(() => {
            if (isLoadingContent) {
              return (
                <div className="relative w-full aspect-[3/4] sm:aspect-square md:aspect-[16/10] lg:aspect-video overflow-hidden bg-slate-900 border-b border-slate-200 dark:border-slate-800 animate-fade-in select-none">
                  {/* Full image area skeleton */}
                  <Skeleton className="absolute inset-0 h-full w-full opacity-40" />

                  {/* Combined gradient shadow */}
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/95 via-black/70 md:via-black/80 via-[40%] md:via-[32%] to-transparent z-10 pointer-events-none" />

                  {/* Main Hero Content Overlay Skeleton */}
                  <div className="absolute inset-0 flex flex-col justify-end md:justify-center p-4 sm:p-12 md:p-16 lg:p-20 md:pb-32 lg:pb-40 z-20">
                    <div className="max-w-7xl w-full mx-auto h-full flex flex-col justify-end md:justify-center">
                      <div className="w-full md:w-[48%] flex flex-col justify-end md:justify-center gap-2 sm:gap-4 md:gap-5 text-left">
                        <Skeleton className="h-3 md:h-4 w-24 rounded-xs" />
                        <div className="flex flex-col gap-2">
                          <Skeleton className="h-6 sm:h-8 md:h-10 lg:h-12 w-full rounded-sm" />
                          <Skeleton className="h-6 sm:h-8 md:h-10 lg:h-12 w-4/5 rounded-sm" />
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1">
                          <Skeleton className="h-3.5 sm:h-4 w-full rounded-xs" />
                          <Skeleton className="h-3.5 sm:h-4 w-3/4 rounded-xs" />
                        </div>
                        <div className="flex items-center justify-between border-t border-white/15 pt-3 sm:pt-4 mt-2">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-3.5 w-24 rounded-xs" />
                            <Skeleton className="h-3.5 w-20 rounded-xs" />
                          </div>
                          <Skeleton className="h-4 w-28 rounded-xs" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4 Bottom Columns Overlay Skeleton (Desktop & Tablet) */}
                  <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/85 backdrop-blur-md border-t border-white/20 py-3 md:py-4 px-4 md:px-8 lg:px-20 hidden md:block">
                    <div className="max-w-7xl w-full mx-auto grid grid-cols-4 gap-3 lg:gap-6">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="flex flex-row items-start gap-2 lg:gap-3 text-left border-r last:border-r-0 border-white/25 pr-2 lg:pr-4 last:pr-0 h-full"
                        >
                          {/* Number 2, 3, 4, 5 */}
                          <div className="font-sans text-lg md:text-xl lg:text-3xl font-black text-brand-red-500/50 leading-none select-none pt-0.5">
                            {idx + 2}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 flex flex-col h-full gap-1">
                            <Skeleton className="h-3.5 lg:h-4 w-full rounded-xs" />
                            <Skeleton className="h-3.5 lg:h-4 w-4/5 rounded-xs" />
                            <div className="flex items-center gap-1 text-[8px] lg:text-[9px] mt-auto pt-1">
                              <Skeleton className="h-3 w-16 rounded-xs" />
                              <Skeleton className="h-3 w-16 rounded-xs" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            const categoryArticles = articlesState.filter(
              (art) => art.category.toUpperCase() === selectedCategory.toUpperCase()
            );
            const heroArticle = categoryArticles.find((art) => art.isHero) || categoryArticles[0];
            
            if (!heroArticle) return null;

            const otherFourArticles = categoryArticles
              .filter((art) => art.id !== heroArticle.id)
              .slice(0, 4);

            return (
              <div 
                onClick={() => handleSelectArticle(heroArticle)}
                className="group relative w-full aspect-[3/4] sm:aspect-square md:aspect-[16/10] lg:aspect-video overflow-hidden bg-slate-900 cursor-pointer transition-all border-b border-slate-200 dark:border-slate-800"
              >
                {/* 16:9 Image */}
                <img
                  src={heroArticle.imageUrl}
                  alt={heroArticle.title}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                
                {/* Combined gradient shadow: bottom vignette on mobile (tighter and thinner), left vignette on desktop */}
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/95 via-black/70 md:via-black/80 via-[40%] md:via-[32%] to-transparent z-10" />
                
                {/* Content Overlay */}
                <div className="group/hero absolute inset-0 flex flex-col justify-end md:justify-center p-4 sm:p-12 md:p-16 lg:p-20 md:pb-32 lg:pb-40 z-20">
                  <div className="max-w-7xl w-full mx-auto h-full flex flex-col justify-end md:justify-center">
                    {/* Left aligned text with 2-column look (left column filled, right column empty) */}
                    <div className="w-full md:w-[48%] flex flex-col justify-end md:justify-center gap-2 sm:gap-4 md:gap-5 text-left">
                      <span className="text-[9px] md:text-xs font-black uppercase tracking-widest text-brand-red-500">
                        {heroArticle.category}
                      </span>
                      
                      <h2 className="font-sans text-lg sm:text-2xl md:text-3xl lg:text-5xl xl:text-6xl font-black text-white leading-[1.1] tracking-tight group-hover/hero:text-brand-red-400 transition-colors">
                        {heroArticle.title}
                      </h2>
                      
                      <p className="font-sans text-[10px] sm:text-xs md:text-sm text-slate-300 leading-relaxed line-clamp-2 font-normal opacity-90">
                        {stripHtml(heroArticle.subtitle || heroArticle.summary || heroArticle.content)}
                      </p>
                      <div className="flex items-center justify-between border-t border-white/15 pt-3 sm:pt-4 mt-2">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-xs text-slate-300 font-sans">
                           <span className="font-bold text-slate-100">{heroArticle.author}</span>
                          <span>•</span>
                          <span>{heroArticle.date}</span>
                        </div>
                        <span className="flex items-center gap-1 text-[9px] sm:text-xs font-black uppercase tracking-wider text-brand-red-500">
                          BACA SEKARANG <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Bottom Columns Overlay (Desktop & Tablet optimized) */}
                {otherFourArticles.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/75 backdrop-blur-md border-t border-white/20 py-3 md:py-4 px-4 md:px-8 lg:px-20 hidden md:block">
                    <div className="max-w-7xl w-full mx-auto grid grid-cols-4 gap-3 lg:gap-6">
                      {otherFourArticles.map((art, idx) => (
                        <div 
                          key={art.id}
                          onClick={(e) => {
                            e.stopPropagation(); // Avoid triggering main hero click
                            handleSelectArticle(art);
                          }}
                          className="group/item flex flex-row items-start gap-2 lg:gap-3 text-left border-r last:border-r-0 border-white/25 pr-2 lg:pr-4 last:pr-0 cursor-pointer h-full"
                        >
                          {/* Number 2, 3, 4, 5 */}
                          <div className="font-sans text-lg md:text-xl lg:text-3xl font-black text-brand-red-500 leading-none select-none pt-0.5">
                            {idx + 2}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 flex flex-col h-full gap-0.5 lg:gap-1">
                            <h4 className="font-sans text-[10px] lg:text-[13px] font-bold text-white line-clamp-2 leading-snug group-hover/item:text-brand-red-400 transition-colors">
                              {art.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-1 lg:gap-x-1.5 text-[8px] lg:text-[9px] text-slate-400 font-sans mt-auto pt-1">
                              <span className="font-bold text-slate-300 truncate max-w-[70px] lg:max-w-[90px]">{art.author}</span>
                              <span>•</span>
                              <span>{art.date}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Standard Layout for category list (full-width for custom 3-column) */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 pt-4 md:pt-6 pb-8 animate-fade-in">
            {(() => {
              const matched = articlesState.filter((art) => {
                const sel = selectedCategory.toUpperCase();
                const artCat = art.category.toUpperCase();
                if (sel === 'EKBIS' || sel === 'EKONOMI & BISNIS') {
                  return artCat === 'EKBIS' || artCat === 'EKONOMI & BISNIS' || artCat === 'EKONOMI';
                }
                return artCat === sel || artCat.includes(sel) || sel.includes(artCat);
              });
              const categoryArticles = matched.length > 0 ? matched : articlesState;
              const heroArticle = categoryArticles.find((art) => art.isHero) || categoryArticles[0];
              const otherArticles = heroArticle 
                ? categoryArticles.filter((art) => art.id !== heroArticle.id) 
                : categoryArticles;

              return (
                <CategoryPageView
                  category={selectedCategory}
                  articles={otherArticles}
                  allCategoryArticles={categoryArticles}
                  onSelectArticle={handleSelectArticle}
                  isLoading={isLoadingContent}
                />
              );
            })()}
          </main>
        </>
      ) : (
        <>
          {/* D. Main Body Section (Two-Column Desktop Grid) */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* Column 1 & 2: Main News Feed & Media Consoles (2/3 width) */}
              <section className="lg:col-span-2 flex flex-col gap-8">
                
                {/* Main news grid content stream */}
                <NewsGrid
                  articles={filteredArticles}
                  bookmarkedIds={bookmarkedIds}
                  onToggleBookmark={handleToggleBookmark}
                  onSelectArticle={handleSelectArticle}
                  selectedCategory={selectedCategory}
                  onSelectPopular={handleSelectPopular}
                  isLoading={isLoadingContent}
                />

              </section>

              {/* Column 3: Sidebar widgets (1/3 width) */}
              <section className="lg:col-span-1 lg:sticky lg:top-20 self-start">
                <Sidebar 
                  onSelectPopular={handleSelectPopular} 
                  variant="home" 
                  articles={articlesState}
                  popularArticles={popularNewsList}
                  onSelectArticle={handleSelectArticle}
                  isLoading={isLoadingContent}
                />
              </section>

            </div>
          </main>

          {/* Horizontal Divider Line running completely edge-to-edge */}
          <hr className="border-t border-slate-200 dark:border-slate-800/80 w-full my-8" />

          {/* E. BONGKAR & BERITA LAINNYA & F. HUKUM & POLITIK (Spans full centered width with proper padding) */}
          <div className="max-w-7xl w-full mx-auto px-4 md:px-8 pb-8">
            <BongkarSection
              articles={filteredArticles}
              onSelectArticle={handleSelectArticle}
              isLoading={isLoadingContent}
            />

            {/* F. HUKUM & POLITIK (Two-Column Category Stream Section) */}
            <HukumPolitikSection
              articles={articlesState}
              onSelectArticle={handleSelectArticle}
              isLoading={isLoadingContent}
            />
          </div>
        </>
      )}

      {/* E. Global Footer Branding */}
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 text-xs py-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Column 1: Brand Logo & Social Media */}
          <div className="flex flex-col gap-4 text-left col-span-2 md:col-span-2 items-start">
            <Logo isDarkMode={true} heightClass="h-7 md:h-8" />
            <p className="text-slate-500 font-sans leading-relaxed max-w-sm text-[11px] md:text-xs">
              Portal Berita Terpercaya menyajikan informasi terkini dan terpopuler dari seluruh penjuru tanah air secara tajam dan berimbang.
            </p>
            {/* Social Media Links */}
            <div className="flex items-center gap-3.5 mt-1">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-900 hover:bg-brand-red-600 text-slate-400 hover:text-white rounded-full transition-all duration-300" title="Instagram Sin Po">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-900 hover:bg-brand-red-600 text-slate-400 hover:text-white rounded-full transition-all duration-300" title="Facebook Sin Po">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-900 hover:bg-brand-red-600 text-slate-400 hover:text-white rounded-full transition-all duration-300" title="X (Twitter) Sin Po">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-900 hover:bg-brand-red-600 text-slate-400 hover:text-white rounded-full transition-all duration-300 flex items-center justify-center" title="TikTok Sin Po">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .8.11v-3.5a6.39 6.39 0 0 0-3.11.8 6.27 6.27 0 0 0-3.3 5.48 6.28 6.28 0 0 0 10.15 4.9 6.24 6.24 0 0 0 2.22-4.9V8a8.15 8.15 0 0 0 5.23 2.08V6.66a4.86 4.86 0 0 1-1.92-.47 4.8 4.8 0 0 1-1.31-.96z" />
                </svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-900 hover:bg-brand-red-600 text-slate-400 hover:text-white rounded-full transition-all duration-300" title="YouTube Sin Po">
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>
 
          {/* Column 2: Kategori */}
          <div className="flex flex-col gap-3 text-left col-span-1">
            <h4 className="font-sans font-extrabold uppercase tracking-widest text-[11px] text-slate-200">KATEGORI</h4>
            <div className="flex flex-col gap-2 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <button 
                onClick={() => {
                  setSelectedCategory("POLITIK");
                  setShowBookmarksOnly(false);
                  handleSelectArticle(null, true);
                  setSubmittedSearchQuery(null);
                  setSelectedTag(null);
                  setSearchQuery("");
                  setSearchDate("");
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-white transition-colors text-left cursor-pointer"
              >
                POLITIK
              </button>
              <button 
                onClick={() => {
                  setSelectedCategory("HUKUM");
                  setShowBookmarksOnly(false);
                  handleSelectArticle(null, true);
                  setSubmittedSearchQuery(null);
                  setSelectedTag(null);
                  setSearchQuery("");
                  setSearchDate("");
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-white transition-colors text-left cursor-pointer"
              >
                HUKUM
              </button>
              <button 
                onClick={() => {
                  setSelectedCategory("EKBIS");
                  setShowBookmarksOnly(false);
                  handleSelectArticle(null, true);
                  setSubmittedSearchQuery(null);
                  setSelectedTag(null);
                  setSearchQuery("");
                  setSearchDate("");
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-white transition-colors text-left cursor-pointer"
              >
                EKONOMI & BISNIS
              </button>
              <button 
                onClick={() => {
                  setSelectedCategory("PERISTIWA");
                  setShowBookmarksOnly(false);
                  handleSelectArticle(null, true);
                  setSubmittedSearchQuery(null);
                  setSelectedTag(null);
                  setSearchQuery("");
                  setSearchDate("");
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-white transition-colors text-left cursor-pointer"
              >
                PERISTIWA
              </button>
            </div>
          </div>
 
          {/* Column 3: Perusahaan Info Buttons */}
          <div className="flex flex-col gap-3 text-left col-span-1">
            <h4 className="font-sans font-extrabold uppercase tracking-widest text-[11px] text-slate-200">PERUSAHAAN</h4>
            <div className="flex flex-col gap-2 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <button 
                onClick={() => setStaticModalSlug("tentang-kami")}
                className="hover:text-white transition-colors text-left cursor-pointer"
              >
                TENTANG KAMI
              </button>
              <button 
                onClick={() => setStaticModalSlug("redaksi")}
                className="hover:text-white transition-colors text-left cursor-pointer"
              >
                REDAKSI
              </button>
              <button 
                onClick={() => setStaticModalSlug("hak-jawab")}
                className="hover:text-white transition-colors text-left cursor-pointer"
              >
                HAK JAWAB
              </button>
              <button 
                onClick={() => setStaticModalSlug("hubungi-kami")}
                className="hover:text-white transition-colors text-left cursor-pointer"
              >
                HUBUNGI KAMI
              </button>
              <button 
                onClick={() => setStaticModalSlug("kebijakan-privasi")}
                className="hover:text-white transition-colors text-left cursor-pointer"
              >
                KEBIJAKAN PRIVASI
              </button>
              <button 
                onClick={() => setStaticModalSlug("pedoman-siber")}
                className="hover:text-white transition-colors text-left cursor-pointer"
              >
                PEDOMAN PEMBERITAAN MEDIA SIBER
              </button>
            </div>
          </div>
        </div>
 
        {/* Bottom copyright section */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10 pt-6 border-t border-slate-900/50">
          {/* Mobile Layout */}
          <div className="flex flex-col items-center justify-center gap-1 text-center md:hidden">
            <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
              © {new Date().getFullYear()} PT Catra Media Nusantara.
            </p>
            <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
              Hak Cipta Dilindungi Undang-Undang.
            </p>
          </div>
          {/* Desktop Layout */}
          <div className="hidden md:flex md:items-center md:justify-between text-left">
            <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
              © {new Date().getFullYear()} PT Catra Media Nusantara. Hak Cipta Dilindungi Undang-Undang.
            </p>
          </div>
        </div>
      </footer>

      {/* Static Page Modal (Redaksi, Pedoman Siber, Tentang Kami, etc.) */}
      <StaticPageModal
        slug={staticModalSlug}
        onClose={() => setStaticModalSlug(null)}
      />

    </div>
  );
}
