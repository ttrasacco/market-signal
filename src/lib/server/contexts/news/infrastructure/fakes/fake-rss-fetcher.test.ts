import { describe, it, expect, beforeEach } from 'vitest';
import { FakeRssFetcher } from './fake-rss-fetcher';
import type { RawArticle } from '../../application/ports/rss-fetcher.port';

const makeArticle = (overrides?: Partial<RawArticle>): RawArticle => ({
	headline: 'Test headline',
	publishedAt: new Date('2026-03-19'),
	source: 'Reuters',
	...overrides,
});

describe('FakeRssFetcher', () => {
	let fake: FakeRssFetcher;

	beforeEach(() => {
		fake = new FakeRssFetcher();
	});

	it('returns empty array by default', async () => {
		const result = await fake.fetchArticles('https://any-feed.com/rss');
		expect(result).toHaveLength(0);
	});

	it('returns configured articles', async () => {
		fake.articles = [makeArticle(), makeArticle({ headline: 'Other news' })];
		const result = await fake.fetchArticles('https://any-feed.com/rss');
		expect(result).toHaveLength(2);
		expect(result[0].headline).toBe('Test headline');
	});

	it('returns a copy — mutating result does not affect internal state', async () => {
		fake.articles = [makeArticle()];
		const result = await fake.fetchArticles('https://any-feed.com/rss');
		result.pop();
		expect(fake.articles).toHaveLength(1);
	});

	it('throws when shouldThrow is true', async () => {
		fake.shouldThrow = true;
		await expect(fake.fetchArticles('https://any-feed.com/rss')).rejects.toThrow('Feed unavailable');
	});

	it('ignores the feedUrl argument (any URL returns same articles)', async () => {
		fake.articles = [makeArticle()];
		const r1 = await fake.fetchArticles('https://feed-a.com/rss');
		const r2 = await fake.fetchArticles('https://feed-b.com/rss');
		expect(r1).toHaveLength(1);
		expect(r2).toHaveLength(1);
	});
});
