describe('routes', () => {
	const OLD_ENV = process.env;

	beforeEach(() => {
		jest.resetModules();
		process.env = { ...OLD_ENV };
	});

	afterAll(() => {
		process.env = OLD_ENV;
	});

	it('builds routes with a prefix', () => {
		process.env.NEXT_PUBLIC_DOMAIN_URL_PREFIX = 'https://app.example.com';
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const routes = require('./routes');

		expect(routes.SITE_ROOT).toBe('https://app.example.com/');
		expect(routes.AUTH_LOGIN).toBe('https://app.example.com//login');
		expect(routes.AUTH_RESET_PASSWORD).toBe('https://app.example.com//reset-password');
		expect(routes.AUTH_RESET_PASSWORD_ENTER_CODE).toBe('https://app.example.com//reset-password/enter-code');
		expect(routes.AUTH_RESET_PASSWORD_SET_PASSWORD).toBe('https://app.example.com//reset-password/set-password');
		expect(routes.AUTH_RESET_PASSWORD_COMPLETE).toBe('https://app.example.com//reset-password/set-password-complete');
		expect(routes.DASHBOARD).toBe('https://app.example.com/dashboard');
		expect(routes.DASHBOARD_EDIT_PROFILE).toBe('https://app.example.com/dashboard/settings/edit-profile');
		expect(routes.DASHBOARD_PASSWORD).toBe('https://app.example.com/dashboard/settings/password');
	});

	it('builds USERS routes with a prefix', () => {
		process.env.NEXT_PUBLIC_DOMAIN_URL_PREFIX = 'https://app.example.com';
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const routes = require('./routes');

		expect(routes.USERS_LIST).toBe('https://app.example.com/dashboard/users');
		expect(routes.USERS_ADD).toBe('https://app.example.com/dashboard/users/new');
		expect(routes.USERS_VIEW(7)).toBe('https://app.example.com/dashboard/users/7');
		expect(routes.USERS_EDIT(7)).toBe('https://app.example.com/dashboard/users/7/edit');
	});

	it('builds routes without prefix (undefined)', () => {
		// @ts-expect-error - deleting a required env var for testing purposes
		delete process.env.NEXT_PUBLIC_DOMAIN_URL_PREFIX;
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const routes = require('./routes');

		expect(routes.SITE_ROOT).toBe('undefined/');
		expect(routes.AUTH_LOGIN).toContain('/login');
	});
});
