import { test, expect, type Page } from '@playwright/test';

// End-to-end coverage for the Summer Movie Wager list builder. Each test starts
// from a fresh browser context, so localStorage is empty unless we set it.

const PICKS_KEY = 'movie-list:picks';
const UNSULLIED_KEY = 'movie-list:unsullied';

// Any available movie card's accessible name contains a "N weekend(s)" badge,
// which the Reset / Unsullied / Remove buttons never do — handy for grabbing
// real movie cards without depending on a specific title.
const availableCards = (page: Page) => page.getByRole('button', { name: /weekend/i });

// Picked rows expose a "Remove <title>" button; their DOM order is the rank order.
const removeButtons = (page: Page) => page.getByRole('button', { name: /^Remove / });

/** Title of each pick in current rank order. */
async function picksOrder(page: Page): Promise<string[]> {
	return page.evaluate(() =>
		[...document.querySelectorAll('[aria-label^="Remove "]')].map((b) =>
			b.getAttribute('aria-label')!.replace(/^Remove /, '')
		)
	);
}

/**
 * Drive a drag-and-drop the way @atlaskit/pragmatic-drag-and-drop expects it.
 *
 * The library is built on the native HTML5 Drag-and-Drop API, which Playwright's
 * mouse / dragTo helpers do NOT trigger (verified: a synthetic mouse drag leaves
 * the list untouched). So we dispatch real DragEvents carrying a single shared
 * DataTransfer, which is the exact sequence the library's adapters listen for.
 */
async function dragMovie(
	page: Page,
	sourceTitle: string,
	target: { onMovie: string; edge: 'top' | 'bottom' } | { onColumn: 'Available Movies' | 'Your Picks' }
): Promise<void> {
	await page.evaluate(
		async ({ sourceTitle, target }) => {
			const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

			const draggableRow = (title: string) => {
				const el = [...document.querySelectorAll<HTMLElement>('[draggable="true"]')].find((e) =>
					e.textContent?.includes(title)
				);
				if (!el) throw new Error(`No draggable row containing "${title}"`);
				return el;
			};

			const column = (heading: string) => {
				const h2 = [...document.querySelectorAll('h2')].find((h) =>
					h.textContent?.includes(heading)
				);
				const col = h2?.closest('div');
				if (!col) throw new Error(`No column for heading "${heading}"`);
				return col;
			};

			const source = draggableRow(sourceTitle);
			let dropTarget: Element;
			let yFrac: number;
			if ('onMovie' in target) {
				dropTarget = draggableRow(target.onMovie);
				yFrac = target.edge === 'top' ? 0.1 : 0.9; // which edge to insert against
			} else {
				dropTarget = column(target.onColumn);
				yFrac = 0.9; // empty space below the items
			}

			const dataTransfer = new DataTransfer();
			const fire = (el: Element, type: string, frac: number) => {
				const r = el.getBoundingClientRect();
				el.dispatchEvent(
					new DragEvent(type, {
						bubbles: true,
						cancelable: true,
						dataTransfer,
						clientX: r.x + r.width / 2,
						clientY: r.y + r.height * frac
					})
				);
			};

			fire(source, 'dragstart', 0.5);
			await wait(50);
			fire(dropTarget, 'dragenter', yFrac);
			fire(dropTarget, 'dragover', yFrac);
			await wait(50);
			fire(dropTarget, 'dragover', yFrac);
			await wait(50);
			fire(dropTarget, 'drop', yFrac);
			fire(source, 'dragend', 0.5);
			await wait(50);
		},
		{ sourceTitle, target }
	);
}

test.beforeEach(async ({ page }) => {
	await page.goto('/');
});

