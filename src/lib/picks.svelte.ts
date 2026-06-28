import { PersistedState } from 'runed';

export type Pick = {
	imdbId: string;
	position: number;
};

// The shared, persisted ranked list of picked movies. Position is the array index.
// Import the `picks` singleton directly wherever needed instead of threading props.
class PickList {
	#ids = new PersistedState<string[]>('movie-list:picks', []);

	// Ordered picks with their 1-based ranking position.
	readonly items: Pick[] = $derived(
		this.#ids.current.map((imdbId, index) => ({ imdbId, position: index + 1 })),
	);

	// Set of picked IMDb IDs, for quick membership checks in templates.
	readonly pickedIds: Set<string> = $derived(new Set(this.#ids.current));

	get count() {
		return this.#ids.current.length;
	}

	has(imdbId: string) {
		return this.pickedIds.has(imdbId);
	}

	add(imdbId: string) {
		if (!this.has(imdbId)) {
			this.#ids.current = [...this.#ids.current, imdbId];
		}
	}

	remove(imdbId: string) {
		this.#ids.current = this.#ids.current.filter((id) => id !== imdbId);
	}

	reorder(imdbIds: string[]) {
		this.#ids.current = imdbIds;
	}

	reset() {
		this.#ids.current = [];
	}
}

export const picks = new PickList();
