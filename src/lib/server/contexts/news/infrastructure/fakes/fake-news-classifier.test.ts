import { describe, it, expect, beforeEach } from 'vitest';
import { FakeNewsClassifier } from './fake-news-classifier';
import { ApiError } from '../../../../infrastructure/errors/api-error';
import type { NewsClassification } from '../../application/ports/news-classifier.port';

const makeClassification = (overrides?: Partial<NewsClassification>): NewsClassification => ({
	sector: 'Technology',
	impactScore: 0.5,
	impactType: 'STRUCTURAL',
	...overrides,
});

describe('FakeNewsClassifier', () => {
	let fake: FakeNewsClassifier;

	beforeEach(() => {
		fake = new FakeNewsClassifier();
	});

	it('returns empty array by default', async () => {
		const result = await fake.classify('Any headline');
		expect(result).toHaveLength(0);
	});

	it('returns configured classifications', async () => {
		fake.classifications = [makeClassification(), makeClassification({ sector: 'Energy' })];
		const result = await fake.classify('Any headline');
		expect(result).toHaveLength(2);
		expect(result[0].sector).toBe('Technology');
	});

	it('returns a copy — mutating result does not affect internal state', async () => {
		fake.classifications = [makeClassification()];
		const result = await fake.classify('Any headline');
		result.pop();
		expect(fake.classifications).toHaveLength(1);
	});

	it('throws ApiError when shouldThrow is true', async () => {
		fake.shouldThrow = true;
		await expect(fake.classify('Any headline')).rejects.toThrow(ApiError);
	});

	it('ignores the headline argument (any headline returns same classifications)', async () => {
		fake.classifications = [makeClassification()];
		const r1 = await fake.classify('Headline A');
		const r2 = await fake.classify('Headline B');
		expect(r1).toHaveLength(1);
		expect(r2).toHaveLength(1);
	});
});
