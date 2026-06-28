<script lang="ts">
	import {
		attachClosestEdge,
		extractClosestEdge,
		type Edge,
	} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
	import { reorderWithEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge';
	import {
		draggable,
		dropTargetForElements,
		monitorForElements,
	} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import type { Attachment } from 'svelte/attachments';
	import { flip } from 'svelte/animate';
	import { moviesByImdbId, endDate } from '$lib/movies';
	import { picks } from '$lib/picks.svelte';
	import MovieCard from './MovieCard.svelte';
	import DropIndicator from './DropIndicator.svelte';
	import { getMovieDragData, isMovieDragData } from './drag-data';

	type Props = {
		disabled?: boolean;
		requiredCount?: number;
	};

	let { disabled = false, requiredCount = 13 }: Props = $props();

	// Track drag state per pick
	type DragState = { type: 'idle' } | { type: 'dragging' } | { type: 'over'; closestEdge: Edge };
	const dragStates = new SvelteMap<string, DragState>();
	let isContainerDropTarget = $state(false);

	function getDragState(imdbId: string): DragState {
		return dragStates.get(imdbId) ?? { type: 'idle' };
	}

	function setDragState(imdbId: string, state: DragState) {
		dragStates.set(imdbId, state);
	}

	function clearDragState(imdbId: string) {
		dragStates.delete(imdbId);
	}

	const neededCount = $derived(Math.max(0, requiredCount - picks.count));

	// Monitor for drops at the list level
	onMount(() => {
		return monitorForElements({
			canMonitor({ source }) {
				return isMovieDragData(source.data);
			},
			onDrop({ location, source }) {
				const target = location.current.dropTargets[0];
				if (!target) return;

				const sourceData = source.data;
				const targetData = target.data;

				if (!isMovieDragData(sourceData)) return;

				// Handle drop from available movies onto the container (add at end)
				if (sourceData.source === 'available' && targetData.type === 'picks-container') {
					picks.add(sourceData.imdbId);
					return;
				}

				// Handle drop from available movies onto a specific pick (insert at position)
				if (
					sourceData.source === 'available' &&
					isMovieDragData(targetData) &&
					targetData.source === 'picks'
				) {
					if (!picks.pickedIds.has(sourceData.imdbId)) {
						const indexOfTarget = picks.items.findIndex((p) => p.imdbId === targetData.imdbId);
						const closestEdge = extractClosestEdge(targetData);

						// Build new order with the movie inserted at the right position
						const newOrder = picks.items.map((p) => p.imdbId);
						const insertIndex = closestEdge === 'top' ? indexOfTarget : indexOfTarget + 1;
						newOrder.splice(insertIndex, 0, sourceData.imdbId);

						picks.reorder(newOrder);
					}
					return;
				}

				// Handle reorder within picks
				if (
					sourceData.source === 'picks' &&
					isMovieDragData(targetData) &&
					targetData.source === 'picks'
				) {
					const indexOfSource = picks.items.findIndex((p) => p.imdbId === sourceData.imdbId);
					const indexOfTarget = picks.items.findIndex((p) => p.imdbId === targetData.imdbId);

					if (indexOfTarget < 0 || indexOfSource < 0) return;

					const closestEdgeOfTarget = extractClosestEdge(targetData);

					const newOrder = reorderWithEdge({
						list: picks.items,
						startIndex: indexOfSource,
						indexOfTarget,
						closestEdgeOfTarget,
						axis: 'vertical',
					});

					picks.reorder(newOrder.map((p) => p.imdbId));
				}
			},
		});
	});

	// Create drag-and-drop attachment for a pick item
	function makeDraggable(imdbId: string): Attachment<HTMLElement> {
		return (element) => {
			if (disabled) return;

			const cleanup1 = draggable({
				element,
				getInitialData: () => getMovieDragData(imdbId, 'picks'),
				onDragStart: () => setDragState(imdbId, { type: 'dragging' }),
				onDrop: () => clearDragState(imdbId),
			});

			const cleanup2 = dropTargetForElements({
				element,
				canDrop: ({ source }) => {
					const data = source.data;
					if (!isMovieDragData(data)) return false;
					// Accept drops from picks (reorder) or available (add)
					if (data.source === 'picks') return source.element !== element;
					if (data.source === 'available') return !picks.pickedIds.has(data.imdbId);
					return false;
				},
				getData: ({ input }) =>
					attachClosestEdge(getMovieDragData(imdbId, 'picks'), {
						element,
						input,
						allowedEdges: ['top', 'bottom'],
					}),
				getIsSticky: () => true,
				onDragEnter: ({ self }) => {
					const closestEdge = extractClosestEdge(self.data);
					if (closestEdge) setDragState(imdbId, { type: 'over', closestEdge });
				},
				onDrag: ({ self }) => {
					const closestEdge = extractClosestEdge(self.data);
					const current = getDragState(imdbId);
					if (current.type === 'over' && current.closestEdge === closestEdge) return;
					if (closestEdge) setDragState(imdbId, { type: 'over', closestEdge });
				},
				onDragLeave: () => clearDragState(imdbId),
				onDrop: () => clearDragState(imdbId),
			});

			return () => {
				cleanup1();
				cleanup2();
			};
		};
	}

	// Make the container a drop target for adding movies at the end
	function makeContainerDropTarget(): Attachment<HTMLElement> {
		return (element) => {
			if (disabled) return;

			const cleanup = dropTargetForElements({
				element,
				canDrop: ({ source }) => {
					const data = source.data;
					if (!isMovieDragData(data)) return false;
					return data.source === 'available' && !picks.pickedIds.has(data.imdbId);
				},
				getData: () => ({ type: 'picks-container' }),
				onDragEnter: () => {
					isContainerDropTarget = true;
				},
				onDragLeave: () => {
					isContainerDropTarget = false;
				},
				onDrop: () => {
					isContainerDropTarget = false;
				},
			});

			return cleanup;
		};
	}
</script>

<div
	class="flex h-full flex-col rounded-lg transition-colors {isContainerDropTarget
		? 'bg-green-50 ring-2 ring-green-500'
		: ''}"
	{@attach makeContainerDropTarget()}
