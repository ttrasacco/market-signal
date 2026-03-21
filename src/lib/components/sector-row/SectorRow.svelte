<script lang="ts">
	import { scoreToColor, getNarrativeLabel } from '../sector-score-card/sector-score-card.utils';
	import ReliabilityIndicator from '../reliability-indicator/ReliabilityIndicator.svelte';
	import type { SectorScoreWithReliability } from '../dashboard-layout/dashboard-layout.utils';

	let {
		data,
		reliabilityData = data.reliabilityData,
		dimmed = false
	}: {
		data: SectorScoreWithReliability;
		reliabilityData?: SectorScoreWithReliability['reliabilityData'];
		dimmed?: boolean;
	} = $props();

	const innerColor = $derived(scoreToColor(data.currentScore));
	const outerColor = $derived(scoreToColor(data.trendingScore));
	const narrativeLabel = $derived(getNarrativeLabel(innerColor, outerColor));
</script>

<div class="sector-row" class:has-open-dropdown={false} data-testid="sector-row">
	<div class="mini-ripple" class:dimmed>
		<div
			class="mini-ripple-outer"
			class:green={outerColor === 'green'}
			class:orange={outerColor === 'orange'}
			class:red={outerColor === 'red'}
		></div>
		<div
			class="mini-ripple-inner"
			class:green={innerColor === 'green'}
			class:orange={innerColor === 'orange'}
			class:red={innerColor === 'red'}
		></div>
	</div>
	<div class="sector-row-name" class:dimmed>{data.sector}</div>
	<div class="sector-row-label" class:dimmed>{narrativeLabel}</div>
	<ReliabilityIndicator data={reliabilityData} />
</div>

<style>
	.sector-row {
		position: relative;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 12px 16px;
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.sector-row:has(button[aria-expanded='true']) {
		z-index: 100;
	}

	@media (max-width: 480px) {
		.sector-row {
			padding: 10px 12px;
		}
		.sector-row-label {
			display: none;
		}
	}

	.sector-row-name {
		font-size: 14px;
		font-weight: 500;
		flex: 1;
		color: var(--color-text-primary);
	}

	.sector-row-label {
		font-size: 11px;
		color: var(--color-text-secondary);
		flex: 1;
	}

	.dimmed {
		opacity: 0.45;
	}

	.mini-ripple {
		position: relative;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.mini-ripple-outer {
		position: absolute;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1.5px solid transparent;
		opacity: 0.6;
	}

	.mini-ripple-inner {
		width: 13px;
		height: 13px;
		border-radius: 50%;
		border: 1.5px solid transparent;
		position: relative;
		z-index: 1;
	}

	.mini-ripple-outer.green {
		border-color: var(--color-green);
	}
	.mini-ripple-outer.orange {
		border-color: var(--color-orange);
	}
	.mini-ripple-outer.red {
		border-color: var(--color-red);
	}

	.mini-ripple-inner.green {
		border-color: var(--color-green);
	}
	.mini-ripple-inner.orange {
		border-color: var(--color-orange);
	}
	.mini-ripple-inner.red {
		border-color: var(--color-red);
	}
</style>
