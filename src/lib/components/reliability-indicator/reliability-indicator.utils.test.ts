import { describe, it, expect } from 'vitest';
import {
	computeReliabilityColor,
	computeAllCriteria,
	type ReliabilityData
} from './reliability-indicator.utils';

const allGreen: ReliabilityData = {
	totalArticles: 21,
	recentArticles: 6,
	sourceCount: 4,
	punctualProportion: 0.2
};

const allRed: ReliabilityData = {
	totalArticles: 4,
	recentArticles: 1,
	sourceCount: 1,
	punctualProportion: 0.8
};

describe('computeReliabilityColor', () => {
	it('returns green when all criteria are green', () => {
		expect(computeReliabilityColor(allGreen)).toBe('green');
	});

	it('returns red when any criterion is red', () => {
		expect(computeReliabilityColor(allRed)).toBe('red');
	});

	it('returns red when only totalArticles is red (< 5)', () => {
		expect(
			computeReliabilityColor({ totalArticles: 4, recentArticles: 6, sourceCount: 4, punctualProportion: 0.2 })
		).toBe('red');
	});

	it('returns red when only recentArticles is red (< 2)', () => {
		expect(
			computeReliabilityColor({ totalArticles: 21, recentArticles: 1, sourceCount: 4, punctualProportion: 0.2 })
		).toBe('red');
	});

	it('returns red when only sourceCount is red (1)', () => {
		expect(
			computeReliabilityColor({ totalArticles: 21, recentArticles: 6, sourceCount: 1, punctualProportion: 0.2 })
		).toBe('red');
	});

	it('returns red when only punctualProportion is red (> 0.7)', () => {
		expect(
			computeReliabilityColor({ totalArticles: 21, recentArticles: 6, sourceCount: 4, punctualProportion: 0.71 })
		).toBe('red');
	});

	it('returns orange when no red but some orange', () => {
		expect(
			computeReliabilityColor({ totalArticles: 10, recentArticles: 6, sourceCount: 4, punctualProportion: 0.2 })
		).toBe('orange');
	});

	it('returns orange when recentArticles is orange (2–5)', () => {
		expect(
			computeReliabilityColor({ totalArticles: 21, recentArticles: 5, sourceCount: 4, punctualProportion: 0.2 })
		).toBe('orange');
	});

	it('returns orange when sourceCount is orange (2)', () => {
		expect(
			computeReliabilityColor({ totalArticles: 21, recentArticles: 6, sourceCount: 2, punctualProportion: 0.2 })
		).toBe('orange');
	});

	it('returns orange when punctualProportion is orange (0.35–0.70)', () => {
		expect(
			computeReliabilityColor({ totalArticles: 21, recentArticles: 6, sourceCount: 4, punctualProportion: 0.5 })
		).toBe('orange');
	});

	// Boundary values
	it('totalArticles = 5 → orange (not red)', () => {
		expect(
			computeReliabilityColor({ totalArticles: 5, recentArticles: 6, sourceCount: 4, punctualProportion: 0.2 })
		).toBe('orange');
	});

	it('totalArticles = 20 → orange (not green)', () => {
		expect(
			computeReliabilityColor({ totalArticles: 20, recentArticles: 6, sourceCount: 4, punctualProportion: 0.2 })
		).toBe('orange');
	});

	it('recentArticles = 2 → orange (not red)', () => {
		expect(
			computeReliabilityColor({ totalArticles: 21, recentArticles: 2, sourceCount: 4, punctualProportion: 0.2 })
		).toBe('orange');
	});

	it('recentArticles = 5 → orange (not green)', () => {
		expect(
			computeReliabilityColor({ totalArticles: 21, recentArticles: 5, sourceCount: 4, punctualProportion: 0.2 })
		).toBe('orange');
	});

	it('sourceCount = 2 → orange (not red)', () => {
		expect(
			computeReliabilityColor({ totalArticles: 21, recentArticles: 6, sourceCount: 2, punctualProportion: 0.2 })
		).toBe('orange');
	});

	it('sourceCount = 3 → orange (not green)', () => {
		expect(
			computeReliabilityColor({ totalArticles: 21, recentArticles: 6, sourceCount: 3, punctualProportion: 0.2 })
		).toBe('orange');
	});

	it('punctualProportion = 0.35 → orange (not green)', () => {
		expect(
			computeReliabilityColor({ totalArticles: 21, recentArticles: 6, sourceCount: 4, punctualProportion: 0.35 })
		).toBe('orange');
	});

	it('punctualProportion = 0.7 → orange (not red)', () => {
		expect(
			computeReliabilityColor({ totalArticles: 21, recentArticles: 6, sourceCount: 4, punctualProportion: 0.7 })
		).toBe('orange');
	});

	it('red wins over orange — mixed red+orange criteria → red', () => {
		expect(
			computeReliabilityColor({ totalArticles: 4, recentArticles: 3, sourceCount: 4, punctualProportion: 0.2 })
		).toBe('red');
	});
});

describe('computeAllCriteria', () => {
	it('returns 4 criteria', () => {
		expect(computeAllCriteria(allGreen)).toHaveLength(4);
	});

	it('all green when all thresholds pass', () => {
		const criteria = computeAllCriteria(allGreen);
		expect(criteria.every((c) => c.color === 'green')).toBe(true);
	});

	it('all red when all thresholds fail', () => {
		const criteria = computeAllCriteria(allRed);
		expect(criteria.every((c) => c.color === 'red')).toBe(true);
	});

	it('each criterion has a label and a color', () => {
		const criteria = computeAllCriteria(allGreen);
		for (const c of criteria) {
			expect(c.label).toBeTruthy();
			expect(['green', 'orange', 'red']).toContain(c.color);
		}
	});

	it('individual criterion colors are independent', () => {
		const data: ReliabilityData = {
			totalArticles: 4,     // red
			recentArticles: 3,    // orange
			sourceCount: 4,       // green
			punctualProportion: 0.2 // green
		};
		const criteria = computeAllCriteria(data);
		expect(criteria[0].color).toBe('red');
		expect(criteria[1].color).toBe('orange');
		expect(criteria[2].color).toBe('green');
		expect(criteria[3].color).toBe('green');
	});
});
