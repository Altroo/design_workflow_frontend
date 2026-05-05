import { expect, type BrowserContext, type Page, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const baseURL = 'http://localhost:3004';
const screenshotDir = 'test-results/auth-visual';

const forceFrench = async (page: Page) => {
	await page.context().addCookies([{ name: 'app-language', value: 'fr', url: baseURL }]);
	await page.addInitScript(() => {
		window.localStorage.setItem('app-language', 'fr');
	});
};

const setResetCookies = async (context: BrowserContext, values: { email?: string; code?: string; passUpdated?: string }) => {
	const cookies = [];
	if (values.email) cookies.push({ name: '@new_email', value: values.email, url: baseURL });
	if (values.code) cookies.push({ name: '@code', value: values.code, url: baseURL });
	if (values.passUpdated) cookies.push({ name: '@pass_updated', value: values.passUpdated, url: baseURL });
	await context.addCookies(cookies);
};

const expectNoPageOverflow = async (page: Page) => {
	const overflow = await page.evaluate(() => {
		const root = document.documentElement;
		const body = document.body;
		return {
			width: Math.max(root.scrollWidth, body.scrollWidth),
			viewport: root.clientWidth,
		};
	});
	expect(overflow.width).toBeLessThanOrEqual(overflow.viewport + 4);
};

const capturePage = async (page: Page, name: string) => {
	await expect(page.locator('.auth-shell')).toBeVisible();
	await expectNoPageOverflow(page);
	await page.screenshot({ path: join(screenshotDir, `${name}.png`), fullPage: true });
};

test.describe('auth visual layout pass', () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test.beforeAll(() => {
		mkdirSync(screenshotDir, { recursive: true });
	});

	test.beforeEach(async ({ page }) => {
		await forceFrench(page);
	});

	test('captures localized desktop auth and reset pages', async ({ context, page }) => {
		test.setTimeout(60_000);
		await page.setViewportSize({ width: 1440, height: 900 });

		await page.goto('/login');
		await expect(page.getByRole('button', { name: /Passer en anglais/i })).toBeVisible();
		await expect(page.locator('.auth-shell')).toContainText(/Connexion|Sécurité|Tableau/i);
		await expect(page.locator('.auth-shell')).not.toContainText(/Secure access|Kanban board|Open studio cards|Dashboard|Backlog|In progress|Completed/i);
		await capturePage(page, 'login-fr');

		await page.getByRole('button', { name: /Passer en anglais/i }).click();
		await expect(page.getByRole('button', { name: /Switch to French/i })).toBeVisible();
		await expect(page.locator('.auth-shell')).toContainText(/Login|Security|Task board/i);
		await capturePage(page, 'login-en');

		await page.getByRole('button', { name: /Switch to French/i }).click();
		await page.goto('/reset-password');
		await expect(page.locator('.auth-shell')).toContainText(/Réinitialiser le mot de passe|Adresse email/i);
		await expect(page.locator('.auth-shell')).not.toContainText(/Recovery|Enter your email/i);
		await capturePage(page, 'reset-password-fr');

		await setResetCookies(context, { email: 'designer@example.com' });
		await page.goto('/reset-password/enter-code');
		await expect(page.locator('.auth-shell')).toContainText(/Rentrez le code|Confirmer le code/i);
		await expect(page.locator('.auth-shell')).not.toContainText(/Verification|Enter the code/i);
		await capturePage(page, 'enter-code-fr');

		await setResetCookies(context, { email: 'designer@example.com', code: '123456' });
		await page.goto('/reset-password/set-password');
		await expect(page.locator('.auth-shell')).toContainText(/Nouveau mot de passe|Créer un nouveau mot de passe/i);
		await expect(page.locator('.auth-shell')).not.toContainText(/Create strong password|Keep workspace secure/i);
		await capturePage(page, 'set-password-fr');

		await setResetCookies(context, { passUpdated: '1' });
		await page.goto('/reset-password/set-password-complete');
		await expect(page.locator('.auth-shell')).toContainText(/Mot de passe modifié/i);
		await expect(page.locator('.auth-shell')).not.toContainText(/Done/i);
		await capturePage(page, 'set-password-complete-fr');
	});

	test('keeps mobile auth pages compact with language switching visible', async ({ page }) => {
		test.setTimeout(45_000);
		await page.setViewportSize({ width: 390, height: 844 });

		await page.goto('/login');
		await expect(page.getByRole('button', { name: /Passer en anglais/i })).toBeVisible();
		await expect(page.locator('.auth-shell')).toContainText(/Connexion|FR/i);
		await capturePage(page, 'mobile-login-fr');

		await page.goto('/reset-password');
		await expect(page.getByRole('button', { name: /Passer en anglais/i })).toBeVisible();
		await expect(page.locator('.auth-shell')).toContainText(/Réinitialiser le mot de passe|FR/i);
		await capturePage(page, 'mobile-reset-password-fr');
	});
});
