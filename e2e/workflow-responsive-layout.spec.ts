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
	for (let attempt = 0; attempt < 3; attempt += 1) {
		await toggle.click();
		await page.waitForTimeout(120);
		if (await toolbar.isVisible()) break;
	}
	await expect(toolbar).toBeVisible();
};

const waitForBoardReady = async (page: Page) => {
	await expect(page.locator('.workflow-board-lanes')).toBeVisible();
	await expect(page.locator('.workflow-board-surface')).not.toContainText(/Chargement tableau|Loading board/i);
	await expect.poll(async () => page.locator('[data-testid^="board-task-"]').count()).toBeGreaterThan(0);
};

const waitForOverviewReady = async (page: Page) => {
	await expect(page.locator('.workflow-overview-page')).toBeVisible();
	await expect(page.locator('.workflow-overview-metrics')).toBeVisible();
	await expect(page.locator('.workflow-overview-grid')).toBeVisible();
};

const waitForProjectsReady = async (page: Page) => {
	await expect(page.locator('.workflow-projects-layout')).toBeVisible();
	await expect.poll(async () => page.locator('.workflow-project-card-modern').count()).toBeGreaterThan(0);
	await expect(page.locator('.workflow-project-card-modern').first()).toBeVisible();
};

const openFirstProjectDetail = async (page: Page) => {
	const firstProjectHref = await page.locator('.workflow-project-card-open').first().getAttribute('href');
	expect(firstProjectHref).toBeTruthy();
	await page.goto(firstProjectHref!);
	await expect(page.locator('.workflow-project-detail-page')).toBeVisible();
	await expect(page.locator('.workflow-project-detail-grid')).toBeVisible();
	await expect(page.locator('.workflow-project-detail-panel').first()).toBeVisible();
};

const waitForTeamReady = async (page: Page) => {
	await expect(page.locator('.workflow-team-grid')).toBeVisible();
	await expect.poll(async () => page.locator('.workflow-team-card').count()).toBeGreaterThan(0);
};

const waitForReportReady = async (page: Page) => {
	await expect(page.locator('.workflow-report-filterbar')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-report-metrics')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-analytics-grid, .workflow-analytics-panel').first()).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-forecast-board')).toBeVisible({ timeout: 30_000 });
	await expect.poll(async () => page.locator('.workflow-report-card').count(), { timeout: 30_000 }).toBeGreaterThan(0);
};

const waitForChatReady = async (page: Page) => {
	await expect(page.locator('.workflow-chat-sidebar')).toBeVisible();
	await expect(page.locator('.workflow-chat-thread-button, .workflow-chat-context-button, .workflow-chat-direct-button').first()).toBeVisible();
	await expect(page.locator('body')).not.toContainText(/Sélectionnez une conversation|Select a conversation/i);
	await expect(page.locator('.workflow-chat-room')).not.toContainText(/Chargement des conversations|Loading conversations/i, { timeout: 30_000 });
	await expect(page.locator('.workflow-chat-room-header')).toContainText(/messages/i);
	await expect(page.locator('.workflow-chat-room textarea').first()).toBeEnabled({ timeout: 30_000 });
};

const waitForNotificationsReady = async (page: Page) => {
	await expect(page.locator('.workflow-notifications-shell')).toBeVisible();
	await expect(page.locator('.workflow-notifications-metrics')).toBeVisible();
	await expect(page.locator('.workflow-notification-preferences')).toBeVisible();
	await expect(page.locator('.workflow-notifications-board')).toBeVisible();
	await expect(page.locator('.workflow-notifications-list > *').first()).toBeVisible();
};

const waitForUsersReady = async (page: Page) => {
	const rows = page.locator('.workflow-users-table tbody tr, .workflow-users-mobile-card');
	const errorState = page.locator('.workflow-users-board').getByText(/Une erreur est survenue|An error occurred/i);

	for (let attempt = 0; attempt < 2; attempt += 1) {
		await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 30_000 });
		await expect(page.locator('.workflow-users-shell')).toBeVisible({ timeout: 30_000 });
		await expect(page.locator('.workflow-users-metrics')).toBeVisible({ timeout: 30_000 });
		await expect(page.locator('.workflow-users-board')).toBeVisible({ timeout: 30_000 });
		await expect(page.locator('.workflow-users-table-wrap:visible, .workflow-users-mobile-list:visible').first()).toBeVisible({ timeout: 30_000 });

		try {
			await expect.poll(async () => rows.count(), { timeout: 30_000 }).toBeGreaterThan(0);
			return;
		} catch (error) {
			if (attempt === 0 && (await errorState.count()) > 0) {
				await page.reload({ waitUntil: 'domcontentloaded' });
				continue;
			}
			throw error;
		}
	}
};

