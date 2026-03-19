<script lang="ts">
	import type { SectorScoreWithReliability } from './dashboard-layout.utils';
	import { getBullishHighlights, getBearishHighlights, sortForTable } from './dashboard-layout.utils';
	import { computeReliabilityColor } from '../reliability-indicator/reliability-indicator.utils';
	import SectorScoreCard from '../sector-score-card/SectorScoreCard.svelte';
	import SectorRow from '../sector-row/SectorRow.svelte';

	let { sectors }: { sectors: SectorScoreWithReliability[] } = $props();

	const bullish = $derived(getBullishHighlights(sectors));
	const bearish = $derived(getBearishHighlights(sectors));
	const tableRows = $derived(sortForTable(sectors));
	const hasHighlights = $derived(bullish.length > 0 || bearish.length > 0);
</script>

<div class="page">

	{#if hasHighlights}
		{#if bullish.length > 0}
			<div class="section-label">
				<span class="dot green"></span>
				Momentum
			</div>
			<div class="highlight-grid">
				{#each bullish as sector (sector.sector)}
					<SectorScoreCard data={sector} reliabilityData={sector.reliabilityData} />
				{/each}
			</div>
		{/if}

		{#if bearish.length > 0}
			<div class="section-label">
				<span class="dot red"></span>
				Pressure
			</div>
			<div class="highlight-grid">
				{#each bearish as sector (sector.sector)}
					<SectorScoreCard data={sector} reliabilityData={sector.reliabilityData} />
				{/each}
			</div>
		{/if}
	{:else}
		<div class="empty-zone" data-testid="empty-zone">No significant sectoral momentum or pressure detected</div>
	{/if}

	<hr class="divider" />

	<div class="section-label">All sectors</div>

	<div class="sector-table" data-testid="sector-table">
		{#each tableRows as sector (sector.sector)}
			<SectorRow
				data={sector}
				reliabilityData={sector.reliabilityData}
				dimmed={computeReliabilityColor(sector.reliabilityData) === 'red'}
			/>
		{/each}
	</div>

	<div class="legend">
		<div class="legend-title">How to read the Ripple Cast</div>
		<div class="legend-rows">
			<div class="legend-row">
				<div class="legend-icon">
					<div class="legend-ripple">
						<div class="legend-outer"></div>
						<div class="legend-inner"></div>
					</div>
				</div>
				<span><strong>Outer ring</strong> — Structural signal (7–30 day forecast)</span>
			</div>
			<div class="legend-row">
				<div class="legend-icon">
					<div class="legend-inner-solo"></div>
				</div>
				<span><strong>Inner ring</strong> — Current signal (recent events)</span>
			</div>
			<div class="legend-row">
				<div class="legend-icon"><div class="legend-dot green"></div></div>
				<span>Building momentum</span>
			</div>
			<div class="legend-row">
				<div class="legend-icon"><div class="legend-dot orange"></div></div>
				<span>Mixed or transitional</span>
			</div>
			<div class="legend-row">
				<div class="legend-icon"><div class="legend-dot red"></div></div>
				<span>Sustained pressure</span>
			</div>
		</div>
	</div>

</div>

<style>
	.page {
		max-width: 960px;
		margin: 0 auto;
		padding: 32px 24px 48px;
	}

	/* ─── Section label ── */
	.section-label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		margin-bottom: 12px;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.dot.green  { background: var(--color-green); }
	.dot.red    { background: var(--color-red); }

	/* ─── Highlight grid ── */
	.highlight-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
		margin-bottom: 32px;
	}

	@media (max-width: 720px) {
		.highlight-grid { grid-template-columns: repeat(2, 1fr); }
	}

	@media (max-width: 480px) {
		.highlight-grid { grid-template-columns: 1fr; }
	}

	/* ─── Divider ── */
	.divider {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: 32px 0;
	}

	/* ─── Sector table ── */
	.sector-table {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	/* ─── Empty zone ── */
	.empty-zone {
		background: var(--color-surface);
		border: 1px dashed var(--color-border);
		border-radius: 12px;
		padding: 20px 16px;
		text-align: center;
		color: var(--color-text-secondary);
		font-size: 12px;
		font-style: italic;
		margin-bottom: 32px;
	}

	/* ─── Legend ── */
	.legend {
		margin-top: 32px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 14px 16px;
	}

	.legend-title {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-secondary);
		margin-bottom: 10px;
	}

	.legend-rows { display: flex; flex-direction: column; gap: 6px; }

	.legend-row {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 12px;
		color: var(--color-text-secondary);
	}

	.legend-row strong { color: var(--color-text-primary); }

	.legend-icon {
		width: 22px;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.legend-ripple {
		position: relative;
		width: 22px;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.legend-outer {
		position: absolute;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 1.5px solid var(--color-text-secondary);
		opacity: 0.4;
	}

	.legend-inner {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 1.5px solid var(--color-text-secondary);
		opacity: 0.7;
	}

	.legend-inner-solo {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 1.5px solid var(--color-text-secondary);
		opacity: 0.7;
	}

	.legend-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.legend-dot.green  { background: var(--color-green); }
	.legend-dot.orange { background: var(--color-orange); }
	.legend-dot.red    { background: var(--color-red); }
</style>
