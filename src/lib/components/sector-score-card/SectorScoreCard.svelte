<script lang="ts">
	import type { SectorScoreCardData } from './sector-score-card.utils';
	import ReliabilityIndicator from '../reliability-indicator/ReliabilityIndicator.svelte';
	import type { ReliabilityData } from '../reliability-indicator/reliability-indicator.utils';

	let {
		data,
		reliabilityData
	}: { data: SectorScoreCardData; reliabilityData?: ReliabilityData } = $props();

	const shadowColors = {
		green: 'rgba(34,197,94,0.2)',
		orange: 'rgba(245,158,11,0.2)',
		red: 'rgba(239,68,68,0.2)'
	} as const;
</script>

<div class="ripple-card">
	<div class="ripple-card-header">
		<div>
			<div class="type-sector-name">{data.sector}</div>
			<div class="type-narrative-label">{data.narrativeLabel}</div>
		</div>
		<ReliabilityIndicator data={reliabilityData} />
	</div>
	<div class="ripple-wrapper">
		<div class="ripple">
			<div
				class="ripple-outer"
				class:green={data.outerColor === 'green'}
				class:orange={data.outerColor === 'orange'}
				class:red={data.outerColor === 'red'}
				style="box-shadow: 0 0 12px {shadowColors[data.outerColor]};"
			></div>
			<div
				class="ripple-outer-2"
				class:green={data.outerColor === 'green'}
				class:orange={data.outerColor === 'orange'}
				class:red={data.outerColor === 'red'}
			></div>
			<div
				class="ripple-inner"
				class:green={data.innerColor === 'green'}
				class:orange={data.innerColor === 'orange'}
				class:red={data.innerColor === 'red'}
			></div>
		</div>
	</div>
</div>

<style>
	.ripple-card {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		padding: 16px;
	}

	@media (max-width: 480px) {
		.ripple-card {
			padding: 12px;
		}
	}

	.ripple-card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 16px;
	}

	.ripple-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.ripple {
		position: relative;
		width: 72px;
		height: 72px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.ripple-outer {
		position: absolute;
		width: 72px;
		height: 72px;
		border-radius: 50%;
		border: 1px solid transparent;
		opacity: 0.35;
		animation: ripple-pulse 3s ease-in-out infinite;
	}

	.ripple-outer-2 {
		position: absolute;
		width: 52px;
		height: 52px;
		border-radius: 50%;
		border: 0.5px solid transparent;
		opacity: 0.2;
		animation: ripple-pulse 3s ease-in-out infinite;
	}

	.ripple-inner {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 1.5px solid transparent;
		position: relative;
		z-index: 1;
	}

	/* Color variants */
	.ripple-outer.green,
	.ripple-outer-2.green {
		border-color: var(--color-green);
	}
	.ripple-outer.orange,
	.ripple-outer-2.orange {
		border-color: var(--color-orange);
	}
	.ripple-outer.red,
	.ripple-outer-2.red {
		border-color: var(--color-red);
	}

	.ripple-inner.green {
		border-color: var(--color-green);
		background: rgba(34, 197, 94, 0.08);
	}
	.ripple-inner.orange {
		border-color: var(--color-orange);
		background: rgba(245, 158, 11, 0.08);
	}
	.ripple-inner.red {
		border-color: var(--color-red);
		background: rgba(239, 68, 68, 0.08);
	}

	@keyframes ripple-pulse {
		0%,
		100% {
			opacity: 0.6;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.04);
		}
	}
</style>
