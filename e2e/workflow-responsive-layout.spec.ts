import { expect, type Page, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { seedDesignWorkflowE2E } from './seed-design-workflow';

const screenshotDir = 'test-results/workflow-responsive';
const seeded = process.env.DESIGN_WORKFLOW_E2E_SEEDED === '1';
const email = process.env.DESIGN_WORKFLOW_E2E_EMAIL;
const password = process.env.DESIGN_WORKFLOW_E2E_PASSWORD;

const forceFrench = async (page: Page) => {
	await page.context().addCookies([{ name: 'app-language', value: 'fr', url: 'http://localhost:3004' }]);
	await page.addInitScript(() => {
		window.localStorage.setItem('app-language', 'fr');
	});
};

const loginWithUi = async (page: Page) => {
	for (let attempt = 0; attempt < 4; attempt += 1) {
		await page.goto('/login', { waitUntil: 'domcontentloaded' });
		const emailField = page.locator('input[name="email"]');
		const destination = await Promise.race([
			page.waitForURL(/\/dashboard\/(overview|my-work|board)/, { timeout: 30_000 }).then(() => 'dashboard').catch(() => 'timeout'),
			emailField.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'form').catch(() => 'timeout'),
		]);
		if (destination === 'dashboard') break;
		await expect(emailField).toBeVisible({ timeout: 1_000 });
		await emailField.fill(email ?? '');
		await page.locator('input[name="password"]').fill(password ?? '');
		const submit = page.locator('button[type="submit"]');
		await expect(submit).toBeEnabled({ timeout: 30_000 });
		await submit.click();
		const didLogin = await page.waitForURL(/\/dashboard\/(overview|my-work|board)/, { timeout: 15_000 }).then(() => true).catch(() => false);
		if (didLogin) break;
		const throttleMessage = await page.getByText(/Request throttled\. Retry in \d+ seconds\./i).textContent({ timeout: 1_000 }).catch(() => '');
		const retrySeconds = Number(throttleMessage?.match(/(\d+)\s+seconds/i)?.[1] ?? 0);
		if (retrySeconds > 0) {
			await page.waitForTimeout((retrySeconds + 1) * 1_000);
		}
		if (attempt === 3) await expect(page).toHaveURL(/\/dashboard\/(overview|my-work|board)/, { timeout: 1_000 });
	}
	await expect(page.locator('.workflow-topbar-profile')).toContainText(/E2E Manager/i, { timeout: 30_000 });
};

const hasDevChunkLoadError = async (page: Page) =>
	page.getByText(/This page couldn.t load|Runtime ChunkLoadError|Loading chunk app\/layout failed/i).first().isVisible({ timeout: 1_500 }).catch(() => false);

