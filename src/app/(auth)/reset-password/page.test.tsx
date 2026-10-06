import { jest } from '@jest/globals';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';

jest.mock('@/components/pages/auth/reset-password/resetPassword', () => ({
	__esModule: true,
	default: () => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { createElement } = require('react');
		return createElement('div', null, 'RESET_PASSWORD_CLIENT_MARKER');
	},
}));

afterEach(() => {
	jest.resetModules();
	jest.clearAllMocks();
});

it.each(['en', 'fr'] as const)('metadata follows the selected server language (%s)', async (language) => {
	jest.resetModules();
	const { translations } = await import('@/translations');
	const t = translations[language];
	jest.doMock('@/utils/serverTranslations', () => ({ getServerTranslations: async () => t }));
	const { generateMetadata } = await import('./page');
	await expect(generateMetadata()).resolves.toEqual({ title: t.metadata.resetPasswordTitle });
});

describe('ResetPasswordPage', () => {
	it('renders ResetPasswordClient', () => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const mod = require('./page');
		const Page = mod.default as () => unknown;
		const html = renderToStaticMarkup(Page() as ReactElement);
		expect(html).toContain('RESET_PASSWORD_CLIENT_MARKER');
	});
});
