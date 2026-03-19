import { db } from '$lib/server/shared/db/client';
import { sectorScoresTable } from './sector-score.schema';
import { eq, sql } from 'drizzle-orm';
import type { SectorScoreRepositoryPort } from '../../application/ports/sector-score.repository.port';
import type { SectorScore } from '../../domain/sector-score';
import type { Sector } from '../../../news/domain/sector';

export class DrizzleSectorScoreAdapter implements SectorScoreRepositoryPort {
  async upsert(score: SectorScore): Promise<void> {
    const dateStr = score.date.toISOString().split('T')[0];
    await db
      .insert(sectorScoresTable)
      .values({
        date: dateStr,
        sector: score.sector,
        punctualScore: score.punctualScore,
        structuralScore: score.structuralScore,
        newsCount: score.newsCount,
      })
      .onConflictDoUpdate({
        target: [sectorScoresTable.date, sectorScoresTable.sector],
        set: {
          punctualScore: score.punctualScore,
          structuralScore: score.structuralScore,
          newsCount: score.newsCount,
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
      punctualScore: row.punctualScore ?? 0,
      structuralScore: row.structuralScore ?? 0,
      newsCount: row.newsCount ?? 0,
    }));
  }
}
