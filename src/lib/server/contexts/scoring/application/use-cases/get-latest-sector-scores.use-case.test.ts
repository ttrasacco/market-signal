import { describe, it, expect, beforeEach } from 'vitest';
import { GetLatestSectorScoresUseCase } from './get-latest-sector-scores.use-case';
import { FakeSectorScoreAdapter } from '../../infrastructure/fakes/fake-sector-score.adapter';
import { Sector } from '$lib/server/contexts/news/domain/sector';

describe('GetLatestSectorScoresUseCase', () => {
	let fake: FakeSectorScoreAdapter;
	let useCase: GetLatestSectorScoresUseCase;

	beforeEach(() => {
		fake = new FakeSectorScoreAdapter();
		useCase = new GetLatestSectorScoresUseCase(fake);
	});

	it('returns empty array when no scores exist', async () => {
		const result = await useCase.execute();
		expect(result).toEqual([]);
	});

	it('returns a score with innerScore and outerScore', async () => {
		const today = new Date('2026-03-19');
		await fake.upsert({
			date: today,
			sector: Sector.TECHNOLOGY,
			punctualScore: 0.2,
			structuralScore: 0.3,
			newsCount: 2
		});
		const result = await useCase.execute();
		expect(result[0].innerScore).toBeDefined();
		expect(result[0].outerScore).toBeDefined();
	});

	it('computes innerScore as (punctualScore + structuralScore) / newsCount', async () => {
		const today = new Date('2026-03-19');
		await fake.upsert({
			date: today,
			sector: Sector.TECHNOLOGY,
			punctualScore: 0.2,
			structuralScore: 0.3,
			newsCount: 2
		});
		const [result] = await useCase.execute();
		expect(result.innerScore).toBeCloseTo((0.2 + 0.3) / 2, 10);
	});

	it('computes outerScore as cumulative sum of normalized historical scores', async () => {
		const yesterday = new Date('2026-03-18');
		const today = new Date('2026-03-19');
		await fake.upsert({
			date: yesterday,
			sector: Sector.TECHNOLOGY,
			punctualScore: 0.1,
			structuralScore: 0.1,
			newsCount: 2
		});
		await fake.upsert({
			date: today,
			sector: Sector.TECHNOLOGY,
			punctualScore: 0.2,
			structuralScore: 0.3,
			newsCount: 2
		});
		const [result] = await useCase.execute();
		// innerScore = (0.2 + 0.3) / 2 = 0.25
		expect(result.innerScore).toBeCloseTo(0.25, 10);
		// outerScore = (0.1+0.1)/2 + (0.2+0.3)/2 = 0.1 + 0.25 = 0.35 (sum, not mean)
		expect(result.outerScore).toBeCloseTo(0.35, 10);
	});

	it('computes outerScore === innerScore when only one historical snapshot exists', async () => {
		const today = new Date('2026-03-19');
		await fake.upsert({
			date: today,
			sector: Sector.TECHNOLOGY,
			punctualScore: 0.2,
			structuralScore: 0.3,
			newsCount: 2
		});
		const [result] = await useCase.execute();
		expect(result.outerScore).toBeCloseTo(result.innerScore, 10);
	});

	it('computes outerScore as sum of two normalized snapshots', async () => {
		const day1 = new Date('2026-03-17');
		const day2 = new Date('2026-03-19');
		await fake.upsert({
			date: day1,
			sector: Sector.TECHNOLOGY,
			punctualScore: 0.4,
			structuralScore: 0.2,
			newsCount: 4
		});
		await fake.upsert({
			date: day2,
			sector: Sector.TECHNOLOGY,
			punctualScore: 0.6,
			structuralScore: 0.0,
			newsCount: 3
		});
		const [result] = await useCase.execute();
		// normalizedScore(day1) = (0.4 + 0.2) / 4 = 0.15
		// normalizedScore(day2) = (0.6 + 0.0) / 3 = 0.2
		// outerScore = 0.15 + 0.2 = 0.35
		expect(result.outerScore).toBeCloseTo(0.35, 10);
	});

	it('returns 0 for innerScore when newsCount is 0', async () => {
		const today = new Date('2026-03-19');
		await fake.upsert({
			date: today,
			sector: Sector.TECHNOLOGY,
			punctualScore: 0.5,
			structuralScore: 0.5,
			newsCount: 0
		});
		const [result] = await useCase.execute();
		expect(result.innerScore).toBe(0);
	});
});
