import { db } from '$lib/server/shared/db/client';
import { sectorScoresTable } from './sector-score.schema';
import { eq, sql } from 'drizzle-orm';
import type { SectorScoreRepositoryPort } from '../../application/ports/sector-score.repository.port';
import type { SectorScore } from '../../domain/sector-score';
import type { Sector } from '../../../news/domain/sector';

export class DrizzleSectorScoreRepository implements SectorScoreRepositoryPort {
  async upsert(score: SectorScore): Promise<void> {
    const dateStr = score.date.toISOString().split('T')[0];
    await db
      .insert(sectorScoresTable)
      .values({
        date: dateStr,
        sector: score.sector,
        score: score.score,
        punctualScore: score.punctualScore,
        structuralScore: score.structuralScore,
      })
      .onConflictDoUpdate({
        target: [sectorScoresTable.date, sectorScoresTable.sector],
        set: {
          score: score.score,
          punctualScore: score.punctualScore,
          structuralScore: score.structuralScore,
        },
      });
  }

  async findLatest(): Promise<SectorScore[]> {
    const rows = await db
      .select()
      .from(sectorScoresTable)
      .where(eq(sectorScoresTable.date, sql`(SELECT MAX(date) FROM sector_scores)`));

    return rows.map((row) => ({
      date: new Date(row.date),
      sector: row.sector as Sector,
      score: row.score,
      punctualScore: row.punctualScore ?? 0,
      structuralScore: row.structuralScore ?? 0,
    }));
  }
}
