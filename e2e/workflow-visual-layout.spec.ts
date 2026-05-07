import { expect, type Locator, type Page, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { seedDesignWorkflowE2E } from './seed-design-workflow';

const screenshotDir = 'test-results/workflow-visual';
const seeded = process.env.DESIGN_WORKFLOW_E2E_SEEDED === '1';
const email = process.env.DESIGN_WORKFLOW_E2E_EMAIL;
const password = process.env.DESIGN_WORKFLOW_E2E_PASSWORD;

const readCssVariable = async (locator: Locator, name: string) =>
	locator.evaluate((element, variableName) => getComputedStyle(element).getPropertyValue(variableName).trim(), name);

const readCssProperty = async (locator: Locator, name: string) =>
	locator.evaluate((element, propertyName) => getComputedStyle(element).getPropertyValue(propertyName), name);

const readLocatorPaint = async (page: Page, locator: Locator) => {
	const buffer = await locator.screenshot();
	return page.evaluate(async (source) => {
		const image = await new Promise<HTMLImageElement>((resolve, reject) => {
			const nextImage = new Image();
			nextImage.onload = () => resolve(nextImage);
			nextImage.onerror = () => reject(new Error('Unable to decode locator screenshot.'));
			nextImage.src = source;
		});
		const canvas = document.createElement('canvas');
		canvas.width = image.naturalWidth;
		canvas.height = image.naturalHeight;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Unable to read locator screenshot pixels.');
		context.drawImage(image, 0, 0);
		const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
		let opaque = 0;
		let nonWhite = 0;
		let colored = 0;
		const colorBuckets = new Set<string>();

		for (let index = 0; index < pixels.length; index += 4) {
			const red = pixels[index] ?? 0;
			const green = pixels[index + 1] ?? 0;
			const blue = pixels[index + 2] ?? 0;
			const alpha = pixels[index + 3] ?? 0;
			if (alpha < 8) continue;
			opaque += 1;
			if (red < 245 || green < 245 || blue < 245) nonWhite += 1;
			if (Math.max(red, green, blue) - Math.min(red, green, blue) > 12) colored += 1;
			colorBuckets.add(`${Math.round(red / 16)}-${Math.round(green / 16)}-${Math.round(blue / 16)}`);
		}

		return {
			colorBucketCount: colorBuckets.size,
			coloredRatio: opaque ? colored / opaque : 0,
			height: canvas.height,
			nonWhiteRatio: opaque ? nonWhite / opaque : 0,
			width: canvas.width,
		};
	}, `data:image/png;base64,${buffer.toString('base64')}`);
};

const expectSharedCardShell = async (locator: Locator) => {
	await expect(locator).toBeVisible({ timeout: 30_000 });
	await expect(await readCssProperty(locator, 'border-top-style')).toBe('solid');
	await expect(await readCssProperty(locator, 'border-top-width')).toBe('1px');
	await expect(await readCssProperty(locator, 'background-color')).toBe('rgb(255, 255, 255)');
	expect(await readCssProperty(locator, 'box-shadow')).not.toBe('none');
};

const expectSharedPageHeader = async (locator: Locator) => {
	await expect(locator).toBeVisible({ timeout: 30_000 });
	await expect(await readCssProperty(locator, 'border-top-style')).toBe('solid');
	await expect(await readCssProperty(locator, 'border-top-width')).toBe('1px');
	await expect(await readCssProperty(locator, 'background-color')).toBe('rgb(255, 255, 255)');
	expect(parseFloat(await readCssProperty(locator, 'border-top-left-radius'))).toBeGreaterThanOrEqual(16);
	expect(await readCssProperty(locator, 'box-shadow')).not.toBe('none');
};

const expectUnifiedWorkflowTitleCard = async (locator: Locator) => {
	await expectSharedPageHeader(locator);
	const metrics = await locator.evaluate((element) => {
		const style = getComputedStyle(element);
		const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
		return {
			minHeight: parseFloat(style.minHeight),
			paddingTop: parseFloat(style.paddingTop),
			radius: parseFloat(style.borderTopLeftRadius),
			rootFontSize,
		};
	});
	expect(metrics.radius).toBeCloseTo(metrics.rootFontSize * 1.25, 0);
	expect(metrics.paddingTop).toBeCloseTo(metrics.rootFontSize * 2, 0);
	expect(metrics.minHeight).toBeGreaterThanOrEqual(metrics.rootFontSize * 7.5);
	expect(await readCssProperty(locator, 'background-image')).toContain('linear-gradient');
};

const expectUnifiedInnerHeader = async (locator: Locator) => {
	await expect(locator).toBeVisible({ timeout: 30_000 });
	const metrics = await locator.evaluate((element) => {
		const style = getComputedStyle(element);
		const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
		return {
			backgroundColor: style.backgroundColor,
			borderStyle: style.borderTopStyle,
			borderWidth: parseFloat(style.borderTopWidth),
			minHeight: parseFloat(style.minHeight),
			radius: parseFloat(style.borderTopLeftRadius),
			rootFontSize,
		};
	});
	expect(metrics.borderStyle).toBe('solid');
	expect(metrics.borderWidth).toBe(1);
	expect(metrics.backgroundColor).toBe('rgb(248, 250, 252)');
	expect(metrics.radius).toBeCloseTo(metrics.rootFontSize * 0.875, 0);
	expect(metrics.minHeight).toBeGreaterThanOrEqual(metrics.rootFontSize * 2.65);
};

const primaryControlBackgrounds = ['rgb(2, 6, 23)', 'rgb(3, 7, 18)', 'rgb(17, 24, 39)'];

const expectUnifiedWorkflowControl = async (locator: Locator, expectedBackgrounds = ['rgb(255, 255, 255)']) => {
	await expect(locator).toBeVisible({ timeout: 30_000 });
	const metrics = await locator.evaluate((element) => {
		const style = getComputedStyle(element);
		const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
		return {
			backgroundColor: style.backgroundColor,
			borderStyle: style.borderTopStyle,
			borderWidth: parseFloat(style.borderTopWidth),
			height: element.getBoundingClientRect().height,
			radius: parseFloat(style.borderTopLeftRadius),
			rootFontSize,
		};
	});
	expect(metrics.borderStyle).toBe('solid');
	expect(metrics.borderWidth).toBe(1);
	expect(expectedBackgrounds).toContain(metrics.backgroundColor);
	expect(metrics.radius).toBeCloseTo(metrics.rootFontSize * 0.875, 0);
	expect(metrics.height).toBeGreaterThanOrEqual(metrics.rootFontSize * 3.1);
};

const expectCompactWorkflowControl = async (locator: Locator, expectedBackgrounds = ['rgb(255, 255, 255)']) => {
	await expect(locator).toBeVisible({ timeout: 30_000 });
	const metrics = await locator.evaluate((element) => {
		const style = getComputedStyle(element);
		const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
		return {
			backgroundColor: style.backgroundColor,
			borderStyle: style.borderTopStyle,
			borderWidth: parseFloat(style.borderTopWidth),
			height: element.getBoundingClientRect().height,
			radius: parseFloat(style.borderTopLeftRadius),
			rootFontSize,
		};
	});
	expect(metrics.borderStyle).toBe('solid');
	expect(metrics.borderWidth).toBe(1);
	expect(expectedBackgrounds).toContain(metrics.backgroundColor);
	expect(metrics.radius).toBeCloseTo(metrics.rootFontSize * 0.75, 0);
	expect(metrics.height).toBeGreaterThanOrEqual(metrics.rootFontSize * 2.6);
};

const expectSemanticBoardColors = async (page: Page) => {
	const expectedStatusAccents: Record<string, string> = {
		backlog: '#64748b',
		todo: '#4f46e5',
		in_progress: '#f59e0b',
		in_review: '#06b6d4',
		blocked: '#e11d48',
		done: '#22c55e',
	};

	for (const [status, accent] of Object.entries(expectedStatusAccents)) {
		const column = page.locator(`.workflow-column[data-status="${status}"]`).first();
		await expect(column, `missing ${status} board column`).toBeAttached();
		await expect(await readCssVariable(column, '--status-accent')).toBe(accent);
	}

	const reviewCard = page.locator('.workflow-trello-board-card[data-status="in_review"]').first();
	await expect(reviewCard).toBeVisible({ timeout: 30_000 });
	await expect(await readCssVariable(reviewCard, '--card-status-accent')).toBe(expectedStatusAccents.in_review);
};

const expectBoardCoverPaint = async (page: Page) => {
	const cover = page.locator('.workflow-trello-board-card .workflow-trello-card-cover').first();
	await expect(cover, 'board cards should render a painted cover area').toBeVisible({ timeout: 30_000 });
	await expect(cover.locator('.workflow-trello-card-cover-art span')).toHaveCount(3);
	await expect(cover.locator('.workflow-trello-card-cover-status')).toBeVisible();
	const box = await cover.boundingBox();
	expect(box?.width ?? 0).toBeGreaterThan(180);
	expect(box?.height ?? 0).toBeGreaterThan(80);
	const paint = await readLocatorPaint(page, cover);
	expect(paint.width).toBeGreaterThan(180);
	expect(paint.height).toBeGreaterThan(80);
	expect(paint.nonWhiteRatio).toBeGreaterThan(0.12);
	expect(paint.coloredRatio).toBeGreaterThan(0.03);
	expect(paint.colorBucketCount).toBeGreaterThan(8);
};

const expectNeutralWorkspaceChrome = async (page: Page) => {
	await expect(await readCssVariable(page.locator('html'), '--accent')).toBe('#111827');

	const activeNav = page.locator('.workflow-nav-link[aria-current="page"], .workflow-nav-link[class*="bg-(--accent-soft)"]').first();
	await expect(activeNav).toBeVisible({ timeout: 30_000 });
	expect(await readCssProperty(activeNav, 'background-color')).toBe('rgb(241, 245, 249)');
	expect(await readCssProperty(activeNav, 'color')).not.toBe('rgb(0, 161, 93)');

	const languageToggle = page.locator('.workflow-language-toggle').first();
	await expect(languageToggle).toBeVisible({ timeout: 30_000 });
	expect(await readCssProperty(languageToggle, 'border-top-color')).not.toBe('rgb(16, 185, 129)');
	expect(await readCssProperty(languageToggle, 'border-top-color')).not.toBe('rgb(34, 197, 94)');

	const primaryButton = page.locator('.app-button:not(.app-button-secondary):not(.app-button-ghost)').first();
	if ((await primaryButton.count()) > 0) {
		expect(await readCssProperty(primaryButton, 'background-color')).not.toBe('rgb(0, 161, 93)');
	}
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

const expectSlateChatAccent = async (page: Page) => {
	const chatShell = page.locator('.workflow-chat-shell');
	await expect(await readCssVariable(chatShell, '--chat-accent')).toBe('#475569');
	await expect(await readCssVariable(chatShell, '--chat-accent-soft')).toBe('#f1f5f9');

	const activeThread = page
		.locator('.workflow-chat-thread-button.is-active, .workflow-chat-context-button.is-active, .workflow-chat-direct-button.is-active')
		.first();
	await expect(activeThread).toBeVisible({ timeout: 30_000 });
	await expect(await readCssProperty(activeThread, 'background-color')).toBe('rgb(241, 245, 249)');

	const sendButton = page.locator('.workflow-chat-composer .app-button:not(.app-button-ghost)').first();
	await expect(sendButton).toBeVisible({ timeout: 30_000 });
	expect(await readCssProperty(sendButton, 'background-color')).toBe('rgb(71, 85, 105)');

	const ownBubble = page.locator('.workflow-chat-bubble-mine').first();
	if ((await ownBubble.count()) > 0) {
		expect(await readCssProperty(ownBubble, 'background-color')).toBe('rgb(238, 243, 248)');
		expect(await readCssProperty(ownBubble, 'color')).toBe('rgb(15, 23, 42)');
	}
	const ownRichCard = page.locator('.workflow-chat-bubble-mine .workflow-chat-rich-card, .workflow-chat-bubble-mine .workflow-chat-voice-player').last();
	if ((await ownRichCard.count()) > 0) {
		expect(await readCssProperty(ownRichCard, 'background-color')).toBe('rgb(248, 250, 252)');
		expect(await readCssProperty(ownRichCard, 'color')).not.toBe('rgb(255, 255, 255)');
	}

	const chatAvatar = page.locator('.workflow-chat-direct-button .workflow-chat-avatar').first();
	if ((await chatAvatar.count()) > 0) {
		expect(await readCssProperty(chatAvatar, 'background-color')).not.toBe('rgb(34, 197, 94)');
		expect(await readCssProperty(chatAvatar, 'background-color')).not.toBe('rgb(16, 185, 129)');
	}
};

const expectFrenchUiChrome = async (locator: Locator, expected: RegExp, forbiddenEnglish: RegExp) => {
	await expect(locator).toContainText(expected, { timeout: 30_000 });
	await expect(locator).not.toContainText(forbiddenEnglish);
};

const expectSeededNotificationCards = async (page: Page) => {
	if (!seeded) return;

	const reviewCard = page
		.locator('.workflow-notifications-card')
		.filter({ hasText: /E2E Review Approval Card|Demande de revue|Review requested/i })
		.first();
	await expect(reviewCard, 'seeded notification card should render in visual screenshots').toBeVisible({ timeout: 30_000 });
	await expect(reviewCard.getByRole('button', { name: /Snooze 1h|Masquer/i })).toBeVisible();
	await expect(reviewCard.getByRole('button', { name: /Accept|Move to progress|Accepter|progress/i }).first()).toBeVisible();
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

const boardEnglishChrome = /Saved views|View name|Private|All statuses|All priorities|All assignees|All reviews|Due date ascending|Manual order|Needs Review|Backlog/i;
const projectEnglishChrome = /Create project|Project name|Short project context|Target end|Start date|Loading projects/i;
const teamEnglishChrome = /Team members|Open tasks|Overdue tasks|Estimated load|Team load map|Attention lane|Available lane|No delivery pressure|No clear availability/i;
const reportEnglishChrome = /Start date|End date|Clear filters|Lead and cycle time|Lead time|Cycle time|Blocked time|Review bottlenecks|Estimate vs actual|Designer forecast|Capacity forecast|Export analytics/i;
const chatEnglishChrome = /Public channel|Private chat|Project room|Task room|Write a message|Filter by|No message|No messages|Select a conversation|Loading conversations|Direct messages|Channels|Live conversations|Search in chat|Media files/i;
const notificationEnglishChrome = /Notification preferences|Digest frequency|Review requests|Due soon|Daily|Weekly|Unread only|Mark all read|Mark as read|Notification center|Alert feed|Task alerts|Chat alerts/i;
const taskEnglishChrome = /Task snapshot|Edit task|Card actions|Time entries|Request changes|Request review|Add handoff checklist|Source chat message|Open source chat/i;

const getFirstBoardTaskId = async (page: Page) => {
	const firstCard = page.locator('[data-testid^="board-task-"]').first();
	await expect(firstCard).toBeVisible({ timeout: 30_000 });
	const testId = await firstCard.getAttribute('data-testid');
	const taskId = Number(testId?.replace('board-task-', ''));
	expect(Number.isInteger(taskId)).toBe(true);
	return taskId;
};

const waitForTaskDetailReady = async (page: Page) => {
	await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 30_000 });
	await expect(page.locator('.workflow-task-detail-page')).toBeVisible({ timeout: 30_000 });
	await expectSharedPageHeader(page.locator('.workflow-hero'));
	await expectSharedCardShell(page.locator('.workflow-task-detail-snapshot'));
	await expect(page.locator('.workflow-task-detail-tabs')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-task-detail-tabs button')).toHaveCount(5);
	await expect.poll(async () => page.locator('.workflow-task-detail-panel').count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(4);
	await expect(page.locator('.workflow-task-detail-page')).not.toContainText(/Loading task|Chargement t.che/i);
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

const waitForUsersReady = async (page: Page) => {
	const rows = page.locator('.workflow-users-table tbody tr');
	const errorState = page.locator('.workflow-users-board').getByText(/Une erreur est survenue|An error occurred/i);

	for (let attempt = 0; attempt < 2; attempt += 1) {
		await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 30_000 });
		await expect(page.locator('.workflow-users-shell')).toBeVisible({ timeout: 30_000 });
		await expect(page.locator('.workflow-users-metrics')).toBeVisible({ timeout: 30_000 });
		await expect(page.locator('.workflow-users-board')).toBeVisible({ timeout: 30_000 });
		await expect(page.locator('.workflow-users-table-wrap')).toBeVisible({ timeout: 30_000 });

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

const waitForUserDetailReady = async (page: Page) => {
	await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 30_000 });
	await expect(page.locator('.workflow-user-detail-shell')).toBeVisible({ timeout: 30_000 });
	await expectSharedPageHeader(page.locator('.workflow-user-detail-hero'));
	await expect(page.locator('.workflow-user-detail-profile-card')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-user-detail-panel').first()).toBeVisible({ timeout: 30_000 });
	await expectSharedCardShell(page.locator('.workflow-user-detail-profile-card'));
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
	await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 30_000 });
	await expect(page.locator('.workflow-user-form-shell')).toBeVisible({ timeout: 30_000 });
	await expectSharedPageHeader(page.locator('.workflow-user-form-hero'));
	await expect(page.locator('.workflow-user-form-grid')).toBeVisible({ timeout: 30_000 });
};

const waitForChatReady = async (page: Page) => {
	await expect(page.locator('.workflow-chat-sidebar')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-chat-task-room-section')).toHaveCount(0);
	await expect(page.locator('.workflow-chat-thread-button, .workflow-chat-context-button, .workflow-chat-direct-button').first()).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('body')).not.toContainText(/Sélectionnez une conversation|Select a conversation/i, { timeout: 30_000 });
	await expect(page.locator('.workflow-chat-room')).not.toContainText(/Chargement des conversations|Loading conversations/i, { timeout: 30_000 });
	await expect(page.locator('.workflow-chat-room-header')).toContainText(/messages/i, { timeout: 30_000 });
	await expect(page.locator('.workflow-chat-room textarea').first()).toBeEnabled({ timeout: 30_000 });
};

const waitForOverviewReady = async (page: Page) => {
	await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 30_000 });
	await expect(page.locator('.workflow-overview-page')).toBeVisible({ timeout: 30_000 });
	await expectSharedPageHeader(page.locator('.workflow-overview-header'));
	await expect(page.locator('.workflow-overview-metrics')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-overview-analytics')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-overview-grid')).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('.workflow-overview-page')).not.toContainText(/Chargement projets|Chargement des cartes|Liste projets r.cup.r.e depuis API|Loading projects|Loading cards/i, { timeout: 30_000 });
	await expect.poll(async () => page.locator('.workflow-overview-project').count(), { timeout: 30_000 }).toBeGreaterThan(0);
};

