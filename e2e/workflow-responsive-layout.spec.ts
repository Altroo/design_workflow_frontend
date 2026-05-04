import { expect, type Page, test } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const authStatePath = '.playwright/.auth/design-workflow-e2e.json';
const screenshotDir = 'test-results/workflow-responsive';

const forceFrench = async (page: Page) => {
	await page.context().addCookies([{ name: 'app-language', value: 'fr', url: 'http://localhost:3004' }]);
	await page.addInitScript(() => {
		window.localStorage.setItem('app-language', 'fr');
	});
};

const expectNoPageOverflow = async (page: Page) => {
	const overflow = await page.evaluate(() => {
		const root = document.documentElement;
		const body = document.body;
		const width = Math.max(root.scrollWidth, body.scrollWidth);
		return {
			width,
			viewport: root.clientWidth,
		};
	});
	expect(overflow.width).toBeLessThanOrEqual(overflow.viewport + 4);
};

const capturePage = async (page: Page, name: string) => {
	await expectNoPageOverflow(page);
	await page.screenshot({ path: join(screenshotDir, `${name}.png`), fullPage: true });
};

const openBoardFilters = async (page: Page) => {
	const toolbar = page.locator('.workflow-kanban-toolbar');
	if (await toolbar.isVisible()) return;
	const toggle = page.locator('.workflow-board-filter-toggle');
	await expect(toggle).toBeVisible();
	await toggle.click();
	await expect(toolbar).toBeVisible();
};

test.describe('workflow responsive visual pass', () => {
	test.skip(!existsSync(authStatePath), 'Run the authenticated dashboard setup before responsive checks.');
	test.use({ storageState: authStatePath });

	test.beforeAll(() => {
		mkdirSync(screenshotDir, { recursive: true });
	});

	test.beforeEach(async ({ page }) => {
		await forceFrench(page);
	});

	test('keeps tablet workflow pages readable without body overflow', async ({ page }) => {
		await page.setViewportSize({ width: 820, height: 1180 });

		await page.goto('/dashboard/board');
		await openBoardFilters(page);
		await expect(page.locator('.workflow-topbar-controls')).toContainText('FR');
		await expect(page.locator('.workflow-saved-view-bar')).toContainText(/Vues enregistr.es|Nom de la vue|Priv.e/i);
		await expect(page.locator('.workflow-kanban-filter-grid')).not.toContainText(/Needs Review|Backlog/i);
		await capturePage(page, 'tablet-board');

		await page.goto('/dashboard/projects');
		await expect(page.locator('.workflow-projects-layout')).toBeVisible();
		await capturePage(page, 'tablet-projects');

		await page.goto('/dashboard/team');
		await expect(page.locator('.workflow-team-grid')).toBeVisible();
		await expect(page.locator('.workflow-team-analytics')).toBeVisible();
		await capturePage(page, 'tablet-team');

		await page.goto('/dashboard/reports/time');
		await expect(page.locator('.workflow-report-filterbar')).toBeVisible();
		await expect(page.locator('.workflow-report-actions')).toBeVisible();
		await capturePage(page, 'tablet-reports');

		await page.goto('/dashboard/chat');
		await expect(page.locator('.workflow-chat-sidebar')).toBeVisible();
		await expect(page.locator('.workflow-chat-task-room-section')).toHaveCount(0);
		await capturePage(page, 'tablet-chat');
	});

	test('keeps mobile workflow pages compact and keeps language switching available', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });

		await page.goto('/dashboard/board');
		await openBoardFilters(page);
		await expect(page.getByRole('button', { name: /Passer en anglais/i })).toBeVisible();
		await expect(page.locator('.workflow-topbar-controls')).toContainText('FR');
		await page.getByRole('button', { name: /Passer en anglais/i }).click();
		await expect(page.locator('.workflow-topbar-controls')).toContainText('EN');
		await expect(page.locator('.workflow-saved-view-bar')).toContainText(/Saved views|View name|Private/i);
		await page.getByRole('button', { name: /Switch to French/i }).click();
		await expect(page.locator('.workflow-topbar-controls')).toContainText('FR');
		await expect(page.locator('.workflow-saved-view-bar')).toContainText(/Vues enregistr.es|Nom de la vue|Priv.e/i);
		await expect(page.locator('.workflow-kanban-filter-grid')).not.toContainText(/Needs Review|Backlog/i);
		const boardLanesOverflow = await page.locator('.workflow-board-lanes').evaluate((lanes) => lanes.scrollWidth > lanes.clientWidth);
		expect(boardLanesOverflow).toBe(true);
		await capturePage(page, 'mobile-board');

		const firstCard = page.locator('[data-testid^="board-task-"]').first();
		if (await firstCard.count()) {
			await firstCard.click();
			await expect(page.locator('.workflow-task-modal')).toBeVisible();
			await expect(page.locator('.workflow-task-modal')).toContainText(/Commentaires|Activit.|Fichiers|Review|Revue/i);
			await capturePage(page, 'mobile-task-modal');
			await page.keyboard.press('Escape');
			await expect(page.locator('.workflow-task-modal')).toHaveCount(0);
		}

		await page.goto('/dashboard/projects');
		await expect(page.locator('.workflow-projects-layout')).toBeVisible();
		await capturePage(page, 'mobile-projects');

		await page.goto('/dashboard/team');
		await expect(page.locator('.workflow-team-grid')).toBeVisible();
		await capturePage(page, 'mobile-team');

		await page.goto('/dashboard/reports/time');
		await expect(page.locator('.workflow-report-filterbar')).toBeVisible();
		await capturePage(page, 'mobile-reports');

		await page.goto('/dashboard/chat');
		await expect(page.locator('.workflow-chat-sidebar')).toBeVisible();
		await expect(page.locator('.workflow-chat-task-room-section')).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Filtrer par/i })).toBeVisible();
		await capturePage(page, 'mobile-chat');
	});
});
