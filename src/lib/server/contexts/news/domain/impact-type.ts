export const ImpactType = {
  STRUCTURAL: 'STRUCTURAL',
  PUNCTUAL: 'PUNCTUAL',
} as const;

export type ImpactType = (typeof ImpactType)[keyof typeof ImpactType];