const gotoDashboardPath = async (page: Page, path: string) => {
	await page.goto(path);
	for (let attempt = 0; attempt < 2 && await hasDevChunkLoadError(page); attempt += 1) {
		await page.reload({ waitUntil: 'domcontentloaded' });
	}
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

const expectMobileNotificationCommentRows = async (page: Page) => {
	const viewport = page.viewportSize();
	if (!viewport || viewport.width > 480) return;

	const forms = page.locator('.workflow-notifications-card .workflow-notifications-comment-action');
	await expect.poll(async () => forms.count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
	const layout = await forms.first().evaluate((form) => {
		const input = form.querySelector('input')?.getBoundingClientRect();
		const button = form.querySelector('button')?.getBoundingClientRect();
		const box = form.getBoundingClientRect();
		return {
			buttonHeight: button?.height ?? 0,
			buttonWidth: button?.width ?? 0,
			formHeight: box.height,
			inputWidth: input?.width ?? 0,
			leftOverflow: input ? input.left < box.left - 1 : true,
			rightOverflow: button ? button.right > box.right + 1 : true,
			sameRow: input && button ? Math.abs(input.top - button.top) < 2 : false,
		};
	});
	expect(layout.formHeight).toBeLessThanOrEqual(48);
	expect(layout.sameRow).toBe(true);
	expect(layout.inputWidth).toBeGreaterThan(180);
	expect(layout.buttonWidth).toBeGreaterThanOrEqual(40);
	expect(layout.buttonWidth).toBeLessThanOrEqual(48);
	expect(layout.buttonHeight).toBeGreaterThanOrEqual(40);
	expect(layout.leftOverflow).toBe(false);
	expect(layout.rightOverflow).toBe(false);
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

const getFirstBoardTaskId = async (page: Page) => {
	const firstCard = page.locator('[data-testid^="board-task-"]').first();
	await expect(firstCard).toBeVisible({ timeout: 30_000 });
	const testId = await firstCard.getAttribute('data-testid');
	const taskId = Number(testId?.replace('board-task-', ''));
	expect(Number.isInteger(taskId)).toBe(true);
	return taskId;
};

const expectMobileTaskDetail = async (page: Page) => {
	const viewport = page.viewportSize();
	if (!viewport || viewport.width > 480) return;

	const tabs = page.locator('.workflow-task-detail-tabs');
	await expect(tabs).toBeVisible({ timeout: 10_000 });
	const tabMetrics = await tabs.evaluate((tabList) => {
		const buttons = Array.from(tabList.querySelectorAll<HTMLElement>('button'));
		const bounds = tabList.getBoundingClientRect();
		return {
			height: bounds.height,
			buttons: buttons.map((button) => {
				const box = button.getBoundingClientRect();
				return {
					height: box.height,
					leftOverflow: box.left < bounds.left - 1,
					rightOverflow: box.right > bounds.right + 1 && tabList.scrollWidth <= tabList.clientWidth,
					width: box.width,
				};
			}),
		};
	});
	expect(tabMetrics.height).toBeLessThanOrEqual(58);
	for (const button of tabMetrics.buttons) {
		expect(button.height).toBeGreaterThanOrEqual(38);
		expect(button.height).toBeLessThanOrEqual(48);
		expect(button.width).toBeGreaterThan(88);
		expect(button.leftOverflow).toBe(false);
		expect(button.rightOverflow).toBe(false);
	}

	const snapshotChildren = page.locator('.workflow-task-detail-snapshot > .grid > *');
	await expect.poll(async () => snapshotChildren.count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
	const snapshotLayout = await page.locator('.workflow-task-detail-snapshot').evaluate((snapshot) => {
		const bounds = snapshot.getBoundingClientRect();
		const children = Array.from(snapshot.querySelectorAll<HTMLElement>(':scope > .grid > *'));
		return children.map((child) => {
			const box = child.getBoundingClientRect();
			return {
				leftOverflow: box.left < bounds.left - 1,
				rightOverflow: box.right > bounds.right + 1,
				widthRatio: bounds.width ? box.width / bounds.width : 1,
			};
		});
	});
	for (const item of snapshotLayout) {
		expect(item.widthRatio).toBeLessThanOrEqual(1.01);
		expect(item.leftOverflow).toBe(false);
		expect(item.rightOverflow).toBe(false);
	}
};

const waitForTaskDetailReady = async (page: Page) => {
	await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 30_000 });
	await expect(page.locator('.workflow-task-detail-page')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-task-detail-snapshot')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-task-detail-tabs')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-task-detail-tabs button')).toHaveCount(5);
	await expect.poll(async () => page.locator('.workflow-task-detail-panel').count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(4);
	await expect(page.locator('.workflow-task-detail-page')).not.toContainText(/Loading task|Chargement t.che/i);
	await expectMobileTaskDetail(page);
};

const openFirstTaskDetailRoute = async (page: Page) => {
	const taskId = await getFirstBoardTaskId(page);
	await page.goto(`/dashboard/tasks/${taskId}`);
	await waitForTaskDetailReady(page);
};

const openFirstBoardTaskModal = async (page: Page) => {
	const firstCard = page.locator('[data-testid^="board-task-"]').first();
	await expect(firstCard).toBeVisible({ timeout: 30_000 });
	await firstCard.click();
	await expect(page.locator('.workflow-task-modal')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-task-modal .workflow-trello-modal-detail')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-task-modal .workflow-trello-modal-actions')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-task-modal .workflow-task-comments-panel, .workflow-task-modal .workflow-trello-modal-activity')).toBeVisible({ timeout: 30_000 });
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
	await expectMobileProjectsSummary(page);
	await expectContentCardInSnapshot(page, '.workflow-project-card-modern', 'project');
};

const expectMobileProjectsSummary = async (page: Page) => {
	const viewport = page.viewportSize();
	if (!viewport || viewport.width > 480) return;

	const metrics = page.locator('.workflow-projects-metrics .workflow-overview-metric');
	await expect.poll(async () => metrics.count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(4);
	const metricLayout = await page.locator('.workflow-projects-metrics').evaluate((grid) => {
		const cards = Array.from(grid.querySelectorAll<HTMLElement>('.workflow-overview-metric')).slice(0, 4);
		const gridBox = grid.getBoundingClientRect();
		const rows = new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top)));
		return {
			cards: cards.map((card) => {
				const box = card.getBoundingClientRect();
				return {
					height: box.height,
					leftOverflow: box.left < gridBox.left - 1,
					rightOverflow: box.right > gridBox.right + 1,
					widthRatio: gridBox.width ? box.width / gridBox.width : 1,
				};
			}),
			rowCount: rows.size,
		};
	});
	expect(metricLayout.rowCount).toBeLessThanOrEqual(2);
	for (const card of metricLayout.cards) {
		expect(card.height).toBeGreaterThanOrEqual(96);
		expect(card.height).toBeLessThanOrEqual(140);
		expect(card.widthRatio).toBeGreaterThan(0.42);
		expect(card.widthRatio).toBeLessThan(0.56);
		expect(card.leftOverflow).toBe(false);
		expect(card.rightOverflow).toBe(false);
	}

	const stats = page.locator('.workflow-project-card-modern .workflow-project-card-stats').first();
	await expect(stats).toBeVisible({ timeout: 10_000 });
	const statLayout = await stats.evaluate((group) => {
		const groupBox = group.getBoundingClientRect();
		const tiles = Array.from(group.querySelectorAll<HTMLElement>('span')).slice(0, 3);
		const rows = new Set(tiles.map((tile) => Math.round(tile.getBoundingClientRect().top)));
		return {
			rowCount: rows.size,
			tiles: tiles.map((tile) => {
				const tileBox = tile.getBoundingClientRect();
				return {
					height: tileBox.height,
					leftOverflow: tileBox.left < groupBox.left - 1,
					rightOverflow: tileBox.right > groupBox.right + 1,
					widthRatio: groupBox.width ? tileBox.width / groupBox.width : 1,
				};
			}),
		};
	});
	expect(statLayout.rowCount).toBe(1);
	for (const tile of statLayout.tiles) {
		expect(tile.height).toBeLessThanOrEqual(82);
		expect(tile.widthRatio).toBeGreaterThan(0.25);
		expect(tile.widthRatio).toBeLessThan(0.36);
		expect(tile.leftOverflow).toBe(false);
		expect(tile.rightOverflow).toBe(false);
	}
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
	await expectMobileProjectDetail(page);
};

const expectMobileProjectDetail = async (page: Page) => {
	const viewport = page.viewportSize();
	if (!viewport || viewport.width > 480) return;

	const covers = page.locator('.workflow-project-detail-page .workflow-task-cover');
	await expect.poll(async () => covers.count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
	const coverLayout = await covers.first().evaluate((cover) => {
		const box = cover.getBoundingClientRect();
		const card = cover.closest('.workflow-task-card')?.getBoundingClientRect();
		return {
			cardWidth: card?.width ?? 0,
			height: box.height,
			leftOverflow: card ? box.left < card.left - 1 : true,
			rightOverflow: card ? box.right > card.right + 1 : true,
		};
	});
	expect(coverLayout.cardWidth).toBeGreaterThan(240);
	expect(coverLayout.height).toBeGreaterThanOrEqual(56);
	expect(coverLayout.height).toBeLessThanOrEqual(78);
	expect(coverLayout.leftOverflow).toBe(false);
	expect(coverLayout.rightOverflow).toBe(false);
};

const waitForTeamReady = async (page: Page) => {
	await expect(page.locator('.workflow-team-grid')).toBeVisible();
	await expect.poll(async () => page.locator('.workflow-team-card').count()).toBeGreaterThan(0);
	await expectMobileTeamSummary(page);
	await expectContentCardInSnapshot(page, '.workflow-team-card', 'team');
};

const expectMobileTeamSummary = async (page: Page) => {
	const viewport = page.viewportSize();
	if (!viewport || viewport.width > 480) return;

	const metrics = page.locator('.workflow-team-metrics .workflow-overview-metric');
	await expect.poll(async () => metrics.count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(4);
	const metricLayout = await page.locator('.workflow-team-metrics').evaluate((grid) => {
		const cards = Array.from(grid.querySelectorAll<HTMLElement>('.workflow-overview-metric')).slice(0, 4);
		const gridBox = grid.getBoundingClientRect();
		const rows = new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top)));
		return {
			cards: cards.map((card) => {
				const box = card.getBoundingClientRect();
				return {
					height: box.height,
					leftOverflow: box.left < gridBox.left - 1,
					rightOverflow: box.right > gridBox.right + 1,
					widthRatio: gridBox.width ? box.width / gridBox.width : 1,
				};
			}),
			rowCount: rows.size,
		};
	});
	expect(metricLayout.rowCount).toBeLessThanOrEqual(2);
	for (const card of metricLayout.cards) {
		expect(card.height).toBeGreaterThanOrEqual(96);
		expect(card.height).toBeLessThanOrEqual(140);
		expect(card.widthRatio).toBeGreaterThan(0.42);
		expect(card.widthRatio).toBeLessThan(0.56);
		expect(card.leftOverflow).toBe(false);
		expect(card.rightOverflow).toBe(false);
	}

	const clippedPillCount = await page.locator('.workflow-team-panel-pill em').evaluateAll((values) =>
		values.filter((value) => value.scrollWidth > value.clientWidth + 1).length,
	);
	expect(clippedPillCount).toBe(0);
};

