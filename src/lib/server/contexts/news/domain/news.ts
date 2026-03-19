export interface News {
  id: string;
  publishedAt: Date;
  analyzedAt: Date;
  source: string;
  headline: string;
}

export function validateNews(news: News): void {
  if (!news.headline.trim()) {
    throw new Error('headline must not be empty');
  }
}
