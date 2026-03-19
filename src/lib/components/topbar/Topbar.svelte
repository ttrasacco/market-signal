<script lang="ts">
	let { date }: { date?: string } = $props();
</script>

<nav class="topbar" data-testid="topbar">
	<div class="topbar-left">
		<div class="topbar-logo-dot"></div>
		<span class="topbar-name">market-signal</span>
	</div>
	<div class="topbar-right">Sector signals</div>
</nav>

{#if date}
	<div class="page-date">{date}</div>
{/if}

<style>
	.topbar {
		position: sticky;
		top: 0;
		z-index: 100;
		background: rgba(15, 15, 17, 0.85);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--color-border);
		padding: 0 24px;
		height: 52px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.topbar-left {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.topbar-logo-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-green);
		box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
	}

	.topbar-name {
		font-size: 14px;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--color-text-primary);
	}

	.topbar-right {
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}

	.page-date {
		font-size: 12px;
		color: var(--color-text-secondary);
		padding: 12px 24px 0;
		max-width: 960px;
		margin: 0 auto;
	}
</style>
