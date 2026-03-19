<script lang="ts">
	import type { PageData } from './$types';
	import Topbar from '$lib/components/topbar/Topbar.svelte';
	import DashboardLayout from '$lib/components/dashboard-layout/DashboardLayout.svelte';

	let { data }: { data: PageData } = $props();

	const now = new Date();
	const datePart = now.toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	});
	const timePart = now.toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});
	const dateLabel = `${datePart} · Scores computed at ${timePart}`;
</script>

<Topbar date={dateLabel} />
<DashboardLayout sectors={data.sectors} />
