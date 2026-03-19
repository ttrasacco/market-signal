import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GetSectorDashboardUseCase } from '$lib/server/contexts/scoring/application/use-cases/get-sector-dashboard.use-case';
import { DrizzleSectorScoreRepository } from '$lib/server/contexts/scoring/infrastructure/db/sector-score.repository';

export const GET: RequestHandler = async () => {
  try {
    const repo = new DrizzleSectorScoreRepository();
    const useCase = new GetSectorDashboardUseCase(repo);
    const sectors = await useCase.execute();
    return json({ sectors });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message, code: 500 }, { status: 500 });
  }
};
