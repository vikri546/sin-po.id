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
import { apiFetch, transformLaravelPostToArticle, isTakedownArticle } from './lib/apiClient';
import { parseAnyDate } from './lib/dateFormatter';
import { stripHtml } from './lib/htmlRenderer';
import StaticPageView from './components/StaticPageView';

// Resolve the correct channel ID from the channels list for API queries (matching sinpo 2 reference)
function resolveChannelId(categoryName: string, channels: any[]): number | null {
  const cat = categoryName.toUpperCase().trim();
  if (cat === 'BONGKAR') return 21;
  if (cat === 'BUDAYA') return 22;
  if (cat === 'PENDIDIKAN') return 23;
  if (cat === 'SIN PO DULU' || cat === 'SINPO DULU') return 24;
  if (cat === 'OLAHRAGA') return 25;
  if (cat === 'KESEHATAN') return 26;
  if (cat === 'SIN PO TV' || cat === 'SINPO TV' || cat === 'POJOK SINPO') return 27;

  if (!channels || channels.length === 0) return null;
  const search = categoryName.toLowerCase().trim();
  const found = channels.find((c: any) =>
    (c.slug && c.slug.toLowerCase() === search) ||
    (c.nama && c.nama.toLowerCase() === search) ||
    (c.name && c.name.toLowerCase() === search)
  );
  return found ? found.id : null;
}

// Build the API endpoint for category news using channel parameter (like sinpo 2 reference)
function getCategoryEndpoint(categoryName: string, page: number, channelId: number | null): string {
  if (channelId) {
    return `/berita?channel=${channelId}&page=${page}&limit=20&sort=desc`;
  }
  const catQuery = categoryName.toLowerCase().trim();
  return `/berita?channel=${encodeURIComponent(catQuery)}&page=${page}&limit=20&sort=desc`;
}

