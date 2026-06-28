// Shared drag data types for movie drag-and-drop between components

// Symbol keys for type-safe drag data
export const movieDragKey = Symbol('movie-drag');

export type MovieDragSource = 'available' | 'picks';

export type MovieDragData = {
	[movieDragKey]: true;
	imdbId: string;
	source: MovieDragSource;
};

export function getMovieDragData(
	imdbId: string,
	source: MovieDragSource,
): Record<string | symbol, unknown> {
	return { [movieDragKey]: true, imdbId, source };
}

export function isMovieDragData(data: Record<string | symbol, unknown>): data is MovieDragData {
	return data[movieDragKey] === true;
}