const waitForReportReady = async (page: Page) => {
	await expect(page.locator('.workflow-report-filterbar')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-report-metrics')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-analytics-grid, .workflow-analytics-panel').first()).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-forecast-board')).toBeVisible({ timeout: 30_000 });
	await expect.poll(async () => page.locator('.workflow-report-card').count(), { timeout: 30_000 }).toBeGreaterThan(0);
	await expectMobileReportAnalytics(page);
	await expectContentCardInSnapshot(page, '.workflow-report-card', 'report');
};

const expectMobileReportAnalytics = async (page: Page) => {
	const viewport = page.viewportSize();
	if (!viewport || viewport.width > 480) return;

	const metricValues = page.locator('.workflow-report-metrics .workflow-report-metric strong');
	await expect.poll(async () => metricValues.count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(4);
	const clippedMetricCount = await metricValues.evaluateAll((values) =>
		values.filter((value) => {
			const style = getComputedStyle(value);
			const box = value.getBoundingClientRect();
			const card = value.closest('.workflow-report-metric')?.getBoundingClientRect();
			return (
				style.textOverflow === 'ellipsis' ||
				style.whiteSpace === 'nowrap' ||
				(card ? box.left < card.left - 1 || box.right > card.right + 1 || box.bottom > card.bottom + 1 : true)
			);
		}).length,
	);
	expect(clippedMetricCount).toBe(0);

	const barBody = page.locator('.workflow-report-chart-body-bar').first();
	await expect(barBody).toBeVisible({ timeout: 10_000 });
	const barHeight = await barBody.evaluate((body) => body.getBoundingClientRect().height);
	expect(barHeight).toBeLessThanOrEqual(260);

	const doughnutCenter = await page.locator('.workflow-report-chart-body-doughnut').evaluate((body) => {
		const center = body.querySelector<HTMLElement>('.workflow-report-doughnut-center');
		const bodyBox = body.getBoundingClientRect();
		const centerBox = center?.getBoundingClientRect();
		return {
			centerBottomRatio: centerBox ? (centerBox.bottom - bodyBox.top) / bodyBox.height : 1,
			centerHeight: centerBox?.height ?? 0,
			centerTopRatio: centerBox ? (centerBox.top - bodyBox.top) / bodyBox.height : 1,
		};
	});
	expect(doughnutCenter.centerHeight).toBeGreaterThan(16);
	expect(doughnutCenter.centerHeight).toBeLessThanOrEqual(38);
	expect(doughnutCenter.centerTopRatio).toBeGreaterThan(0.22);
	expect(doughnutCenter.centerBottomRatio).toBeLessThan(0.52);

	const keyLayout = await page.locator('.workflow-report-chart-keys').first().evaluate((keys) => {
		const box = keys.getBoundingClientRect();
		const chips = Array.from(keys.querySelectorAll<HTMLElement>('span'));
		return chips.map((chip) => {
			const chipBox = chip.getBoundingClientRect();
			return {
				height: chipBox.height,
				leftOverflow: chipBox.left < box.left - 1,
				rightOverflow: chipBox.right > box.right + 1,
			};
		});
	});
	expect(keyLayout.length).toBeGreaterThanOrEqual(1);
	for (const chip of keyLayout) {
		expect(chip.height).toBeLessThanOrEqual(46);
		expect(chip.leftOverflow).toBe(false);
		expect(chip.rightOverflow).toBe(false);
	}

	const insightLayout = await page.locator('.workflow-report-insights').evaluate((insights) => {
		const cards = Array.from(insights.querySelectorAll<HTMLElement>('.workflow-report-insight'));
		const box = insights.getBoundingClientRect();
		const rows = new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top)));
		return {
			cards: cards.map((card) => {
				const cardBox = card.getBoundingClientRect();
				return {
					height: cardBox.height,
					leftOverflow: cardBox.left < box.left - 1,
					rightOverflow: cardBox.right > box.right + 1,
					widthRatio: box.width ? cardBox.width / box.width : 1,
				};
			}),
			rowCount: rows.size,
		};
	});
	expect(insightLayout.rowCount).toBe(1);
	for (const card of insightLayout.cards) {
		expect(card.height).toBeLessThanOrEqual(96);
		expect(card.widthRatio).toBeGreaterThan(0.25);
		expect(card.widthRatio).toBeLessThan(0.36);
		expect(card.leftOverflow).toBe(false);
		expect(card.rightOverflow).toBe(false);
	}
};

