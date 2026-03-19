import type { News } from '../../domain/news';
import type { NewsImpact } from '../../domain/news-impact';

export interface NewsImpactRepositoryPort {
	save(news: News, impacts: NewsImpact[]): Promise<void>;
	findAllImpacts(): Promise<NewsImpact[]>;
}
