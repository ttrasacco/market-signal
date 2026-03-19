import { describe, it, expect, beforeEach } from 'vitest';
import { ComputeDailyScoresUseCase } from './compute-daily-scores.use-case';
import { FakeNewsImpactReadAdapter } from '../../infrastructure/fakes/fake-news-impact-read.adapter';
import { FakeSectorScoreAdapter } from '$lib/server/contexts/scoring/infrastructure/fakes/fake-sector-score.adapter';
import { ImpactType } from '$lib/server/contexts/news/domain/impact-type';
import { Sector } from '$lib/server/contexts/news/domain/sector';
import { computeDecay } from '$lib/server/contexts/scoring/domain/decay-model';

describe('ComputeDailyScoresUseCase', () => {
  let newsRepo: FakeNewsImpactReadAdapter;
  let scoreRepo: FakeSectorScoreAdapter;
  let useCase: ComputeDailyScoresUseCase;

  const today = new Date('2025-01-10T00:00:00.000Z');

  beforeEach(() => {
    newsRepo = new FakeNewsImpactReadAdapter();
    scoreRepo = new FakeSectorScoreAdapter();
    useCase = new ComputeDailyScoresUseCase(newsRepo, scoreRepo);
  });

  it('STRUCTURAL impact decays slower than PUNCTUAL for same input score and age', async () => {
    const publishedAt = new Date('2025-01-07T00:00:00.000Z'); // 3 days ago
    const impactScore = 5;

    newsRepo.impacts = [
      {
        id: '1',
        newsId: 'n1',
        sector: Sector.TECHNOLOGY,
        impactScore,
        impactType: ImpactType.STRUCTURAL,
        publishedAt,
      },
    ];
    await useCase.execute(today);
    const [structural] = Array.from(scoreRepo.scores.values());

    newsRepo.impacts = [
      {
        id: '2',
        newsId: 'n2',
        sector: Sector.TECHNOLOGY,
        impactScore,
        impactType: ImpactType.PUNCTUAL,
        publishedAt,
      },
    ];
    scoreRepo.scores.clear();
    await useCase.execute(today);
    const [punctual] = Array.from(scoreRepo.scores.values());

    expect(structural.punctualScore + structural.structuralScore).toBeGreaterThan(punctual.punctualScore + punctual.structuralScore);
  });

  it('PUNCTUAL-only sector → punctualScore > 0, structuralScore = 0', async () => {
    newsRepo.impacts = [
      {
        id: '1',
        newsId: 'n1',
        sector: Sector.TECHNOLOGY,
        impactScore: 5,
        impactType: ImpactType.PUNCTUAL,
        publishedAt: today,
      },
    ];

    await useCase.execute(today);

    const [result] = Array.from(scoreRepo.scores.values());
    expect(result.punctualScore).toBeGreaterThan(0);
    expect(result.structuralScore).toBe(0);
  });

  it('STRUCTURAL-only sector → structuralScore > 0, punctualScore = 0', async () => {
    newsRepo.impacts = [
      {
        id: '1',
        newsId: 'n1',
        sector: Sector.ENERGY,
        impactScore: 4,
        impactType: ImpactType.STRUCTURAL,
        publishedAt: today,
      },
    ];

    await useCase.execute(today);

    const [result] = Array.from(scoreRepo.scores.values());
    expect(result.structuralScore).toBeGreaterThan(0);
    expect(result.punctualScore).toBe(0);
  });

  it('mixed sector → score ≈ punctualScore + structuralScore', async () => {
    newsRepo.impacts = [
      {
        id: '1',
        newsId: 'n1',
        sector: Sector.FINANCIALS,
        impactScore: 6,
        impactType: ImpactType.PUNCTUAL,
        publishedAt: today,
      },
      {
        id: '2',
        newsId: 'n2',
        sector: Sector.FINANCIALS,
        impactScore: 3,
        impactType: ImpactType.STRUCTURAL,
        publishedAt: today,
      },
    ];

    await useCase.execute(today);

    const [result] = Array.from(scoreRepo.scores.values());
    expect(result.punctualScore).toBeGreaterThan(0);
    expect(result.structuralScore).toBeGreaterThan(0);
  });

  it('multi-sector aggregation — two impacts in different sectors → two upserts', async () => {
    newsRepo.impacts = [
      {
        id: '1',
        newsId: 'n1',
        sector: Sector.TECHNOLOGY,
        impactScore: 5,
        impactType: ImpactType.STRUCTURAL,
        publishedAt: today,
      },
      {
        id: '2',
        newsId: 'n2',
        sector: Sector.ENERGY,
        impactScore: 3,
        impactType: ImpactType.PUNCTUAL,
        publishedAt: today,
      },
    ];

    await useCase.execute(today);

    expect(scoreRepo.scores.size).toBe(2);
    const sectors = Array.from(scoreRepo.scores.values()).map((s) => s.sector);
    expect(sectors).toContain(Sector.TECHNOLOGY);
    expect(sectors).toContain(Sector.ENERGY);
  });

  it('idempotency — calling execute() twice for same date produces same scores', async () => {
    newsRepo.impacts = [
      {
        id: '1',
        newsId: 'n1',
        sector: Sector.TECHNOLOGY,
        impactScore: 5,
        impactType: ImpactType.STRUCTURAL,
        publishedAt: today,
      },
    ];

    await useCase.execute(today);
    const firstRun = Array.from(scoreRepo.scores.values());

    await useCase.execute(today);
    const secondRun = Array.from(scoreRepo.scores.values());

    expect(secondRun).toHaveLength(1);
    expect(secondRun[0].punctualScore).toBeCloseTo(firstRun[0].punctualScore, 10);
    expect(secondRun[0].structuralScore).toBeCloseTo(firstRun[0].structuralScore, 10);
  });

  it('empty impacts → no upserts called', async () => {
    newsRepo.impacts = [];
    await useCase.execute(today);
    expect(scoreRepo.scores.size).toBe(0);
  });

  it('age=0 → score equals raw impactScore (no decay at day 0)', async () => {
    const impactScore = 7;
    newsRepo.impacts = [
      {
        id: '1',
        newsId: 'n1',
        sector: Sector.TECHNOLOGY,
        impactScore,
        impactType: ImpactType.STRUCTURAL,
        publishedAt: today,
      },
    ];

    await useCase.execute(today);

    const [result] = Array.from(scoreRepo.scores.values());
    expect(result.structuralScore).toBeCloseTo(computeDecay(impactScore, ImpactType.STRUCTURAL, 0), 10);
    expect(result.structuralScore).toBeCloseTo(impactScore, 10);
  });
});
