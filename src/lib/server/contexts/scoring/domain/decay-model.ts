import { ImpactType } from '../../news/domain/impact-type';

// λ_STRUCTURAL: slow decay — structural impacts last weeks/months (~14-day half-life)
// λ_PUNCTUAL: fast decay — punctual impacts fade in days (~2.3-day half-life)
export const LAMBDA_STRUCTURAL = 0.05;
export const LAMBDA_PUNCTUAL = 0.3;

export function computeDecay(
	impactScore: number,
	impactType: ImpactType,
	ageInDays: number
): number {
	const lambda = impactType === ImpactType.STRUCTURAL ? LAMBDA_STRUCTURAL : LAMBDA_PUNCTUAL;
	return impactScore * Math.exp(-lambda * ageInDays);
}
