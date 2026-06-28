<script lang="ts">
	type Props = {
		imdbId: string;
		tmdbId?: number;
		bomId?: string;
		size?: 'sm' | 'md';
	};

	let { imdbId, tmdbId, bomId, size = 'sm' }: Props = $props();

	const imdbUrl = $derived(`https://www.imdb.com/title/${imdbId}/`);
	const tmdbUrl = $derived(tmdbId ? `https://www.themoviedb.org/movie/${tmdbId}` : null);
	const bomUrl = $derived(bomId ? `https://www.boxofficemojo.com/release/${bomId}/` : null);

	const sizeClass = $derived(size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs');
</script>

<span class="inline-flex items-center gap-1">
	<a
		href={imdbUrl}
		target="_blank"
		rel="noopener noreferrer"
		class="inline-flex items-center rounded font-bold leading-none {sizeClass} bg-yellow-400 text-black hover:bg-yellow-500"
		title="View on IMDb"
	>
		IMDb
	</a>
	{#if tmdbUrl}
		<a
			href={tmdbUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center rounded font-bold leading-none {sizeClass} bg-[#01b4e4] text-white hover:bg-[#0198c0]"
			title="View on TMDB"
		>
			TMDB
		</a>
	{/if}
	{#if bomUrl}
		<a
			href={bomUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center rounded font-bold leading-none {sizeClass} bg-slate-700 text-slate-100 hover:bg-slate-800"
			title="View on Box Office Mojo"
		>
			BOM
		</a>
	{/if}
</span>
