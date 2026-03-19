import { describe, it, expect, beforeEach } from 'vitest';
import { FakeNewsImpactAdapter } from './fake-news-impact.adapter';
import type { News } from '../../domain/news';
import type { NewsImpact } from '../../domain/news-impact';
import { Sector } from '../../domain/sector';
import { ImpactType } from '../../domain/impact-type';

describe('FakeNewsImpactAdapter', () => {
	let repo: FakeNewsImpactAdapter;

	const makeNews = (overrides?: Partial<News>): News => ({
		id: crypto.randomUUID(),
		publishedAt: new Date(),
		analyzedAt: new Date(),
		source: 'Reuters',
		headline: 'Test headline',
		...overrides
	});

	const makeImpact = (newsId: string, overrides?: Partial<NewsImpact>): NewsImpact => ({
		id: crypto.randomUUID(),
		newsId,
		sector: Sector.TECHNOLOGY,
		impactScore: 0.5,
		impactType: ImpactType.PUNCTUAL,
		...overrides
	});

	beforeEach(() => {
		repo = new FakeNewsImpactAdapter();
	});

	it('starts empty', async () => {
		expect(repo.news).toHaveLength(0);
		expect(repo.impacts).toHaveLength(0);
		expect(await repo.findAllImpacts()).toHaveLength(0);
	});

	it('save() stores news and impacts in memory', async () => {
		const news = makeNews();
		const impacts = [makeImpact(news.id), makeImpact(news.id)];

		await repo.save(news, impacts);

		expect(repo.news).toHaveLength(1);
		expect(repo.news[0]).toBe(news);
		expect(repo.impacts).toHaveLength(2);
	});

	it('save() with zero impacts stores only news', async () => {
		const news = makeNews();

		await repo.save(news, []);

		expect(repo.news).toHaveLength(1);
		expect(repo.impacts).toHaveLength(0);
	});

	it('findAllImpacts() returns all stored impacts', async () => {
		const news = makeNews();
		const impacts = [
			makeImpact(news.id, { sector: Sector.ENERGY, impactScore: -0.3 }),
			makeImpact(news.id, { sector: Sector.TECHNOLOGY, impactScore: 0.8 })
		];

		await repo.save(news, impacts);
		const found = await repo.findAllImpacts();

		expect(found).toHaveLength(2);
		expect(found.map((i) => i.sector)).toContain(Sector.ENERGY);
		expect(found.map((i) => i.sector)).toContain(Sector.TECHNOLOGY);
	});

	it('findAllImpacts() returns a copy — mutating result does not affect internal state', async () => {
		const news = makeNews();
		await repo.save(news, [makeImpact(news.id)]);

		const found = await repo.findAllImpacts();
		found.pop();

		expect(repo.impacts).toHaveLength(1);
	});

	it('accumulates impacts across multiple saves', async () => {
		const news1 = makeNews();
		const news2 = makeNews();

		await repo.save(news1, [makeImpact(news1.id)]);
		await repo.save(news2, [makeImpact(news2.id), makeImpact(news2.id)]);

		expect(repo.news).toHaveLength(2);
		expect(repo.impacts).toHaveLength(3);
	});
});
