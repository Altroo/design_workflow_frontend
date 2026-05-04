import { expect, test, type Page } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const email = process.env.DESIGN_WORKFLOW_E2E_EMAIL;
const password = process.env.DESIGN_WORKFLOW_E2E_PASSWORD;
const seeded = process.env.DESIGN_WORKFLOW_E2E_SEEDED === '1';
const authStatePath = '.playwright/.auth/design-workflow-e2e.json';

test.describe.configure({ mode: 'serial' });
test.use({ storageState: authStatePath });

const loginWithUi = async (page: Page) => {
	await page.goto('/login');

	await page.locator('input[name="email"]').fill(email ?? '');
	await page.locator('input[name="password"]').fill(password ?? '');
	await page.locator('button[type="submit"]').click();

	await expect(page).toHaveURL(/\/dashboard\/(overview|my-work|board)/, { timeout: 30_000 });
};

test.beforeAll(async ({ browser }) => {
	if (!email || !password) return;
	if (existsSync(authStatePath)) return;

	mkdirSync(dirname(authStatePath), { recursive: true });
	const page = await browser.newPage({ storageState: undefined });
	await loginWithUi(page);
	await page.context().storageState({ path: authStatePath });
	await page.close();
});

test.describe('authenticated dashboard', () => {
	test.skip(!email || !password, 'Set DESIGN_WORKFLOW_E2E_EMAIL and DESIGN_WORKFLOW_E2E_PASSWORD to run login tests.');

	test('opens the dashboard shell with an authenticated session', async ({ page }) => {
		await page.goto('/dashboard/overview');

		await expect(page).toHaveURL(/\/dashboard\/(overview|my-work|board)/, { timeout: 30_000 });
		await expect(page.locator('body')).toContainText(/Design Workflow|Tableau|Dashboard|Task board/i);
	});

	test('opens premium board search, saved views, table mode, and calendar mode', async ({ page }) => {
		await page.goto('/dashboard/board');

		await expect(page).toHaveURL(/\/dashboard\/board/);
		await expect(page.locator('body')).toContainText(/Task board|Tableau de t.ches|Tableau de taches/i, { timeout: 30_000 });

		await expect(page.locator('.workflow-kanban-toolbar')).toBeVisible();
		await expect(page.locator('.workflow-saved-view-bar')).toBeVisible();
		await expect(page.locator('.workflow-saved-view-bar')).toContainText(/Saved views|View name|Private|Team|Vues|Nom|Priv.|Equipe/i);
		await expect(page.getByPlaceholder(/Task, project, description|T.che, projet, description|Tache, projet, description/i)).toBeVisible();

		await page.getByRole('button', { name: /^Table$/i }).click();
		await expect(page.locator('.workflow-board-table')).toBeVisible();
		await expect(page.locator('.workflow-board-table')).toContainText(/Task|T.che|Tache|Project|Projet/i);

		await page.getByRole('button', { name: /Calendar|Calendrier/i }).click();
		await expect(page.locator('.workflow-board-calendar')).toBeVisible();
		await expect(page.locator('.workflow-board-calendar')).toContainText(/Calendar|Calendrier|Sun|Mon|Lun|Mar/i);
	});

	test('opens workflow reports and export controls', async ({ page }) => {
		await page.goto('/dashboard/reports/time');

		await expect(page).toHaveURL(/\/dashboard\/reports\/time/);
		await expect(page.locator('body')).toContainText(/Reports|Rapports|Analytics|Temps/i, { timeout: 30_000 });
		await expect(page.getByRole('button', { name: /Export CSV|Exporter CSV/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /Export analytics|Exporter analytics/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /Export PDF|Exporter PDF/i })).toBeVisible();
		await expect(page.locator('body')).toContainText(/Lead and cycle time|Review bottlenecks|Capacity forecast|Studio analytics|Analytics/i);
	});

	test('opens notification center actions and preferences', async ({ page }) => {
		await page.goto('/dashboard/notifications');

		await expect(page).toHaveURL(/\/dashboard\/notifications/);
		await expect(page.locator('body')).toContainText(/Notifications|Centre notifications|Alertes/i, { timeout: 30_000 });
		await expect(page.locator('.workflow-notifications-metrics')).toBeVisible();
		await expect(page.getByRole('button', { name: /Unread only|Non lues seulement/i })).toBeVisible();
		await expect(page.locator('.workflow-notification-preferences')).toContainText(/Digest frequency|Fr.quence du r.sum.|Frequence du resume/i);
	});

	test('keeps the board usable on mobile viewports', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/dashboard/my-work');

		await expect(page).toHaveURL(/\/dashboard\/my-work/);
		await expect(page.locator('body')).toContainText(/My task board|Mon tableau|Mon travail/i, { timeout: 30_000 });
		await expect(page.locator('.workflow-kanban-actions')).toBeVisible();

		const filterToggle = page.locator('.workflow-board-filter-toggle');
		if (await filterToggle.isVisible()) {
			await filterToggle.click();
		}
		await expect(page.locator('.workflow-kanban-toolbar')).toBeVisible();

		const firstCard = page.locator('[data-testid^="board-task-"]').first();
		if (await firstCard.count()) {
			await firstCard.click();
			await expect(page.locator('.workflow-task-modal')).toBeVisible();
		}
	});
});

