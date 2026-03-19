import Anthropic from '@anthropic-ai/sdk';

import { createApiError } from '../../../../infrastructure/errors/api-error';
import { ImpactType } from '../../domain/impact-type';
import { Sector } from '../../domain/sector';

import type {
	NewsClassifierPort,
	NewsClassification,
	HeadlineClassification
} from '../../application/ports/news-classifier.port';

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
				messages: [{ role: 'user', content: buildBatchPrompt(headlines) }]
			});

			const text = (message.content[0] as { type: 'text'; text: string }).text;
			const json = text
				.replace(/^```(?:json)?\s*/i, '')
				.replace(/\s*```$/, '')
				.trim();
			const raw: unknown = JSON.parse(json);

			if (!Array.isArray(raw)) {
				throw new Error('Classifier response is not an array');
			}

			return raw.filter(isRawHeadlineClassification).map(({ headline, classifications }) => ({
				headline,
				classifications: classifications
					.filter(isRawClassification)
					.map(({ sector, impactScore, impactType, scoring }) => ({
						sector,
						impactScore: Math.round(impactScore * 10000) / 10000,
						impactType,
						scoring
					}))
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

SECTOR DEFINITIONS:
${Object.values(Sector)
	.map((s) => `- ${s}`)
	.join('\n')}

IMPACT TYPE:
- STRUCTURAL: affects fundamentals for months or years (regulation, geopolitical shift, major merger, central bank policy change)
- PUNCTUAL: temporary event resolving within days or weeks (earnings beat, strike, natural disaster, political statement)

IMPACT SCORE — score between -1 and 1, derived from these criteria:
- Scope: global or multi-country (+0.3), national (+0.2), regional (+0.1)
- Certainty: confirmed fact (+0.2), official announcement (+0.15), rumor or forecast (+0.05)
- Magnitude: market-moving or systemic (+0.3), moderate (+0.2), minor (+0.1)
- Direction: multiply final absolute score by +1 (positive for sector) or -1 (negative for sector)

Example scoring: confirmed global regulation hurting finance = -(0.3 + 0.2 + 0.3) = -0.8

RULES:
- Ignore duplicate or near-duplicate headlines — include only one entry for them
- Include ALL sectors meaningfully impacted (minimum relevance threshold: scope score >= 0.2)
- If a headline does not meaningfully impact any sector, return an empty classifications array
- Return only valid JSON array, no explanation
- - Ignore headlines using conditional or speculative language: 
  "could", "might", "may", "would", "should", "is expected to", "is likely to", "analysts say", "sources suggest". A forecast or rumor without confirmed facts → empty classifications array.

SECTOR DEFINITIONS (classify ONLY into these sectors):
- TECHNOLOGY: software, hardware, semiconductors, AI, cybersecurity — NOT telecoms or media
- ENERGY: oil, gas, renewables, electricity production, energy transition, nuclear
- HEALTHCARE: pharma, biotech, medical devices, public health policy, epidemics
- FINANCIALS: banks, insurance, investment funds, interest rates, credit, financial regulation — NOT general economy or inflation
- CONSUMER_STAPLES: food, beverages, household products, tobacco — non-cyclical, recession-resistant
- CONSUMER_DISCRETIONARY: retail, luxury, automotive, tourism, entertainment — cyclical, tied to economic confidence
- INDUSTRIALS: manufacturing, aerospace, defense, construction, logistics, supply chain
- MATERIALS: raw materials, chemicals, steel, mining, paper, packaging — NOT energy commodities
- UTILITIES: electricity distribution, water, gas networks, waste management — NOT energy production
- REAL_ESTATE: property markets, REITs, urban planning — NOT construction (→ INDUSTRIALS)
- COMMUNICATION: telecoms, media, streaming, social networks, advertising, publishing

IMPORTANT: There is no geopolitical or macro sector. 
For geopolitical or macroeconomic news, classify into the sectors most impacted by the event.
A Middle East conflict → ENERGY. US-China trade sanctions → TECHNOLOGY, INDUSTRIALS. 
Central bank rate decision → FINANCIALS, REAL_ESTATE.
If the impact is too diffuse to assign meaningful sectors, return an empty classifications array.

RESPONSE FORMAT:
[{
  "headline": "exact string from the list",
  "classifications": [{
    "sector": "one of: ${Object.values(Sector).join(', ')}",
    "impactScore": number between -1 and 1,
    "impactType": "STRUCTURAL or PUNCTUAL",
    "scoring": { "scope": number, "certainty": number, "magnitude": number }
  }]
}]

Example:
[{"headline":"Fed raises rates 0.5 points amid inflation concerns","classifications":[{"sector":"FINANCE","impactScore":-0.7,"impactType":"PUNCTUAL","scoring":{"scope":0.3,"certainty":0.2,"magnitude":0.2}}]}]`;
}

interface RawClassification {
	sector: Sector;
	impactScore: number;
	impactType: ImpactType;
	scoring: {
		scope: number;
		certainty: number;
		magnitude: number;
	};
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
		Object.values(ImpactType).includes(obj.impactType as ImpactType) &&
		typeof obj.scoring === 'object' &&
		obj.scoring !== null &&
		typeof (obj.scoring as Record<string, unknown>).scope === 'number' &&
		typeof (obj.scoring as Record<string, unknown>).certainty === 'number' &&
		typeof (obj.scoring as Record<string, unknown>).magnitude === 'number'
	);
}

function isRawHeadlineClassification(item: unknown): item is RawHeadlineClassification {
	if (typeof item !== 'object' || item === null) return false;
	const obj = item as Record<string, unknown>;
	return typeof obj.headline === 'string' && Array.isArray(obj.classifications);
}
