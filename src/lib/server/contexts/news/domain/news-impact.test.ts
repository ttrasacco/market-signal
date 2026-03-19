import { describe, it, expect } from 'vitest';
import type { NewsImpact } from './news-impact';
import { validateNewsImpact } from './news-impact';
import type { News } from './news';
import { validateNews } from './news';
import { Sector } from './sector';
import { ImpactType } from './impact-type';

const baseImpact: NewsImpact = {
	id: 'uuid-1',
	newsId: 'news-1',
	sector: Sector.TECHNOLOGY,
	impactScore: 0,
	impactType: ImpactType.PUNCTUAL
};

const baseNews: News = {
	id: 'uuid-2',
	publishedAt: new Date('2026-03-19'),
	analyzedAt: new Date('2026-03-19'),
	source: 'Reuters',
	headline: 'Tech sector surges'
};

describe('NewsImpact validation', () => {
	it('accepts impactScore at boundary value -1', () => {
		expect(() => validateNewsImpact({ ...baseImpact, impactScore: -1 })).not.toThrow();
	});

	it('accepts impactScore at boundary value 1', () => {
		expect(() => validateNewsImpact({ ...baseImpact, impactScore: 1 })).not.toThrow();
	});

	it('accepts impactScore of 0', () => {
		expect(() => validateNewsImpact({ ...baseImpact, impactScore: 0 })).not.toThrow();
	});

	it('rejects impactScore > 1', () => {
		expect(() => validateNewsImpact({ ...baseImpact, impactScore: 1.1 })).toThrow(
			'impactScore must be in range [-1, 1]'
		);
	});

	it('rejects impactScore < -1', () => {
		expect(() => validateNewsImpact({ ...baseImpact, impactScore: -1.1 })).toThrow(
			'impactScore must be in range [-1, 1]'
		);
	});
});

describe('News validation', () => {
	it('accepts a valid headline', () => {
		expect(() => validateNews({ ...baseNews, headline: 'Valid headline' })).not.toThrow();
	});

	it('rejects empty headline', () => {
		expect(() => validateNews({ ...baseNews, headline: '' })).toThrow(
			'headline must not be empty'
		);
	});

	it('rejects whitespace-only headline', () => {
		expect(() => validateNews({ ...baseNews, headline: '   ' })).toThrow(
			'headline must not be empty'
		);
	});
});
