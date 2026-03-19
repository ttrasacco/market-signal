export interface RawArticle {
	publishedAt: Date;
	source: string;
	headline: string;
}

export interface RssFetcherPort {
	fetchArticles(feedUrl: string): Promise<RawArticle[]>;
}
