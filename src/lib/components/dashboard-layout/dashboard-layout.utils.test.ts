import {
	describe,
	expect,
	it
} from "vitest";

import {
	computeReliabilityDataPerSector,
	defaultReliabilityData,
	getBearishHighlights,
	getBullishHighlights,
	sortForTable,
	type SectorScoreWithReliability
} from "./dashboard-layout.utils";

import type { ReliabilityData } from '../reliability-indicator/reliability-indicator.utils';
import type { NewsImpactWithSource } from '$lib/types/news';

// Helpers
function makeReliable(sector: string, currentScore: number): SectorScoreWithReliability {
	return {
		sector: sector as SectorScoreWithReliability['sector'],
		currentScore,
		trendingScore: 0,
		reliabilityData: {
			totalArticles: 25,
			recentArticles: 8,
			sourceCount: 5,
			punctualProportion: 0.2
		}
	};
}

function makeUnreliable(sector: string, currentScore: number): SectorScoreWithReliability {
	return {
		...makeReliable(sector, currentScore),
		reliabilityData: {
			totalArticles: 2,
			recentArticles: 0,
			sourceCount: 1,
			punctualProportion: 0
		}
	};
}

// ─── getBullishHighlights ──────────────────────────────────────────────────────

describe('getBullishHighlights', () => {
	it('returns top 3 reliable sectors with score > 0', () => {
		const sectors = [
			makeReliable('Technology', 0.8),
			makeReliable('Energy', 0.5),
			makeReliable('Finance', 0.3),
			makeReliable('Healthcare', 0.1)
		];
		const result = getBullishHighlights(sectors);
		expect(result).toHaveLength(3);
		expect(result[0].sector).toBe('Technology');
		expect(result[1].sector).toBe('Energy');
		expect(result[2].sector).toBe('Finance');
	});

	it('excludes red-reliability sectors', () => {
		const sectors = [
			makeReliable('Technology', 0.8),
			makeUnreliable('Energy', 0.9), // unreliable but high score — must be excluded
			makeReliable('Finance', 0.3)
		];
		const result = getBullishHighlights(sectors);
		expect(result.map((s) => s.sector)).not.toContain('Energy');
		expect(result.map((s) => s.sector)).toContain('Technology');
	});

	it('excludes sectors with score <= 0', () => {
		const sectors = [
			makeReliable('Technology', 0.5),
			makeReliable('Energy', 0),
			makeReliable('Finance', -0.3)
		];
		const result = getBullishHighlights(sectors);
		expect(result).toHaveLength(1);
		expect(result[0].sector).toBe('Technology');
	});

	it('returns fewer than 3 when fewer qualify', () => {
		const sectors = [makeReliable('Technology', 0.5), makeReliable('Energy', 0.3)];
		const result = getBullishHighlights(sectors);
		expect(result).toHaveLength(2);
	});

	it('returns empty when no qualifying sectors', () => {
		const sectors = [makeUnreliable('Technology', 0.5), makeReliable('Finance', -0.3)];
		expect(getBullishHighlights(sectors)).toHaveLength(0);
	});
});

// ─── getBearishHighlights ──────────────────────────────────────────────────────

describe('getBearishHighlights', () => {
	it('returns bottom 3 reliable sectors with score < 0, lowest first', () => {
		const sectors = [
			makeReliable('Technology', -0.8),
			makeReliable('Energy', -0.5),
			makeReliable('Finance', -0.3),
			makeReliable('Healthcare', -0.1)
		];
		const result = getBearishHighlights(sectors);
		expect(result).toHaveLength(3);
		expect(result[0].sector).toBe('Technology'); // most negative first
		expect(result[1].sector).toBe('Energy');
		expect(result[2].sector).toBe('Finance');
	});

	it('excludes red-reliability sectors', () => {
		const sectors = [
			makeReliable('Technology', -0.8),
			makeUnreliable('Energy', -0.9) // unreliable most negative — excluded
		];
		const result = getBearishHighlights(sectors);
		expect(result.map((s) => s.sector)).not.toContain('Energy');
	});

	it('excludes sectors with score >= 0', () => {
		const sectors = [
			makeReliable('Technology', -0.5),
			makeReliable('Energy', 0),
			makeReliable('Finance', 0.3)
		];
		const result = getBearishHighlights(sectors);
		expect(result).toHaveLength(1);
		expect(result[0].sector).toBe('Technology');
	});

	it('returns empty when all are red-reliability', () => {
		const sectors = [makeUnreliable('Technology', -0.5), makeUnreliable('Energy', -0.3)];
		expect(getBearishHighlights(sectors)).toHaveLength(0);
	});
});