// Filter helper to exclude legacy 2022 fallback articles with broken dummy images (e.g. Pembalap MotoGP, Lahan Sawit)
function isBrokenLegacyArticle(art: Article): boolean {
  if (!art || !art.title) return true;
  if (art.category === 'Umum' && (art.date.includes('2022') || art.title.includes('MotoGP') || art.title.includes('Sawit') || art.title.includes('Batsirai') || art.title.includes('IKN'))) {
    return true;
  }
  return false;
}

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
  const [masterLiveArticles, setMasterLiveArticles] = useState<Article[]>([]);
  const [breakingNewsList, setBreakingNewsList] = useState<string[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [popularNewsList, setPopularNewsList] = useState<Article[]>([]);
  const [staticModalSlug, setStaticModalSlug] = useState<string | null>(null);

  // Channel list from API for dynamic category resolution (like sinpo 2 reference)
  const [channelsList, setChannelsList] = useState<any[]>([]);

  // Dedicated category articles pool - accumulates paginated results for the active category
  const [categoryArticlesPool, setCategoryArticlesPool] = useState<Article[]>([]);
  const categorySeenIdsRef = useRef<Set<string>>(new Set());

  // Loading & Skeleton State (automatic initial load, reload & navigation transition)
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(true);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loadingStartTimeRef = useRef<number>(Date.now());

  const triggerLoading = useCallback((minDurationMs: number = 500) => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
    loadingStartTimeRef.current = Date.now();
    setIsLoadingContent(true);
  }, []);

  const finishLoading = useCallback((minDurationMs: number = 500) => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
    const elapsed = Date.now() - loadingStartTimeRef.current;
    const remaining = Math.max(0, minDurationMs - elapsed);

    loadingTimerRef.current = setTimeout(() => {
      setIsLoadingContent(false);
    }, remaining);
  }, []);

  const masterLiveArticlesRef = useRef<Article[]>([]);

  // Real-Time Live News Fetcher & Auto Polling
  const fetchLiveData = useCallback(async () => {
    try {
      const [headlineRes, response] = await Promise.all([
        apiFetch('/headline?limit=1').catch(() => null),
        apiFetch('/berita?limit=100').catch(() => null),
      ]);

      if (response && response.success && Array.isArray(response.data)) {
        // Filter out takedown/scheduled articles from raw API data (matching sinpo 2 isTakedownArticle filter)
        const cleanRawData = response.data.filter((item: any) => item && !isTakedownArticle(item));
        const liveArticles = cleanRawData.map(transformLaravelPostToArticle);
        
        // Filter out valid articles
        let validArticles = liveArticles.filter(a => a && a.id);

        if (validArticles.length > 0) {
          // Sort strictly newest first by date timestamp
          validArticles.sort((a, b) => {
            const timeA = a.publishedAtMs || parseAnyDate(a.date).getTime();
            const timeB = b.publishedAtMs || parseAnyDate(b.date).getTime();
            return timeB - timeA;
          });

          // Check if CMS has active headline articles from /headline endpoint or /berita items (matching sinpo 2 algorithm)
          let headlineArt: Article | null = null;

          if (headlineRes && headlineRes.success && Array.isArray(headlineRes.data) && headlineRes.data.length > 0) {
            const cleanHeadlines = headlineRes.data.filter((item: any) => item && !isTakedownArticle(item));
            if (cleanHeadlines.length > 0) {
              // Sort headline articles strictly newest-first to get the latest CMS headline
              const transformedHeadlines = cleanHeadlines.map(transformLaravelPostToArticle);
              transformedHeadlines.sort((a, b) => {
                const timeA = a.publishedAtMs || parseAnyDate(a.date).getTime();
                const timeB = b.publishedAtMs || parseAnyDate(b.date).getTime();
                return timeB - timeA;
              });
              headlineArt = transformedHeadlines[0];
            }
          }

          // Fallback: check if any validArticle in pool has isHero/headline flag
          if (!headlineArt) {
            const cmsHeadlineInPool = validArticles.find(a => (a as any).isHeadline || (a as any).headline === '1' || (a as any).headline === 1);
            if (cmsHeadlineInPool) {
              headlineArt = cmsHeadlineInPool;
            } else {
              headlineArt = validArticles[0];
            }
          }

          if (headlineArt) {
            headlineArt.isHero = true;
            const remaining = validArticles.filter(a => a.id !== headlineArt.id);
            validArticles = [headlineArt, ...remaining];
          }

          // Save to master live pool cache
          masterLiveArticlesRef.current = validArticles;
          setMasterLiveArticles(validArticles);

          // If currently on SEMUA homepage, update active articlesState directly
          if (!selectedCategory || selectedCategory === 'SEMUA') {
            setArticlesState(validArticles);
          }

          // Update Breaking Ticker from top 5 newest items
          const recentTicker = validArticles.slice(0, 5).map(a => `${a.category}: ${a.title}`);
          setBreakingNewsList(recentTicker);

          // Derive Popular News from highest viewed recent articles
          const sortedByPopularity = [...validArticles].sort((a, b) => (b.views || 0) - (a.views || 0));
          setPopularNewsList(sortedByPopularity.slice(0, 5));
        }
      }
    } catch (err) {
      console.log('SinPo Live REST API /berita notice:', err);
    }
  }, [selectedCategory]);

  useEffect(() => {
    // Initial fetch
    fetchLiveData().then(() => {
      finishLoading(500);
    });

    // Fetch categories
    async function fetchCategories() {
      try {
        const catRes = await apiFetch('/kategori');
        if (catRes.success && Array.isArray(catRes.data)) {
          const catNames = catRes.data.map((c: any) => (c.nama || c.name || '').toUpperCase());
          setCategoriesList(['SEMUA', ...catNames]);
        }
      } catch (err) {
        console.log('SinPo REST API /kategori notice:', err);
      }
    }
    fetchCategories();

    // Fetch channels list for dynamic channel ID resolution (like sinpo 2 reference)
    async function fetchChannels() {
      try {
        const chanRes = await apiFetch('/channel?limit=100');
        if (chanRes.success && Array.isArray(chanRes.data)) {
          setChannelsList(chanRes.data);
        }
      } catch (err) {
        console.log('SinPo REST API /channel notice:', err);
      }
    }
    fetchChannels();

    // Setup 30-second real-time auto polling to fetch newest news continuously (silent background update)
    const interval = setInterval(() => {
      fetchLiveData();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchLiveData, finishLoading]);

  // Category pagination state for continuous historical loading (exact algorithm from sinpo 2)
  const categoryPageRef = useRef<number>(1);
  const [hasMoreCategoryNews, setHasMoreCategoryNews] = useState<boolean>(true);
  const isFetchingCategoryRef = useRef<boolean>(false);

  // Navigation nonce counter to force main page useEffect re-execution on re-clicks & return navigation
  const [navNonce, setNavNonce] = useState<number>(0);

  // Refetch / Synchronize news from SinPo API whenever category, search query, or tag changes
  useEffect(() => {
    let isMounted = true;
    categoryPageRef.current = 1;
    setHasMoreCategoryNews(true);
    isFetchingCategoryRef.current = false;

    // Trigger smooth loading skeleton for any page entrance/change
    triggerLoading(500);

    // Reset category pool and seen IDs when switching categories
    setCategoryArticlesPool([]);
    categorySeenIdsRef.current = new Set();

    // A. HOMEPAGE ("SEMUA") without search or tag: Instant restore from masterLiveArticles
    if ((!selectedCategory || selectedCategory === 'SEMUA') && !submittedSearchQuery && !selectedTag) {
      const liveList = masterLiveArticlesRef.current.length > 0 ? masterLiveArticlesRef.current : masterLiveArticles;
      if (liveList.length > 0) {
        setArticlesState(liveList);
        if (isMounted) finishLoading(500);
      } else {
        fetchLiveData().then(() => {
          if (isMounted) finishLoading(500);
        });
      }
      return;
    }

    async function fetchFilteredNews() {
      try {
        if (selectedCategory && selectedCategory !== 'SEMUA' && selectedCategory !== 'INDEKS' && !submittedSearchQuery && !selectedTag) {
          // B. CATEGORY FILTER: Use channel parameter (like sinpo 2 reference)
          const channelId = resolveChannelId(selectedCategory, channelsList);
          const endpoint = getCategoryEndpoint(selectedCategory, 1, channelId);
          
          let categoryArticles: Article[] = [];

          try {
            const catRes = await apiFetch(endpoint);
            if (catRes.success && Array.isArray(catRes.data)) {
              categoryArticles = catRes.data
                .filter((item: any) => item && !isTakedownArticle(item))
                .map((item: any) => {
                  const art = transformLaravelPostToArticle(item);
                  if (selectedCategory && selectedCategory !== 'SEMUA') {
                    art.category = selectedCategory.toUpperCase().trim();
                  }
                  return art;
                })
                .filter((a: Article) => a && a.id && !isBrokenLegacyArticle(a));
            }
          } catch (err) {
            console.log('Category API fetch notice:', err);
          }

          // Sort strictly newest first to oldest by timestamp
          categoryArticles.sort((a, b) => {
            const timeA = a.publishedAtMs || parseAnyDate(a.date).getTime();
            const timeB = b.publishedAtMs || parseAnyDate(b.date).getTime();
            return timeB - timeA;
          });

          if (categoryArticles.length > 0) {
            categoryArticles[0].isHero = true;
          }

          if (isMounted) {
            // Register seen IDs
            categorySeenIdsRef.current = new Set(categoryArticles.map(a => a.id));
            // Set pagination to page 2 for next load-more
            categoryPageRef.current = 2;
            // Check if there might be more pages
            setHasMoreCategoryNews(categoryArticles.length >= 20);
            // Store in dedicated category pool
            setCategoryArticlesPool(categoryArticles);
            setArticlesState(categoryArticles);
          }
        } else if (selectedCategory === 'INDEKS' && !submittedSearchQuery && !selectedTag) {
          if (isMounted) {
            const liveList = masterLiveArticlesRef.current.length > 0 ? masterLiveArticlesRef.current : masterLiveArticles;
            setArticlesState(liveList);
          }
        } else {
          // C. SEARCH QUERY OR TAG QUERY
          let endpoint = '/berita';
          const params = new URLSearchParams();

          if (submittedSearchQuery && submittedSearchQuery.trim()) {
            params.append('q', submittedSearchQuery.trim());
          }

          if (selectedTag && selectedTag.trim()) {
            params.append('tag', selectedTag.trim());
          }

          params.append('limit', '50');

          const queryString = params.toString();
          if (queryString) {
            endpoint += `?${queryString}`;
          }

          const res = await apiFetch(endpoint);
          if (isMounted && res.success && Array.isArray(res.data)) {
            const articles = res.data
              .filter((item: any) => item && !isTakedownArticle(item))
              .map(transformLaravelPostToArticle)
              .filter((a: Article) => a && a.id && !isBrokenLegacyArticle(a));
            
            articles.sort((a, b) => {
              const timeA = a.publishedAtMs || parseAnyDate(a.date).getTime();
              const timeB = b.publishedAtMs || parseAnyDate(b.date).getTime();
              return timeB - timeA;
            });

            if (articles.length > 0) {
              articles[0].isHero = true;
            }
            setArticlesState(articles);
          }
        }
      } catch (err) {
        console.log('Filtered news API fetch notice:', err);
      } finally {
        if (isMounted) {
          finishLoading(500);
        }
      }
    }

    fetchFilteredNews();

    return () => {
      isMounted = false;
    };
  }, [submittedSearchQuery, selectedCategory, selectedTag, channelsList, navNonce]);

  // Load next page of category historical articles from backend API (exact sinpo 2 algorithm)
  const handleLoadMoreCategoryArticles = useCallback(async (attempts: number = 0) => {
    if (!selectedCategory || selectedCategory === 'SEMUA' || !hasMoreCategoryNews) return;
    if (isFetchingCategoryRef.current && attempts === 0) return;
    if (attempts >= 2) return; // Prevent slow repetitive network loops
    
    isFetchingCategoryRef.current = true;
    const fetchLimit = 20;
    const currentPage = categoryPageRef.current;

    try {
      const channelId = resolveChannelId(selectedCategory, channelsList);
      const endpoint = getCategoryEndpoint(selectedCategory, currentPage, channelId);
      const res = await apiFetch(endpoint);

      // Advance page counter for next call
      categoryPageRef.current = currentPage + 1;

      if (res.success && Array.isArray(res.data)) {
        const rawItems = res.data.filter((item: any) => item && !isTakedownArticle(item));

        if (rawItems.length === 0) {
          setHasMoreCategoryNews(false);
          return;
        }

        const transformed = rawItems
          .map((item: any) => {
            const art = transformLaravelPostToArticle(item);
            if (selectedCategory && selectedCategory !== 'SEMUA') {
              art.category = selectedCategory.toUpperCase().trim();
            }
            return art;
          })
          .filter((a: Article) => a && a.id && !isBrokenLegacyArticle(a));

        // Filter out already-seen articles (like sinpo 2's filterSeenNews)
        const newItems = transformed.filter((a: Article) => !categorySeenIdsRef.current.has(a.id));

        if (newItems.length > 0) {
          // Register new IDs as seen
          newItems.forEach((a: Article) => categorySeenIdsRef.current.add(a.id));

          // Append to category pool and sort newest-first
          setCategoryArticlesPool(prev => {
            const merged = [...prev, ...newItems];
            merged.sort((a, b) => (b.publishedAtMs || parseAnyDate(b.date).getTime()) - (a.publishedAtMs || parseAnyDate(a.date).getTime()));
            return merged;
          });

          // Also update global articlesState for hero/sidebar usage
          setArticlesState(prev => {
            const existingIds = new Set(prev.map(a => a.id));
            const freshItems = newItems.filter((a: Article) => !existingIds.has(a.id));
            if (freshItems.length === 0) return prev;
            const merged = [...prev, ...freshItems];
            merged.sort((a, b) => (b.publishedAtMs || parseAnyDate(b.date).getTime()) - (a.publishedAtMs || parseAnyDate(a.date).getTime()));
            return merged;
          });

          // If raw items < fetchLimit, no more pages
          if (rawItems.length < fetchLimit) {
            setHasMoreCategoryNews(false);
          }
        } else if (rawItems.length >= fetchLimit && attempts < 1) {
          // All items were duplicates but server had a full page - try next page (max 1 retry)
          isFetchingCategoryRef.current = false;
          return handleLoadMoreCategoryArticles(attempts + 1);
        } else {
          setHasMoreCategoryNews(false);
        }
      } else {
        setHasMoreCategoryNews(false);
      }
    } catch (err) {
      console.log('Category pagination notice:', err);
      setHasMoreCategoryNews(false);
    } finally {
      isFetchingCategoryRef.current = false;
    }
  }, [selectedCategory, hasMoreCategoryNews, channelsList]);

  // Automatically fetch full detail content for the active hero article to populate its 2-line summary
  useEffect(() => {
    const activeHero = articlesState.find(a => a.isHero) || articlesState[0];
    if (!activeHero || (activeHero.summary && activeHero.summary.trim().length >= 25)) return;

    let isMounted = true;
    async function loadHeroDetail() {
      try {
        const detailRes = await apiFetch(`/berita/${activeHero.id}`);
        if (isMounted && detailRes.success && detailRes.data) {
          const rawContent = detailRes.data.isi || detailRes.data.content || detailRes.data.ringkasan || '';
          const cleanedText = stripHtml(rawContent).trim();
          if (cleanedText) {
            setArticlesState(prev => prev.map(art => 
              art.id === activeHero.id ? { ...art, summary: cleanedText, content: rawContent } : art
            ));
          }
        }
      } catch (err) {
        console.log('Hero detail fetch notice:', err);
      }
    }
    loadHeroDetail();
    return () => { isMounted = false; };
  }, [articlesState]);

  // Selected Article for the Reader Modal
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const homeScrollPosRef = React.useRef<number>(0);

  const handleSelectArticle = (article: Article | null, forceScrollToTop: boolean = false, skipPushState: boolean = false) => {
    triggerLoading(500);
    if (article) {
      if (!selectedArticle) {
        homeScrollPosRef.current = window.scrollY;
      }
      setStaticModalSlug(null);
      setSelectedArticle(article);
      window.scrollTo({ top: 0, behavior: 'auto' });

      if (!skipPushState && typeof window !== 'undefined') {
        const url = `?article=${encodeURIComponent(article.slug || article.id)}`;
        window.history.pushState({ type: 'article', id: article.id }, '', url);
      }
      finishLoading(500);
    } else {
      setSelectedArticle(null);
      setStaticModalSlug(null);
      if (forceScrollToTop) {
        homeScrollPosRef.current = 0;
      }
      setTimeout(() => {
        window.scrollTo({ top: homeScrollPosRef.current, behavior: 'auto' });
      }, 0);

      if (!skipPushState && typeof window !== 'undefined') {
        let url = '/';
        if (submittedSearchQuery) {
          url = `?q=${encodeURIComponent(submittedSearchQuery)}`;
        } else if (selectedTag) {
          url = `?tag=${encodeURIComponent(selectedTag)}`;
        } else if (selectedCategory && selectedCategory !== 'SEMUA') {
          url = `?category=${encodeURIComponent(selectedCategory)}`;
        }
        window.history.pushState({ type: 'list' }, '', url);
      }
      setNavNonce((prev) => prev + 1);
    }
  };

  const handleCategorySelect = (cat: string, skipPushState: boolean = false) => {
    setSelectedCategory(cat);
    setStaticModalSlug(null);
    setShowBookmarksOnly(false);
    setSelectedArticle(null);
    setSubmittedSearchQuery(null);
    setSelectedTag(null);
    setSearchQuery("");
    setSearchDate("");
    triggerLoading(500);
    setNavNonce((prev) => prev + 1);

    if (!skipPushState && typeof window !== 'undefined') {
      const url = cat === 'SEMUA' ? '/' : `?category=${encodeURIComponent(cat)}`;
      window.history.pushState({ type: 'category', category: cat }, '', url);
    }
  };

  const handleSearchSubmit = (query: string, skipPushState: boolean = false) => {
    setSubmittedSearchQuery(query);
    setStaticModalSlug(null);
    setSelectedArticle(null);
    setSelectedTag(null);
    setSearchDate("");
    triggerLoading(500);
    setNavNonce((prev) => prev + 1);

    if (!skipPushState && typeof window !== 'undefined') {
      const url = `?q=${encodeURIComponent(query)}`;
      window.history.pushState({ type: 'search', query }, '', url);
    }
  };

  const handleTagSelect = (tag: string, skipPushState: boolean = false) => {
    setSelectedTag(tag);
    setSelectedArticle(null);
    setStaticModalSlug(null);
    setSubmittedSearchQuery(null);
    triggerLoading(500);
    setNavNonce((prev) => prev + 1);

    if (!skipPushState && typeof window !== 'undefined') {
      const url = `?tag=${encodeURIComponent(tag)}`;
      window.history.pushState({ type: 'tag', tag }, '', url);
    }
  };

  const handleStaticPageSelect = (slug: string, skipPushState: boolean = false) => {
    triggerLoading(500);
    setStaticModalSlug(slug);
    setSelectedArticle(null);
    setSelectedCategory("SEMUA");
    setShowBookmarksOnly(false);
    setSubmittedSearchQuery(null);
    setSelectedTag(null);
    setSearchQuery("");
    setSearchDate("");
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (!skipPushState && typeof window !== 'undefined') {
      const url = `?page=${encodeURIComponent(slug)}`;
      window.history.pushState({ type: 'static_page', slug }, '', url);
    }
    finishLoading(500);
  };

  // Handle Browser Back / Forward (popstate) event with smooth loading skeleton
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      // Always trigger smooth loading skeleton transition on browser back/forward navigation
      triggerLoading(500);

      const params = new URLSearchParams(window.location.search);
      const articleParam = params.get('article');
      const categoryParam = params.get('category');
      const searchParam = params.get('q');
      const tagParam = params.get('tag');
      const pageParam = params.get('page');

      if (articleParam) {
        setStaticModalSlug(null);
        const pool = masterLiveArticlesRef.current.length > 0 
          ? masterLiveArticlesRef.current 
          : (masterLiveArticles.length > 0 ? masterLiveArticles : articlesState);
        
        const cleanIdOrSlug = articleParam.replace('laravel-', '');
        const matched = pool.find((a) => a.id === articleParam || a.id === `laravel-${cleanIdOrSlug}` || a.slug === articleParam || a.slug === cleanIdOrSlug);
        
        if (matched) {
          setSelectedArticle(matched);
          window.scrollTo({ top: 0, behavior: 'auto' });
          finishLoading(500);
        } else {
          apiFetch(`/berita/${encodeURIComponent(cleanIdOrSlug)}`)
            .then((res) => {
              if (res.success && res.data) {
                const art = transformLaravelPostToArticle(res.data);
                setSelectedArticle(art);
                window.scrollTo({ top: 0, behavior: 'auto' });
              } else {
                setSelectedArticle(transformLaravelPostToArticle({ id: articleParam, judul: 'Berita Tidak Ditemukan' }));
              }
              finishLoading(500);
            })
            .catch(() => {
              setSelectedArticle(transformLaravelPostToArticle({ id: articleParam, judul: 'Berita Tidak Ditemukan' }));
              finishLoading(500);
            });
        }
      } else if (pageParam && pageParam.trim()) {
        setSelectedArticle(null);
        setStaticModalSlug(pageParam.trim());
        setSelectedTag(null);
        setSubmittedSearchQuery(null);
        finishLoading(500);
      } else {
        setSelectedArticle(null);
        setStaticModalSlug(null);

        if (searchParam && searchParam.trim()) {
          setSubmittedSearchQuery(searchParam.trim());
          setSelectedTag(null);
        } else if (tagParam && tagParam.trim()) {
          setSelectedTag(tagParam.trim());
          setSubmittedSearchQuery(null);
        } else if (categoryParam && categoryParam.trim()) {
          setSelectedCategory(categoryParam.trim().toUpperCase());
          setSubmittedSearchQuery(null);
          setSelectedTag(null);
        } else {
          setSelectedCategory('SEMUA');
          setSubmittedSearchQuery(null);
          setSelectedTag(null);
        }

        setNavNonce((prev) => prev + 1);
        finishLoading(500);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [triggerLoading, finishLoading, articlesState, masterLiveArticles]);

  // Initial URL Parameter sync on startup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    const articleParam = params.get('article');
    const searchParam = params.get('q');
    const tagParam = params.get('tag');
    const pageParam = params.get('page');

    if (articleParam) {
      triggerLoading(500);
      const cleanIdOrSlug = articleParam.replace('laravel-', '');
      apiFetch(`/berita/${encodeURIComponent(cleanIdOrSlug)}`)
        .then((res) => {
          if (res.success && res.data) {
            setSelectedArticle(transformLaravelPostToArticle(res.data));
          } else {
            setSelectedArticle(transformLaravelPostToArticle({ id: articleParam, judul: 'Berita Tidak Ditemukan' }));
          }
          finishLoading(500);
        })
        .catch(() => {
          setSelectedArticle(transformLaravelPostToArticle({ id: articleParam, judul: 'Berita Tidak Ditemukan' }));
          finishLoading(500);
        });
    } else if (pageParam) {
      setStaticModalSlug(pageParam.trim());
      triggerLoading(500);
    } else if (categoryParam) {
      setSelectedCategory(categoryParam.trim().toUpperCase());
    } else if (searchParam) {
      setSubmittedSearchQuery(searchParam.trim());
    } else if (tagParam) {
      setSelectedTag(tagParam.trim());
    }
  }, [triggerLoading, finishLoading]);

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

  // Master pool of live articles across all mixed categories for sidebars, drawers, and article detail widgets
  const masterArticlesPool = masterLiveArticlesRef.current.length > 0 
    ? masterLiveArticlesRef.current 
    : (masterLiveArticles.length > 0 ? masterLiveArticles : articlesState);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans transition-colors duration-200 antialiased`}>
      {/* A. Top Editorial Bar & Breaking News Ticker */}
      <BreakingTicker 
        items={breakingNewsList} 
        articles={popularNewsList.length > 0 ? popularNewsList : masterArticlesPool}
        onSelectArticle={handleSelectArticle}
      />

      {/* B. Central Brand Header */}
      <Header
        bookmarkCount={bookmarkedIds.length}
        showBookmarksOnly={showBookmarksOnly}
        onToggleBookmarksOnly={() => setShowBookmarksOnly(!showBookmarksOnly)}
        selectedCategory={(submittedSearchQuery || selectedTag || activeModalArticle || staticModalSlug) ? "" : selectedCategory}
        onSelectCategory={(cat) => handleCategorySelect(cat)}
        articles={masterArticlesPool}
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
        onSearchSubmit={(query) => handleSearchSubmit(query)}
      />

      {/* C. Sticky Navigation Category & Live Search */}
      <StickyNav
        selectedCategory={(submittedSearchQuery || selectedTag || activeModalArticle || staticModalSlug) ? "" : selectedCategory}
        onSelectCategory={(cat) => handleCategorySelect(cat)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={setIsDrawerOpen}
        articles={masterArticlesPool}
        onSelectArticle={(art) => {
          handleSelectArticle(art);
          setSubmittedSearchQuery(null);
          setSelectedTag(null);
          setSearchQuery("");
          setSearchDate("");
        }}
        onSearchSubmit={(query) => handleSearchSubmit(query)}
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
                onSelectCategory={(cat) => handleCategorySelect(cat)}
                articles={masterArticlesPool}
                onSelectArticle={handleSelectArticle}
                onSelectTag={(tag) => handleTagSelect(tag)}
                isLoading={isLoadingContent}
              />
            </section>

            {/* Column 3: Sidebar widgets (1/3 width) */}
            <section className="lg:col-span-1 lg:sticky lg:top-20 self-start">
              <Sidebar 
                onSelectPopular={handleSelectPopular} 
                hideExtraWidgets={true} 
                variant="detail" 
                articles={masterArticlesPool}
                popularArticles={popularNewsList}
                onSelectArticle={handleSelectArticle}
                isLoading={isLoadingContent}
              />
            </section>

          </div>
        </main>
      ) : staticModalSlug ? (
        <main className="flex-1 max-w-7xl w-full mx-auto">
          <StaticPageView
            slug={staticModalSlug}
            isLoading={isLoadingContent}
            onNavigateHome={() => handleCategorySelect("SEMUA")}
          />
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
                articles={masterArticlesPool}
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
                articles={masterArticlesPool}
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

            const categoryArticles = categoryArticlesPool.length > 0 
              ? categoryArticlesPool 
              : articlesState.filter(
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
                      
                      <p className="font-sans text-xs sm:text-sm md:text-base text-slate-200 leading-relaxed line-clamp-2 font-normal opacity-95 mt-1 sm:mt-2">
                        {stripHtml(heroArticle.summary || heroArticle.subtitle || heroArticle.content) || `Simak ulasan lengkap dan kabar berita terkini mengenai ${heroArticle.title} selengkapnya di SinPo.id.`}
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
              // Use dedicated category pool for the list (properly paginated from API)
              const poolArticles = categoryArticlesPool.length > 0 ? categoryArticlesPool : articlesState;
              const heroArticle = poolArticles.find((art) => art.isHero) || poolArticles[0];
              const otherFourArticles = heroArticle
                ? poolArticles.filter((art) => art.id !== heroArticle.id).slice(0, 4)
                : [];
              
              // Exclude all 5 articles already displayed in the top Category Hero Banner
              const heroBannerArticleIds = new Set([
                heroArticle?.id,
                ...otherFourArticles.map((art) => art.id)
              ].filter(Boolean));

              const remainingArticles = poolArticles.filter((art) => !heroBannerArticleIds.has(art.id));

              return (
                <CategoryPageView
                  category={selectedCategory}
                  articles={remainingArticles}
                  allCategoryArticles={masterArticlesPool}
                  onSelectArticle={handleSelectArticle}
                  isLoading={isLoadingContent}
                  onLoadMoreRemote={handleLoadMoreCategoryArticles}
                  hasMoreRemote={hasMoreCategoryNews}
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
                  articles={masterArticlesPool}
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
            {/* Social Media Links matching sinpo 2 */}
            <div className="flex items-center gap-3.5 mt-1">
              <a href="https://www.instagram.com/sinpotv" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-900 hover:bg-brand-red-600 text-slate-400 hover:text-white rounded-full transition-all duration-300" title="Instagram SinPo TV">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://x.com/sinpotv" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-900 hover:bg-brand-red-600 text-slate-400 hover:text-white rounded-full transition-all duration-300" title="X (Twitter) SinPo TV">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="https://www.tiktok.com/@sinpotv" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-900 hover:bg-brand-red-600 text-slate-400 hover:text-white rounded-full transition-all duration-300 flex items-center justify-center" title="TikTok SinPo TV">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .8.11v-3.5a6.39 6.39 0 0 0-3.11.8 6.27 6.27 0 0 0-3.3 5.48 6.28 6.28 0 0 0 10.15 4.9 6.24 6.24 0 0 0 2.22-4.9V8a8.15 8.15 0 0 0 5.23 2.08V6.66a4.86 4.86 0 0 1-1.92-.47 4.8 4.8 0 0 1-1.31-.96z" />
                </svg>
              </a>
              <a href="https://youtube.com/@sinpotv?si=hiaKrjanN5Zh1GFe" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-900 hover:bg-brand-red-600 text-slate-400 hover:text-white rounded-full transition-all duration-300" title="SIN PO TV (YouTube)">
                <Youtube className="h-4 w-4" />
              </a>
              <a href="https://www.facebook.com/people/SIN-PO-TV/61552603735655/" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-900 hover:bg-brand-red-600 text-slate-400 hover:text-white rounded-full transition-all duration-300" title="Facebook SinPo TV">
                <Facebook className="h-4 w-4" />
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
 
          {/* Column 3: Perusahaan Info Links */}
          <div className="flex flex-col gap-3 text-left col-span-1">
            <h4 className="font-sans font-extrabold uppercase tracking-widest text-[11px] text-slate-200">PERUSAHAAN</h4>
            <div className="flex flex-col gap-2 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <a 
                href="?page=tentang-kami"
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  handleStaticPageSelect("tentang-kami");
                }}
                className="hover:text-white transition-colors text-left cursor-pointer"
              >
                TENTANG KAMI
              </a>
              <a 
                href="?page=redaksi"
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  handleStaticPageSelect("redaksi");
                }}
                className="hover:text-white transition-colors text-left cursor-pointer"
              >
                REDAKSI
              </a>
              <a 
                href="?page=hak-jawab"
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  handleStaticPageSelect("hak-jawab");
                }}
                className="hover:text-white transition-colors text-left cursor-pointer"
              >
                HAK JAWAB
              </a>
              <a 
                href="?page=hubungi-kami"
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  handleStaticPageSelect("hubungi-kami");
                }}
                className="hover:text-white transition-colors text-left cursor-pointer"
              >
                HUBUNGI KAMI
              </a>
              <a 
                href="?page=kebijakan-privasi"
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  handleStaticPageSelect("kebijakan-privasi");
                }}
                className="hover:text-white transition-colors text-left cursor-pointer"
              >
                KEBIJAKAN PRIVASI
              </a>
              <a 
                href="?page=pedoman-siber"
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  handleStaticPageSelect("pedoman-siber");
                }}
                className="hover:text-white transition-colors text-left cursor-pointer"
              >
                PEDOMAN PEMBERITAAN MEDIA SIBER
              </a>
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

    </div>
  );
}
