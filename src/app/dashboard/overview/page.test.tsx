import { jest } from '@jest/globals';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

type Session = { user: { pk: number; email: string; role?: string } } | null;

const mockAuth = jest.fn() as jest.MockedFunction<() => Promise<Session>>;
jest.mock('@/auth', () => ({
	__esModule: true,
	auth: mockAuth,
}));

const mockHasWorkflowManagerAccess = jest.fn();
jest.mock('@/utils/workflowAccess', () => ({
	__esModule: true,
	hasWorkflowManagerAccess: (user: unknown) => mockHasWorkflowManagerAccess(user),
}));

const mockRedirect = jest.fn((url: string | URL) => {
	throw new Error(`redirect:${String(url)}`);
});
jest.mock('next/navigation', () => ({
	__esModule: true,
	redirect: mockRedirect,
}));

jest.mock('@/components/pages/design-workflow/designWorkflowShell', () => ({
	__esModule: true,
	default: (props: { title?: string; variant?: string }) => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const React = require('react');
		return React.createElement('div', null, `WORKFLOW_SHELL:${props.title}:${props.variant}`);
	},
}));

const AUTH_LOGIN = '/login';
const DASHBOARD_MY_WORK = '/dashboard/my-work';
jest.mock('@/utils/routes', () => ({
	__esModule: true,
	AUTH_LOGIN,
	DASHBOARD_MY_WORK,
}));

beforeEach(() => {
	jest.resetModules();
	jest.clearAllMocks();
});

describe('DashboardOverviewPage server component', () => {
	it('redirects to login without a session', async () => {
		mockAuth.mockResolvedValueOnce(null);

		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const Page = require('./page').default as () => Promise<unknown>;

		await expect(Page()).rejects.toThrow(`redirect:${AUTH_LOGIN}`);
		expect(mockRedirect).toHaveBeenCalledWith(AUTH_LOGIN);
	});

	it('redirects non-managers to my work', async () => {
		mockAuth.mockResolvedValueOnce({ user: { pk: 1, email: 'user@example.com' } });
		mockHasWorkflowManagerAccess.mockReturnValueOnce(false);

		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const Page = require('./page').default as () => Promise<unknown>;

		await expect(Page()).rejects.toThrow(`redirect:${DASHBOARD_MY_WORK}`);
		expect(mockRedirect).toHaveBeenCalledWith(DASHBOARD_MY_WORK);
	});

	it('renders overview shell for managers', async () => {
		mockAuth.mockResolvedValueOnce({ user: { pk: 1, email: 'manager@example.com' } });
		mockHasWorkflowManagerAccess.mockReturnValueOnce(true);

		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const Page = require('./page').default as () => Promise<unknown>;

		const result = await Page();
		expect(renderToStaticMarkup(result as React.ReactElement)).toContain('WORKFLOW_SHELL:Overview:overview');
	});
});
