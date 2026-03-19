export class ApiError extends Error {
	constructor(
		public readonly statusCode: number,
		message: string,
		public readonly cause?: unknown
	) {
		super(message);
		this.name = 'ApiError';
	}
}

export function createApiError(error: unknown): ApiError {
	if (error instanceof ApiError) return error;
	if (error instanceof Error) return new ApiError(500, error.message, error);
	return new ApiError(500, 'Unknown error', error);
}
