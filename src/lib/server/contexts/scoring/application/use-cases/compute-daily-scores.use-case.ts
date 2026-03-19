import type { NewsImpactReadPort } from '../ports/news-impact.read.port';
import type { SectorScoreRepositoryPort } from '../ports/sector-score.repository.port';
import { computeDecay } from '../../domain/decay-model';
import type { Sector } from '$lib/server/contexts/news/domain/sector';
import type { NewsImpactForScoring } from '../ports/news-impact.read.port';

export class ComputeDailyScoresUseCase {
  constructor(
    private readonly newsImpactReadPort: NewsImpactReadPort,
    private readonly sectorScoreRepo: SectorScoreRepositoryPort
  ) {}

  async execute(date: Date): Promise<{ scoresComputed: number }> {
    const impacts = await this.newsImpactReadPort.findAllImpacts();

    const bySector = new Map<Sector, NewsImpactForScoring[]>();
    for (const impact of impacts) {
      const existing = bySector.get(impact.sector) ?? [];
      bySector.set(impact.sector, [...existing, impact]);
    }

    for (const [sector, sectorImpacts] of bySector) {
      const score = sectorImpacts.reduce((sum, impact) => {
        const ageInDays =
          (date.getTime() - impact.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
        return sum + computeDecay(impact.impactScore, impact.impactType, ageInDays);
      }, 0);
      await this.sectorScoreRepo.upsert({ date, sector, score });
    }

    console.log(`[PIPELINE] scoring: ${bySector.size} sector scores computed`);
    return { scoresComputed: bySector.size };
  }
}
