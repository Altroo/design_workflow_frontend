import { expect, type Page, test } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const authStatePath = '.playwright/.auth/design-workflow-e2e.json';
const screenshotDir = 'test-results/workflow-responsive';
const seeded = process.env.DESIGN_WORKFLOW_E2E_SEEDED === '1';

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

const expectNoNextDevIndicator = async (page: Page) => {
	await expect
		.poll(
			() =>
				page.evaluate(() =>
					Array.from(document.querySelectorAll('nextjs-portal')).some((portal) => {
						const style = getComputedStyle(portal);
						const box = portal.getBoundingClientRect();
						return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
					}),
				),
			{ timeout: 10_000 },
		)
		.toBe(false);
};

const capturePage = async (page: Page, name: string) => {
	await expectNoPageOverflow(page);
	await expectNoNextDevIndicator(page);
	await page.screenshot({ path: join(screenshotDir, `${name}.png`), fullPage: true });
};

const expectContentCardInSnapshot = async (page: Page, selector: string, label: string) => {
	const card = page.locator(selector).first();
	await expect(card, `${label} content should be rendered before responsive capture`).toBeVisible({ timeout: 30_000 });
	const exposure = await card.evaluate((element) => {
		const box = element.getBoundingClientRect();
		const viewportWidth = document.documentElement.clientWidth;
		const horizontal = Math.max(0, Math.min(box.right, viewportWidth) - Math.max(box.left, 0));
		const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
		return {
			height: box.height,
			horizontalRatio: box.width ? horizontal / box.width : 0,
			textLength: text.length,
			width: box.width,
		};
	});
	expect(exposure.width, `${label} card width`).toBeGreaterThan(140);
	expect(exposure.height, `${label} card height`).toBeGreaterThan(56);
	expect(exposure.horizontalRatio, `${label} card horizontal exposure`).toBeGreaterThan(0.82);
	expect(exposure.textLength, `${label} card text`).toBeGreaterThan(8);
};

const expectSeededNotificationCards = async (page: Page) => {
	if (!seeded) return;

	const reviewCard = page
		.locator('.workflow-notifications-card')
		.filter({ hasText: /E2E Review Approval Card|Demande de revue|Review requested/i })
		.first();
	await expect(reviewCard, 'seeded notification card should render before responsive capture').toBeVisible({ timeout: 30_000 });
	await expect(reviewCard.getByRole('button', { name: /Snooze 1h|Masquer/i })).toBeVisible();
	await expect(reviewCard.getByRole('button', { name: /Accept|Move to progress|Accepter|progress/i }).first()).toBeVisible();
};