test.describe('initial state', () => {
	test('renders the header, both columns, and a clean slate', async ({ page }) => {
		await expect(page).toHaveTitle('My List - Summer Movie Wager 2026');
		await expect(page.getByRole('heading', { level: 1, name: 'My List for Summer 2026' })).toBeVisible();
		await expect(page.getByText('0/13 picked')).toBeVisible();

		// All 35 movies start available, none picked.
		await expect(page.getByRole('heading', { name: 'Available Movies (35)' })).toBeVisible();
		await expect(page.getByRole('heading', { name: /Your Picks \(0\/13\)/ })).toBeVisible();
		await expect(page.getByText('Need 13 more')).toBeVisible();
		await expect(availableCards(page)).toHaveCount(35);

		// Reset is a no-op with nothing picked.
		await expect(page.getByRole('button', { name: 'Reset list' })).toBeDisabled();

		// Spoiler-free mode is on by default.
		await expect(page.getByRole('checkbox', { name: 'Unsullied' })).toBeChecked();
	});
});

test.describe('picking and removing', () => {
	test('clicking an available movie adds it to picks', async ({ page }) => {
		await page.getByRole('button', { name: 'Toy Story 5' }).click();

		await expect(page.getByText('1/13 picked')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Available Movies (34)' })).toBeVisible();
		await expect(page.getByRole('heading', { name: /Your Picks \(1\/13\)/ })).toBeVisible();
		await expect(page.getByText('Need 12 more')).toBeVisible();

		// It moved out of the available column and now has a remove control.
		await expect(page.getByRole('button', { name: 'Remove Toy Story 5' })).toBeVisible();
		await expect(availableCards(page)).toHaveCount(34);
	});

	test('the remove button puts a movie back in the available list', async ({ page }) => {
		await page.getByRole('button', { name: 'Moana' }).click();
		await expect(page.getByRole('button', { name: 'Remove Moana' })).toBeVisible();

		await page.getByRole('button', { name: 'Remove Moana' }).click();

		await expect(page.getByText('0/13 picked')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Available Movies (35)' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Remove Moana' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Moana' })).toBeVisible();
	});
});

test.describe('reset', () => {
	test('requires a second click to confirm before clearing', async ({ page }) => {
		await page.getByRole('button', { name: 'Supergirl' }).click();
		await page.getByRole('button', { name: 'Tuner' }).click();
		await expect(removeButtons(page)).toHaveCount(2);

		// First click only arms the confirmation.
		await page.getByRole('button', { name: 'Reset list' }).click();
		await expect(page.getByRole('button', { name: 'Click again to confirm' })).toBeVisible();
		await expect(removeButtons(page)).toHaveCount(2);

		// Second click actually clears the list.
		await page.getByRole('button', { name: 'Click again to confirm' }).click();
		await expect(page.getByText('0/13 picked')).toBeVisible();
		await expect(removeButtons(page)).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Reset list' })).toBeDisabled();
	});

	test('auto-cancels the confirmation after a few seconds', async ({ page }) => {
		await page.getByRole('button', { name: 'Supergirl' }).click();
		await page.getByRole('button', { name: 'Reset list' }).click();
		await expect(page.getByRole('button', { name: 'Click again to confirm' })).toBeVisible();

		// The confirm window is 3s; after it lapses the button reverts and the pick survives.
		await expect(page.getByRole('button', { name: 'Reset list' })).toBeVisible({ timeout: 5000 });
		await expect(removeButtons(page)).toHaveCount(1);
	});
});

test.describe('unsullied (spoiler-free) mode', () => {
	test('blurs posters when on and reveals them when off', async ({ page }) => {
		await page.getByRole('button', { name: 'Toy Story 5' }).click();
		const poster = page.locator('img[alt="Toy Story 5"]').first();

		// On by default -> blurred.
		await expect(poster).toHaveClass(/blur-md/);

		await page.getByRole('checkbox', { name: 'Unsullied' }).uncheck();
		await expect(poster).not.toHaveClass(/blur-md/);

		await page.getByRole('checkbox', { name: 'Unsullied' }).check();
		await expect(poster).toHaveClass(/blur-md/);
	});
});

test.describe('ranking and dark horses', () => {
	test('numbers the top 10 and marks slots 11-13 as dark horses', async ({ page }) => {
		// Add 13 movies by repeatedly taking the top available card.
		for (let i = 0; i < 13; i++) {
			await availableCards(page).first().click();
			await expect(removeButtons(page)).toHaveCount(i + 1);
		}

		await expect(page.getByRole('heading', { name: /Your Picks \(13\/13\)/ })).toBeVisible();
		// Quota met: the "Need N more" nudge is gone.
		await expect(page.getByText(/Need \d+ more/)).toHaveCount(0);

		// Ranks 1-10 are numbered; the last three are dark-horse picks.
		await expect(page.getByText('1.', { exact: true })).toBeVisible();
		await expect(page.getByText('10.', { exact: true })).toBeVisible();
		await expect(page.getByText('11.', { exact: true })).toHaveCount(0);
		await expect(page.getByText('🐴')).toHaveCount(3);
	});
});

test.describe('drag and drop', () => {
	test('reordering within picks via native drag updates the rank order', async ({ page }) => {
		await page.getByRole('button', { name: 'Supergirl' }).click();
		await page.getByRole('button', { name: 'Moana' }).click();
		await page.getByRole('button', { name: 'Tuner' }).click();
		expect(await picksOrder(page)).toEqual(['Supergirl', 'Moana', 'Tuner']);

		// Drag the last pick above the first.
		await dragMovie(page, 'Tuner', { onMovie: 'Supergirl', edge: 'top' });

		await expect.poll(() => picksOrder(page)).toEqual(['Tuner', 'Supergirl', 'Moana']);
	});

	test('dragging an available movie onto the picks column adds it', async ({ page }) => {
		await dragMovie(page, 'Toy Story 5', { onColumn: 'Your Picks' });

		await expect(page.getByRole('button', { name: 'Remove Toy Story 5' })).toBeVisible();
		await expect(page.getByText('1/13 picked')).toBeVisible();
	});

	test('dragging a pick onto the available column removes it', async ({ page }) => {
		await page.getByRole('button', { name: 'Moana' }).click();
		await expect(page.getByRole('button', { name: 'Remove Moana' })).toBeVisible();

		await dragMovie(page, 'Moana', { onColumn: 'Available Movies' });

		await expect(page.getByRole('button', { name: 'Remove Moana' })).toHaveCount(0);
		await expect(page.getByText('0/13 picked')).toBeVisible();
	});
});

test.describe('persistence', () => {
	test('picks and the unsullied setting survive a reload', async ({ page }) => {
		await page.getByRole('button', { name: 'Supergirl' }).click();
		await page.getByRole('button', { name: 'Tuner' }).click();
		await page.getByRole('checkbox', { name: 'Unsullied' }).uncheck();

		// Sanity-check what got written to localStorage.
		await expect
			.poll(() => page.evaluate((k) => localStorage.getItem(k), UNSULLIED_KEY))
			.toBe('false');
		await expect
			.poll(() => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '[]').length, PICKS_KEY))
			.toBe(2);

		await page.reload();

		await expect(page.getByRole('heading', { name: /Your Picks \(2\/13\)/ })).toBeVisible();
		await expect(removeButtons(page)).toHaveCount(2);
		await expect(page.getByRole('checkbox', { name: 'Unsullied' })).not.toBeChecked();
	});
});

test.describe('external links', () => {
	test('each card links out to IMDb, TMDB, and Box Office Mojo', async ({ page }) => {
		// Toy Story 5 has all three IDs in the catalog.
		const imdb = page.locator('a[href="https://www.imdb.com/title/tt29355505/"]');
		await expect(imdb.first()).toBeVisible();
		await expect(imdb.first()).toHaveAttribute('target', '_blank');
		await expect(page.locator('a[href="https://www.themoviedb.org/movie/1084244"]').first()).toBeVisible();
		await expect(
			page.locator('a[href="https://www.boxofficemojo.com/release/rl3344859137/"]').first()
		).toBeVisible();
	});
});