>
	<h2 class="mb-3 text-lg font-semibold text-slate-900">
		Your Picks ({picks.count}/{requiredCount})
		{#if isContainerDropTarget}
			<span class="text-sm font-normal text-green-600">Drop to add</span>
		{:else if neededCount > 0}
			<span class="text-sm font-normal text-amber-600">Need {neededCount} more</span>
		{/if}
	</h2>
	<div class="flex-1 space-y-2 pr-2">
		{#if picks.items.length === 0}
			<p class="py-8 text-center text-slate-400">
				{#if isContainerDropTarget}
					Drop here to add to your list
				{:else}
					Drag movies from the left to start building your list
				{/if}
			</p>
		{:else}
			{#each picks.items as pick, index (pick.imdbId)}
				{@const movie = moviesByImdbId[pick.imdbId]}
				{@const isDarkHorse = index >= 10}
				{@const state = getDragState(pick.imdbId)}
				{@const isDragging = state.type === 'dragging'}
				{@const isOver = state.type === 'over'}

				<div
					class="relative flex items-center gap-2 {isDragging ? 'opacity-40' : ''}"
					style={disabled ? '' : 'cursor: grab;'}
					{@attach makeDraggable(pick.imdbId)}
					animate:flip={{ duration: 300 }}
				>
					<span
						class="w-6 text-center text-sm font-medium {isDarkHorse
							? 'text-amber-500'
							: 'text-slate-400'}"
					>
						{#if index < 10}
							{index + 1}.
						{:else if index < 13}
							🐴
						{/if}
					</span>
					<div class="flex-1">
						{#if movie}
							<MovieCard
								{movie}
								showRemove={!disabled}
								onremove={() => picks.remove(pick.imdbId)}
								{disabled}
								showLinks
								{endDate}
							/>
						{:else}
							<div
								class="rounded-lg border border-dashed border-slate-200 p-4 text-center text-slate-400"
							>
								Unknown movie
							</div>
						{/if}
					</div>
					{#if isOver && state.closestEdge}
						<DropIndicator edge={state.closestEdge} />
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>
