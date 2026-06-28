<script lang="ts">
	import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';

	const edgeStyles: Record<Edge, string> = {
		top: 'top-0 -translate-y-1/2',
		bottom: 'bottom-0 translate-y-1/2',
		left: 'left-0 -translate-x-1/2',
		right: 'right-0 translate-x-1/2',
	};

	let { edge }: { edge: Edge } = $props();
</script>

<div class="pointer-events-none absolute right-0 left-0 z-10 h-0.5 bg-violet-500 {edgeStyles[edge]}">
	<div class="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full border-2 border-violet-500"></div>
</div>
