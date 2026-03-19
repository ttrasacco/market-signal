import type { Sector } from '../../news/domain/sector';

export interface SectorScore {
  date: Date;
  sector: Sector;
  punctualScore: number;   // Σ decayed PUNCTUAL impacts
  structuralScore: number; // Σ decayed STRUCTURAL impacts
  newsCount: number;       // nombre d'articles contributeurs
}
