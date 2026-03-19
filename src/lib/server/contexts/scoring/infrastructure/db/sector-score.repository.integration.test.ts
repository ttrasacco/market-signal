import { describe, it, expect, beforeEach } from 'vitest';
import { DrizzleSectorScoreRepository } from './sector-score.repository';
import { Sector } from '../../../news/domain/sector';

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)('DrizzleSectorScoreRepository (integration)', () => {
  let repo: DrizzleSectorScoreRepository;

  beforeEach(() => {
    repo = new DrizzleSectorScoreRepository();
  });

  it('upserts and retrieves a score', async () => {
    const score = { date: new Date('2026-03-19'), sector: Sector.TECHNOLOGY, score: 0.7 };
    await repo.upsert(score);
    const result = await repo.findLatest();
    const found = result.find((s) => s.sector === Sector.TECHNOLOGY);
    expect(found?.score).toBeCloseTo(0.7);
  });

  it('upsert twice same key = one row', async () => {
    const score = { date: new Date('2026-03-19'), sector: Sector.ENERGY, score: 0.5 };
    await repo.upsert(score);
    await repo.upsert({ ...score, score: 0.9 });
    const result = await repo.findLatest();
    const found = result.filter((s) => s.sector === Sector.ENERGY);
    expect(found).toHaveLength(1);
    expect(found[0].score).toBeCloseTo(0.9);
  });
});
