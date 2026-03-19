import { describe, it, expect, beforeEach } from 'vitest';
import { IngestNewsUseCase } from './ingest-news.use-case';
import { FakeRssFetcher } from '../../infrastructure/fakes/fake-rss-fetcher';
import { FakeNewsClassifier } from '../../infrastructure/fakes/fake-news-classifier';
import { FakeNewsImpactAdapter } from '../../infrastructure/fakes/fake-news-impact.adapter';
import type { RawArticle } from '../ports/rss-fetcher.port';
import type { NewsClassification } from '../ports/news-classifier.port';
import { Sector } from '../../domain/sector';
import { ImpactType } from '../../domain/impact-type';

const makeArticle = (overrides?: Partial<RawArticle>): RawArticle => ({
	headline: 'Test headline',
	publishedAt: new Date('2026-03-19'),
	source: 'Reuters',
	...overrides
});

const makeClassification = (overrides?: Partial<NewsClassification>): NewsClassification => ({
	sector: Sector.TECHNOLOGY,
	impactScore: 0.5,
	impactType: ImpactType.PUNCTUAL,
	...overrides
});

describe('IngestNewsUseCase', () => {
	let fetcher: FakeRssFetcher;
	let classifier: FakeNewsClassifier;
	let repository: FakeNewsImpactAdapter;
	let useCase: IngestNewsUseCase;

	beforeEach(() => {
		fetcher = new FakeRssFetcher();
		classifier = new FakeNewsClassifier();
		repository = new FakeNewsImpactAdapter();
		useCase = new IngestNewsUseCase(fetcher, classifier, repository, ['https://feed.com/rss']);
	});

	it('creates one NewsImpact per classification result', async () => {
		fetcher.articles = [makeArticle()];
		classifier.classifications = [
			makeClassification(),
			makeClassification({ sector: Sector.ENERGY })
		];

		const result = await useCase.execute();

		expect(repository.impacts).toHaveLength(2);
		expect(repository.news).toHaveLength(1);
		expect(result.articlesIngested).toBe(1);
		expect(result.impactsStored).toBe(2);
	});

	it('persists same newsId on all impacts for one article', async () => {
		fetcher.articles = [makeArticle()];
		classifier.classifications = [
			makeClassification(),
			makeClassification({ sector: Sector.FINANCIALS })
		];

		await useCase.execute();

		const [n] = repository.news;
		expect(repository.impacts.every((i) => i.newsId === n.id)).toBe(true);
	});

	it('processes multiple articles independently', async () => {
		fetcher.articles = [makeArticle({ headline: 'A' }), makeArticle({ headline: 'B' })];
		classifier.classifications = [makeClassification()];

		await useCase.execute();

		expect(repository.news).toHaveLength(2);
		expect(repository.impacts).toHaveLength(2);
	});

	it('skips article when classifier throws — does not abort pipeline', async () => {
		fetcher.articles = [makeArticle({ headline: 'Bad' }), makeArticle({ headline: 'Good' })];
		let callCount = 0;
		classifier.classify = async (_headline: string) => {
			callCount++;
			if (callCount === 1) throw new Error('API error');
			return [makeClassification()];
		};

		const result = await useCase.execute();

		expect(repository.news).toHaveLength(1);
		expect(result.articlesIngested).toBe(1);
	});

	it('skips feed when fetcher throws — processes other feeds', async () => {
		const goodFetcher = new FakeRssFetcher([makeArticle()]);
		useCase = new IngestNewsUseCase(
			{
				fetchArticles: async (url: string) => {
					if (url.includes('bad')) throw new Error('unreachable');
					return goodFetcher.fetchArticles(url);
				}
			},
			classifier,
			repository,
			['https://bad-feed.com/rss', 'https://good-feed.com/rss']
		);
		classifier.classifications = [makeClassification()];

		const result = await useCase.execute();

		expect(repository.news).toHaveLength(1);
		expect(result.articlesIngested).toBe(1);
	});

	it('returns zero counts when feed is empty', async () => {
		fetcher.articles = [];
		const result = await useCase.execute();
		expect(result.articlesIngested).toBe(0);
		expect(result.impactsStored).toBe(0);
	});

	it('skips article when classifier returns empty array', async () => {
		fetcher.articles = [makeArticle()];
		classifier.classifications = [];

		const result = await useCase.execute();

		expect(repository.news).toHaveLength(0);
		expect(result.articlesIngested).toBe(0);
	});
});
