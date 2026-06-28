<script lang="ts">
	import type { Movie } from '$lib/movies';
	import MovieLinks from './MovieLinks.svelte';

	type Props = {
		movie: Movie;
		onclick?: () => void;
		disabled?: boolean;
		showRemove?: boolean;
		onremove?: () => void;
		showLinks?: boolean;
		endDate?: string;
	};

	let {
		movie,
		onclick,
		disabled = false,
		showRemove = false,
		onremove,
		showLinks = false,
		endDate,
	}: Props = $props();

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function getWeekendsInRange(startDateStr: string, endDateStr: string): number {
		const start = new Date(startDateStr + 'T00:00:00');
		const end = new Date(endDateStr + 'T23:59:59');

		let count = 0;
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const current = new Date(start);

		while (current <= end) {
			if (current.getDay() === 6) {
				// Saturday = start of a box office weekend
				count++;
			}
			current.setDate(current.getDate() + 1);
		}

		return count;
	}

	const weekendsInSeason = $derived(
		endDate ? getWeekendsInRange(movie.releaseDate, endDate) : null,
	);

	const posterUrl = $derived(
		movie.posterPath ? `https://image.tmdb.org/t/p/w92${movie.posterPath}` : null,
	);
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 transition-colors {disabled
		? 'cursor-not-allowed opacity-50'
		: onclick
			? 'cursor-pointer hover:border-indigo-600 hover:bg-indigo-50'
			: ''}"
	onclick={disabled ? undefined : onclick}
	onkeydown={disabled || !onclick
		? undefined
		: (e) => {
				if (e.key === 'Enter' || e.key === ' ') onclick?.();
			}}
	role={onclick ? 'button' : undefined}
	tabindex={onclick && !disabled ? 0 : undefined}
>
	{#if posterUrl}
		<img src={posterUrl} alt={movie.name} class="h-14 w-10 rounded object-cover" />
	{:else}
		<div class="flex h-14 w-10 items-center justify-center rounded bg-slate-100 text-slate-400">
			<span class="text-xs">?</span>
		</div>
	{/if}
	<div class="min-w-0 flex-1">
		<div class="truncate font-medium text-slate-900">{movie.name}</div>
		<div class="flex items-center gap-2 text-sm text-slate-500">
			<span>{formatDate(movie.releaseDate)}</span>
			{#if weekendsInSeason !== null}
				<span
					class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none {weekendsInSeason <=
					2
						? 'bg-red-100 text-red-700'
						: 'bg-slate-100 text-slate-600'}"
				>
					{weekendsInSeason}
					{weekendsInSeason === 1 ? 'weekend' : 'weekends'}
				</span>
			{/if}
		</div>
		{#if showLinks}
			<div class="mt-1">
				<MovieLinks imdbId={movie.imdbId} tmdbId={movie.tmdbId} bomId={movie.bomId} />
			</div>
		{/if}
	</div>
	{#if showRemove && onremove}
		<button
			type="button"
			class="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
			onclick={(e) => {
				e.stopPropagation();
				onremove?.();
			}}
			aria-label="Remove {movie.name}"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	{/if}
</div>
