import { eq } from 'drizzle-orm';
import { db } from '$lib/server/shared/db/client';
import {
	newsTable,
	newsImpactsTable
} from '$lib/server/contexts/news/infrastructure/db/news-impact.schema';
import type {
	NewsImpactReadPort,
	NewsImpactForScoring
} from '$lib/server/cross-context/compute-daily-scores/application/ports/news-impact.read.port';
import type { Sector } from '$lib/server/contexts/news/domain/sector';
import type { ImpactType } from '$lib/server/contexts/news/domain/impact-type';

export class DrizzleNewsImpactReadAdapter implements NewsImpactReadPort {
	async findAllImpacts(): Promise<NewsImpactForScoring[]> {
		const rows = await db
			.select({
				id: newsImpactsTable.id,
				newsId: newsImpactsTable.newsId,
				sector: newsImpactsTable.sector,
				impactScore: newsImpactsTable.impactScore,
				impactType: newsImpactsTable.impactType,
				publishedAt: newsTable.publishedAt
			})
			.from(newsImpactsTable)
			.innerJoin(newsTable, eq(newsImpactsTable.newsId, newsTable.id));

		return rows.map((row) => ({
			id: row.id,
			newsId: row.newsId,
			sector: row.sector as Sector,
			impactScore: row.impactScore,
			impactType: row.impactType as ImpactType,
			publishedAt: row.publishedAt
		}));
	}
}
