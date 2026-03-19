import type { Sector } from '../../news/domain/sector';

export interface SectorScore {
  date: Date;
  sector: Sector;
  score: number;           // composite = punctualScore + structuralScore
  punctualScore: number;   // Σ decayed PUNCTUAL impacts
  structuralScore: number; // Σ decayed STRUCTURAL impacts
}
