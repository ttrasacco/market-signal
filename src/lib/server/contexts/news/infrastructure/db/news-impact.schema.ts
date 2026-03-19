import { pgTable, text, real, timestamp, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';

export const newsTable = pgTable(
	'news',
	{
		id: text('id').primaryKey(),
		publishedAt: timestamp('published_at').notNull(),
		analyzedAt: timestamp('analyzed_at').notNull(),
		source: text('source').notNull(),
		headline: text('headline').notNull(),
	},
	(t) => [uniqueIndex('news_source_headline_idx').on(t.source, t.headline)]
);

export const newsImpactsTable = pgTable('news_impacts', {
	id: text('id').primaryKey(),
	newsId: text('news_id')
		.notNull()
		.references(() => newsTable.id),
	sector: text('sector').notNull(),
	impactScore: real('impact_score').notNull(),
	impactType: text('impact_type').notNull(),
	scoring: jsonb('scoring'),
});