const waitForUserFormReady = async (page: Page) => {
	await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 30_000 });
	await expect(page.locator('.workflow-user-form-shell')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-user-form-grid')).toBeVisible({ timeout: 30_000 });
};

const waitForProfileReady = async (page: Page) => {
	await expect(page.locator('.workflow-profile-shell')).toBeVisible();
	await expect(page.locator('.workflow-profile-fields')).toBeVisible();
	await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 20_000 });
};

const waitForPasswordReady = async (page: Page) => {
	await expect(page.locator('.workflow-password-shell')).toBeVisible();
	await expect(page.locator('.workflow-password-fields')).toBeVisible();
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
		test.setTimeout(90_000);
		await page.setViewportSize({ width: 820, height: 1180 });

		await page.goto('/dashboard/board');
		await openBoardFilters(page);
		await expect(page.locator('.workflow-topbar-controls')).toContainText('FR');
		await expect(page.locator('.workflow-saved-view-bar')).toContainText(/Vues enregistr.es|Nom de la vue|Priv.e/i);
		await expect(page.locator('.workflow-kanban-filter-grid')).not.toContainText(/Needs Review|Backlog/i);
		await waitForBoardReady(page);
		await capturePage(page, 'tablet-board');

		await page.goto('/dashboard/overview');
		await waitForOverviewReady(page);
		await capturePage(page, 'tablet-overview');

		await page.goto('/dashboard/projects');
		await waitForProjectsReady(page);
		await capturePage(page, 'tablet-projects');
		await openFirstProjectDetail(page);
		await capturePage(page, 'tablet-project-detail');

		await page.goto('/dashboard/team');
		await waitForTeamReady(page);
		await capturePage(page, 'tablet-team');

		await page.goto('/dashboard/reports/time');
		await expect(page.locator('.workflow-report-actions')).toBeVisible();
		await waitForReportReady(page);
		await capturePage(page, 'tablet-reports');

		await page.goto('/dashboard/chat');
		await expect(page.locator('.workflow-chat-task-room-section')).toHaveCount(0);
		await waitForChatReady(page);
		await expect(page.locator('.workflow-chat-thread-button, .workflow-chat-context-button, .workflow-chat-direct-button').first()).toBeVisible();
		await capturePage(page, 'tablet-chat');

		await page.goto('/dashboard/notifications');
		await waitForNotificationsReady(page);
		await capturePage(page, 'tablet-notifications');

		await page.goto('/dashboard/users');
		await waitForUsersReady(page);
		await capturePage(page, 'tablet-users');

		await page.goto('/dashboard/users/new');
		await waitForUserFormReady(page);
		await capturePage(page, 'tablet-user-new');

		await page.goto('/dashboard/settings/edit-profile');
		await waitForProfileReady(page);
		await capturePage(page, 'tablet-profile');

		await page.goto('/dashboard/settings/password');
		await waitForPasswordReady(page);
		await capturePage(page, 'tablet-password');
	});

	test('keeps mobile workflow pages compact and keeps language switching available', async ({ page }) => {
		test.setTimeout(90_000);
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
		await waitForBoardReady(page);
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

		await page.goto('/dashboard/overview');
		await waitForOverviewReady(page);
		await capturePage(page, 'mobile-overview');

		await page.goto('/dashboard/projects');
		await waitForProjectsReady(page);
		await capturePage(page, 'mobile-projects');
		await openFirstProjectDetail(page);
		await capturePage(page, 'mobile-project-detail');

		await page.goto('/dashboard/team');
		await waitForTeamReady(page);
		await capturePage(page, 'mobile-team');

		await page.goto('/dashboard/reports/time');
		await waitForReportReady(page);
		await capturePage(page, 'mobile-reports');

		await page.goto('/dashboard/chat');
		await expect(page.locator('.workflow-chat-task-room-section')).toHaveCount(0);
		await waitForChatReady(page);
		await expect(page.locator('.workflow-chat-thread-button, .workflow-chat-context-button, .workflow-chat-direct-button').first()).toBeVisible();
		await expect(page.getByRole('button', { name: /Filtrer par/i })).toBeVisible();
		await capturePage(page, 'mobile-chat');

		await page.goto('/dashboard/notifications');
		await waitForNotificationsReady(page);
		await capturePage(page, 'mobile-notifications');

		await page.goto('/dashboard/users');
		await waitForUsersReady(page);
		await capturePage(page, 'mobile-users');

		await page.goto('/dashboard/users/new');
		await waitForUserFormReady(page);
		await capturePage(page, 'mobile-user-new');

		await page.goto('/dashboard/settings/edit-profile');
		await waitForProfileReady(page);
		await capturePage(page, 'mobile-profile');

		await page.goto('/dashboard/settings/password');
		await waitForPasswordReady(page);
		await capturePage(page, 'mobile-password');
	});
});
