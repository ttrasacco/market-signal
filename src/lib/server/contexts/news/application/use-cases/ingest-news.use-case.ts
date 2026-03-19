import type { RssFetcherPort } from '../ports/rss-fetcher.port';
import type { NewsClassifierPort } from '../ports/news-classifier.port';
import type { NewsImpactRepositoryPort } from '../ports/news-impact.repository.port';
import type { News } from '../../domain/news';
import type { NewsImpact } from '../../domain/news-impact';

export interface IngestNewsResult {
	articlesIngested: number;
	impactsStored: number;
}

export class IngestNewsUseCase {
	constructor(
		private readonly fetcher: RssFetcherPort,
		private readonly classifier: NewsClassifierPort,
		private readonly repository: NewsImpactRepositoryPort,
		private readonly feedUrls: string[]
	) {}

	async execute(): Promise<IngestNewsResult> {
		let articlesIngested = 0;
		let impactsStored = 0;

		for (const feedUrl of this.feedUrls) {
			let articles;
			try {
				articles = await this.fetcher.fetchArticles(feedUrl);
			} catch (error) {
				console.error(`[PIPELINE] ingest: feed failed ${feedUrl}`, error);
				continue;
			}

			for (const article of articles) {
				try {
					const classifications = await this.classifier.classify(article.headline);

					if (classifications.length === 0) continue;

					const newsId = crypto.randomUUID();
					const news: News = {
						id: newsId,
						publishedAt: article.publishedAt,
						analyzedAt: new Date(),
						source: article.source,
						headline: article.headline
					};

					const impacts: NewsImpact[] = classifications.map((c) => ({
						id: crypto.randomUUID(),
						newsId,
						sector: c.sector,
						impactScore: c.impactScore,
						impactType: c.impactType
					}));

					await this.repository.save(news, impacts);
					articlesIngested++;
					impactsStored += impacts.length;
				} catch (error) {
					console.error(`[PIPELINE] ingest: article failed "${article.headline}"`, error);
				}
			}
		}

		console.log(
			`[PIPELINE] ingest: ${articlesIngested} articles fetched, ${impactsStored} impacts stored`
		);
		return { articlesIngested, impactsStored };
	}
}
