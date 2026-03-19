import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createRateLimiter } from './rate-limiter';

describe('createRateLimiter', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('does not block requests under the limit', () => {
		const isRateLimited = createRateLimiter(3, 60_000);
		expect(isRateLimited('ip-under')).toBe(false);
		expect(isRateLimited('ip-under')).toBe(false);
	});

	it('blocks at exactly the limit (>= semantics)', () => {
		const isRateLimited = createRateLimiter(3, 60_000);
		isRateLimited('ip-exact');
		isRateLimited('ip-exact');
		isRateLimited('ip-exact'); // 3rd request fills the bucket
		// 4th request: sees length=3 >= 3 → blocked
		expect(isRateLimited('ip-exact')).toBe(true);
	});

	it('blocks requests over the limit', () => {
		const isRateLimited = createRateLimiter(2, 60_000);
		isRateLimited('ip-over');
		isRateLimited('ip-over');
		expect(isRateLimited('ip-over')).toBe(true);
		expect(isRateLimited('ip-over')).toBe(true);
	});

	it('tracks different IPs independently', () => {
		const isRateLimited = createRateLimiter(2, 60_000);
		isRateLimited('ip-a');
		isRateLimited('ip-a');
		// ip-a is now at limit
		expect(isRateLimited('ip-a')).toBe(true);
		// ip-b has made no requests — should not be blocked
		expect(isRateLimited('ip-b')).toBe(false);
	});

	it('resets after window expiry', () => {
		const isRateLimited = createRateLimiter(2, 60_000);
		isRateLimited('ip-reset');
		isRateLimited('ip-reset');
		expect(isRateLimited('ip-reset')).toBe(true);

		// Advance time beyond the window
		vi.advanceTimersByTime(60_001);

		// Old timestamps are outside the window — bucket should be empty
		expect(isRateLimited('ip-reset')).toBe(false);
	});
});
