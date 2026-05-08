import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const email = process.env.DESIGN_WORKFLOW_E2E_EMAIL;
const password = process.env.DESIGN_WORKFLOW_E2E_PASSWORD;
const screenshotDir = 'test-results/live-empty-pages';

const pagesToReview = [
	{ name: 'overview', path: '/dashboard/overview', marker: /Accueil|Dashboard|Workflow/i },
	{ name: 'board', path: '/dashboard/board', marker: /Tableau de t.ches|Task board|Ajouter une carte/i },
	{ name: 'my-work', path: '/dashboard/my-work', marker: /Mon travail|My work|Tableau/i },
	{ name: 'projects', path: '/dashboard/projects', marker: /Projets|Projects/i },
	{ name: 'team', path: '/dashboard/team', marker: /.quipe|Team/i },
	{ name: 'chat', path: '/dashboard/chat', marker: /Chat|Canal public|Public channel/i },
	{ name: 'reports', path: '/dashboard/reports/time', marker: /Rapports|Reports/i },
	{ name: 'notifications', path: '/dashboard/notifications', marker: /Notifications/i },
] as const;

const loginWithUi = async (page: Page) => {
	await page.goto('/login', { waitUntil: 'domcontentloaded' });

	const emailField = page.locator('input[name="email"]');
	const destination = await Promise.race([
		page.waitForURL(/\/dashboard\/(overview|my-work|board)/, { timeout: 20_000 }).then(() => 'dashboard').catch(() => 'timeout'),
		emailField.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'form').catch(() => 'timeout'),
	]);

	if (destination === 'dashboard') return;

	await expect(emailField).toBeVisible({ timeout: 1_000 });
	await emailField.fill(email ?? '');
	await page.locator('input[name="password"]').fill(password ?? '');
	const submit = page.locator('button[type="submit"]');
	await expect(submit).toBeEnabled({ timeout: 20_000 });
	await submit.click();
	await expect(page).toHaveURL(/\/dashboard\/(overview|my-work|board)/, { timeout: 30_000 });
};

test.describe('live empty workflow pages', () => {
	test.skip(!email || !password, 'Set DESIGN_WORKFLOW_E2E_EMAIL and DESIGN_WORKFLOW_E2E_PASSWORD.');
	test.setTimeout(120_000);

	test('captures production empty-state pages for design review', async ({ page }) => {
		mkdirSync(screenshotDir, { recursive: true });
		await page.setViewportSize({ width: 1440, height: 1000 });
		await loginWithUi(page);

		for (const target of pagesToReview) {
			await page.goto(target.path, { waitUntil: 'domcontentloaded' });
			await expect(page.locator('body')).toContainText(target.marker, { timeout: 30_000 });
			await page.waitForLoadState('networkidle').catch(() => undefined);
			await page.screenshot({ path: join(screenshotDir, `${target.name}.png`), fullPage: true });
		}
	});
});
