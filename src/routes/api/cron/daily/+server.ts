import type { RequestHandler } from '@sveltejs/kit';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import { DrizzleNewsImpactAdapter } from '$lib/server/contexts/news/infrastructure/db/news-impact.adapter';
import { AnthropicClassifier } from '$lib/server/contexts/news/infrastructure/llm/anthropic-classifier';
import { RssFetcher } from '$lib/server/contexts/news/infrastructure/rss/rss-fetcher';
import { IngestNewsUseCase } from '$lib/server/contexts/news/application/use-cases/ingest-news.use-case';
import { DrizzleNewsImpactReadAdapter } from '$lib/server/contexts/scoring/infrastructure/db/news-impact.read.adapter';
import { DrizzleSectorScoreAdapter } from '$lib/server/contexts/scoring/infrastructure/db/sector-score.adapter';
import { ComputeDailyScoresUseCase } from '$lib/server/contexts/scoring/application/use-cases/compute-daily-scores.use-case';
import { RunDailyPipelineUseCase } from '$lib/server/cross-context/pipeline/application/run-daily-pipeline.use-case';
import { handleCronRequest } from '$lib/server/cross-context/pipeline/interface/cron-handler';

const FEED_URLS = [
	'https://feeds.reuters.com/reuters/businessNews',
	'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
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