const waitForChatReady = async (page: Page) => {
	await expect(page.locator('.workflow-chat-sidebar')).toBeVisible();
	await expect(page.locator('.workflow-chat-thread-button, .workflow-chat-context-button, .workflow-chat-direct-button').first()).toBeVisible();
	await expect(page.locator('body')).not.toContainText(/Sélectionnez une conversation|Select a conversation/i);
	await expect(page.locator('.workflow-chat-room')).not.toContainText(/Chargement des conversations|Loading conversations/i, { timeout: 30_000 });
	await expect(page.locator('.workflow-chat-room-header')).toContainText(/messages/i);
	await expect(page.locator('.workflow-chat-room textarea').first()).toBeEnabled({ timeout: 30_000 });
};

const expectMobileChatSwitcher = async (page: Page) => {
	const viewport = page.viewportSize();
	if (!viewport || viewport.width > 480) return;

	await expect(page.locator('.workflow-chat-thread-section')).toBeVisible({ timeout: 10_000 });
	await expect(page.locator('.workflow-chat-context-button').first()).toBeVisible({ timeout: 10_000 });
	await expect(page.locator('.workflow-chat-direct-button').first()).toBeVisible({ timeout: 10_000 });

	const layout = await page.locator('.workflow-chat-sidebar').evaluate((sidebar) => {
		const box = sidebar.getBoundingClientRect();
		const style = getComputedStyle(sidebar);
		const sections = Array.from(
			sidebar.querySelectorAll<HTMLElement>('.workflow-chat-thread-section, .workflow-chat-context-section, .workflow-chat-direct-section'),
		).map((section) => {
			const sectionBox = section.getBoundingClientRect();
			return {
				bottomOverflow: sectionBox.bottom > box.bottom + 1,
				height: sectionBox.height,
				leftOverflow: sectionBox.left < box.left - 1,
				rightOverflow: sectionBox.right > box.right + 1,
			};
		});
		return {
			height: box.height,
			maxHeight: style.maxHeight,
			overflowY: style.overflowY,
			sections,
		};
	});

	expect(layout.height).toBeGreaterThan(300);
	expect(layout.height).toBeLessThan(620);
	expect(layout.maxHeight).toBe('none');
	expect(layout.overflowY).toBe('visible');
	expect(layout.sections.length).toBe(3);
	for (const section of layout.sections) {
		expect(section.height).toBeGreaterThan(42);
		expect(section.bottomOverflow).toBe(false);
		expect(section.leftOverflow).toBe(false);
		expect(section.rightOverflow).toBe(false);
	}
};

