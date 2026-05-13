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
const mockNotFound = jest.fn(() => ({ notFound: true }));
jest.mock('next/navigation', () => ({
	__esModule: true,
	redirect: mockRedirect,
	notFound: mockNotFound,
}));

jest.mock('@/components/pages/design-workflow/designWorkflowShell', () => ({
	__esModule: true,
	default: (props: { title?: string; variant?: string; taskId?: number }) => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const React = require('react');
		return React.createElement('div', null, `WORKFLOW_SHELL:${props.title}:${props.variant}:${props.taskId}`);
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

describe('DashboardTaskDetailPage server component', () => {
	it('redirects to login without a session', async () => {
		mockAuth.mockResolvedValueOnce(null);

		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const Page = require('./page').default as (props: { params: Promise<{ id: string }> }) => Promise<unknown>;

		await Page({ params: Promise.resolve({ id: '12' }) });
		expect(mockRedirect).toHaveBeenCalledWith(AUTH_LOGIN);
	});

	it('calls notFound for invalid ids', async () => {
		mockAuth.mockResolvedValueOnce({ user: { pk: 1, email: 'user@example.com' } });

		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const Page = require('./page').default as (props: { params: Promise<{ id: string }> }) => Promise<unknown>;

		await Page({ params: Promise.resolve({ id: 'bad' }) });
		expect(mockNotFound).toHaveBeenCalled();
	});

	it('renders task detail shell with numeric id', async () => {
		mockAuth.mockResolvedValueOnce({ user: { pk: 1, email: 'user@example.com' } });

		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const Page = require('./page').default as (props: { params: Promise<{ id: string }> }) => Promise<unknown>;

		const result = await Page({ params: Promise.resolve({ id: '12' }) });
		expect(renderToStaticMarkup(result as React.ReactElement)).toContain('WORKFLOW_SHELL:Task detail:task-detail:12');
	});
});
