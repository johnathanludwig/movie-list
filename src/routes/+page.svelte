<script lang="ts">
	import { movies, year, endDate } from '$lib/movies';
	import AvailableMovies from '$lib/components/AvailableMovies.svelte';
	import PicksList from '$lib/components/PicksList.svelte';

	const moviesByImdbId = Object.fromEntries(movies.map((m) => [m.imdbId, m]));

	// Ordered list of picked movie IMDb IDs. Position is the array index.
	let pickIds = $state<string[]>([]);

	const pickedImdbIds = $derived(new Set(pickIds));
	const pickCount = $derived(pickIds.length);

	// Convert to the shape PicksList expects.
	const picks = $derived(
		pickIds.map((imdbId, index) => ({
			imdbId,
			position: index + 1,
		})),
	);

	function handleAddPick(imdbId: string) {
		if (!pickIds.includes(imdbId)) {
			pickIds = [...pickIds, imdbId];
		}
	}

	function handleRemovePick(imdbId: string) {
		pickIds = pickIds.filter((id) => id !== imdbId);
	}

	function handleReorder(imdbIds: string[]) {
		pickIds = imdbIds;
	}
</script>

<svelte:head>
	<title>My List - Summer Movie Wager {year}</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-6">
	<header class="mb-6">
		<h1 class="text-2xl font-bold text-slate-900">
			My List for Summer {year}
		</h1>
		<p class="mt-1 text-sm text-slate-500">
			Pick movies and drag to rank them &bull; {pickCount}/13 picked
		</p>
	</header>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2" style="height: calc(100vh - 160px);">
		<div class="flex flex-col rounded-lg bg-slate-100 p-4">
			<AvailableMovies
				{movies}
				{pickedImdbIds}
				onAddPick={handleAddPick}
				onRemovePick={handleRemovePick}
				{endDate}
			/>
		</div>
		<div class="flex flex-col rounded-lg bg-slate-100 p-4">
			<PicksList
				{picks}
				movies={moviesByImdbId}
				onRemove={handleRemovePick}
				onReorder={handleReorder}
				onAdd={handleAddPick}
				{endDate}
			/>
		</div>
	</div>
</div>
