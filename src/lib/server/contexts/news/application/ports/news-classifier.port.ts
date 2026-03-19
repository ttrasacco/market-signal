import type { Sector } from '../../domain/sector';
import type { ImpactType } from '../../domain/impact-type';

export interface NewsClassification {
	sector: Sector;
	impactScore: number;
	impactType: ImpactType;
}

export interface NewsClassifierPort {
	classify(headline: string): Promise<NewsClassification[]>;
}
