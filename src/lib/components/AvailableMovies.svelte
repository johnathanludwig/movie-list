<script lang="ts">
	import {
		draggable,
		dropTargetForElements,
		monitorForElements,
	} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import type { Attachment } from 'svelte/attachments';
	import { movies, endDate } from '$lib/movies';
	import { picks } from '$lib/picks.svelte';
	import MovieCard from './MovieCard.svelte';
	import { getMovieDragData, isMovieDragData } from './drag-data';

	type Props = {
		disabled?: boolean;
	};

	let { disabled = false }: Props = $props();

	// Track drag state
	type DragState = { type: 'idle' } | { type: 'dragging' };
	const dragStates = new SvelteMap<string, DragState>();
	let isDropTarget = $state(false);

	function getDragState(imdbId: string): DragState {
		return dragStates.get(imdbId) ?? { type: 'idle' };
	}

	function setDragState(imdbId: string, state: DragState) {
		dragStates.set(imdbId, state);
	}

	function clearDragState(imdbId: string) {
		dragStates.delete(imdbId);
	}

	const sortedMovies = $derived(
		[...movies].sort(
			(a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime(),
		),
	);

	const availableCount = $derived(movies.length - picks.count);

	// Monitor for drops - when a pick is dropped here, remove it
	onMount(() => {
		return monitorForElements({
			canMonitor({ source }) {
				return isMovieDragData(source.data) && source.data.source === 'picks';
			},
			onDrop({ location, source }) {
				const target = location.current.dropTargets[0];
				if (!target) return;

				const sourceData = source.data;
				if (!isMovieDragData(sourceData)) return;

				// Check if dropped on this component's container
				if (target.data.type === 'available-container') {
					picks.remove(sourceData.imdbId);
				}
			},
		});
	});

	// Make available movies draggable
	function makeDraggable(imdbId: string): Attachment<HTMLElement> {
		return (element) => {
			if (disabled) return;

			const cleanup = draggable({
				element,
				getInitialData: () => getMovieDragData(imdbId, 'available'),
				onDragStart: () => setDragState(imdbId, { type: 'dragging' }),
				onDrop: () => clearDragState(imdbId),
			});

			return cleanup;
		};
	}

	// Make the container a drop target for picks being removed
	function makeDropTarget(): Attachment<HTMLElement> {
		return (element) => {
			if (disabled) return;

			const cleanup = dropTargetForElements({
				element,
				canDrop: ({ source }) => isMovieDragData(source.data) && source.data.source === 'picks',
				getData: () => ({ type: 'available-container' }),
				onDragEnter: () => {
					isDropTarget = true;
				},
				onDragLeave: () => {
					isDropTarget = false;
				},
				onDrop: () => {
					isDropTarget = false;
				},
			});

			return cleanup;
		};
	}
</script>

<div
	class="flex h-full flex-col rounded-lg transition-colors {isDropTarget
		? 'bg-red-50 ring-2 ring-red-500'
		: ''}"
	{@attach makeDropTarget()}
>
	<h2 class="mb-3 text-lg font-semibold text-slate-900">
		Available Movies ({availableCount})
		{#if isDropTarget}
			<span class="text-sm font-normal text-red-600">Drop to remove from picks</span>
		{/if}
	</h2>
	<div class="flex-1 space-y-2 overflow-y-auto pr-2">
		{#each sortedMovies as movie (movie.imdbId)}
			{@const isPicked = picks.has(movie.imdbId)}
			{@const state = getDragState(movie.imdbId)}
			{@const isDragging = state.type === 'dragging'}
			{#if !isPicked}
				<div
					class="transition-opacity {isDragging ? 'opacity-40' : ''}"
					style={disabled ? '' : 'cursor: grab;'}
					{@attach makeDraggable(movie.imdbId)}
				>
					<MovieCard
						{movie}
						onclick={() => picks.add(movie.imdbId)}
						{disabled}
						showLinks
						{endDate}
					/>
				</div>
			{/if}
		{/each}
		{#if availableCount === 0}
			<p class="py-8 text-center text-slate-400">All movies have been picked!</p>
		{/if}
	</div>
</div>
