import type { PageServerLoad } from './$types';
import { DrizzleSectorScoreAdapter } from '$lib/server/contexts/scoring/infrastructure/db/sector-score.adapter';
import { DrizzleNewsImpactAdapter } from '$lib/server/contexts/news/infrastructure/db/news-impact.adapter';
import { GetLatestSectorScoresUseCase } from '$lib/server/contexts/scoring/application/use-cases/get-latest-sector-scores.use-case';
import {
	computeReliabilityDataPerSector,
	defaultReliabilityData
} from '$lib/components/dashboard-layout/dashboard-layout.utils';

export const load: PageServerLoad = async () => {
	const sectorScoreRepo = new DrizzleSectorScoreAdapter();
	const newsImpactRepo = new DrizzleNewsImpactAdapter();

	const useCase = new GetLatestSectorScoresUseCase(sectorScoreRepo);
	const [scores, allImpacts] = await Promise.all([
		useCase.execute(),
		newsImpactRepo.findAllImpactsWithSource()
	]);

	const reliabilityMap = computeReliabilityDataPerSector(allImpacts);

	return {
		sectors: scores.map((s) => ({
			...s,
			reliabilityData: reliabilityMap.get(s.sector) ?? defaultReliabilityData()
		}))
	};
};
