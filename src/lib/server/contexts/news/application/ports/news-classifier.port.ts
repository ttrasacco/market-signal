import type { Sector } from '../../domain/sector';
import type { ImpactType } from '../../domain/impact-type';

export interface NewsClassification {
	sector: Sector;
	impactScore: number;
	impactType: ImpactType;
}

export interface HeadlineClassification {
	headline: string;
	classifications: NewsClassification[];
}

export interface NewsClassifierPort {
	classify(headline: string): Promise<NewsClassification[]>;
	classifyBatch(headlines: string[]): Promise<HeadlineClassification[]>;
}
