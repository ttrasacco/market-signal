import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/contexts/**/infrastructure/db/*.schema.ts',
	out: './drizzle/migrations',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
});
