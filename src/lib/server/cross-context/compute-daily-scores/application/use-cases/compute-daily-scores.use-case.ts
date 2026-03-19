import type { NewsImpactReadPort, NewsImpactForScoring } from '../ports/news-impact.read.port';
import type { SectorScoreRepositoryPort } from '$lib/server/contexts/scoring/application/ports/sector-score.repository.port';
import { computeDecay } from '$lib/server/contexts/scoring/domain/decay-model';
import { ImpactType } from '$lib/server/contexts/news/domain/impact-type';
import type { Sector } from '$lib/server/contexts/news/domain/sector';

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
      let punctualScore = 0;
      let structuralScore = 0;

      for (const impact of sectorImpacts) {
        const ageInDays =
          (date.getTime() - impact.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
        const decayed = computeDecay(impact.impactScore, impact.impactType, ageInDays);
        if (impact.impactType === ImpactType.PUNCTUAL) {
          punctualScore += decayed;
        } else {
          structuralScore += decayed;
        }
      }

      const score = punctualScore + structuralScore;
      await this.sectorScoreRepo.upsert({ date, sector, score, punctualScore, structuralScore });
    }

    console.log(`[PIPELINE] scoring: ${bySector.size} sector scores computed`);
    return { scoresComputed: bySector.size };
  }
}
