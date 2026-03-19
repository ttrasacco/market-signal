import type { PageServerLoad } from './$types';
import {
	computeReliabilityDataPerSector,
	defaultReliabilityData
} from "$lib/components/dashboard-layout/dashboard-layout.utils";
import {
	getNarrativeLabel,
	scoreToColor
} from "$lib/components/sector-score-card/sector-score-card.utils";
import { DrizzleNewsImpactAdapter } from "$lib/server/contexts/news/infrastructure/db/news-impact.adapter";
import { GetLatestSectorScoresUseCase } from "$lib/server/contexts/scoring/application/use-cases/get-latest-sector-scores.use-case";
import { DrizzleSectorScoreAdapter } from "$lib/server/contexts/scoring/infrastructure/db/sector-score.adapter";

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
		sectors: scores.map((s) => {
			const innerColor = scoreToColor(s.innerScore);
			const outerColor = scoreToColor(s.outerScore);
			return {
				sector: s.sector,
				innerScore: s.innerScore,
				innerColor,
				outerColor,
				narrativeLabel: getNarrativeLabel(innerColor, outerColor),
				reliabilityData: reliabilityMap.get(s.sector) ?? defaultReliabilityData()
			};
		})
	};
};
