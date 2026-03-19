import Anthropic from '@anthropic-ai/sdk';
import { createApiError } from '../../../../infrastructure/errors/api-error';
import { Sector } from '../../domain/sector';
import { ImpactType } from '../../domain/impact-type';
import type { NewsClassifierPort, NewsClassification } from '../../application/ports/news-classifier.port';

export class AnthropicClassifier implements NewsClassifierPort {
	private readonly client: Anthropic;

	constructor(apiKey: string) {
		this.client = new Anthropic({ apiKey });
	}

	async classify(headline: string): Promise<NewsClassification[]> {
		try {
			const message = await this.client.messages.create({
				model: 'claude-sonnet-4-6',
				max_tokens: 1024,
				messages: [{ role: 'user', content: buildPrompt(headline) }],
			});

			const text = (message.content[0] as { type: 'text'; text: string }).text;
			const raw: unknown = JSON.parse(text);

			if (!Array.isArray(raw)) {
				throw new Error('Classifier response is not an array');
			}

			return raw
				.filter(isRawClassification)
				.map(({ sector, impactScore, impactType }) => ({
					sector,
					impactScore: Math.max(-1, Math.min(1, impactScore)),
					impactType,
				}));
		} catch (error) {
			throw createApiError(error);
		}
	}
}

function buildPrompt(headline: string): string {
	return `You are a financial news classifier. Analyze the following news headline and return a JSON array of sector impacts.

Headline: "${headline}"

Rules:
- Each entry must have: sector (one of: ${Object.values(Sector).join(', ')}), impactScore (number between -1 and 1), impactType (STRUCTURAL or PUNCTUAL)
- STRUCTURAL: fundamental, long-lasting change (months/years)
- PUNCTUAL: temporary, short-lived event (days/weeks)
- Include ALL sectors meaningfully impacted
- Return only valid JSON array, no explanation

Example: [{"sector":"TECHNOLOGY","impactScore":0.8,"impactType":"STRUCTURAL"}]`;
}

interface RawClassification {
	sector: Sector;
	impactScore: number;
	impactType: ImpactType;
}

function isRawClassification(item: unknown): item is RawClassification {
	if (typeof item !== 'object' || item === null) return false;
	const obj = item as Record<string, unknown>;
	return (
		typeof obj.sector === 'string' &&
		Object.values(Sector).includes(obj.sector as Sector) &&
		typeof obj.impactScore === 'number' &&
		typeof obj.impactType === 'string' &&
		Object.values(ImpactType).includes(obj.impactType as ImpactType)
	);
}
