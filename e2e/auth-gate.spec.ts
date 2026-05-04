import { expect, test } from '@playwright/test';

const emailInput = 'input[name="email"]';
const passwordInput = 'input[name="password"]';

test.describe('authentication gate', () => {
	test('renders the login form', async ({ page }) => {
		await page.goto('/login');

		await expect(page.locator(emailInput)).toBeVisible();
		await expect(page.locator(passwordInput)).toBeVisible();
		await expect(page.locator('button[type="submit"]')).toBeVisible();
	});

	test('redirects protected dashboard routes to login when logged out', async ({ page }) => {
		await page.goto('/dashboard/board');

		await expect(page).toHaveURL(/\/login$/);
		await expect(page.locator(emailInput)).toBeVisible();
	});
});
