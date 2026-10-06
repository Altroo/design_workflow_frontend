import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ErrorBoundary } from './errorBoundary';
import { LanguageContextProvider } from '@/contexts/languageContext';
import { notFound, redirect } from 'next/navigation';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

// A component that throws on render
const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
	if (shouldThrow) throw new Error('Test error');
	return <div data-testid="ok">OK</div>;
};

describe('ErrorBoundary', () => {
	// Suppress React's console.error for expected boundary errors
	beforeEach(() => {
		jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('renders children when no error occurs', () => {
		render(
			<ErrorBoundary>
				<ThrowingComponent shouldThrow={false} />
			</ErrorBoundary>,
		);
		expect(screen.getByTestId('ok')).toBeInTheDocument();
	});

	it('renders the default error UI when a child throws', () => {
		render(
			<ErrorBoundary>
				<ThrowingComponent shouldThrow={true} />
			</ErrorBoundary>,
		);
		expect(screen.getByText(/Une erreur est survenue/i)).toBeInTheDocument();
		expect(screen.getByText(/Nous nous excusons/i)).toBeInTheDocument();
	});

	it('renders user-provided fallback when a child throws and fallback is given', () => {
		render(
			<ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Fallback</div>}>
				<ThrowingComponent shouldThrow={true} />
			</ErrorBoundary>,
		);
		expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
		expect(screen.queryByText(/Une erreur est survenue/i)).not.toBeInTheDocument();
	});

	it('resets to show children after clicking reset button', async () => {
		// First render with error
		const { rerender } = render(
			<ErrorBoundary>
				<ThrowingComponent shouldThrow={true} />
			</ErrorBoundary>,
		);

		expect(screen.getByText(/Une erreur est survenue/i)).toBeInTheDocument();

		// First, switch to non-throwing children so they won't re-throw after reset
		rerender(
			<ErrorBoundary>
				<ThrowingComponent shouldThrow={false} />
			</ErrorBoundary>,
		);

		// Find and click the reset/retry button
		const resetBtn = screen.getByRole('button', { name: /réessayer/i });
		await userEvent.click(resetBtn);

		// Non-throwing children should now be rendered
		expect(screen.getByTestId('ok')).toBeInTheDocument();
	});

	it('shows error message in dev mode (NODE_ENV test is non-production)', () => {
		render(
			<ErrorBoundary>
				<ThrowingComponent shouldThrow={true} />
			</ErrorBoundary>,
		);
		// In test/dev environment the error message should be shown
		expect(screen.getByText('Test error')).toBeInTheDocument();
	});

	it('uses the current language context rather than a stale storage preference', () => {
		localStorage.setItem('app-language', 'fr');
		render(
			<LanguageContextProvider initialLanguage="en">
				<ErrorBoundary>
					<ThrowingComponent shouldThrow />
				</ErrorBoundary>
			</LanguageContextProvider>,
		);
		expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
		localStorage.removeItem('app-language');
	});

	it('retries server content through the Next router', async () => {
		const router: AppRouterInstance = {
			bfcacheId: 'test-route',
			back: jest.fn(),
			forward: jest.fn(),
			refresh: jest.fn(),
			push: jest.fn(),
			replace: jest.fn(),
			prefetch: jest.fn(),
		};
		render(
			<AppRouterContext value={router}>
				<ErrorBoundary>
					<ThrowingComponent shouldThrow />
				</ErrorBoundary>
			</AppRouterContext>,
		);
		await userEvent.click(screen.getByRole('button', { name: /réessayer/i }));
		expect(router.refresh).toHaveBeenCalledTimes(1);
	});

	it.each([
		['redirect', () => redirect('/login'), 'NEXT_REDIRECT'],
		['not found', () => notFound(), 'NEXT_HTTP_ERROR_FALLBACK;404'],
	])('does not swallow a Next.js %s response', (_name, navigate, expected) => {
		const Navigation = () => {
			navigate();
			return null;
		};
		expect(() =>
			render(
				<ErrorBoundary>
					<Navigation />
				</ErrorBoundary>,
			),
		).toThrow(expected);
	});
});
