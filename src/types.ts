export interface Comment {
  id: string;
  name: string;
  commentText: string;
  date: string;
}

export interface Article {
  id: string;
  slug?: string;
  title: string;
  subtitle: string;
  summary: string;
  content: string;
  category: string; // POLITIK, PERISTIWA, HUKUM, EKBIS, BONGKAR
  imageUrl: string;
  date: string;
  publishedAtMs?: number; // Exact timestamp in milliseconds for 100% accurate chronological sorting
  author: string;
  readTime: string;
  tags: string[];
  comments: Comment[];
  isInvestigative?: boolean;
  isHero?: boolean;
  views?: number;
  dilihat?: number;
  caption?: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  status: 'critical' | 'ongoing' | 'resolved';
}

export interface TVProgram {
  id: string;
  title: string;
  host: string;
  time: string;
  videoPlaceholderText: string;
  tickerText: string;
}
