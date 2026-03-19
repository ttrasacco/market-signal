import { pgTable, text, real, date, primaryKey } from 'drizzle-orm/pg-core';

export const sectorScoresTable = pgTable(
  'sector_scores',
  {
    date: date('date').notNull(),
    sector: text('sector').notNull(),
    score: real('score').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.date, table.sector] }),
  })
);
