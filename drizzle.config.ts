import { defineConfig } from "drizzle-kit";

// Use DIRECT_URL (non-pooled) for migrations if available, fall back to DATABASE_URL.
// Neon pooled connections (pgbouncer) hang on drizzle-kit migrate — use the direct endpoint.
// max=1 is required: postgres-js blocks raw BEGIN statements unless pool size is 1.
const base = process.env.DIRECT_URL ?? process.env.DATABASE_URL!;
const migrationUrl = base.includes("max=") ? base : `${base}&max=1`;

export default defineConfig({
	schema: './src/lib/server/contexts/**/infrastructure/db/*.schema.ts',
	out: './drizzle/migrations',
	dialect: 'postgresql',
	dbCredentials: {
		url: migrationUrl,
	},
});
