export const Sector = {
	TECHNOLOGY: 'Technology',
	ENERGY: 'Energy',
	HEALTHCARE: 'Healthcare',
	FINANCIALS: 'Financials',
	CONSUMER: 'Consumer',
	INDUSTRIALS: 'Industrials',
	MATERIALS: 'Materials',
	UTILITIES: 'Utilities',
	REAL_ESTATE: 'Real Estate',
	COMMUNICATION: 'Communication'
} as const;

export type Sector = (typeof Sector)[keyof typeof Sector];