const waitForNotificationsReady = async (page: Page) => {
	await expect(page.locator('.workflow-notifications-shell')).toBeVisible();
	await expect(page.locator('.workflow-notifications-metrics')).toBeVisible();
	await expect(page.locator('.workflow-notification-preferences')).toBeVisible();
	await expect(page.locator('.workflow-notifications-board')).toBeVisible();
	await expect(page.locator('.workflow-notifications-list > *').first()).toBeVisible();
	await expectMobileNotificationPreferences(page);
	await expectMobileNotificationActions(page);
	await expectMobileNotificationCommentRows(page);
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
			await expectMobileUsersControls(page);
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
	await expectMobileUserFormShell(page);
};

const waitForUserDetailReady = async (page: Page) => {
	await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 30_000 });
	await expect(page.locator('.workflow-user-detail-shell')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-user-detail-hero')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-user-detail-profile-card')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-user-detail-panel').first()).toBeVisible({ timeout: 30_000 });
	await expectMobileUserDetail(page);
};

const openFirstUserDetail = async (page: Page) => {
	const firstVisibleAction = page
		.locator('.workflow-users-mobile-card:visible .workflow-users-mobile-actions button, .workflow-users-table tbody tr:visible .workflow-users-row-actions button')
		.first();
	await expect(firstVisibleAction).toBeVisible({ timeout: 10_000 });
	await firstVisibleAction.click();
	await waitForUserDetailReady(page);
};

const openCurrentUserEdit = async (page: Page) => {
	await expect(page.locator('.workflow-user-detail-edit')).toBeVisible({ timeout: 10_000 });
	await page.locator('.workflow-user-detail-edit').click();
	await waitForUserFormReady(page);
};

const waitForProfileReady = async (page: Page) => {
	await expect(page.locator('.workflow-profile-shell')).toBeVisible();
	await expect(page.locator('.workflow-profile-fields')).toBeVisible();
	await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 20_000 });
	await expectMobileUserFormShell(page);
};

