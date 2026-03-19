import type { NewsImpactReadPort, NewsImpactForScoring } from '../../application/ports/news-impact.read.port';

export class FakeNewsImpactReadAdapter implements NewsImpactReadPort {
  public impacts: NewsImpactForScoring[] = [];

  async findAllImpacts(): Promise<NewsImpactForScoring[]> {
    return [...this.impacts];
  }
}