const openAvailableProjectDetail = async (page: Page) => {
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
		if (opened) return;
	}

	throw new Error('No available project detail page opened from the project cards.');
};

test.describe('workflow visual layout pass', () => {
	test.skip(!email || !password, 'Set DESIGN_WORKFLOW_E2E_EMAIL and DESIGN_WORKFLOW_E2E_PASSWORD before visual layout checks.');
	test.setTimeout(120_000);
	test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1920, height: 900 } });

	test.beforeAll(() => {
		seedDesignWorkflowE2E();
		mkdirSync(screenshotDir, { recursive: true });
	});

	test.beforeEach(async ({ context, page }) => {
		await loginWithUi(page);
		await context.addCookies([{ name: 'app-language', value: 'fr', url: 'http://localhost:3004' }]);
	});

	test('captures and checks the premium workflow pages', async ({ page }) => {
		test.setTimeout(120_000);
		await gotoDashboardPath(page, '/dashboard/board');
		await expectNoNextDevIndicator(page);
		await expectUnifiedWorkflowTitleCard(page.locator('.workflow-kanban-header'));
		await expectNeutralWorkspaceChrome(page);
		await expect(page.locator('.workflow-kanban-toolbar')).toBeVisible();
		await expect(page.locator('.workflow-kanban-filter-grid')).toBeVisible();
		await expectUnifiedWorkflowControl(page.locator('.workflow-kanban-search'));
		await expectUnifiedWorkflowControl(page.locator('.workflow-kanban-filter-grid .app-input').first());
		await expectUnifiedWorkflowControl(page.locator('.workflow-saved-view-bar .app-input').nth(1));
		await expectUnifiedWorkflowControl(page.locator('.workflow-saved-view-bar .app-button').first(), primaryControlBackgrounds);
		const activeBoardSegment = page.locator('.workflow-board-segment button.is-active').first();
		await expect(activeBoardSegment).toBeVisible();
		expect(await readCssProperty(activeBoardSegment, 'background-color')).not.toBe('rgb(0, 161, 93)');
		await expect(page.locator('.workflow-topbar-controls')).toContainText('FR');
		await expect(page.locator('.workflow-rail-title')).toContainText(/Flux Design/i);
		await expect(page.locator('.workflow-saved-view-bar')).toContainText(/Vues enregistr.es|Nom de la vue|Priv.e/i);
		await expect(page.locator('.workflow-kanban-filter-grid')).toContainText(/Toutes les revues|. revoir|Ordre manuel|Date cible croissante/i);
		await expectFrenchUiChrome(page.locator('.workflow-saved-view-bar'), /Vues enregistr.es|Nom de la vue|Priv.e/i, boardEnglishChrome);
		await expectFrenchUiChrome(page.locator('.workflow-kanban-filter-grid'), /Tous les statuts|Toutes les priorit.s|Tous les assign.s|Toutes les revues|. revoir|Ordre manuel|Date cible croissante/i, boardEnglishChrome);
		const filterRowCount = await page.locator('.workflow-kanban-filter-grid').evaluate((grid) => {
			const tops = Array.from(grid.children).map((child) => Math.round(child.getBoundingClientRect().top));
			return new Set(tops).size;
		});
		expect(filterRowCount).toBeGreaterThanOrEqual(2);
		await expect(page.locator('.workflow-board-lanes')).toBeVisible();
		await expect(page.locator('.workflow-board-surface')).not.toContainText(/Chargement tableau|Loading board/i);
		await expect.poll(async () => page.locator('[data-testid^="board-task-"]').count()).toBeGreaterThan(0);
		await expectSemanticBoardColors(page);
		await expectBoardCoverPaint(page);
		const addCardButton = page.locator('.workflow-column-add-card').first();
		await expect(addCardButton).toBeVisible();
		expect(await readCssProperty(addCardButton, 'border-top-style')).toBe('solid');
		expect(await readCssProperty(addCardButton, 'background-color')).toBe('rgb(255, 255, 255)');
		expect(await addCardButton.evaluate((button) => button.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
		const boardLaneFit = await page.locator('.workflow-board-surface').evaluate((surface) => {
			const surfaceRect = surface.getBoundingClientRect();
			const columns = Array.from(surface.querySelectorAll('.workflow-column[data-status]')).map((column) => column.getBoundingClientRect());
			return {
				columnCount: columns.length,
				maxColumnWidth: Math.max(...columns.map((rect) => rect.width)),
				lastColumnRight: columns.at(-1)?.right ?? surfaceRect.right,
				surfaceRight: surfaceRect.right,
			};
		});
		expect(boardLaneFit.columnCount).toBeGreaterThanOrEqual(6);
		expect(boardLaneFit.maxColumnWidth).toBeLessThanOrEqual(260);
		expect(boardLaneFit.lastColumnRight).toBeLessThanOrEqual(boardLaneFit.surfaceRight - 8);
		await page.screenshot({ path: join(screenshotDir, 'board.png'), fullPage: true });
		await page.locator('[data-testid^="board-task-"]').first().click();
		await expect(page.locator('.workflow-task-modal')).toBeVisible();
		await expect(page.locator('.workflow-task-modal')).toContainText(/Demander modifications|Approuver|Pi.ces jointes|Commentaires/i);
		await expectCompactWorkflowControl(page.locator('.workflow-task-modal .workflow-trello-modal-action').first());
		await expectCompactWorkflowControl(page.locator('.workflow-task-modal .workflow-trello-modal-action-primary').first(), primaryControlBackgrounds);
		await expectCompactWorkflowControl(page.locator('.workflow-task-modal .workflow-trello-modal-comment-box button').first(), primaryControlBackgrounds);
		await expectUnifiedWorkflowControl(page.locator('.workflow-task-modal .workflow-trello-modal-comment-box .app-input').first());
		const taskModalActions = (await page.locator('.workflow-task-modal .workflow-trello-modal-action').allTextContents()).join(' ');
		expect(taskModalActions).toMatch(/Demander modifications|Approuver|Liste|Membres|Archiver/i);
		expect(taskModalActions).not.toMatch(/Request changes|\bApprove\b|Checklist|\bMembers\b|\bArchive\b/i);
		await page.screenshot({ path: join(screenshotDir, 'task-modal.png'), fullPage: true });
		await page.keyboard.press('Escape');
		await expect(page.locator('.workflow-task-modal')).toHaveCount(0);

		await gotoDashboardPath(page, '/dashboard/overview');
		await waitForOverviewReady(page);
		await expectUnifiedWorkflowTitleCard(page.locator('.workflow-overview-header'));
		await expectUnifiedInnerHeader(page.locator('.workflow-overview-metric-pill').first());
		await expectUnifiedInnerHeader(page.locator('.workflow-overview-panel-pill').first());
		await expectSharedCardShell(page.locator('.workflow-overview-metric').first());
		await page.screenshot({ path: join(screenshotDir, 'overview.png'), fullPage: true });

		await gotoDashboardPath(page, '/dashboard/my-work');
		await expectUnifiedWorkflowTitleCard(page.locator('.workflow-kanban-header'));
		await expect(page.locator('.workflow-board-lanes')).toBeVisible();
		await expect(page.locator('.workflow-board-surface')).not.toContainText(/Chargement tableau|Loading board/i);
		await expect.poll(async () => page.locator('[data-testid^="board-task-"]').count()).toBeGreaterThan(0);
		await page.screenshot({ path: join(screenshotDir, 'my-work.png'), fullPage: true });
		await openFirstBoardTaskModal(page);
		await expect(page.locator('.workflow-task-modal')).toContainText(/Commentaires|Activit.|Fichiers|Revue|Temps saisi/i);
		await page.screenshot({ path: join(screenshotDir, 'my-work-task-modal.png'), fullPage: true });
		await page.keyboard.press('Escape');
		await expect(page.locator('.workflow-task-modal')).toHaveCount(0);
		await openFirstTaskDetailRoute(page);
		await expectFrenchUiChrome(page.locator('.workflow-task-detail-page'), /Aper.u t.che|Actions carte|Commentaires|Temps saisi|Activit/i, taskEnglishChrome);
		const taskDetailLayout = await page.locator('.workflow-task-detail-page').evaluate((pageEl) => {
			const columns = getComputedStyle(pageEl).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length;
			const hero = pageEl.querySelector('.workflow-task-detail-snapshot');
			const heroGrid = hero?.querySelector('.grid');
			const toolsGrid = pageEl.querySelector('.workflow-task-tools-panel .workflow-task-tools-board');
			const historyGrid = pageEl.querySelector('.workflow-task-history-grid');
			const edit = pageEl.querySelector('.workflow-task-edit-panel')?.getBoundingClientRect();
			const reassign = pageEl.querySelector('.workflow-task-reassign-panel')?.getBoundingClientRect();
			return {
				columns,
				heroColumns: heroGrid ? getComputedStyle(heroGrid).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length : 0,
				heroHeight: hero?.getBoundingClientRect().height ?? 0,
				toolsColumns: toolsGrid ? getComputedStyle(toolsGrid).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length : 0,
				historyColumns: historyGrid ? getComputedStyle(historyGrid).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length : 0,
				editReassignSameRow: edit && reassign ? Math.abs(edit.top - reassign.top) < 8 : false,
			};
		});
		expect(taskDetailLayout.columns).toBe(2);
		expect(taskDetailLayout.heroColumns).toBeGreaterThanOrEqual(2);
		expect(taskDetailLayout.heroHeight).toBeLessThan(290);
		expect(taskDetailLayout.toolsColumns).toBe(2);
		expect(taskDetailLayout.historyColumns).toBe(2);
		expect(taskDetailLayout.editReassignSameRow).toBe(true);
		await page.screenshot({ path: join(screenshotDir, 'task-detail.png'), fullPage: true });

		await gotoDashboardPath(page, '/dashboard/projects');
		await expect(page.locator('.workflow-projects-layout')).toBeVisible();
		const projectLayoutColumns = await page.locator('.workflow-projects-layout').evaluate((layout) => getComputedStyle(layout).gridTemplateColumns.trim().split(/\s+/).length);
		expect(projectLayoutColumns).toBe(1);
		await expectSharedPageHeader(page.locator('.workflow-projects-header'));
		await expect(page.locator('.workflow-projects-card-grid')).toBeVisible();
		await expect.poll(async () => page.locator('.workflow-project-card-modern').count()).toBeGreaterThan(0);
		await expect(page.locator('.workflow-project-card-modern').first()).toBeVisible();
		await expectSharedCardShell(page.locator('.workflow-projects-create'));
		await expectSharedCardShell(page.locator('.workflow-project-card-modern').first());
		const projectPrimary = page.locator('.workflow-projects-create .app-button:not(.app-button-ghost)').first();
		await expect(projectPrimary).toBeVisible();
		expect(await readCssProperty(projectPrimary, 'background-color')).not.toBe('rgb(0, 161, 93)');
		await expectFrenchUiChrome(page.locator('.workflow-projects-create'), /Cr.er un projet|Nom du projet|Fin cible/i, projectEnglishChrome);
		await page.screenshot({ path: join(screenshotDir, 'projects.png'), fullPage: true });
		await openAvailableProjectDetail(page);
		await expect(page.locator('.workflow-project-detail-page')).toBeVisible();
		await expectSharedPageHeader(page.locator('.workflow-project-detail-header'));
		await expect(page.locator('.workflow-project-detail-grid')).toBeVisible();
		await expect(page.locator('.workflow-project-detail-panel').first()).toBeVisible();
		await page.screenshot({ path: join(screenshotDir, 'project-detail.png'), fullPage: true });

		await gotoDashboardPath(page, '/dashboard/team');
		await expectUnifiedWorkflowTitleCard(page.locator('.workflow-team-header'));
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
		const teamSideSizing = await page.locator('.workflow-team-side').evaluate((side) => {
			const spotlight = side.querySelector('.workflow-team-spotlight')?.getBoundingClientRect();
			const lanes = Array.from(side.querySelectorAll('.workflow-team-lane')).map((lane) => lane.getBoundingClientRect());
			return {
				spotlightHeight: spotlight?.height ?? 0,
				spotlightWidth: spotlight?.width ?? 0,
				attentionHeight: lanes[0]?.height ?? 0,
				attentionWidth: lanes[0]?.width ?? 0,
			};
		});
		expect(teamSideSizing.attentionHeight).toBeGreaterThan(0);
		expect(teamSideSizing.attentionHeight).toBeLessThan(teamSideSizing.spotlightHeight);
		expect(teamSideSizing.attentionWidth).toBeLessThan(teamSideSizing.spotlightWidth);
		await expectSharedCardShell(page.locator('.workflow-team-analytics'));
		await expectSharedCardShell(page.locator('.workflow-team-card').first());
		await expectFrenchUiChrome(page.locator('.workflow-team-page'), /Membres .quipe|T.ches ouvertes|Charge estim.e|Carte charge .quipe/i, teamEnglishChrome);
		await page.screenshot({ path: join(screenshotDir, 'team.png'), fullPage: true });

		await gotoDashboardPath(page, '/dashboard/reports/time');
		await expectUnifiedWorkflowTitleCard(page.locator('.workflow-report-hero'));
		await expect(page.locator('.workflow-report-filterbar')).toBeVisible();
		await expect(page.locator('.workflow-report-date-fields')).toBeVisible();
		await expect(page.locator('.workflow-report-actions')).toBeVisible();
		await expectUnifiedWorkflowControl(page.locator('.workflow-report-filterbar .app-input').first());
		await expectUnifiedWorkflowControl(page.locator('.workflow-report-clear').first());
		await expectUnifiedWorkflowControl(page.locator('.workflow-report-export').first());
		await expect(page.locator('.workflow-report-filterbar')).toContainText(/Effacer les filtres|Exporter CSV|Exporter PDF/i);
		await expect(page.locator('.workflow-analytics-grid')).toBeVisible();
		await expect(page.locator('.workflow-forecast-board')).toBeVisible();
		const widestReportAction = await page.locator('.workflow-report-actions button').evaluateAll((buttons) =>
			Math.max(...buttons.map((button) => button.getBoundingClientRect().width)),
		);
		expect(widestReportAction).toBeLessThan(190);
		await expectUnifiedInnerHeader(page.locator('.workflow-report-metric span').first());
		await expectUnifiedInnerHeader(page.locator('.workflow-report-chart-head').first());
		await expectUnifiedInnerHeader(page.locator('.workflow-report-board-head').first());
		await expectSharedCardShell(page.locator('.workflow-report-metric').first());
		await expectSharedCardShell(page.locator('.workflow-report-chart-card').first());
		expect(await readCssProperty(page.locator('.workflow-report-metric svg').first(), 'background-color')).not.toBe('rgb(0, 161, 93)');
		await expectFrenchUiChrome(page.locator('.workflow-report-filterbar'), /Date de d.but|Date de fin|Effacer les filtres|Exporter CSV|Exporter PDF/i, reportEnglishChrome);
		await expectFrenchUiChrome(page.locator('.workflow-analytics-grid'), /D.lai et temps de cycle|Goulots de revue|Estim. vs r.el|Pr.vision designer/i, reportEnglishChrome);
		await page.screenshot({ path: join(screenshotDir, 'reports.png'), fullPage: true });

		await gotoDashboardPath(page, '/dashboard/chat');
		await waitForChatReady(page);
		await expectUnifiedWorkflowTitleCard(page.locator('.workflow-chat-sidebar-head'));
		await expectUnifiedWorkflowTitleCard(page.locator('.workflow-chat-room-header'));
		await expectUnifiedInnerHeader(page.locator('.workflow-chat-panel-pill').first());
		await expect(page.getByRole('button', { name: /Filtrer par/i })).toBeVisible();
		await expect(page.locator('.workflow-chat-tools-toggle span')).toHaveText(/Filtrer par/i);
		await expectSlateChatAccent(page);
		await expectFrenchUiChrome(page.locator('.workflow-chat-sidebar'), /Canal public|Projets|Messages directs/i, chatEnglishChrome);
		await expect(page.locator('.workflow-chat-room textarea').first()).toHaveAttribute('placeholder', /crire un message/i);
		await expect(page.locator('.workflow-chat-room')).not.toContainText(chatEnglishChrome);
		const seededProjectThread = page.locator('.workflow-chat-context-button').filter({ hasText: /E2E Premium Review Studio/i });
		await expect(seededProjectThread).toHaveCount(1);
		await seededProjectThread.click();
		await expect(page.locator('.workflow-chat-room-header')).toContainText(/E2E Premium Review Studio/i);
		await expect(page.locator('.workflow-chat-bubble-mine')).toBeVisible();
		await expect(page.locator('.workflow-chat-bubble-mine .workflow-chat-rich-card').first()).toBeVisible();
		await page.locator('.workflow-chat-message-row').last().scrollIntoViewIfNeeded();
		await page.waitForTimeout(120);
		await page.screenshot({ path: join(screenshotDir, 'chat.png'), fullPage: true });

		await gotoDashboardPath(page, '/dashboard/notifications');
		await expect(page.locator('.workflow-notifications-shell')).toBeVisible();
		await expectSharedPageHeader(page.locator('.workflow-notifications-hero'));
		await expect(page.locator('.workflow-notifications-metrics')).toBeVisible();
		await expect(page.locator('.workflow-notification-preferences')).toBeVisible();
		await expect(page.locator('.workflow-notifications-board')).toBeVisible();
		const firstNotification = page.locator('.workflow-notifications-list > *').first();
		await expect(firstNotification).toBeVisible();
		const notificationPaint = await firstNotification.evaluate((card) => {
			const styles = getComputedStyle(card);
			const beforeStyles = getComputedStyle(card, '::before');
			return {
				backgroundImage: styles.backgroundImage,
				beforeBackgroundImage: beforeStyles.backgroundImage,
			};
		});
		expect(notificationPaint.backgroundImage).not.toContain('gradient');
		expect(notificationPaint.beforeBackgroundImage).not.toContain('gradient');
		await expectSeededNotificationCards(page);
		await expectSharedCardShell(page.locator('.workflow-notifications-metric').first());
		await expectSharedCardShell(page.locator('.workflow-notification-preferences'));
		await expectFrenchUiChrome(page.locator('.workflow-notification-preferences'), /Pr.f.rences notifications|Fr.quence du r.sum.|Demandes de revue|Quotidien/i, notificationEnglishChrome);
		await expectFrenchUiChrome(page.locator('.workflow-notifications-board'), /Centre notifications|Flux alertes/i, notificationEnglishChrome);
		await page.screenshot({ path: join(screenshotDir, 'notifications.png'), fullPage: true });

		await gotoDashboardPath(page, '/dashboard/users');
		await waitForUsersReady(page);
		await expectSharedPageHeader(page.locator('.workflow-users-hero'));
		await page.screenshot({ path: join(screenshotDir, 'users.png'), fullPage: true });
		await openFirstUserDetail(page);
		await page.screenshot({ path: join(screenshotDir, 'user-detail.png'), fullPage: true });
		await openCurrentUserEdit(page);
		await page.screenshot({ path: join(screenshotDir, 'user-edit.png'), fullPage: true });

		await gotoDashboardPath(page, '/dashboard/users/new');
		await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 30_000 });
		await expect(page.locator('.workflow-user-form-shell')).toBeVisible({ timeout: 30_000 });
		await expectSharedPageHeader(page.locator('.workflow-user-form-hero'));
		await expect(page.locator('.workflow-user-form-grid')).toBeVisible({ timeout: 30_000 });
		await expectUnifiedWorkflowControl(page.locator('.workflow-user-form-fields .app-input').first());
		await expectUnifiedWorkflowControl(page.locator('.workflow-user-form-fields .app-select-trigger').first());
		await expectUnifiedWorkflowControl(page.locator('.workflow-user-form-toggle').first());
		await expectUnifiedWorkflowControl(page.locator('.workflow-user-form-submit button').first(), primaryControlBackgrounds);
		await page.screenshot({ path: join(screenshotDir, 'user-new.png'), fullPage: true });

		await gotoDashboardPath(page, '/dashboard/settings/edit-profile');
		await expect(page.locator('.workflow-profile-shell')).toBeVisible();
		await expectSharedPageHeader(page.locator('.workflow-user-form-hero'));
		await expect(page.locator('.workflow-profile-fields')).toBeVisible();
		await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 20_000 });
		await expectUnifiedWorkflowControl(page.locator('.workflow-profile-fields .app-input').first());
		await expectUnifiedWorkflowControl(page.locator('.workflow-profile-fields .app-select-trigger').first());
		await expectUnifiedWorkflowControl(page.locator('.workflow-user-form-submit button').first(), primaryControlBackgrounds);
		await page.screenshot({ path: join(screenshotDir, 'profile.png'), fullPage: true });

		await gotoDashboardPath(page, '/dashboard/settings/password');
		await expect(page.locator('.workflow-password-shell')).toBeVisible();
		await expectSharedPageHeader(page.locator('.workflow-user-form-hero'));
		await expect(page.locator('.workflow-password-fields')).toBeVisible();
		await expectUnifiedWorkflowControl(page.locator('.workflow-password-fields .app-input').first());
		await expectUnifiedWorkflowControl(page.locator('.workflow-user-form-submit button').first(), primaryControlBackgrounds);
		await page.screenshot({ path: join(screenshotDir, 'password.png'), fullPage: true });
	});

	test('captures the primary workflow pages in English', async ({ page }) => {
		test.setTimeout(90_000);
		await gotoDashboardPath(page, '/dashboard/overview');
		const languageToggle = page.locator('.workflow-language-toggle').first();
		await expect(languageToggle).toBeVisible({ timeout: 30_000 });
		await expect(languageToggle).toContainText('FR');
		await languageToggle.click();
		await expect(page.locator('.workflow-topbar-controls')).toContainText('EN');
		await waitForOverviewReady(page);
		await expect(page.locator('.workflow-topbar-controls')).toContainText('EN');
		await expectFrenchUiChrome(page.locator('.workflow-overview-page'), /Overview|Active projects|Project load|Delivery mix/i, /Accueil|Charge projets|Mix livraison/i);
		await page.screenshot({ path: join(screenshotDir, 'en-overview.png'), fullPage: true });

		await gotoDashboardPath(page, '/dashboard/projects');
		await expect(page.locator('.workflow-projects-layout')).toBeVisible({ timeout: 30_000 });
		await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 30_000 });
		await expect(page.locator('.workflow-projects-card-grid')).toBeVisible({ timeout: 30_000 });
		await expect.poll(async () => page.locator('.workflow-project-card-modern').count(), { timeout: 30_000 }).toBeGreaterThan(0);
		await expect(page.locator('.workflow-topbar-profile')).toContainText(/E2E Manager/i, { timeout: 30_000 });
		await expectFrenchUiChrome(page.locator('.workflow-projects-layout'), /Projects|Create project|Project name|Target end/i, /Projets actifs|Cr.er un projet|Nom du projet|Fin cible/i);
		await page.screenshot({ path: join(screenshotDir, 'en-projects.png'), fullPage: true });

		await gotoDashboardPath(page, '/dashboard/team');
		await expect(page.locator('.workflow-team-page')).toBeVisible({ timeout: 30_000 });
		await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 30_000 });
		await expect(page.locator('.workflow-team-grid')).toBeVisible({ timeout: 30_000 });
		await expect(page.locator('.workflow-team-board')).toBeVisible({ timeout: 30_000 });
		await expect.poll(async () => page.locator('.workflow-team-card').count(), { timeout: 30_000 }).toBeGreaterThan(0);
		await expect(page.locator('.workflow-topbar-profile')).toContainText(/E2E Manager/i, { timeout: 30_000 });
		await expectFrenchUiChrome(page.locator('.workflow-team-page'), /Team|Team members|Open tasks|Estimated load|Team load map/i, /Équipe|Membres .quipe|T.ches ouvertes|Charge estim.e|Carte charge .quipe/i);
		await page.screenshot({ path: join(screenshotDir, 'en-team.png'), fullPage: true });

		await gotoDashboardPath(page, '/dashboard/reports/time');
		await expect(page.locator('.workflow-report-shell')).toBeVisible({ timeout: 30_000 });
		await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 30_000 });
		await expect(page.locator('.workflow-analytics-grid')).toBeVisible({ timeout: 30_000 });
		await expect(page.locator('.workflow-forecast-board')).toBeVisible({ timeout: 30_000 });
		await expect(page.locator('.workflow-report-shell')).not.toContainText(/No report data|No project/i, { timeout: 30_000 });
		await expect(page.locator('.workflow-topbar-profile')).toContainText(/E2E Manager/i, { timeout: 30_000 });
		await expectFrenchUiChrome(page.locator('.workflow-report-shell'), /Reports|Start date|End date|Export CSV|Lead and cycle time|Review bottlenecks/i, /Rapports|Date de d.but|Date de fin|Exporter CSV|D.lai et temps de cycle|Goulots de revue/i);
		await page.screenshot({ path: join(screenshotDir, 'en-reports.png'), fullPage: true });

		await gotoDashboardPath(page, '/dashboard/chat');
		await waitForChatReady(page);
		await expectFrenchUiChrome(page.locator('.workflow-chat-shell'), /Chat|Public channel|Projects|Direct messages|Write a message|Filter by/i, /Canal public|Messages directs|.crire un message|Filtrer par/i);
		await page.screenshot({ path: join(screenshotDir, 'en-chat.png'), fullPage: true });

		await gotoDashboardPath(page, '/dashboard/notifications');
		await expect(page.locator('.workflow-notifications-shell')).toBeVisible({ timeout: 30_000 });
		await expect(page.getByTestId('api-loader')).toHaveCount(0, { timeout: 30_000 });
		await expect(page.locator('.workflow-notifications-list > *').first()).toBeVisible({ timeout: 30_000 });
		await expectSeededNotificationCards(page);
		await expect(page.locator('.workflow-topbar-profile')).toContainText(/E2E Manager/i, { timeout: 30_000 });
		await expectFrenchUiChrome(page.locator('.workflow-notifications-shell'), /Notifications|Notification preferences|Digest frequency|Unread only|Notification center/i, /Pr.f.rences notifications|Fr.quence du r.sum.|Non lues seulement|Centre notifications/i);
		await page.screenshot({ path: join(screenshotDir, 'en-notifications.png'), fullPage: true });
	});
});
