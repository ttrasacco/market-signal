import { describe, it, expect, beforeEach } from 'vitest';
import { GetLatestSectorScoresUseCase } from './get-latest-sector-scores.use-case';
import { FakeSectorScoreAdapter } from '../../infrastructure/fakes/fake-sector-score.adapter';

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

  it('returns all scores for the latest date', async () => {
    const today = new Date('2026-03-19');
    await fake.upsert({ date: today, sector: 'TECHNOLOGY', score: 0.5, punctualScore: 0.2, structuralScore: 0.3 });
    await fake.upsert({ date: today, sector: 'ENERGY', score: -0.2, punctualScore: -0.2, structuralScore: 0 });
    const result = await useCase.execute();
    expect(result).toHaveLength(2);
  });

  it('returns only latest date scores when multiple dates exist', async () => {
    const yesterday = new Date('2026-03-18');
    const today = new Date('2026-03-19');
    await fake.upsert({ date: yesterday, sector: 'TECHNOLOGY', score: 0.3, punctualScore: 0.1, structuralScore: 0.2 });
    await fake.upsert({ date: today, sector: 'TECHNOLOGY', score: 0.5, punctualScore: 0.2, structuralScore: 0.3 });
    const result = await useCase.execute();
    expect(result).toHaveLength(1);
    expect(result[0].date.toISOString()).toContain('2026-03-19');
  });
});
