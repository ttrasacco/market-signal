CREATE TABLE "news_impacts" (
	"id" text PRIMARY KEY NOT NULL,
	"news_id" text NOT NULL,
	"sector" text NOT NULL,
	"impact_score" real NOT NULL,
	"impact_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" text PRIMARY KEY NOT NULL,
	"published_at" timestamp NOT NULL,
	"analyzed_at" timestamp NOT NULL,
	"source" text NOT NULL,
	"headline" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "news_impacts" ADD CONSTRAINT "news_impacts_news_id_news_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE no action ON UPDATE no action;