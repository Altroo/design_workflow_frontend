import { expect, test, type Page } from '@playwright/test';

import { seedDesignWorkflowE2E } from './seed-design-workflow';

const email = process.env.DESIGN_WORKFLOW_E2E_EMAIL;
const password = process.env.DESIGN_WORKFLOW_E2E_PASSWORD;
const seeded = process.env.DESIGN_WORKFLOW_E2E_SEEDED === '1';

const hydrationPattern = /hydrated but some attributes|server rendered HTML didn't match|hydration failed|did not match|didn't match/i;

const loginWithUi = async (page: Page) => {
	await page.goto('/login', { waitUntil: 'domcontentloaded' });
	const emailField = page.locator('input[name="email"]');
	const destination = await Promise.race([
		page.waitForURL(/\/dashboard(?:\/(overview|my-work|board))?$/, { timeout: 30_000 }).then(() => 'dashboard').catch(() => 'timeout'),
		emailField.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'form').catch(() => 'timeout'),
	]);
	if (destination === 'dashboard') return;
	await emailField.fill(email ?? '');
	await page.locator('input[name="password"]').fill(password ?? '');
	await page.locator('button[type="submit"]').click();
	await expect(page).toHaveURL(/\/dashboard(?:\/(overview|my-work|board))?$/, { timeout: 30_000 });
};

test.describe('hydration console guard', () => {
	test.skip(!email || !password, 'Set DESIGN_WORKFLOW_E2E_EMAIL and DESIGN_WORKFLOW_E2E_PASSWORD before hydration checks.');
	test.use({ storageState: { cookies: [], origins: [] } });

	test.beforeAll(() => {
		if (seeded) seedDesignWorkflowE2E();
	});

	test('does not emit React hydration mismatch warnings on primary routes', async ({ page }) => {
		const hydrationMessages: string[] = [];
		page.on('console', (message) => {
			const text = message.text();
			if (hydrationPattern.test(text)) hydrationMessages.push(`[${message.type()}] ${text}`);
		});
		page.on('pageerror', (error) => {
			const text = String(error.stack || error.message || error);
			if (hydrationPattern.test(text)) hydrationMessages.push(`[pageerror] ${text}`);
		});

		await loginWithUi(page);
		for (const path of ['/dashboard/overview', '/dashboard/board', '/dashboard/projects', '/dashboard/team', '/dashboard/reports/time', '/dashboard/chat', '/dashboard/notifications']) {
			await page.goto(path, { waitUntil: 'domcontentloaded' });
			await page.locator('body').waitFor({ state: 'visible', timeout: 30_000 });
			if (path === '/dashboard/reports/time') {
				await expect(page.locator('.workflow-report-shell')).toBeVisible({ timeout: 30_000 });
				await expect(page.locator('.workflow-report-chart-body canvas').first()).toBeVisible({ timeout: 30_000 });
			}
			await page.waitForTimeout(250);
		}

		expect(hydrationMessages).toEqual([]);
	});
});
