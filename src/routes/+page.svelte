<script lang="ts">
	import type { PageData } from './$types';
	import Topbar from '$lib/components/topbar/Topbar.svelte';
	import DashboardLayout from '$lib/components/dashboard-layout/DashboardLayout.svelte';

	let { data }: { data: PageData } = $props();

	const dateLabel = new Date().toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	});
</script>

<Topbar date={dateLabel} />
<DashboardLayout sectors={data.sectors} />
