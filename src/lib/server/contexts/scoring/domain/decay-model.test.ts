import { describe, it, expect } from 'vitest';
import { computeDecay, LAMBDA_STRUCTURAL, LAMBDA_PUNCTUAL } from './decay-model';
import { ImpactType } from '../../news/domain/impact-type';

describe('computeDecay', () => {
	it('applies no decay at age 0', () => {
		expect(computeDecay(0.8, ImpactType.STRUCTURAL, 0)).toBeCloseTo(0.8);
		expect(computeDecay(0.8, ImpactType.PUNCTUAL, 0)).toBeCloseTo(0.8);
	});

	it('STRUCTURAL decays slower than PUNCTUAL at day 7', () => {
		const structural = computeDecay(1.0, ImpactType.STRUCTURAL, 7);
		const punctual = computeDecay(1.0, ImpactType.PUNCTUAL, 7);
		expect(structural).toBeGreaterThan(punctual);
	});

	it('decay approaches 0 for large age', () => {
		// STRUCTURAL: e^(-0.05 * 500) ≈ 1.4e-11; PUNCTUAL: e^(-0.3 * 100) ≈ 9.4e-14
		expect(computeDecay(1.0, ImpactType.STRUCTURAL, 500)).toBeCloseTo(0, 5);
		expect(computeDecay(1.0, ImpactType.PUNCTUAL, 100)).toBeCloseTo(0, 5);
	});

	it('handles negative impact scores', () => {
		const result = computeDecay(-0.5, ImpactType.STRUCTURAL, 0);
		expect(result).toBeCloseTo(-0.5);
	});

	it('uses LAMBDA_STRUCTURAL for STRUCTURAL type', () => {
		const result = computeDecay(1.0, ImpactType.STRUCTURAL, 1);
		expect(result).toBeCloseTo(Math.exp(-LAMBDA_STRUCTURAL));
	});

	it('uses LAMBDA_PUNCTUAL for PUNCTUAL type', () => {
		const result = computeDecay(1.0, ImpactType.PUNCTUAL, 1);
		expect(result).toBeCloseTo(Math.exp(-LAMBDA_PUNCTUAL));
	});
});
