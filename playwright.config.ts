import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3004';
const shouldStartServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER !== '1';
const configuredWorkers = Number(process.env.PLAYWRIGHT_WORKERS ?? '1');

export default defineConfig({
	testDir: './e2e',
	timeout: 30_000,
	expect: {
		timeout: 10_000,
	},
	fullyParallel: false,
	workers: Number.isFinite(configuredWorkers) && configuredWorkers > 0 ? configuredWorkers : 1,
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	...(shouldStartServer
		? {
				webServer: {
					command: 'bun run dev',
					url: baseURL,
					reuseExistingServer: true,
					timeout: 120_000,
				},
			}
		: {}),
});
