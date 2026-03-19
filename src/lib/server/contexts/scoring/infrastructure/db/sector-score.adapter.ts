import { db } from "$lib/server/shared/db/client";
import {
	eq,
	sql
} from "drizzle-orm";

import { sectorScoresTable } from "./sector-score.schema";

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

  async findLatest(sector: Sector): Promise<SectorScore> {
    const row = (await db
      .select()
      .from(sectorScoresTable)
      .where(eq(sectorScoresTable.sector, sector))
      .orderBy(sql`date DESC`)
      .limit(1))[0];

    return {
      date: new Date(row.date),
      sector: row.sector as Sector,
      punctualScore: row.punctualScore ?? 0,
      structuralScore: row.structuralScore ?? 0,
      newsCount: row.newsCount ?? 0,
    };
  }

  async findHistory(): Promise<SectorScore[]> {
    const rows = await db.select().from(sectorScoresTable);
    return rows.map((row) => ({
      date: new Date(row.date),
      sector: row.sector as Sector,
      punctualScore: row.punctualScore ?? 0,
      structuralScore: row.structuralScore ?? 0,
      newsCount: row.newsCount ?? 0,
    }));
  }
}
