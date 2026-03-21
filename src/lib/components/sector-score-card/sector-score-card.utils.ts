export type SignalColor = 'green' | 'orange' | 'red';

export function scoreToColor(score: number): SignalColor {
	if (score > 0.4) return 'green';
	if (score < -0.4) return 'red';
	return 'orange';
}

const NARRATIVE_LABELS: Record<SignalColor, Record<SignalColor, string>> = {
	green: {
		green: 'Confirmed momentum',
		orange: 'Healthy · caution ahead',
		red: 'Recovery · structural drag'
	},
	orange: {
		green: 'Turbulence · rebound expected',
		orange: 'Mixed signal',
		red: 'Growing pressure'
	},
	red: {
		green: 'Crisis · early recovery signs',
		orange: 'Crisis · fragile rebound',
		red: 'Widespread deterioration'
	}
};

export function getNarrativeLabel(
	punctualColor: SignalColor,
	structuralColor: SignalColor
): string {
	return NARRATIVE_LABELS[punctualColor][structuralColor];
}
