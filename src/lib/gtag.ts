/**
 * Google Analytics 4 (GA4) Helper Utilities for SinPo.id
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || '';

// Log page views for SPA navigation
export const pageview = (url: string, title?: string) => {
  if (typeof window !== 'undefined' && window.gtag && GA_MEASUREMENT_ID) {
    setTimeout(() => {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: url,
        page_title: title || document.title,
      });
    }, 0);
  }
};

interface GTagEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

// Log custom events (e.g., article views, category clicks, search queries, TTS play)
export const event = ({ action, category, label, value }: GTagEvent) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Declare global window.gtag interface for TypeScript
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: Record<string, any>[];
  }
}
