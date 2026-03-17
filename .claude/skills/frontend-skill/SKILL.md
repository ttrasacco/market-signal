---
name: frontend-skill
description: Ce fichier est à utiliser quand on travaille sur tout ce qui se trouve dans src/routes/ et les composants .svelte.
---

Règles

Zéro logique métier dans les routes — uniquement du câblage vers les use cases
Pas de form actions — passer par des endpoints +server.ts
Pas de Svelte stores — utiliser les Runes ($state, $derived)


Runes Svelte 5
RuneÉquivalent AngularUsage$state(val)signal(val)Variable réactive$derived(expr)computed(() => expr)Valeur calculée$effect(() => {})effect(() => {})Effet de bord$props()@Input()Props du composant
svelte<script lang="ts">
  let count = $state(0);
  let double = $derived(count * 2);
</script>

<button onclick={() => count++}>{count} → {double}</button>

Pattern +page.server.ts
typescriptimport type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const useCase = new GetSectorDashboardUseCase(new SectorScoreRepository());
  return { scores: await useCase.execute() };
};
svelte<!-- +page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

{#each data.scores as score}
  <p>{score.sector} : {score.score}</p>
{/each}

Pattern +server.ts
typescriptimport { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  await new IngestNewsUseCase(/* ... */).execute(body);
  return json({ success: true }, { status: 201 });
};
