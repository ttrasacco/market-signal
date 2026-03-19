import type { Sector } from '$lib/server/contexts/news/domain/sector';
import type { ImpactType } from '$lib/server/contexts/news/domain/impact-type';

export interface NewsImpactForScoring {
  id: string;
  newsId: string;
  sector: Sector;
  impactScore: number;
  impactType: ImpactType;
  publishedAt: Date;
}

export interface NewsImpactReadPort {
  findAllImpacts(): Promise<NewsImpactForScoring[]>;
}