const waitForPasswordReady = async (page: Page) => {
	await expect(page.locator('.workflow-password-shell')).toBeVisible();
	await expect(page.locator('.workflow-password-fields')).toBeVisible();
	await expectMobileUserFormShell(page);
};

const expectMobileUsersControls = async (page: Page) => {
	const viewport = page.viewportSize();
	if (!viewport || viewport.width > 480) return;

	const controls = page.locator('.workflow-users-toolbar > div:last-child').first();
	await expect(controls).toBeVisible({ timeout: 10_000 });
	const controlLayout = await controls.evaluate((group) => {
		const groupBox = group.getBoundingClientRect();
		const items = Array.from(group.children)
			.filter((child): child is HTMLElement => child instanceof HTMLElement && child.offsetParent !== null)
			.map((child) => {
				const box = child.getBoundingClientRect();
				return {
					height: box.height,
					leftOverflow: box.left < groupBox.left - 1,
					rightOverflow: box.right > groupBox.right + 1,
					widthRatio: groupBox.width ? box.width / groupBox.width : 1,
					top: Math.round(box.top),
				};
			});
		return {
			items,
			rowCount: new Set(items.map((item) => item.top)).size,
		};
	});
	expect(controlLayout.rowCount).toBeLessThanOrEqual(2);
	for (const item of controlLayout.items) {
		expect(item.height).toBeGreaterThanOrEqual(32);
		expect(item.height).toBeLessThanOrEqual(58);
		expect(item.widthRatio).toBeGreaterThan(0.42);
		expect(item.widthRatio).toBeLessThan(0.56);
		expect(item.leftOverflow).toBe(false);
		expect(item.rightOverflow).toBe(false);
	}

	const meta = page.locator('.workflow-users-mobile-card .workflow-users-mobile-meta').first();
	await expect(meta).toBeVisible({ timeout: 10_000 });
	const metaLayout = await meta.evaluate((group) => {
		const groupBox = group.getBoundingClientRect();
		const items = Array.from(group.children)
			.filter((child): child is HTMLElement => child instanceof HTMLElement && child.offsetParent !== null)
			.map((child) => {
				const box = child.getBoundingClientRect();
				return {
					height: box.height,
					leftOverflow: box.left < groupBox.left - 1,
					rightOverflow: box.right > groupBox.right + 1,
					top: Math.round(box.top),
				};
			});
		return {
			items,
			rowCount: new Set(items.map((item) => item.top)).size,
		};
	});
	expect(metaLayout.rowCount).toBeLessThanOrEqual(2);
	for (const item of metaLayout.items) {
		expect(item.height).toBeLessThanOrEqual(86);
		expect(item.leftOverflow).toBe(false);
		expect(item.rightOverflow).toBe(false);
	}
};

const expectMobileUserFormShell = async (page: Page) => {
	const viewport = page.viewportSize();
	if (!viewport || viewport.width > 480) return;

	const checkbox = page.locator('.workflow-user-form-shell input[type="checkbox"]').first();
	if (await checkbox.count()) {
		const checkboxBox = await checkbox.boundingBox();
		expect(checkboxBox?.width ?? 0).toBeLessThanOrEqual(24);
		expect(checkboxBox?.height ?? 0).toBeLessThanOrEqual(24);
	}

	const upload = page.locator('.workflow-user-form-avatar .workflow-square-image-upload, .workflow-user-form-avatar .workflow-square-image-preview').first();
	if (await upload.count()) {
		const uploadBox = await upload.boundingBox();
		expect(uploadBox?.height ?? 0).toBeGreaterThanOrEqual(168);
		expect(uploadBox?.height ?? 0).toBeLessThanOrEqual(218);
	}

	const toggleGroups = page.locator('.workflow-user-form-toggle-stack, .workflow-user-form-permissions');
	const toggleGroupCount = await toggleGroups.count();
	for (let index = 0; index < toggleGroupCount; index += 1) {
		const layout = await toggleGroups.nth(index).evaluate((group) => {
			const groupBox = group.getBoundingClientRect();
			const items = Array.from(group.querySelectorAll<HTMLElement>('.workflow-user-form-toggle')).map((item) => {
				const box = item.getBoundingClientRect();
				return {
					height: box.height,
					leftOverflow: box.left < groupBox.left - 1,
					rightOverflow: box.right > groupBox.right + 1,
					top: Math.round(box.top),
				};
			});
			return {
				itemCount: items.length,
				items,
				rowCount: new Set(items.map((item) => item.top)).size,
			};
		});
		if (!layout.itemCount) continue;
		expect(layout.rowCount).toBeLessThanOrEqual(Math.ceil(layout.itemCount / 2));
		for (const item of layout.items) {
			expect(item.height).toBeLessThanOrEqual(72);
			expect(item.leftOverflow).toBe(false);
			expect(item.rightOverflow).toBe(false);
		}
	}

	const passwordVisual = page.locator('.workflow-password-visual').first();
	if (await passwordVisual.count()) {
		const visualBox = await passwordVisual.boundingBox();
		expect(visualBox?.height ?? 0).toBeLessThanOrEqual(150);
	}
};

