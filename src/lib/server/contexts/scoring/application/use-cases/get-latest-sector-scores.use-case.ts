import type { SectorScoreRepositoryPort } from '../ports/sector-score.repository.port';
import type { SectorScore } from '../../domain/sector-score';
import { Sector } from "$lib/server/contexts/news/domain/sector";

export interface SectorScoreView extends SectorScore {
	currentScore: number; // (punctualScore + structuralScore) / newsCount — latest snapshot
	trendingScore: number; // ∑((punctualScore + structuralScore) / newsCount) — cumulative sum of historical normalized scores
}

function normalizedScore(score: SectorScore): number {
	if (score.newsCount === 0) return 0;
	return (score.currentScore + score.trendingScore) / score.newsCount;
}

export class GetSectorScoresUseCase {
	constructor(private readonly sectorScoreRepo: SectorScoreRepositoryPort) {}

	async execute(): Promise<SectorScoreView[]> {
		const sectorScoreViews: SectorScoreView[] = [];
		for (const sector of Object.values(Sector)) {
			let latestSectorScore: SectorScore;
			try {
				latestSectorScore = await this.sectorScoreRepo.findLatest(sector);
			} catch {
				continue;
			}
			const sectorScoresHistory = await this.sectorScoreRepo.findHistory(sector);
			sectorScoreViews.push({
				...latestSectorScore,
				currentScore: normalizedScore(latestSectorScore),
				trendingScore: sectorScoresHistory.reduce((sum, s) => sum + normalizedScore(s), 0)
			});
		}
		return sectorScoreViews;
	}
}
