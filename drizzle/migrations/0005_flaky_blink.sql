ALTER TABLE "sector_scores" ADD COLUMN "news_count" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sector_scores" DROP COLUMN "score";