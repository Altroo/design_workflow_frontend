import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const authStatePath = '.playwright/.auth/design-workflow-e2e.json';
const screenshotDir = 'test-results/workflow-visual';

test.describe('workflow visual layout pass', () => {
	test.skip(!existsSync(authStatePath), 'Run the authenticated dashboard setup before visual layout checks.');
	test.use({ storageState: authStatePath, viewport: { width: 1920, height: 900 } });

	test.beforeAll(() => {
		mkdirSync(screenshotDir, { recursive: true });
	});

	test.beforeEach(async ({ context, page }) => {
		await context.addCookies([{ name: 'app-language', value: 'fr', url: 'http://localhost:3004' }]);
		await page.addInitScript(() => {
			window.localStorage.setItem('app-language', 'fr');
		});
	});

	test('captures and checks the premium workflow pages', async ({ page }) => {
		test.setTimeout(90_000);
		await page.goto('/dashboard/board');
		await expect(page.locator('.workflow-kanban-toolbar')).toBeVisible();
		await expect(page.locator('.workflow-kanban-filter-grid')).toBeVisible();
		await expect(page.locator('.workflow-topbar-controls')).toContainText('FR');
		await expect(page.locator('.workflow-rail-title')).toContainText(/Flux Design/i);
		await expect(page.locator('.workflow-saved-view-bar')).toContainText(/Vues enregistr.es|Nom de la vue|Priv.e/i);
		await expect(page.locator('.workflow-kanban-filter-grid')).toContainText(/Toutes les revues|Ordre manuel/i);
		await expect(page.locator('.workflow-saved-view-bar')).not.toContainText(/Saved views|View name|Private/i);
		const filterRowCount = await page.locator('.workflow-kanban-filter-grid').evaluate((grid) => {
			const tops = Array.from(grid.children).map((child) => Math.round(child.getBoundingClientRect().top));
			return new Set(tops).size;
		});
		expect(filterRowCount).toBeGreaterThanOrEqual(2);
		await expect(page.locator('.workflow-board-lanes')).toBeVisible();
		await expect(page.locator('.workflow-board-surface')).not.toContainText(/Chargement tableau|Loading board/i);
		await expect.poll(async () => page.locator('[data-testid^="board-task-"]').count()).toBeGreaterThan(0);
		await page.screenshot({ path: join(screenshotDir, 'board.png'), fullPage: true });
		await page.locator('[data-testid^="board-task-"]').first().click();
		await expect(page.locator('.workflow-task-modal')).toBeVisible();
		await expect(page.locator('.workflow-task-modal')).toContainText(/Commentaires|Activit.|Fichiers|Review|Revue/i);
		await page.screenshot({ path: join(screenshotDir, 'task-modal.png'), fullPage: true });
		await page.keyboard.press('Escape');
		await expect(page.locator('.workflow-task-modal')).toHaveCount(0);

		await page.goto('/dashboard/overview');
		await expect(page.locator('.workflow-overview-page')).toBeVisible();
		await expect(page.locator('.workflow-overview-metrics')).toBeVisible();
		await expect(page.locator('.workflow-overview-grid')).toBeVisible();
		await page.screenshot({ path: join(screenshotDir, 'overview.png'), fullPage: true });

		await page.goto('/dashboard/my-work');
		await expect(page.locator('.workflow-board-lanes')).toBeVisible();
		await expect(page.locator('.workflow-board-surface')).not.toContainText(/Chargement tableau|Loading board/i);
		await page.screenshot({ path: join(screenshotDir, 'my-work.png'), fullPage: true });

		await page.goto('/dashboard/projects');
		await expect(page.locator('.workflow-projects-layout')).toBeVisible();
		await expect(page.locator('.workflow-projects-card-grid')).toBeVisible();
		await expect(page.locator('.workflow-projects-list')).not.toContainText(/Chargement projets|Loading projects/i);
		await expect.poll(async () => page.locator('.workflow-project-card-modern').count()).toBeGreaterThan(0);
		await page.screenshot({ path: join(screenshotDir, 'projects.png'), fullPage: true });
		const firstProjectHref = await page.locator('.workflow-project-card-open').first().getAttribute('href');
		expect(firstProjectHref).toBeTruthy();
		await page.goto(firstProjectHref!);
		await expect(page.locator('.workflow-project-detail-page')).toBeVisible();
		await expect(page.locator('.workflow-project-detail-grid')).toBeVisible();
		await expect(page.locator('.workflow-project-detail-panel').first()).toBeVisible();
		await page.screenshot({ path: join(screenshotDir, 'project-detail.png'), fullPage: true });

		await page.goto('/dashboard/team');
		await expect(page.locator('.workflow-team-grid')).toBeVisible();
		await expect(page.locator('.workflow-team-analytics')).toBeVisible();
		await expect(page.locator('.workflow-team-board')).toBeVisible();
		await expect.poll(async () => page.locator('.workflow-team-card').count()).toBeGreaterThan(0);
		const teamLayout = await page.locator('.workflow-team-grid').evaluate((grid) => {
			const analytics = grid.querySelector('.workflow-team-analytics')?.getBoundingClientRect();
			const board = grid.querySelector('.workflow-team-board')?.getBoundingClientRect();
			const bounds = grid.getBoundingClientRect();
			return {
				analyticsWidth: analytics?.width ?? bounds.width,
				boardWidth: board?.width ?? 0,
				topDelta: Math.abs((analytics?.top ?? 0) - (board?.top ?? 0)),
				totalWidth: bounds.width,
			};
		});
		expect(teamLayout.analyticsWidth).toBeLessThan(teamLayout.totalWidth * 0.55);
		expect(teamLayout.boardWidth).toBeGreaterThan(teamLayout.analyticsWidth);
		expect(teamLayout.topDelta).toBeLessThan(4);
		await page.screenshot({ path: join(screenshotDir, 'team.png'), fullPage: true });

		await page.goto('/dashboard/reports/time');
		await expect(page.locator('.workflow-report-filterbar')).toBeVisible();
		await expect(page.locator('.workflow-report-date-fields')).toBeVisible();
		await expect(page.locator('.workflow-report-actions')).toBeVisible();
		await expect(page.locator('.workflow-report-filterbar')).toContainText(/Effacer les filtres|Exporter CSV|Exporter PDF/i);
		await expect(page.locator('.workflow-analytics-grid')).toBeVisible();
		await expect(page.locator('.workflow-forecast-board')).toBeVisible();
		const widestReportAction = await page.locator('.workflow-report-actions button').evaluateAll((buttons) =>
			Math.max(...buttons.map((button) => button.getBoundingClientRect().width)),
		);
		expect(widestReportAction).toBeLessThan(190);
		await page.screenshot({ path: join(screenshotDir, 'reports.png'), fullPage: true });

		await page.goto('/dashboard/chat');
		await expect(page.locator('.workflow-chat-sidebar')).toBeVisible();
		await expect(page.locator('.workflow-chat-task-room-section')).toHaveCount(0);
		await expect(page.locator('.workflow-chat-thread-button').first()).toBeVisible();
		await expect(page.locator('body')).not.toContainText(/Sélectionnez une conversation|Select a conversation/i);
		await expect(page.locator('.workflow-chat-thread-button, .workflow-chat-context-button, .workflow-chat-direct-button').first()).toBeVisible();
		await expect(page.locator('.workflow-chat-room-header')).toContainText(/messages/i);
		await expect(page.getByRole('button', { name: /Filtrer par/i })).toBeVisible();
		await expect(page.locator('.workflow-chat-tools-toggle span')).toHaveText(/Filtrer par/i);
		await page.screenshot({ path: join(screenshotDir, 'chat.png'), fullPage: true });

		await page.goto('/dashboard/notifications');
		await expect(page.locator('.workflow-notifications-shell')).toBeVisible();
		await expect(page.locator('.workflow-notifications-metrics')).toBeVisible();
		await expect(page.locator('.workflow-notification-preferences')).toBeVisible();
		await expect(page.locator('.workflow-notifications-board')).toBeVisible();
		await expect(page.locator('.workflow-notifications-list > *').first()).toBeVisible();
		await page.screenshot({ path: join(screenshotDir, 'notifications.png'), fullPage: true });

		await page.goto('/dashboard/users');
		await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 30_000 });
		await expect(page.locator('.workflow-users-shell')).toBeVisible({ timeout: 30_000 });
		await expect(page.locator('.workflow-users-metrics')).toBeVisible({ timeout: 30_000 });
		await expect(page.locator('.workflow-users-board')).toBeVisible({ timeout: 30_000 });
		await expect(page.locator('.workflow-users-table-wrap')).toBeVisible({ timeout: 30_000 });
		await expect.poll(async () => page.locator('.workflow-users-table tbody tr').count()).toBeGreaterThan(0);
		await page.screenshot({ path: join(screenshotDir, 'users.png'), fullPage: true });

		await page.goto('/dashboard/users/new');
		await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 30_000 });
		await expect(page.locator('.workflow-user-form-shell')).toBeVisible({ timeout: 30_000 });
		await expect(page.locator('.workflow-user-form-grid')).toBeVisible({ timeout: 30_000 });
		await page.screenshot({ path: join(screenshotDir, 'user-new.png'), fullPage: true });

		await page.goto('/dashboard/settings/edit-profile');
		await expect(page.locator('.workflow-profile-shell')).toBeVisible();
		await expect(page.locator('.workflow-profile-fields')).toBeVisible();
		await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 20_000 });
		await page.screenshot({ path: join(screenshotDir, 'profile.png'), fullPage: true });

		await page.goto('/dashboard/settings/password');
		await expect(page.locator('.workflow-password-shell')).toBeVisible();
		await expect(page.locator('.workflow-password-fields')).toBeVisible();
		await page.screenshot({ path: join(screenshotDir, 'password.png'), fullPage: true });
	});
});
