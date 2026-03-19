import { rateLimiter } from '$lib/server/middleware/rate-limiter';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/')) {
		const ip = event.getClientAddress();
		if (rateLimiter(ip)) {
			return new Response('Too Many Requests', { status: 429 });
		}
	}
	return resolve(event);
};
