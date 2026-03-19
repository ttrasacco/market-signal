import { describe, it, expect, beforeEach } from 'vitest';
import { GetSectorDashboardUseCase } from './get-sector-dashboard.use-case';
import { FakeSectorScoreRepository } from '../../infrastructure/fakes/fake-sector-score.repository';

describe('GetSectorDashboardUseCase', () => {
  let fake: FakeSectorScoreRepository;
  let useCase: GetSectorDashboardUseCase;

  beforeEach(() => {
    fake = new FakeSectorScoreRepository();
    useCase = new GetSectorDashboardUseCase(fake);
  });

  it('returns empty array when no scores exist', async () => {
    const result = await useCase.execute();
    expect(result).toEqual([]);
  });

  it('returns all scores for the latest date', async () => {
    const today = new Date('2026-03-19');
    await fake.upsert({ date: today, sector: 'TECHNOLOGY', score: 0.5 });
    await fake.upsert({ date: today, sector: 'ENERGY', score: -0.2 });
    const result = await useCase.execute();
    expect(result).toHaveLength(2);
  });

  it('returns only latest date scores when multiple dates exist', async () => {
    const yesterday = new Date('2026-03-18');
    const today = new Date('2026-03-19');
    await fake.upsert({ date: yesterday, sector: 'TECHNOLOGY', score: 0.3 });
    await fake.upsert({ date: today, sector: 'TECHNOLOGY', score: 0.5 });
    const result = await useCase.execute();
    expect(result).toHaveLength(1);
    expect(result[0].date.toISOString()).toContain('2026-03-19');
  });
});
