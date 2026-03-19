import { describe, it, expect, beforeEach } from 'vitest';
import { FakeSectorScoreAdapter } from '../fakes/fake-sector-score.adapter';
import { Sector } from '../../../news/domain/sector';

describe('FakeSectorScoreAdapter', () => {
  let repo: FakeSectorScoreAdapter;

  beforeEach(() => {
    repo = new FakeSectorScoreAdapter();
  });

  it('upserts and retrieves a score', async () => {
    const score = { date: new Date('2026-03-19'), sector: Sector.TECHNOLOGY, punctualScore: 0.4, structuralScore: 0.3, newsCount: 3 };
    await repo.upsert(score);
    const result = await repo.findLatest();
    const found = result.find((s) => s.sector === Sector.TECHNOLOGY);
    expect(found?.punctualScore).toBeCloseTo(0.4);
  });

  it('upsert twice same key = one row', async () => {
    const score = { date: new Date('2026-03-19'), sector: Sector.ENERGY, punctualScore: 0.3, structuralScore: 0.2, newsCount: 2 };
    await repo.upsert(score);
    await repo.upsert({ ...score, punctualScore: 0.9 });
    const result = await repo.findLatest();
    const found = result.filter((s) => s.sector === Sector.ENERGY);
    expect(found).toHaveLength(1);
    expect(found[0].punctualScore).toBeCloseTo(0.9);
  });
});
