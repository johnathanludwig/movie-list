import { PersistedState } from 'runed';

// Shared UI settings, persisted to localStorage. Import directly wherever needed
// instead of threading through props.

// "Unsullied" mode blurs posters to stay spoiler-free. On by default.
export const unsullied = new PersistedState<boolean>('movie-list:unsullied', true);
