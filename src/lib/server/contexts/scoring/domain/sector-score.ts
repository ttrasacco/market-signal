import type { Sector } from '../../news/domain/sector';

export interface SectorScore {
  date: Date;
  sector: Sector;
  score: number; // unbounded — sum of decayed impacts
}
