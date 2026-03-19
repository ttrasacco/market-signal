CREATE TABLE "sector_scores" (
	"date" date NOT NULL,
	"sector" text NOT NULL,
	"score" real NOT NULL,
	CONSTRAINT "sector_scores_date_sector_pk" PRIMARY KEY("date","sector")
);
