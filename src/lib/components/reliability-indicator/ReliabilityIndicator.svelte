<script lang="ts">
	import {
		computeReliabilityColor,
		computeAllCriteria,
		type ReliabilityData,
		type CriterionResult
	} from './reliability-indicator.utils';
	import type { SignalColor } from '../sector-score-card/sector-score-card.utils';

	let { data }: { data: ReliabilityData | undefined } = $props();

	const overallColor: SignalColor = $derived(data ? computeReliabilityColor(data) : 'orange');
	const criteria: CriterionResult[] = $derived(data ? computeAllCriteria(data) : []);

	let isOpen = $state(false);

	function toggle() {
		isOpen = !isOpen;
	}

	function close() {
		isOpen = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggle();
		}
		if (e.key === 'Escape') {
			close();
		}
	}
</script>

<div class="reliability-wrapper">
	<button
		class="reliability-icon"
		class:green={overallColor === 'green'}
		class:orange={overallColor === 'orange'}
		class:red={overallColor === 'red'}
		aria-expanded={isOpen}
		aria-haspopup="true"
		aria-label="Reliability indicator"
		onclick={toggle}
		onkeydown={handleKeydown}
	></button>

	{#if isOpen}
		<div class="reliability-dropdown" role="tooltip">
			{#each criteria as criterion (criterion.label)}
				<div class="criterion-row">
					<span
						class="criterion-dot"
						class:green={criterion.color === 'green'}
						class:orange={criterion.color === 'orange'}
						class:red={criterion.color === 'red'}
					></span>
					<span class="criterion-label">{criterion.label}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.reliability-wrapper {
		position: relative;
		display: inline-block;
	}

	.reliability-icon {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: none;
		cursor: pointer;
		padding: 0;
		display: block;
		flex-shrink: 0;
	}

	.reliability-icon.green {
		background-color: var(--color-green);
	}

	.reliability-icon.orange {
		background-color: var(--color-orange);
	}

	.reliability-icon.red {
		background-color: var(--color-red);
	}

	.reliability-dropdown {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		background-color: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 8px 10px;
		min-width: 180px;
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.criterion-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.criterion-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.criterion-dot.green {
		background-color: var(--color-green);
	}

	.criterion-dot.orange {
		background-color: var(--color-orange);
	}

	.criterion-dot.red {
		background-color: var(--color-red);
	}

	.criterion-label {
		font-size: 12px;
		font-weight: 400;
		color: var(--color-text-primary);
	}

	@media (max-width: 480px) {
		.reliability-dropdown {
			display: none;
		}
	}
</style>
