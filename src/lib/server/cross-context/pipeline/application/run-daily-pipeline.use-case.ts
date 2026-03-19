import type { IngestNewsUseCase, IngestNewsResult } from '$lib/server/contexts/news/application/use-cases/ingest-news.use-case';
import type { ComputeDailyScoresUseCase } from '$lib/server/cross-context/compute-daily-scores/application/use-cases/compute-daily-scores.use-case';

export interface RunDailyPipelineResult {
	articlesIngested: number;
	impactsStored: number;
	scoresComputed: number;
}

export class RunDailyPipelineUseCase {
	constructor(
		private readonly ingestNewsUseCase: IngestNewsUseCase,
		private readonly computeDailyScoresUseCase: ComputeDailyScoresUseCase
	) {}

	async execute(): Promise<RunDailyPipelineResult> {
		let articlesIngested = 0;
		let impactsStored = 0;

		try {
			const ingestResult: IngestNewsResult = await this.ingestNewsUseCase.execute();
			articlesIngested = ingestResult.articlesIngested;
			impactsStored = ingestResult.impactsStored;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			console.error(`[PIPELINE] ingest error: ${message}`);
			// Continue to scoring — it can run on existing event store data
		}

		const { scoresComputed } = await this.computeDailyScoresUseCase.execute(new Date());

		return { articlesIngested, impactsStored, scoresComputed };
	}
}