const expectMobileUserDetail = async (page: Page) => {
	const viewport = page.viewportSize();
	if (!viewport || viewport.width > 480) return;

	const actions = page.locator('.workflow-user-detail-actions');
	await expect(actions).toBeVisible({ timeout: 10_000 });
	const actionLayout = await actions.evaluate((group) => {
		const groupBox = group.getBoundingClientRect();
		const items = Array.from(group.children)
			.filter((child): child is HTMLElement => child instanceof HTMLElement && child.offsetParent !== null)
			.map((child) => {
				const box = child.getBoundingClientRect();
				return {
					height: box.height,
					leftOverflow: box.left < groupBox.left - 1,
					rightOverflow: box.right > groupBox.right + 1,
					widthRatio: groupBox.width ? box.width / groupBox.width : 1,
					top: Math.round(box.top),
				};
			});
		return {
			items,
			rowCount: new Set(items.map((item) => item.top)).size,
		};
	});
	expect(actionLayout.rowCount).toBeLessThanOrEqual(1);
	for (const item of actionLayout.items) {
		expect(item.height).toBeLessThanOrEqual(56);
		expect(item.widthRatio).toBeGreaterThan(0.25);
		expect(item.widthRatio).toBeLessThan(0.4);
		expect(item.leftOverflow).toBe(false);
		expect(item.rightOverflow).toBe(false);
	}

	const detailRows = page.locator('.workflow-user-detail-info-row');
	await expect.poll(async () => detailRows.count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(6);
	const rowLayout = await detailRows.first().evaluate((row) => {
		const box = row.getBoundingClientRect();
		return { height: box.height, width: box.width };
	});
	expect(rowLayout.width).toBeGreaterThan(240);
	expect(rowLayout.height).toBeLessThanOrEqual(82);
};

test.describe('workflow responsive visual pass', () => {
	test.skip(!email || !password, 'Set DESIGN_WORKFLOW_E2E_EMAIL and DESIGN_WORKFLOW_E2E_PASSWORD before responsive checks.');
	test.setTimeout(120_000);
	test.use({ storageState: { cookies: [], origins: [] } });

	test.beforeAll(() => {
		seedDesignWorkflowE2E();
		mkdirSync(screenshotDir, { recursive: true });
	});

	test.beforeEach(async ({ page }) => {
		await loginWithUi(page);
		await forceFrench(page);
	});

	test('keeps tablet workflow pages readable without body overflow', async ({ page }) => {
		test.setTimeout(120_000);
		await page.setViewportSize({ width: 820, height: 1180 });

		await gotoDashboardPath(page, '/dashboard/board');
		await openBoardFilters(page);
		await expect(page.locator('.workflow-topbar-controls')).toContainText('FR');
		await expect(page.locator('.workflow-saved-view-bar')).toContainText(/Vues enregistr.es|Nom de la vue|Priv.e/i);
		await expect(page.locator('.workflow-kanban-filter-grid')).not.toContainText(/Needs Review|Backlog/i);
		await waitForBoardReady(page);
		await centerBoardOnFirstTask(page);
		await capturePage(page, 'tablet-board');

		await gotoDashboardPath(page, '/dashboard/my-work');
		await openBoardFilters(page);
		await waitForBoardReady(page);
		await centerBoardOnFirstTask(page);
		await capturePage(page, 'tablet-my-work');
		await openFirstBoardTaskModal(page);
		await capturePage(page, 'tablet-my-work-task-modal');
		await page.keyboard.press('Escape');
		await expect(page.locator('.workflow-task-modal')).toHaveCount(0);
		await openFirstTaskDetailRoute(page);
		await capturePage(page, 'tablet-task-detail');

		await gotoDashboardPath(page, '/dashboard/overview');
		await waitForOverviewReady(page);
		await capturePage(page, 'tablet-overview');

		await gotoDashboardPath(page, '/dashboard/projects');
		await waitForProjectsReady(page);
		await capturePage(page, 'tablet-projects');
		await openFirstProjectDetail(page);
		await capturePage(page, 'tablet-project-detail');

		await gotoDashboardPath(page, '/dashboard/team');
		await waitForTeamReady(page);
		await capturePage(page, 'tablet-team');

		await gotoDashboardPath(page, '/dashboard/reports/time');
		await expect(page.locator('.workflow-report-actions')).toBeVisible();
		await waitForReportReady(page);
		await capturePage(page, 'tablet-reports');

		await gotoDashboardPath(page, '/dashboard/chat');
		await expect(page.locator('.workflow-chat-task-room-section')).toHaveCount(0);
		await waitForChatReady(page);
		await expect(page.locator('.workflow-chat-thread-button, .workflow-chat-context-button, .workflow-chat-direct-button').first()).toBeVisible();
		await capturePage(page, 'tablet-chat');

		await gotoDashboardPath(page, '/dashboard/notifications');
		await waitForNotificationsReady(page);
		await capturePage(page, 'tablet-notifications');

		await gotoDashboardPath(page, '/dashboard/users');
		await waitForUsersReady(page);
		await capturePage(page, 'tablet-users');
		await openFirstUserDetail(page);
		await capturePage(page, 'tablet-user-detail');
		await openCurrentUserEdit(page);
		await capturePage(page, 'tablet-user-edit');

		await gotoDashboardPath(page, '/dashboard/users/new');
		await waitForUserFormReady(page);
		await capturePage(page, 'tablet-user-new');

		await gotoDashboardPath(page, '/dashboard/settings/edit-profile');
		await waitForProfileReady(page);
		await capturePage(page, 'tablet-profile');

		await gotoDashboardPath(page, '/dashboard/settings/password');
		await waitForPasswordReady(page);
		await capturePage(page, 'tablet-password');
	});

	test('keeps mobile workflow pages compact and keeps language switching available', async ({ page }) => {
		test.setTimeout(120_000);
		await page.setViewportSize({ width: 390, height: 844 });

		await gotoDashboardPath(page, '/dashboard/board');
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

		await gotoDashboardPath(page, '/dashboard/my-work');
		await openBoardFilters(page);
		await waitForBoardReady(page);
		await centerBoardOnFirstTask(page);
		await capturePage(page, 'mobile-my-work');
		await openFirstBoardTaskModal(page);
		await capturePage(page, 'mobile-my-work-task-modal');
		await page.keyboard.press('Escape');
		await expect(page.locator('.workflow-task-modal')).toHaveCount(0);
		await openFirstTaskDetailRoute(page);
		await capturePage(page, 'mobile-task-detail');

		await gotoDashboardPath(page, '/dashboard/overview');
		await waitForOverviewReady(page);
		await capturePage(page, 'mobile-overview');

		await gotoDashboardPath(page, '/dashboard/projects');
		await waitForProjectsReady(page);
		await capturePage(page, 'mobile-projects');
		await openFirstProjectDetail(page);
		await capturePage(page, 'mobile-project-detail');

		await gotoDashboardPath(page, '/dashboard/team');
		await waitForTeamReady(page);
		await capturePage(page, 'mobile-team');

		await gotoDashboardPath(page, '/dashboard/reports/time');
		await waitForReportReady(page);
		await capturePage(page, 'mobile-reports');

		await gotoDashboardPath(page, '/dashboard/chat');
		await expect(page.locator('.workflow-chat-task-room-section')).toHaveCount(0);
		await waitForChatReady(page);
		await expect(page.locator('.workflow-chat-thread-button, .workflow-chat-context-button, .workflow-chat-direct-button').first()).toBeVisible();
		await expect(page.getByRole('button', { name: /Filtrer par/i })).toBeVisible();
		await expectMobileChatSwitcher(page);
		await capturePage(page, 'mobile-chat');

		await gotoDashboardPath(page, '/dashboard/notifications');
		await waitForNotificationsReady(page);
		await capturePage(page, 'mobile-notifications');

		await gotoDashboardPath(page, '/dashboard/users');
		await waitForUsersReady(page);
		await capturePage(page, 'mobile-users');
		await openFirstUserDetail(page);
		await capturePage(page, 'mobile-user-detail');
		await openCurrentUserEdit(page);
		await capturePage(page, 'mobile-user-edit');

		await gotoDashboardPath(page, '/dashboard/users/new');
		await waitForUserFormReady(page);
		await capturePage(page, 'mobile-user-new');

		await gotoDashboardPath(page, '/dashboard/settings/edit-profile');
		await waitForProfileReady(page);
		await capturePage(page, 'mobile-profile');

		await gotoDashboardPath(page, '/dashboard/settings/password');
		await waitForPasswordReady(page);
		await capturePage(page, 'mobile-password');
	});
});
