import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DrizzleNewsImpactAdapter } from '$lib/server/contexts/news/infrastructure/db/news-impact.adapter';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const adapter = new DrizzleNewsImpactAdapter();
		const impacts = await adapter.findAllImpacts();
		const sector = url.searchParams.get('sector');
		const filtered = sector ? impacts.filter((i) => i.sector === sector) : impacts;
		return json({ impacts: filtered });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message, code: 500 }, { status: 500 });
	}
};
