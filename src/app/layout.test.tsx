import { renderToStaticMarkup } from 'react-dom/server';
import type { PropsWithChildren } from 'react';
import { cookies } from 'next/headers';
import { getServerTranslations } from '@/utils/serverTranslations';
import { en } from '@/translations/en';
import { fr } from '@/translations/fr';
import RootLayout, { generateMetadata, viewport } from './layout';

const mockProvider = ({ children }: PropsWithChildren) => children;
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@/utils/serverTranslations', () => ({ getServerTranslations: jest.fn() }));
jest.mock('next/font/local', () => {
	const optionsSeen = { current: {} };
	return {
		__esModule: true,
		optionsSeen,
		default: (options: object) => {
			optionsSeen.current = options;
			return { variable: 'font-poppins' };
		},
	};
});
jest.mock('@/providers/sessionProvider', () => ({
	__esModule: true,
	default: (props: PropsWithChildren) => mockProvider(props),
}));
jest.mock('@/providers/storeProvider', () => ({
	__esModule: true,
	default: (props: PropsWithChildren) => mockProvider(props),
}));
jest.mock('@/providers/themeProvider', () => ({
	__esModule: true,
	default: (props: PropsWithChildren) => mockProvider(props),
}));
jest.mock('@/contexts/InitContext', () => ({ InitContextProvider: (props: PropsWithChildren) => mockProvider(props) }));
jest.mock('@/contexts/languageContext', () => ({
	LanguageContextProvider: (props: PropsWithChildren) => mockProvider(props),
}));
jest.mock('@/contexts/toastContext', () => ({
	ToastContextProvider: (props: PropsWithChildren) => mockProvider(props),
}));
jest.mock('@/components/shared/errorBoundary', () => ({
	ErrorBoundary: (props: PropsWithChildren) => mockProvider(props),
}));
jest.mock('@/contexts/initEffects', () => ({ InitEffects: () => null }));
jest.mock('@/components/shared/sessionExpiredListener/sessionExpiredListener', () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock('@/components/shared/maintenance/Maintenance', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/shared/appUpdate/appUpdate', () => ({ __esModule: true, default: () => null }));

it('loads fallback Poppins fonts only when a page actually uses them', () => {
	expect(jest.requireMock('next/font/local').optionsSeen.current).toMatchObject({
		preload: false,
		display: 'swap',
		variable: '--font-poppins',
	});
});

it.each([en, fr])('generates localized app metadata with indexing disabled', async (translation) => {
	jest.mocked(getServerTranslations).mockResolvedValue(translation);
	expect(await generateMetadata()).toMatchObject({
		title: translation.metadata.appTitle,
		applicationName: translation.metadata.appTitle,
		robots: { index: false, follow: false },
		manifest: '/assets/ico/manifest.json',
	});
	expect(viewport).toMatchObject({ width: 'device-width', initialScale: 1 });
});

it.each([
	{ language: 'en', theme: 'dark', expectedLanguage: 'en', expectedTheme: 'dark' },
	{ language: 'fr', theme: 'light', expectedLanguage: 'fr', expectedTheme: 'light' },
	{ language: 'invalid', theme: 'invalid', expectedLanguage: 'fr', expectedTheme: 'light' },
	{ language: undefined, theme: undefined, expectedLanguage: 'fr', expectedTheme: 'light' },
])(
	'renders a complete document from cookie preferences ($language/$theme)',
	async ({ language, theme, expectedLanguage, expectedTheme }) => {
		jest.mocked(getServerTranslations).mockResolvedValue(expectedLanguage === 'en' ? en : fr);
		jest.mocked(cookies).mockResolvedValue({
			get: (name: string) => {
				const value = name === 'app-language' ? language : theme;
				return value ? { name, value } : undefined;
			},
		} as Awaited<ReturnType<typeof cookies>>);
		const markup = renderToStaticMarkup(await RootLayout({ children: <h1>Workspace</h1> }));
		const document = new DOMParser().parseFromString(markup, 'text/html');
		expect(document.documentElement.lang).toBe(expectedLanguage);
		expect(document.documentElement.dataset.theme).toBe(expectedTheme);
		expect(document.querySelector('#main-content h1')?.textContent).toBe('Workspace');
		expect(document.querySelector('a.skip-to-content')?.getAttribute('href')).toBe('#main-content');
		expect(document.body.className).toBe('font-poppins');
	},
);
