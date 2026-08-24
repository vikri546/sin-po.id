/**
 * Standardized API Response Contract for SinPo.id Laravel REST API
 */

export interface ApiMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  meta?: ApiMeta;
  errors?: Record<string, string[]>;
}

export interface AuthResponse {
  token: string;
  token_type?: string;
  user: {
    id: number;
    name: string;
    email: string;
    role?: string;
    avatar?: string;
  };
}

export interface NewsItem {
  id: number;
  slug: string;
  title: string;
  subtitle?: string;
  summary?: string;
  content: string;
  category: {
    id: number;
    name: string;
    slug: string;
  };
  image_url: string;
  published_at: string;
  author: {
    id: number;
    name: string;
  };
  read_time?: string;
  tags?: Array<{ id: number; name: string; slug: string }>;
  comments_count?: number;
  is_investigative?: boolean;
  is_hero?: boolean;
}

export interface CommentPayload {
  berita_id: number;
  nama: string;
  email: string;
  komentar: string;
}
