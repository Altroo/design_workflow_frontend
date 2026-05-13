import { jest } from '@jest/globals';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

type Session = { user: { pk: number; email: string; role?: string } } | null;

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
	default: (props: { title?: string; variant?: string; taskId?: number }) => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const React = require('react');
		return React.createElement('div', null, `WORKFLOW_SHELL:${props.title}:${props.variant}:${props.taskId ?? 'none'}`);
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

describe('DashboardBoardPage server component', () => {
	it('redirects to login without a session', async () => {
		mockAuth.mockResolvedValueOnce(null);

		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const Page = require('./page').default as (props?: { searchParams?: Promise<{ task?: string }> }) => Promise<unknown>;

		await Page({});
		expect(mockRedirect).toHaveBeenCalledWith(AUTH_LOGIN);
	});

	it('renders board shell and forwards task id', async () => {
		mockAuth.mockResolvedValueOnce({ user: { pk: 1, email: 'user@example.com' } });

		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const Page = require('./page').default as (props?: { searchParams?: Promise<{ task?: string }> }) => Promise<unknown>;

		const result = await Page({ searchParams: Promise.resolve({ task: '22' }) });
		expect(renderToStaticMarkup(result as React.ReactElement)).toContain('WORKFLOW_SHELL:Board:board:22');
	});
});
