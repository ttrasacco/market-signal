<script lang="ts">
	import { scoreToColor, getNarrativeLabel, type SectorScoreCardData } from '../sector-score-card/sector-score-card.utils';
	import ReliabilityIndicator from '../reliability-indicator/ReliabilityIndicator.svelte';
	import type { ReliabilityData } from '../reliability-indicator/reliability-indicator.utils';

	let { data, reliabilityData, dimmed = false }: { data: SectorScoreCardData; reliabilityData?: ReliabilityData; dimmed?: boolean } = $props();

	const punctualColor = $derived(scoreToColor(data.punctualScore));
	const structuralColor = $derived(scoreToColor(data.structuralScore));
	const narrativeLabel = $derived(getNarrativeLabel(punctualColor, structuralColor));
</script>

<div class="sector-row" class:has-open-dropdown={false} data-testid="sector-row">
	<div class="mini-ripple" class:dimmed>
		<div class="mini-ripple-outer" class:green={structuralColor === 'green'} class:orange={structuralColor === 'orange'} class:red={structuralColor === 'red'}></div>
		<div class="mini-ripple-inner" class:green={punctualColor === 'green'} class:orange={punctualColor === 'orange'} class:red={punctualColor === 'red'}></div>
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
		.sector-row { padding: 10px 12px; }
		.sector-row-label { display: none; }
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

	.dimmed { opacity: 0.45; }

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

	.mini-ripple-outer.green  { border-color: var(--color-green); }
	.mini-ripple-outer.orange { border-color: var(--color-orange); }
	.mini-ripple-outer.red    { border-color: var(--color-red); }

	.mini-ripple-inner.green  { border-color: var(--color-green); }
	.mini-ripple-inner.orange { border-color: var(--color-orange); }
	.mini-ripple-inner.red    { border-color: var(--color-red); }
</style>
