import { computeReliabilityColor } from '../reliability-indicator/reliability-indicator.utils';
import type { ReliabilityData } from '../reliability-indicator/reliability-indicator.utils';
import type { Sector } from '$lib/server/contexts/news/domain/sector';
import type { NewsImpactWithSource } from '$lib/types/news';

export type SectorScoreWithReliability = {
	sector: Sector;
	currentScore: number;
	trendingScore: number;
	reliabilityData: ReliabilityData;
};

export function computeReliabilityDataPerSector(
	impacts: NewsImpactWithSource[]
): Map<string, ReliabilityData> {
	const map = new Map<string, ReliabilityData>();
	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

	const grouped = new Map<string, NewsImpactWithSource[]>();
	for (const impact of impacts) {
		const group = grouped.get(impact.sector) ?? [];
		group.push(impact);
		grouped.set(impact.sector, group);
	}

	for (const [sector, sectorImpacts] of grouped) {
		const totalArticles = sectorImpacts.length;
		const recentArticles = sectorImpacts.filter((i) => i.publishedAt >= sevenDaysAgo).length;
		const sourceCount = new Set(sectorImpacts.map((i) => i.source)).size;
		const punctualCount = sectorImpacts.filter((i) => i.impactType === 'PUNCTUAL').length;
		const punctualProportion = totalArticles > 0 ? punctualCount / totalArticles : 0;

		map.set(sector, { totalArticles, recentArticles, sourceCount, punctualProportion });
	}

	return map;
}

export function defaultReliabilityData(): ReliabilityData {
	return { totalArticles: 0, recentArticles: 0, sourceCount: 0, punctualProportion: 0 };
}

export function getBullishHighlights(
	sectors: SectorScoreWithReliability[]
): SectorScoreWithReliability[] {
	return sectors
		.filter(
			(s) => s.currentScore > 0 && computeReliabilityColor(s.reliabilityData) !== 'red'
		)
		.sort((a, b) => b.currentScore - a.currentScore)
		.slice(0, 3);
}

export function getBearishHighlights(
	sectors: SectorScoreWithReliability[]
): SectorScoreWithReliability[] {
	return sectors
		.filter(
			(s) => s.currentScore < 0 && computeReliabilityColor(s.reliabilityData) !== 'red'
		)
		.sort((a, b) => a.currentScore - b.currentScore)
		.slice(0, 3);
}

export function sortForTable(sectors: SectorScoreWithReliability[]): SectorScoreWithReliability[] {
	const reliable = sectors
		.filter((s) => computeReliabilityColor(s.reliabilityData) !== 'red')
		.sort((a, b) => b.currentScore - a.currentScore);
	const unreliable = sectors
		.filter((s) => computeReliabilityColor(s.reliabilityData) === 'red')
		.sort((a, b) => b.currentScore - a.currentScore);
	return [...reliable, ...unreliable];
}
