import { fixContentImages } from './apiClient';

/**
 * Utility functions for rendering and stripping rich HTML content in SinPo.id
 */

/**
 * Strips HTML tags and unescapes common HTML entities for clean plain-text display
 * (used for card summaries, search indexing, TTS audio reader, etc.)
 */
export function stripHtml(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ensures content is formatted properly as valid HTML.
 * If raw plain text with double newlines (\n\n) is provided, wraps paragraphs in <p> tags.
 */
export function formatArticleHtml(content?: string): string {
  if (!content) return '';

  const processed = fixContentImages(content);
  const trimmed = processed.trim();
  if (!trimmed) return '';

  // Check if content already contains HTML elements (e.g. <p>, <div>, <strong>, <ul>, <ol>, <img>, <br>, <h2>, etc.)
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(trimmed);

  if (hasHtmlTags) {
    return trimmed;
  }

  // Convert plain text with line breaks (\n\n) into <p> HTML paragraphs
  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return '';

  return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`).join('');
}
