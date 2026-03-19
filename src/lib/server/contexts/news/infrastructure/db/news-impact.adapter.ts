import { db } from '$lib/server/shared/db/client';
import { newsTable, newsImpactsTable } from './news-impact.schema';
import { eq } from 'drizzle-orm';
import type { NewsImpactRepositoryPort, NewsImpactWithSource } from '../../application/ports/news-impact.repository.port';
import type { News } from '../../domain/news';
import type { NewsImpact } from '../../domain/news-impact';

export class DrizzleNewsImpactAdapter implements NewsImpactRepositoryPort {
	async save(news: News, impacts: NewsImpact[]): Promise<void> {
		await db.transaction(async (tx) => {
			const inserted = await tx
				.insert(newsTable)
				.values({
					id: news.id,
					publishedAt: news.publishedAt,
					analyzedAt: news.analyzedAt,
					source: news.source,
					headline: news.headline,
				})
				.onConflictDoNothing()
				.returning({ id: newsTable.id });

			if (inserted.length === 0) return; // duplicate — skip impacts

			if (impacts.length > 0) {
				await tx.insert(newsImpactsTable).values(
					impacts.map((impact) => ({
						id: impact.id,
						newsId: impact.newsId,
						sector: impact.sector,
						impactScore: impact.impactScore,
						impactType: impact.impactType,
						scoring: impact.scoring ?? null,
					}))
				);
			}
		});
	}

	async findAllImpacts(): Promise<NewsImpact[]> {
		const rows = await db.select().from(newsImpactsTable);
		return rows.map((row) => ({
			id: row.id,
			newsId: row.newsId,
			sector: row.sector as NewsImpact['sector'],
			impactScore: Math.round(row.impactScore * 10000) / 10000,
			impactType: row.impactType as NewsImpact['impactType'],
			scoring: row.scoring ?? undefined,
		}));
	}

	async findAllImpactsWithSource(): Promise<NewsImpactWithSource[]> {
		const rows = await db
			.select({
				sector: newsImpactsTable.sector,
				impactType: newsImpactsTable.impactType,
				publishedAt: newsTable.publishedAt,
				source: newsTable.source,
			})
			.from(newsImpactsTable)
			.innerJoin(newsTable, eq(newsImpactsTable.newsId, newsTable.id));

		return rows.map((row) => ({
			sector: row.sector,
			impactType: row.impactType as 'PUNCTUAL' | 'STRUCTURAL',
			publishedAt: row.publishedAt,
			source: row.source,
		}));
	}
}
