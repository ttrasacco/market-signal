import Anthropic from "@anthropic-ai/sdk";

import { createApiError } from "../../../../infrastructure/errors/api-error";
import { ImpactType } from "../../domain/impact-type";
import { Sector } from "../../domain/sector";

import type { NewsClassifierPort, NewsClassification, HeadlineClassification } from '../../application/ports/news-classifier.port';

export class AnthropicClassifier implements NewsClassifierPort {
	private readonly client: Anthropic;

	constructor(apiKey: string) {
		this.client = new Anthropic({ apiKey });
	}

	async classify(headline: string): Promise<NewsClassification[]> {
		const results = await this.classifyBatch([headline]);
		return results[0]?.classifications ?? [];
	}

	async classifyBatch(headlines: string[]): Promise<HeadlineClassification[]> {
		if (headlines.length === 0) return [];

		try {
			const message = await this.client.messages.create({
				model: 'claude-haiku-4-5',
				max_tokens: 15000,
				messages: [{ role: 'user', content: buildBatchPrompt(headlines) }],
			});

			const text = (message.content[0] as { type: 'text'; text: string }).text;
			const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
			const raw: unknown = JSON.parse(json);

			if (!Array.isArray(raw)) {
				throw new Error('Classifier response is not an array');
			}

			return raw
				.filter(isRawHeadlineClassification)
				.map(({ headline, classifications }) => ({
					headline,
					classifications: classifications
						.filter(isRawClassification)
						.map(({ sector, impactScore, impactType }) => ({
							sector,
							impactScore: Math.max(-1, Math.min(1, impactScore)),
							impactType,
						})),
				}));
		} catch (error) {
			throw createApiError(error);
		}
	}
}

function buildBatchPrompt(headlines: string[]): string {
	const numbered = headlines.map((h, i) => `${i + 1}. "${h}"`).join('\n');
	return `You are a financial news classifier. Analyze the following news headlines and return a JSON array, one entry per headline.

Headlines:
${numbered}

Rules:
- Ignore duplicate or near-duplicate headlines — include only one entry for them
- Each entry must have: headline (exact string from the list), classifications (array of sector impacts)
- Each classification must have: sector (one of: ${Object.values(Sector).join(', ')}), impactScore (number between -1 and 1), impactType (STRUCTURAL or PUNCTUAL)
- STRUCTURAL: fundamental, long-lasting change (months/years)
- PUNCTUAL: temporary, short-lived event (days/weeks)
- Include ALL sectors meaningfully impacted per headline
- Return only valid JSON array, no explanation

Example: [{"headline":"Fed raises rates","classifications":[{"sector":"FINANCE","impactScore":-0.7,"impactType":"PUNCTUAL"}]}]`;
}

interface RawClassification {
	sector: Sector;
	impactScore: number;
	impactType: ImpactType;
}

interface RawHeadlineClassification {
	headline: string;
	classifications: RawClassification[];
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

function isRawHeadlineClassification(item: unknown): item is RawHeadlineClassification {
	if (typeof item !== 'object' || item === null) return false;
	const obj = item as Record<string, unknown>;
	return typeof obj.headline === 'string' && Array.isArray(obj.classifications);
}