test.describe('seeded premium workflow coverage', () => {
	test.skip(!email || !password || !seeded, 'Run seed_design_workflow_e2e and set DESIGN_WORKFLOW_E2E_SEEDED=1 with matching credentials.');

	test('opens seeded review card and exposes artifact annotations', async ({ page }) => {
		await page.goto('/dashboard/board');

		await expect(page.locator('.workflow-kanban-toolbar')).toBeVisible();
		await page.getByPlaceholder(/Task, project, description|T.che, projet, description|Tache, projet, description/i).fill('E2E Review Approval Card');
		await expect(page.getByText('E2E Review Approval Card').first()).toBeVisible({ timeout: 30_000 });
		await page.getByText('E2E Review Approval Card').first().click();

		await expect(page.locator('.workflow-task-modal, .workflow-trello-modal-detail')).toBeVisible();
		await expect(page.locator('body')).toContainText(/E2E pin: tighten spacing around logo|Artifact versions|e2e-material-board/i);
		await expect(page.getByRole('button', { name: /Approve|Request changes|Request review/i }).first()).toBeVisible();
	});

	test('opens seeded chat-source task back link', async ({ page }) => {
		await page.goto('/dashboard/board');

		await expect(page.locator('.workflow-kanban-toolbar')).toBeVisible();
		await page.getByRole('button', { name: /Reset filters|R.initialiser/i }).click();
		await expect(page.locator('.workflow-saved-view-bar')).not.toContainText(/E2E Review Queue/i);
		await page.getByPlaceholder(/Task, project, description|T.che, projet, description|Tache, projet, description/i).fill('E2E Task From Chat Source');
		const sourceTaskResult = page.locator('.workflow-workspace-search-results a').filter({ hasText: 'E2E Task From Chat Source' }).first();
		await expect(sourceTaskResult).toBeVisible({ timeout: 30_000 });
		await sourceTaskResult.click();
		await expect(page).toHaveURL(/\/dashboard\/board\?task=\d+/);

		await expect(page.getByText(/Source chat message|Message chat source/i)).toBeVisible();
		await expect(page.getByRole('link', { name: /Open source chat|Ouvrir le chat source/i })).toHaveAttribute('href', /\/dashboard\/chat\?thread=\d+&message=\d+/);
	});

	test('opens seeded notification actions', async ({ page }) => {
		await page.goto('/dashboard/notifications');

		await expect(page.locator('body')).toContainText(/Review requested|Demande de revue|E2E Review Approval Card/i, { timeout: 30_000 });
		await expect(page.getByRole('button', { name: /Snooze 1h|Masquer/i }).first()).toBeVisible();
		await expect(page.getByRole('button', { name: /Accept|Move to progress|Accepter|progress/i }).first()).toBeVisible();
	});
});
