import type { SectorScore } from '../../domain/sector-score';

export interface SectorScoreRepositoryPort {
  upsert(score: SectorScore): Promise<void>;
  findLatest(): Promise<SectorScore[]>;
}
