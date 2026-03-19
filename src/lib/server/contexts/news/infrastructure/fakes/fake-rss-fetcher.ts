import type { RssFetcherPort, RawArticle } from '../../application/ports/rss-fetcher.port';

export class FakeRssFetcher implements RssFetcherPort {
	public articles: RawArticle[];
	public shouldThrow = false;

	constructor(articles: RawArticle[] = []) {
		this.articles = articles;
	}

	async fetchArticles(_feedUrl: string): Promise<RawArticle[]> {
		if (this.shouldThrow) {
			throw new Error('Feed unavailable');
		}
		return [...this.articles];
	}
}
