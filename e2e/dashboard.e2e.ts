import { test, expect } from '@playwright/test';

test.describe('Dashboard smoke test', () => {
	test('loads without errors and renders sector table', async ({ page }) => {
		const consoleErrors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') consoleErrors.push(msg.text());
		});

		const start = Date.now();
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		const loadTime = Date.now() - start;

		// Brand visible (AC #1)
		await expect(page.locator('.topbar-name')).toHaveText('market-signal');

		// Sector table always rendered (AC #1)
		await expect(page.locator('[data-testid="sector-table"]')).toBeVisible();

		// Either rows are visible OR empty zone is shown — both are valid DB states (AC #2)
		const rowCount = await page.locator('[data-testid="sector-row"]').count();
		const emptyZoneVisible = await page.locator('[data-testid="empty-zone"]').isVisible();
		expect(rowCount > 0 || emptyZoneVisible).toBe(true);

		// No JS console errors (AC #1)
		expect(consoleErrors).toHaveLength(0);

		// NFR1: load < 3 seconds (AC #2)
		expect(loadTime).toBeLessThan(3000);
	});
});
