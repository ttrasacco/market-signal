import { describe, it, expect } from 'vitest';
import { scoreToColor, getNarrativeLabel } from './sector-score-card.utils';

describe('scoreToColor', () => {
	it('returns green when score > 0.2', () => {
		expect(scoreToColor(0.21)).toBe('green');
		expect(scoreToColor(1)).toBe('green');
		expect(scoreToColor(0.5)).toBe('green');
	});

	it('returns red when score < -0.2', () => {
		expect(scoreToColor(-0.21)).toBe('red');
		expect(scoreToColor(-1)).toBe('red');
		expect(scoreToColor(-0.5)).toBe('red');
	});

	it('returns orange in the neutral zone [-0.2, 0.2]', () => {
		expect(scoreToColor(0)).toBe('orange');
		expect(scoreToColor(0.2)).toBe('orange');
		expect(scoreToColor(-0.2)).toBe('orange');
		expect(scoreToColor(0.1)).toBe('orange');
		expect(scoreToColor(-0.1)).toBe('orange');
	});
});

describe('getNarrativeLabel', () => {
	it('returns "Confirmed momentum" for green × green', () => {
		expect(getNarrativeLabel('green', 'green')).toBe('Confirmed momentum');
	});

	it('returns "Healthy · caution ahead" for green × orange', () => {
		expect(getNarrativeLabel('green', 'orange')).toBe('Healthy · caution ahead');
	});

	it('returns "Recovery · structural drag" for green × red', () => {
		expect(getNarrativeLabel('green', 'red')).toBe('Recovery · structural drag');
	});

	it('returns "Turbulence · rebound expected" for orange × green', () => {
		expect(getNarrativeLabel('orange', 'green')).toBe('Turbulence · rebound expected');
	});

	it('returns "Mixed signal" for orange × orange', () => {
		expect(getNarrativeLabel('orange', 'orange')).toBe('Mixed signal');
	});

	it('returns "Growing pressure" for orange × red', () => {
		expect(getNarrativeLabel('orange', 'red')).toBe('Growing pressure');
	});

	it('returns "Crisis · uncertain stabilization" for red × green', () => {
		expect(getNarrativeLabel('red', 'green')).toBe('Crisis · uncertain stabilization');
	});

	it('returns "Crisis · uncertain stabilization" for red × orange', () => {
		expect(getNarrativeLabel('red', 'orange')).toBe('Crisis · uncertain stabilization');
	});

	it('returns "Widespread deterioration" for red × red', () => {
		expect(getNarrativeLabel('red', 'red')).toBe('Widespread deterioration');
	});
});
