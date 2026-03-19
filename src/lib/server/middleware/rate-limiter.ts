type Timestamps = number[];

const store = new Map<string, Timestamps>();

export function createRateLimiter(limit: number, windowMs: number) {
	return function isRateLimited(ip: string): boolean {
		const now = Date.now();
		const timestamps = (store.get(ip) ?? []).filter((t) => now - t < windowMs);
		if (timestamps.length >= limit) {
			store.set(ip, timestamps);
			return true;
		}
		timestamps.push(now);
		store.set(ip, timestamps);
		return false;
	};
}

export const rateLimiter = createRateLimiter(60, 60_000);
