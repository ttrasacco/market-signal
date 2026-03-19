import type { RequestHandler } from '@sveltejs/kit';
import type { Config } from '@sveltejs/adapter-vercel';

export const config: Config = { maxDuration: 60 };
import { ANTHROPIC_API_KEY } from "$env/static/private";
import { IngestNewsUseCase } from "$lib/server/contexts/news/application/use-cases/ingest-news.use-case";
import { DrizzleNewsImpactAdapter } from "$lib/server/contexts/news/infrastructure/db/news-impact.adapter";
import { AnthropicClassifier } from "$lib/server/contexts/news/infrastructure/llm/anthropic-classifier";
import { RssFetcher } from "$lib/server/contexts/news/infrastructure/rss/rss-fetcher";
import { DrizzleSectorScoreAdapter } from "$lib/server/contexts/scoring/infrastructure/db/sector-score.adapter";
import { ComputeDailyScoresUseCase } from "$lib/server/cross-context/compute-daily-scores/application/use-cases/compute-daily-scores.use-case";
import { DrizzleNewsImpactReadAdapter } from "$lib/server/cross-context/compute-daily-scores/infrastructure/db/news-impact.read.adapter";
import { RunDailyPipelineUseCase } from "$lib/server/cross-context/pipeline/application/run-daily-pipeline.use-case";
import { handleCronRequest } from "$lib/server/cross-context/pipeline/interface/cron-handler";

const FEED_URLS = [
	'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
	'http://feeds.bbci.co.uk/news/world/rss.xml',
	'http://feeds.bbci.co.uk/news/business/rss.xml',
	'https://www.theguardian.com/business/rss',
	'https://www.theguardian.com/world/rss',
	'https://www.ft.com/companies?format=rss',
];

export const GET: RequestHandler = async ({ request }) => {
	const newsRepo = new DrizzleNewsImpactAdapter();
	const classifier = new AnthropicClassifier(ANTHROPIC_API_KEY);
	const fetcher = new RssFetcher();
	const ingestUseCase = new IngestNewsUseCase(fetcher, classifier, newsRepo, FEED_URLS);

	const newsReadRepo = new DrizzleNewsImpactReadAdapter();
	const sectorScoreRepo = new DrizzleSectorScoreAdapter();
	const computeUseCase = new ComputeDailyScoresUseCase(newsReadRepo, sectorScoreRepo);

	const pipeline = new RunDailyPipelineUseCase(ingestUseCase, computeUseCase);

	return handleCronRequest(request, pipeline);
};
