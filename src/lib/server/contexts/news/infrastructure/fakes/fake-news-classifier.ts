import type {
	NewsClassifierPort,
	NewsClassification,
	HeadlineClassification
} from '../../application/ports/news-classifier.port';
import { ApiError } from '../../../../infrastructure/errors/api-error';

export class FakeNewsClassifier implements NewsClassifierPort {
	public classifications: NewsClassification[] = [];
	public shouldThrow = false;

	async classify(_headline: string): Promise<NewsClassification[]> {
		if (this.shouldThrow) {
			throw new ApiError(500, 'Anthropic API unavailable');
		}
		return [...this.classifications];
	}

	async classifyBatch(headlines: string[]): Promise<HeadlineClassification[]> {
		if (this.shouldThrow) {
			throw new ApiError(500, 'Anthropic API unavailable');
		}
		return headlines.map((headline) => ({
			headline,
			classifications: [...this.classifications]
		}));
	}
}
