import type { PageServerLoad } from './$types';
import {
	computeReliabilityDataPerSector,
	defaultReliabilityData
} from "$lib/components/dashboard-layout/dashboard-layout.utils";
import { DrizzleNewsImpactAdapter } from "$lib/server/contexts/news/infrastructure/db/news-impact.adapter";
import { GetSectorScoresUseCase } from "$lib/server/contexts/scoring/application/use-cases/get-latest-sector-scores.use-case";
import { DrizzleSectorScoreAdapter } from "$lib/server/contexts/scoring/infrastructure/db/sector-score.adapter";

export const load: PageServerLoad = async () => {
	const sectorScoreRepo = new DrizzleSectorScoreAdapter();
	const newsImpactRepo = new DrizzleNewsImpactAdapter();

	const useCase = new GetSectorScoresUseCase(sectorScoreRepo);
	const [scores, allImpacts] = await Promise.all([
		useCase.execute(),
		newsImpactRepo.findAllImpactsWithSource()
	]);

	const reliabilityMap = computeReliabilityDataPerSector(allImpacts);

	return {
		sectors: scores.map((s) => {
			return {
				sector: s.sector,
				currentScore: s.currentScore,
				trendingScore: s.trendingScore,
				reliabilityData: reliabilityMap.get(s.sector) ?? defaultReliabilityData()
			};
		})
	};
};
