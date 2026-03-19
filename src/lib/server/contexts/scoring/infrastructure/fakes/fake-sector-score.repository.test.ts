import { describe, it, expect, beforeEach } from 'vitest';
import { FakeSectorScoreAdapter } from './fake-sector-score.adapter';
import { Sector } from '../../../news/domain/sector';

describe('FakeSectorScoreAdapter', () => {
  let repo: FakeSectorScoreAdapter;
  const today = new Date('2026-03-19');
  const yesterday = new Date('2026-03-18');

  beforeEach(() => {
    repo = new FakeSectorScoreAdapter();
  });

  it('starts empty', async () => {
    const result = await repo.findLatest();
    expect(result).toHaveLength(0);
  });

  it('stores a score via upsert', async () => {
    await repo.upsert({ date: today, sector: Sector.TECHNOLOGY, punctualScore: 0.3, structuralScore: 0.4, newsCount: 3 });
    expect(repo.scores.size).toBe(1);
  });

  it('overwrites same sector+date on second upsert', async () => {
    await repo.upsert({ date: today, sector: Sector.TECHNOLOGY, punctualScore: 0.3, structuralScore: 0.4, newsCount: 3 });
    await repo.upsert({ date: today, sector: Sector.TECHNOLOGY, punctualScore: 0.1, structuralScore: 0.2, newsCount: 1 });
    expect(repo.scores.size).toBe(1);
    const result = await repo.findLatest();
    expect(result[0].punctualScore).toBeCloseTo(0.1);
  });

  it('findLatest returns only max-date scores', async () => {
    await repo.upsert({ date: yesterday, sector: Sector.ENERGY, punctualScore: 0.2, structuralScore: 0.3, newsCount: 2 });
    await repo.upsert({ date: today, sector: Sector.TECHNOLOGY, punctualScore: 0.5, structuralScore: 0.3, newsCount: 4 });
    const result = await repo.findLatest();
    expect(result).toHaveLength(1);
    expect(result[0].sector).toBe(Sector.TECHNOLOGY);
  });

  it('returns all sectors for max date', async () => {
    await repo.upsert({ date: today, sector: Sector.TECHNOLOGY, punctualScore: 0.5, structuralScore: 0.3, newsCount: 4 });
    await repo.upsert({ date: today, sector: Sector.ENERGY, punctualScore: -0.3, structuralScore: 0, newsCount: 1 });
    const result = await repo.findLatest();
    expect(result).toHaveLength(2);
  });
});
