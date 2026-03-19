import type { Sector } from '$lib/server/contexts/news/domain/sector';
import type { SectorScore } from '../../domain/sector-score';

export interface SectorScoreRepositoryPort {
	upsert(score: SectorScore): Promise<void>;
	findLatest(sector: Sector): Promise<SectorScore>;
	findHistory(sector: Sector): Promise<SectorScore[]>;
}
