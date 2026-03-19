import Parser from 'rss-parser';
import type { RssFetcherPort, RawArticle } from '../../application/ports/rss-fetcher.port';

const parser = new Parser();

export class RssFetcher implements RssFetcherPort {
	async fetchArticles(feedUrl: string): Promise<RawArticle[]> {
		const feed = await parser.parseURL(feedUrl);
		const source = feed.title ?? new URL(feedUrl).hostname;

		return (feed.items ?? [])
			.filter((item) => !!item.title)
			.map((item) => ({
				headline: item.title!,
				publishedAt: new Date(item.isoDate ?? item.pubDate ?? new Date().toISOString()),
				source
			}));
	}
}
