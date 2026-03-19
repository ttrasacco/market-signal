import type { SignalColor } from '../sector-score-card/sector-score-card.utils';

export type { SignalColor };

export interface ReliabilityData {
	totalArticles: number;
	recentArticles: number;
	sourceCount: number;
	punctualProportion: number; // 0–1 ratio of PUNCTUAL impacts / total impacts
}

export interface CriterionResult {
	label: string;
	color: SignalColor;
}

function totalArticlesColor(n: number): SignalColor {
	if (n > 20) return 'green';
	if (n >= 5) return 'orange';
	return 'red';
}

function recentArticlesColor(n: number): SignalColor {
	if (n > 5) return 'green';
	if (n >= 2) return 'orange';
	return 'red';
}

function sourceDiversityColor(n: number): SignalColor {
	if (n > 3) return 'green';
	if (n >= 2) return 'orange';
	return 'red';
}

function punctualProportionColor(ratio: number): SignalColor {
	if (ratio < 0.35) return 'green';
	if (ratio <= 0.7) return 'orange';
	return 'red';
}

export function computeReliabilityColor(data: ReliabilityData): SignalColor {
	const colors: SignalColor[] = [
		totalArticlesColor(data.totalArticles),
		recentArticlesColor(data.recentArticles),
		sourceDiversityColor(data.sourceCount),
		punctualProportionColor(data.punctualProportion)
	];
	if (colors.includes('red')) return 'red';
	if (colors.includes('orange')) return 'orange';
	return 'green';
}

export function computeAllCriteria(data: ReliabilityData): CriterionResult[] {
	return [
		{ label: 'Coverage', color: totalArticlesColor(data.totalArticles) },
		{ label: 'Freshness', color: recentArticlesColor(data.recentArticles) },
		{ label: 'Source diversity', color: sourceDiversityColor(data.sourceCount) },
		{ label: 'Signal stability', color: punctualProportionColor(data.punctualProportion) }
	];
}
