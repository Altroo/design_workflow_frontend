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
	{ name: 'users-list', path: '/dashboard/users', marker: /Liste des utilisateurs|Users list/i },
	{ name: 'users-new', path: '/dashboard/users/new', marker: /Nouvel utilisateur|New user/i },
	{ name: 'password', path: '/dashboard/settings/password', marker: /Modifier le mot de passe|Change password/i },
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

const expectRailLogoToStayCircular = async (page: Page) => {
	const logo = page.locator('.workflow-rail-logo').first();
	await expect(logo).toBeVisible({ timeout: 10_000 });
	const box = await logo.boundingBox();
	expect(box).not.toBeNull();
	if (!box) return;
	expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
	expect(box.width).toBeGreaterThanOrEqual(58);
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
			await expectRailLogoToStayCircular(page);
			await page.screenshot({ path: join(screenshotDir, `${target.name}.png`), fullPage: true });
		}
	});
});
