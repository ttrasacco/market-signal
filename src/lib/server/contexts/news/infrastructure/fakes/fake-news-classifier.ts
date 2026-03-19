import type { NewsClassifierPort, NewsClassification } from '../../application/ports/news-classifier.port';
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
}
