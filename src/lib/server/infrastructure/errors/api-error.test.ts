import { describe, it, expect } from 'vitest';
import { ApiError, createApiError } from './api-error';

describe('ApiError', () => {
	it('sets statusCode, message and name correctly', () => {
		const err = new ApiError(404, 'Not found');
		expect(err.statusCode).toBe(404);
		expect(err.message).toBe('Not found');
		expect(err.name).toBe('ApiError');
		expect(err).toBeInstanceOf(Error);
	});

	it('stores optional cause', () => {
		const cause = new Error('original');
		const err = new ApiError(500, 'Wrapped', cause);
		expect(err.cause).toBe(cause);
	});
});

describe('createApiError', () => {
	it('returns ApiError as-is (identity)', () => {
		const original = new ApiError(400, 'Bad request');
		const result = createApiError(original);
		expect(result).toBe(original);
	});

	it('wraps a plain Error with statusCode 500 and preserves message', () => {
		const error = new Error('something broke');
		const result = createApiError(error);
		expect(result).toBeInstanceOf(ApiError);
		expect(result.statusCode).toBe(500);
		expect(result.message).toBe('something broke');
		expect(result.cause).toBe(error);
	});

	it('wraps unknown value with statusCode 500', () => {
		const result = createApiError('a string error');
		expect(result).toBeInstanceOf(ApiError);
		expect(result.statusCode).toBe(500);
		expect(result.message).toBe('Unknown error');
		expect(result.cause).toBe('a string error');
	});

	it('wraps null with statusCode 500', () => {
		const result = createApiError(null);
		expect(result.statusCode).toBe(500);
		expect(result.message).toBe('Unknown error');
	});
});