// ─── sortForTable ──────────────────────────────────────────────────────────────

describe('sortForTable', () => {
	it('places reliable sectors before unreliable, sorted descending within each group', () => {
		const sectors = [
			makeReliable('Technology', 0.5),
			makeUnreliable('Energy', 0.9),
			makeReliable('Finance', 0.2),
			makeUnreliable('Healthcare', 0.3)
		];
		const result = sortForTable(sectors);
		// reliable first: Technology (0.5), Finance (0.2)
		expect(result[0].sector).toBe('Technology');
		expect(result[1].sector).toBe('Finance');
		// unreliable after: Energy (0.9), Healthcare (0.3)
		expect(result[2].sector).toBe('Energy');
		expect(result[3].sector).toBe('Healthcare');
	});

	it('sorts reliable group by descending score', () => {
		const sectors = [
			makeReliable('Finance', 0.2),
			makeReliable('Technology', 0.8),
			makeReliable('Energy', 0.5)
		];
		const result = sortForTable(sectors);
		expect(result.map((s) => s.sector)).toEqual(['Technology', 'Energy', 'Finance']);
	});

	it('returns all sectors when all are red-reliability, sorted descending', () => {
		const sectors = [makeUnreliable('Finance', 0.2), makeUnreliable('Technology', 0.8)];
		const result = sortForTable(sectors);
		expect(result[0].sector).toBe('Technology');
		expect(result[1].sector).toBe('Finance');
	});

	it('returns empty list when no sectors', () => {
		expect(sortForTable([])).toEqual([]);
	});

	it('handles exactly 3 qualifying sectors correctly', () => {
		const sectors = [makeReliable('A', 0.9), makeReliable('B', 0.5), makeReliable('C', 0.1)];
		const bullish = getBullishHighlights(sectors);
		expect(bullish).toHaveLength(3);
	});
});

// ─── computeReliabilityDataPerSector ──────────────────────────────────────────

describe('computeReliabilityDataPerSector', () => {
	const now = new Date();
	const recent = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
	const old = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

	const impacts: NewsImpactWithSource[] = [
		{ sector: 'Technology', impactType: 'STRUCTURAL', publishedAt: recent, source: 'Reuters' },
		{ sector: 'Technology', impactType: 'PUNCTUAL', publishedAt: old, source: 'Bloomberg' },
		{ sector: 'Technology', impactType: 'PUNCTUAL', publishedAt: recent, source: 'Reuters' },
		{ sector: 'Energy', impactType: 'STRUCTURAL', publishedAt: old, source: 'FT' }
	];

	it('computes totalArticles per sector', () => {
		const map = computeReliabilityDataPerSector(impacts);
		expect(map.get('Technology')?.totalArticles).toBe(3);
		expect(map.get('Energy')?.totalArticles).toBe(1);
	});

	it('computes recentArticles (last 7 days)', () => {
		const map = computeReliabilityDataPerSector(impacts);
		expect(map.get('Technology')?.recentArticles).toBe(2); // 2 recent articles
		expect(map.get('Energy')?.recentArticles).toBe(0); // old article
	});

	it('computes sourceCount as distinct sources', () => {
		const map = computeReliabilityDataPerSector(impacts);
		expect(map.get('Technology')?.sourceCount).toBe(2); // Reuters + Bloomberg
		expect(map.get('Energy')?.sourceCount).toBe(1); // FT only
	});

	it('computes punctualProportion correctly', () => {
		const map = computeReliabilityDataPerSector(impacts);
		// Technology: 2 PUNCTUAL / 3 total = 0.6667
		expect(map.get('Technology')?.punctualProportion).toBeCloseTo(2 / 3);
		// Energy: 0 PUNCTUAL / 1 total = 0
		expect(map.get('Energy')?.punctualProportion).toBe(0);
	});

	it('returns empty map for no impacts', () => {
		const map = computeReliabilityDataPerSector([]);
		expect(map.size).toBe(0);
	});
});

// ─── defaultReliabilityData ────────────────────────────────────────────────────

describe('defaultReliabilityData', () => {
	it('returns zero-filled ReliabilityData', () => {
		const data: ReliabilityData = defaultReliabilityData();
		expect(data.totalArticles).toBe(0);
		expect(data.recentArticles).toBe(0);
		expect(data.sourceCount).toBe(0);
		expect(data.punctualProportion).toBe(0);
	});
});
