import { render, renderHook, screen } from '@testing-library/react';
import { InitContextProvider, useInitAccessToken, useInitContext } from './InitContext';
import { emptyInitStateToken } from '@/store/slices/_initSlice';
import { useAppSelector } from '@/utils/hooks';
import { getInitStateToken } from '@/store/selectors';

jest.mock('@/utils/hooks');
jest.mock('@/store/selectors');

describe('InitContextProvider', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useAppSelector as jest.Mock).mockImplementation((selector) => {
			if (selector === getInitStateToken) return { access: 'mock-token', refresh: 'mock-refresh' };
			return undefined;
		});
	});

	it('exposes initialized tokens to context consumers', () => {
		const { result } = renderHook(() => ({ context: useInitContext(), token: useInitAccessToken() }), {
			wrapper: InitContextProvider,
		});
		expect(result.current.context.initStateToken).toEqual({ access: 'mock-token', refresh: 'mock-refresh' });
		expect(result.current.token).toBe('mock-token');
	});

	it('uses the session token when Redux has not initialized', () => {
		jest.mocked(useAppSelector).mockReturnValue(undefined);
		const session = {
			accessToken: 'session-token',
			refreshToken: '',
			accessTokenExpiration: '',
			refreshTokenExpiration: '',
			expires: '',
			user: {
				id: '1',
				pk: 1,
				name: 'Test',
				email: 'test@example.test',
				emailVerified: null,
				first_name: 'Test',
				last_name: 'User',
				role: 'designer' as const,
			},
		};
		const { result } = renderHook(() => ({ context: useInitContext(), token: useInitAccessToken(session) }), {
			wrapper: InitContextProvider,
		});
		expect(result.current.context.initStateToken).toEqual(emptyInitStateToken);
		expect(result.current.token).toBe('session-token');
	});

	it('renders children', () => {
		render(
			<InitContextProvider>
				<div data-testid="child">Child</div>
			</InitContextProvider>,
		);
		expect(screen.getByTestId('child')).toBeInTheDocument();
	});

	it('calls useAppSelector with getInitStateToken selector', () => {
		render(
			<InitContextProvider>
				<div />
			</InitContextProvider>,
		);
		expect(useAppSelector).toHaveBeenCalledWith(getInitStateToken);
	});

	it('renders children even when selector returns undefined (uses emptyInitStateToken fallback)', () => {
		(useAppSelector as jest.Mock).mockReturnValue(undefined);
		render(
			<InitContextProvider>
				<div data-testid="child">Child</div>
			</InitContextProvider>,
		);
		expect(screen.getByTestId('child')).toBeInTheDocument();
	});
});
