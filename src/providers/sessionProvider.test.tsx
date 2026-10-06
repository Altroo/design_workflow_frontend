import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import SessionProvider from './sessionProvider';

jest.mock('next-auth/react', () => ({
	SessionProvider: jest.fn(({ children }: ComponentProps<typeof NextAuthSessionProvider>) => <>{children}</>),
}));

it('passes the session and children through with proactive refresh and focus refresh enabled', () => {
	const session = {
		expires: '2026-12-31T00:00:00Z',
		accessToken: 'test-access',
		refreshToken: 'test-refresh',
		accessTokenExpiration: '2026-12-31T00:00:00Z',
		refreshTokenExpiration: '2026-12-31T00:00:00Z',
		user: {
			id: '1',
			pk: 1,
			name: 'Test Designer',
			email: 'designer@example.test',
			emailVerified: null,
			first_name: 'Test',
			last_name: 'Designer',
			role: 'designer' as const,
		},
	};
	render(
		<SessionProvider session={session} refetchInterval={0} refetchOnWindowFocus={false}>
			<span>Workspace</span>
		</SessionProvider>,
	);
	expect(screen.getByText('Workspace')).toBeInTheDocument();
	expect(jest.mocked(NextAuthSessionProvider).mock.calls[0][0]).toMatchObject({
		session,
		refetchInterval: 240,
		refetchOnWindowFocus: true,
	});
});
