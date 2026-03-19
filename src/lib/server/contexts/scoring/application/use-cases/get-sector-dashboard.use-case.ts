import type { SectorScoreRepositoryPort } from '../ports/sector-score.repository.port';
import type { SectorScore } from '../../domain/sector-score';

export class GetSectorDashboardUseCase {
  constructor(private readonly sectorScoreRepo: SectorScoreRepositoryPort) {}

  async execute(): Promise<SectorScore[]> {
    return this.sectorScoreRepo.findLatest();
  }
}
