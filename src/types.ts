export interface Comment {
  id: string;
  name: string;
  commentText: string;
  date: string;
}

export interface Article {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  content: string;
  category: string; // POLITIK, PERISTIWA, HUKUM, EKBIS, BONGKAR
  imageUrl: string;
  date: string;
  author: string;
  readTime: string;
  tags: string[];
  comments: Comment[];
  isInvestigative?: boolean;
  isHero?: boolean;
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
