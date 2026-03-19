import type { NewsImpactRepositoryPort, NewsImpactWithSource } from '../../application/ports/news-impact.repository.port';
import type { News } from '../../domain/news';
import type { NewsImpact } from '../../domain/news-impact';

export class FakeNewsImpactAdapter implements NewsImpactRepositoryPort {
	public news: News[] = [];
	public impacts: NewsImpact[] = [];

	async save(news: News, impacts: NewsImpact[]): Promise<void> {
		this.news.push(news);
		this.impacts.push(...impacts);
	}

	async findAllImpacts(): Promise<NewsImpact[]> {
		return [...this.impacts];
	}

	async findAllImpactsWithSource(): Promise<NewsImpactWithSource[]> {
		return this.impacts.map((impact) => {
			const parentNews = this.news.find((n) => n.id === impact.newsId);
			return {
				sector: impact.sector,
				impactType: impact.impactType as 'PUNCTUAL' | 'STRUCTURAL',
				publishedAt: parentNews?.publishedAt ?? new Date(0),
				source: parentNews?.source ?? '',
			};
		});
	}
}
