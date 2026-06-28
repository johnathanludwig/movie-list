<script lang="ts">
	import { year } from '$lib/movies';
	import { picks } from '$lib/picks.svelte';
	import { unsullied } from '$lib/settings.svelte';
	import AvailableMovies from '$lib/components/AvailableMovies.svelte';
	import PicksList from '$lib/components/PicksList.svelte';

	// Reset requires a second click to confirm, auto-cancelling after a few seconds.
	let confirmingReset = $state(false);
	let resetTimeout: ReturnType<typeof setTimeout> | undefined;

	function handleReset() {
		if (!confirmingReset) {
			confirmingReset = true;
			resetTimeout = setTimeout(() => {
				confirmingReset = false;
			}, 3000);
			return;
		}

		clearTimeout(resetTimeout);
		confirmingReset = false;
		picks.reset();
	}
</script>

<svelte:head>
	<title>My List - Summer Movie Wager {year}</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-6">
	<header class="mb-6 flex items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-slate-900">
				My List for Summer {year}
			</h1>
			<p class="mt-1 text-sm text-slate-500">
				Pick movies and drag to rank them &bull; {picks.count}/13 picked
			</p>
		</div>
		<div class="flex shrink-0 items-center gap-4">
			<label class="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
				<input
					type="checkbox"
					bind:checked={unsullied.current}
					class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
				/>
				Unsullied
			</label>
			<button
				type="button"
				onclick={handleReset}
				disabled={picks.count === 0}
				class="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 {confirmingReset
					? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
					: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}"
			>
				{confirmingReset ? 'Click again to confirm' : 'Reset list'}
			</button>
		</div>
	</header>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2" style="height: calc(100vh - 160px);">
		<div class="flex flex-col rounded-lg bg-slate-100 p-4">
			<AvailableMovies />
		</div>
		<div class="flex flex-col rounded-lg bg-slate-100 p-4">
			<PicksList />
		</div>
	</div>
</div>
