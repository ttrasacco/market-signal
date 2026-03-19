import type { NewsImpactRepositoryPort } from '../../application/ports/news-impact.repository.port';
import type { News } from '../../domain/news';
import type { NewsImpact } from '../../domain/news-impact';

export class FakeNewsImpactRepository implements NewsImpactRepositoryPort {
	public news: News[] = [];
	public impacts: NewsImpact[] = [];

	async save(news: News, impacts: NewsImpact[]): Promise<void> {
		this.news.push(news);
		this.impacts.push(...impacts);
	}

	async findAllImpacts(): Promise<NewsImpact[]> {
		return [...this.impacts];
	}
}
