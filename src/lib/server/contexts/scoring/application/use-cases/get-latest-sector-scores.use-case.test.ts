import { Sector } from "$lib/server/contexts/news/domain/sector";
import {
	beforeEach,
	describe,
	expect,
	it
} from "vitest";

import { FakeSectorScoreAdapter } from "../../infrastructure/fakes/fake-sector-score.adapter";
import { GetSectorScoresUseCase } from "./get-latest-sector-scores.use-case";

describe('GetSectorScoresUseCase', () => {
	let fake: FakeSectorScoreAdapter;
	let useCase: GetSectorScoresUseCase;

	beforeEach(() => {
		fake = new FakeSectorScoreAdapter();
		useCase = new GetSectorScoresUseCase(fake);
	});

	it('returns empty array when no scores exist', async () => {
		const result = await useCase.execute();
		expect(result).toEqual([]);
	});

	it('returns a score with currentScore and trendingScore', async () => {
		const today = new Date('2026-03-19');
		await fake.upsert({
			date: today,
			sector: Sector.TECHNOLOGY,
			currentScore: 0.2,
			trendingScore: 0.3,
			newsCount: 2
		});
		const result = await useCase.execute();
		expect(result[0].currentScore).toBeDefined();
		expect(result[0].trendingScore).toBeDefined();
	});

	it('computes currentScore as (punctualScore + structuralScore) / newsCount', async () => {
		const today = new Date('2026-03-19');
		await fake.upsert({
			date: today,
			sector: Sector.TECHNOLOGY,
			currentScore: 0.2,
			trendingScore: 0.3,
			newsCount: 2
		});
		const [result] = await useCase.execute();
		expect(result.currentScore).toBeCloseTo((0.2 + 0.3) / 2, 10);
	});

	it('computes trendingScore as cumulative sum of normalized historical scores', async () => {
		const yesterday = new Date('2026-03-18');
		const today = new Date('2026-03-19');
		await fake.upsert({
			date: yesterday,
			sector: Sector.TECHNOLOGY,
			currentScore: 0.1,
			trendingScore: 0.1,
			newsCount: 2
		});
		await fake.upsert({
			date: today,
			sector: Sector.TECHNOLOGY,
			currentScore: 0.2,
			trendingScore: 0.3,
			newsCount: 2
		});
		const [result] = await useCase.execute();
		// currentScore = (0.2 + 0.3) / 2 = 0.25
		expect(result.currentScore).toBeCloseTo(0.25, 10);
		// trendingScore = (0.1+0.1)/2 + (0.2+0.3)/2 = 0.1 + 0.25 = 0.35 (sum, not mean)
		expect(result.trendingScore).toBeCloseTo(0.35, 10);
	});

	it('computes trendingScore === currentScore when only one historical snapshot exists', async () => {
		const today = new Date('2026-03-19');
		await fake.upsert({
			date: today,
			sector: Sector.TECHNOLOGY,
			currentScore: 0.2,
			trendingScore: 0.3,
			newsCount: 2
		});
		const [result] = await useCase.execute();
		expect(result.trendingScore).toBeCloseTo(result.currentScore, 10);
	});

	it('computes trendingScore as sum of two normalized snapshots', async () => {
		const day1 = new Date('2026-03-17');
		const day2 = new Date('2026-03-19');
		await fake.upsert({
			date: day1,
			sector: Sector.TECHNOLOGY,
			currentScore: 0.4,
			trendingScore: 0.2,
			newsCount: 4
		});
		await fake.upsert({
			date: day2,
			sector: Sector.TECHNOLOGY,
			currentScore: 0.6,
			trendingScore: 0.0,
			newsCount: 3
		});
		const [result] = await useCase.execute();
		// normalizedScore(day1) = (0.4 + 0.2) / 4 = 0.15
		// normalizedScore(day2) = (0.6 + 0.0) / 3 = 0.2
		// trendingScore = 0.15 + 0.2 = 0.35
		expect(result.trendingScore).toBeCloseTo(0.35, 10);
	});

	it('returns 0 for currentScore when newsCount is 0', async () => {
		const today = new Date('2026-03-19');
		await fake.upsert({
			date: today,
			sector: Sector.TECHNOLOGY,
			currentScore: 0.5,
			trendingScore: 0.5,
			newsCount: 0
		});
		const [result] = await useCase.execute();
		expect(result.currentScore).toBe(0);
	});
});
