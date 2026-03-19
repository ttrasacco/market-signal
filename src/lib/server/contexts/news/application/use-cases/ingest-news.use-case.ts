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

			// Single LLM call for all headlines of this feed
			const headlines = articles.map((a) => a.headline);
			let batchResults;
			try {
				batchResults = await this.classifier.classifyBatch(headlines);
			} catch (error) {
				console.error(`[PIPELINE] ingest: batch classification failed for ${feedUrl}`, error);
				continue;
			}

			const classificationsByHeadline = new Map(
				batchResults.map((r) => [r.headline, r.classifications])
			);

			for (const article of articles) {
				try {
					const classifications = classificationsByHeadline.get(article.headline) ?? [];
					if (classifications.length === 0) continue;

					const newsId = crypto.randomUUID();
					const news: News = {
						id: newsId,
						publishedAt: article.publishedAt,
						analyzedAt: new Date(),
						source: feedUrl,
						headline: article.headline
					};

					const impacts: NewsImpact[] = classifications.map((c) => ({
						id: crypto.randomUUID(),
						newsId,
						sector: c.sector,
						impactScore: c.impactScore,
						impactType: c.impactType,
						scoring: c.scoring
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