const expectMobileNotificationPreferences = async (page: Page) => {
	const viewport = page.viewportSize();
	if (!viewport || viewport.width > 480) return;

	const toggles = page.locator('.workflow-notification-preference-toggle');
	await expect.poll(async () => toggles.count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(4);
	for (let index = 0; index < 4; index += 1) {
		const metrics = await toggles.nth(index).evaluate((toggle) => {
			const input = toggle.querySelector('input')?.getBoundingClientRect();
			const label = toggle.querySelector('span')?.getBoundingClientRect();
			const box = toggle.getBoundingClientRect();
			return {
				labelGap: input && label ? label.left - input.right : 0,
				labelRightGap: label ? box.right - label.right : 0,
				rowHeight: box.height,
			};
		});
		expect(metrics.rowHeight).toBeGreaterThanOrEqual(42);
		expect(metrics.labelGap).toBeGreaterThanOrEqual(4);
		expect(metrics.labelGap).toBeLessThanOrEqual(14);
		expect(metrics.labelRightGap).toBeGreaterThanOrEqual(8);
	}
};

const expectMobileNotificationActions = async (page: Page) => {
	const viewport = page.viewportSize();
	if (!viewport || viewport.width > 480) return;

	const actionGroups = page.locator('.workflow-notifications-card .workflow-notifications-actions');
	await expect.poll(async () => actionGroups.count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
	const group = actionGroups.first();
	await expect.poll(async () => group.locator('.workflow-notifications-action-button').count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(4);
	const layout = await group.evaluate((element) => {
		const buttons = Array.from(element.querySelectorAll<HTMLElement>('.workflow-notifications-action-button'));
		const box = element.getBoundingClientRect();
		const rows = new Set(buttons.map((button) => Math.round(button.getBoundingClientRect().top)));
		return {
			buttons: buttons.map((button) => {
				const buttonBox = button.getBoundingClientRect();
				return {
					height: buttonBox.height,
					leftOverflow: buttonBox.left < box.left - 1,
					rightOverflow: buttonBox.right > box.right + 1,
					widthRatio: box.width ? buttonBox.width / box.width : 1,
				};
			}),
			rowCount: rows.size,
		};
	});
	expect(layout.rowCount).toBeLessThanOrEqual(3);
	for (const button of layout.buttons) {
		expect(button.height).toBeGreaterThanOrEqual(40);
		expect(button.widthRatio).toBeLessThanOrEqual(1.01);
		expect(button.leftOverflow).toBe(false);
		expect(button.rightOverflow).toBe(false);
	}
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

const centerBoardOnFirstTask = async (page: Page) => {
	const firstCard = page.locator('[data-testid^="board-task-"]').first();
	await expect(firstCard).toBeAttached();
	await firstCard.evaluate((card) => {
		const lanes = card.closest('.workflow-board-lanes');
		if (!(lanes instanceof HTMLElement)) return;
		const lanesBox = lanes.getBoundingClientRect();
		const cardBox = card.getBoundingClientRect();
		lanes.scrollLeft += cardBox.left - lanesBox.left - Math.max(16, (lanesBox.width - cardBox.width) / 2);
	});
	await page.waitForTimeout(120);
	const exposure = await firstCard.evaluate((card) => {
		const lanes = card.closest('.workflow-board-lanes');
		if (!(lanes instanceof HTMLElement)) return { horizontalRatio: 0, verticalRatio: 0 };
		const lanesBox = lanes.getBoundingClientRect();
		const cardBox = card.getBoundingClientRect();
		const horizontal = Math.max(0, Math.min(cardBox.right, lanesBox.right) - Math.max(cardBox.left, lanesBox.left));
		const vertical = Math.max(0, Math.min(cardBox.bottom, lanesBox.bottom) - Math.max(cardBox.top, lanesBox.top));
		return {
			horizontalRatio: cardBox.width ? horizontal / cardBox.width : 0,
			verticalRatio: cardBox.height ? vertical / cardBox.height : 0,
		};
	});
	expect(exposure.horizontalRatio).toBeGreaterThan(0.75);
	expect(exposure.verticalRatio).toBeGreaterThan(0.75);
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
	await expectContentCardInSnapshot(page, '.workflow-project-card-modern', 'project');
};

const openFirstProjectDetail = async (page: Page) => {
	const projectHrefs = await page.locator('.workflow-project-card-open').evaluateAll((links) =>
		links.map((link) => (link as HTMLAnchorElement).href).filter(Boolean),
	);
	expect(projectHrefs.length).toBeGreaterThan(0);

	for (const href of projectHrefs) {
		await page.goto(href);
		const opened = await page
			.locator('.workflow-project-detail-page')
			.waitFor({ state: 'visible', timeout: 10_000 })
			.then(() => true)
			.catch(() => false);
		if (opened) break;
	}

	await expect(page.locator('.workflow-project-detail-page')).toBeVisible();
	await expect(page.locator('.workflow-project-detail-grid')).toBeVisible();
	await expect(page.locator('.workflow-project-detail-panel').first()).toBeVisible();
};

const waitForTeamReady = async (page: Page) => {
	await expect(page.locator('.workflow-team-grid')).toBeVisible();
	await expect.poll(async () => page.locator('.workflow-team-card').count()).toBeGreaterThan(0);
	await expectContentCardInSnapshot(page, '.workflow-team-card', 'team');
};

const waitForReportReady = async (page: Page) => {
	await expect(page.locator('.workflow-report-filterbar')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-report-metrics')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-analytics-grid, .workflow-analytics-panel').first()).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-forecast-board')).toBeVisible({ timeout: 30_000 });
	await expect.poll(async () => page.locator('.workflow-report-card').count(), { timeout: 30_000 }).toBeGreaterThan(0);
	await expectContentCardInSnapshot(page, '.workflow-report-card', 'report');
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
	await expectMobileNotificationPreferences(page);
	await expectMobileNotificationActions(page);
	await expectSeededNotificationCards(page);
	await expectContentCardInSnapshot(page, seeded ? '.workflow-notifications-card' : '.workflow-notifications-list > *', 'notification');
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
		await centerBoardOnFirstTask(page);
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
		await centerBoardOnFirstTask(page);
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
