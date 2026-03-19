import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GetLatestSectorScoresUseCase } from '$lib/server/contexts/scoring/application/use-cases/get-latest-sector-scores.use-case';
import { DrizzleSectorScoreAdapter } from '$lib/server/contexts/scoring/infrastructure/db/sector-score.adapter';

export const GET: RequestHandler = async () => {
  try {
    const repo = new DrizzleSectorScoreAdapter();
    const useCase = new GetLatestSectorScoresUseCase(repo);
    const sectors = await useCase.execute();
    return json({ sectors });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message, code: 500 }, { status: 500 });
  }
};
