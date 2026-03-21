import type { Sector } from '../../news/domain/sector';
export interface SectorScore {
	date: Date;
	sector: Sector;
	currentScore: number;
	trendingScore: number;
	newsCount: number; // nombre d'articles contributeurs
}