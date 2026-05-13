import { jest } from '@jest/globals';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

type Session = { user: { pk: number; email: string } } | null;

const mockAuth = jest.fn() as jest.MockedFunction<() => Promise<Session>>;
jest.mock('@/auth', () => ({
	__esModule: true,
	auth: mockAuth,
}));

const mockRedirect = jest.fn((url: string | URL) => ({ redirectedTo: String(url) }));
jest.mock('next/navigation', () => ({
	__esModule: true,
	redirect: mockRedirect,
}));

jest.mock('@/components/pages/design-workflow/designWorkflowShell', () => ({
	__esModule: true,
	default: (props: { title?: string; variant?: string; projectId?: number }) => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const React = require('react');
		return React.createElement('div', null, `WORKFLOW_SHELL:${props.title}:${props.variant}:${props.projectId}`);
	},
}));

const AUTH_LOGIN = '/login';
jest.mock('@/utils/routes', () => ({
	__esModule: true,
	AUTH_LOGIN,
}));

beforeEach(() => {
	jest.resetModules();
	jest.clearAllMocks();
});

describe('DashboardProjectDetailPage server component', () => {
	it('redirects to login without a session', async () => {
		mockAuth.mockResolvedValueOnce(null);

		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const Page = require('./page').default as (props: { params: Promise<{ id: string }> }) => Promise<unknown>;

		await Page({ params: Promise.resolve({ id: '5' }) });
		expect(mockRedirect).toHaveBeenCalledWith(AUTH_LOGIN);
	});

	it('renders project detail shell with id', async () => {
		mockAuth.mockResolvedValueOnce({ user: { pk: 1, email: 'user@example.com' } });

		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const Page = require('./page').default as (props: { params: Promise<{ id: string }> }) => Promise<unknown>;

		const result = await Page({ params: Promise.resolve({ id: '5' }) });
		expect(renderToStaticMarkup(result as React.ReactElement)).toContain('WORKFLOW_SHELL:Project:project-detail:5');
	});
});
