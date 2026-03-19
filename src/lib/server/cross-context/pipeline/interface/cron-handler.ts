import { CRON_SECRET } from '$env/static/private';
import type { RunDailyPipelineUseCase } from '../application/run-daily-pipeline.use-case';

export async function handleCronRequest(
	request: Request,
	useCase: RunDailyPipelineUseCase
): Promise<Response> {
	const authHeader = request.headers.get('Authorization');
	if (authHeader !== `Bearer ${CRON_SECRET}`) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const result = await useCase.execute();
		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		// [PIPELINE] error: message already logged in RunDailyPipelineUseCase
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
