import type { Sector } from './sector';
import type { ImpactType } from './impact-type';

export interface NewsImpact {
	id: string;
	newsId: string;
	sector: Sector;
	impactScore: number; // range: [-1, 1]
	impactType: ImpactType;
	scoring?: unknown;
}

export function validateNewsImpact(impact: NewsImpact): void {
	if (impact.impactScore < -1 || impact.impactScore > 1) {
		throw new Error('impactScore must be in range [-1, 1]');
	}
}
