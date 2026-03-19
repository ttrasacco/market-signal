import { describe, it, expect, beforeEach } from 'vitest';
import { FakeSectorScoreRepository } from './fake-sector-score.repository';
import { Sector } from '../../../news/domain/sector';

describe('FakeSectorScoreRepository', () => {
  let repo: FakeSectorScoreRepository;
  const today = new Date('2026-03-19');
  const yesterday = new Date('2026-03-18');

  beforeEach(() => {
    repo = new FakeSectorScoreRepository();
  });

  it('starts empty', async () => {
    const result = await repo.findLatest();
    expect(result).toHaveLength(0);
  });

  it('stores a score via upsert', async () => {
    await repo.upsert({ date: today, sector: Sector.TECHNOLOGY, score: 0.7, punctualScore: 0.3, structuralScore: 0.4 });
    expect(repo.scores.size).toBe(1);
  });

  it('overwrites same sector+date on second upsert', async () => {
    await repo.upsert({ date: today, sector: Sector.TECHNOLOGY, score: 0.7, punctualScore: 0.3, structuralScore: 0.4 });
    await repo.upsert({ date: today, sector: Sector.TECHNOLOGY, score: 0.3, punctualScore: 0.1, structuralScore: 0.2 });
    expect(repo.scores.size).toBe(1);
    const result = await repo.findLatest();
    expect(result[0].score).toBeCloseTo(0.3);
  });

  it('findLatest returns only max-date scores', async () => {
    await repo.upsert({ date: yesterday, sector: Sector.ENERGY, score: 0.5, punctualScore: 0.2, structuralScore: 0.3 });
    await repo.upsert({ date: today, sector: Sector.TECHNOLOGY, score: 0.8, punctualScore: 0.5, structuralScore: 0.3 });
    const result = await repo.findLatest();
    expect(result).toHaveLength(1);
    expect(result[0].sector).toBe(Sector.TECHNOLOGY);
  });

  it('returns all sectors for max date', async () => {
    await repo.upsert({ date: today, sector: Sector.TECHNOLOGY, score: 0.8, punctualScore: 0.5, structuralScore: 0.3 });
    await repo.upsert({ date: today, sector: Sector.ENERGY, score: -0.3, punctualScore: -0.3, structuralScore: 0 });
    const result = await repo.findLatest();
    expect(result).toHaveLength(2);
  });
});
