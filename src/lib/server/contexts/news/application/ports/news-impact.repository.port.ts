import type { News } from '../../domain/news';
import type { NewsImpact } from '../../domain/news-impact';

export interface NewsImpactWithSource {
	sector: string;
	impactType: 'PUNCTUAL' | 'STRUCTURAL';
	publishedAt: Date;
	source: string;
}

export interface NewsImpactRepositoryPort {
	save(news: News, impacts: NewsImpact[]): Promise<void>;
	findAllImpacts(): Promise<NewsImpact[]>;
	findAllImpactsWithSource(): Promise<NewsImpactWithSource[]>;
}
