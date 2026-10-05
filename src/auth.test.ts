import NextAuth from 'next-auth';
import type { Account, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

// Mock dependencies before importing auth
jest.mock('next-auth', () => {
	const mockNextAuth = jest.fn(() => ({
		handlers: { GET: jest.fn(), POST: jest.fn() },
		auth: jest.fn(),
	}));
	return {
		__esModule: true,
		default: mockNextAuth,
	};
});

jest.mock('next-auth/providers/credentials', () => ({
	__esModule: true,
	default: jest.fn((config) => ({ ...config, type: 'credentials' })),
}));

jest.mock('@/utils/helpers', () => ({
	allowAnyInstance: jest.fn(() => ({})),
}));

jest.mock('@/utils/apiHelpers', () => ({
	postApi: jest.fn(),
}));

import { allowAnyInstance } from '@/utils/helpers';
import { postApi } from '@/utils/apiHelpers';

const mockedNextAuth = NextAuth as jest.Mock;
const mockedPostApi = postApi as jest.Mock;
const mockedAllowAnyInstance = allowAnyInstance as jest.Mock;
let getAuthenticatedWorkflowUser: typeof import('./auth').getAuthenticatedWorkflowUser;

const signedUser = {
	id: '1',
	pk: 1,
	email: 'test@example.com',
	emailVerified: null,
	name: 'John Doe',
	first_name: 'John',
	last_name: 'Doe',
	role: 'manager' as const,
	is_staff: true,
	is_superuser: true,
	image: null,
};

const currentProfile = {
	id: 1,
	email: 'updated@example.com',
	first_name: 'Jane',
	last_name: 'Doe',
	role: 'designer',
	is_staff: false,
	is_superuser: false,
	avatar: '/media/avatar.jpg',
	avatar_cropped: '/media/avatar-small.jpg',
};

// Helper to extract config passed to NextAuth
const getNextAuthConfig = () => {
	return mockedNextAuth.mock.calls[0]?.[0];
};

// Helper to get authorize function from credentials provider
const getAuthorizeFunction = () => {
	const config = getNextAuthConfig();
	return config?.providers?.[0]?.authorize;
};

const getSsoAuthorizeFunction = () => {
	const config = getNextAuthConfig();
	return config?.providers?.[1]?.authorize;
};

// Helper to get callbacks
const getCallbacks = () => {
	const config = getNextAuthConfig();
	return config?.callbacks;
};

describe('auth.ts', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Re-import to trigger NextAuth call
		jest.isolateModules(() => {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			getAuthenticatedWorkflowUser = require('./auth').getAuthenticatedWorkflowUser;
		});
	});

	describe('NextAuth Configuration', () => {
		it('should configure NextAuth with correct settings', () => {
			expect(mockedNextAuth).toHaveBeenCalled();
			const config = getNextAuthConfig();

			expect(config).toBeDefined();
			expect(config.session).toEqual({
				strategy: 'jwt',
				maxAge: 6 * 24 * 60 * 60,
				updateAge: 60 * 60,
			});
			expect(config.jwt).toEqual({
				maxAge: 6 * 24 * 60 * 60,
			});
			expect(config.pages).toEqual({
				signIn: '/login',
				error: '/login',
			});
		});

		it('should have credentials provider configured', () => {
			const config = getNextAuthConfig();
			const provider = config?.providers?.[0];

			expect(provider).toBeDefined();
			expect(provider.type).toBe('credentials');
			expect(provider.name).toBe('credentials');
			expect(provider.credentials).toEqual({
				email: { label: 'Email', type: 'email', placeholder: 'email' },
				password: { label: 'Password', type: 'password', placeholder: 'password' },
			});
		});
	});

	describe('authorize function', () => {
		const validCredentials = {
			email: 'test@example.com',
			password: 'password123',
		};

		const mockSuccessResponse = {
			status: 200,
			data: {
				user: {
					pk: 1,
					email: 'test@example.com',
					first_name: 'John',
					last_name: 'Doe',
				},
				access: 'access-token-123',
				refresh: 'refresh-token-456',
				access_expiration: '2025-12-31T00:00:00Z',
				refresh_expiration: '2026-01-15T00:00:00Z',
			},
		};

		it('should return null for invalid email format', async () => {
			const authorize = getAuthorizeFunction();
			const result = await authorize({ email: 'invalid-email', password: 'pass' });

			expect(result).toBeNull();
			expect(mockedPostApi).not.toHaveBeenCalled();
		});

		it('should return null for missing password', async () => {
			const authorize = getAuthorizeFunction();
			const result = await authorize({ email: 'test@example.com' });

			expect(result).toBeNull();
		});

		it('should return null for missing email', async () => {
			const authorize = getAuthorizeFunction();
			const result = await authorize({ password: 'password123' });

			expect(result).toBeNull();
		});

		it('should return user object on successful login', async () => {
			mockedPostApi.mockResolvedValueOnce(mockSuccessResponse);

			const authorize = getAuthorizeFunction();
			const result = await authorize(validCredentials);

			expect(mockedAllowAnyInstance).toHaveBeenCalled();
			expect(mockedPostApi).toHaveBeenCalledWith(expect.any(String), expect.any(Object), {
				email: validCredentials.email,
				password: validCredentials.password,
			});

			expect(result).toEqual({
				id: '1',
				email: 'test@example.com',
				name: 'John Doe',
				image: null,
				user: {
					id: '1',
					pk: 1,
					email: 'test@example.com',
					emailVerified: null,
					name: 'John Doe',
					first_name: 'John',
					last_name: 'Doe',
					role: 'designer',
					is_staff: false,
					is_superuser: false,
					image: null,
				},
				access: 'access-token-123',
				access_expiration: '2025-12-31T00:00:00Z',
				refresh: 'refresh-token-456',
				refresh_expiration: '2026-01-15T00:00:00Z',
			});
		});

		it('should return null when API returns non-200 status', async () => {
			mockedPostApi.mockResolvedValueOnce({ status: 401 });

			const authorize = getAuthorizeFunction();
			const result = await authorize(validCredentials);

			expect(result).toBeNull();
		});

		it('should return null when API throws', async () => {
			mockedPostApi.mockRejectedValueOnce(new Error('Network error'));

			const authorize = getAuthorizeFunction();
			const result = await authorize(validCredentials);

			expect(result).toBeNull();
		});
	});

	describe('sso authorize function', () => {
		it('hydrates workflow role from profile after SSO exchange', async () => {
			const profileGet = jest.fn().mockResolvedValue({
				status: 200,
				data: {
					pk: 1,
					email: 'manager@example.com',
					first_name: 'Manager',
					last_name: 'User',
					role: 'manager',
					is_staff: true,
					is_superuser: true,
				},
			});
			mockedAllowAnyInstance.mockReturnValueOnce({ get: profileGet });
			mockedPostApi.mockResolvedValueOnce({
				status: 200,
				data: {
					user: {
						pk: 1,
						email: 'manager@example.com',
						first_name: 'Manager',
						last_name: 'User',
					},
					access: 'access-token-123',
					refresh: 'refresh-token-456',
					access_expiration: '2025-12-31T00:00:00Z',
					refresh_expiration: '2026-01-15T00:00:00Z',
				},
			});

			const authorize = getSsoAuthorizeFunction();
			const result = await authorize({ code: 'sso-code' });

			expect(profileGet).toHaveBeenCalledWith(expect.any(String), {
				headers: { Authorization: 'Bearer access-token-123' },
			});
			expect(result.user.role).toBe('manager');
			expect(result.user.is_staff).toBe(true);
			expect(result.user.is_superuser).toBe(true);
		});
	});

	describe('signIn callback', () => {
		it('should return true and attach tokens for credentials provider', async () => {
			const callbacks = getCallbacks();
			const user = {
				user: { pk: 1, email: 'test@example.com' },
				access: 'access-token',
				refresh: 'refresh-token',
				access_expiration: '2025-12-31',
				refresh_expiration: '2026-01-15',
			} as unknown as User;

			const account = {
				provider: 'credentials',
			} as Account;

			const result = await callbacks.signIn({ user, account });

			expect(result).toBe(true);
			expect(account.user).toEqual(user.user);
			expect(account.access).toBe('access-token');
			expect(account.refresh).toBe('refresh-token');
		});

		it('should return false for non-credentials provider', async () => {
			const callbacks = getCallbacks();
			const user = {} as User;
			const account = { provider: 'google' } as Account;

			const result = await callbacks.signIn({ user, account });

			expect(result).toBe(false);
		});

		it('should return false when account is null', async () => {
			const callbacks = getCallbacks();
			const user = {} as User;

			const result = await callbacks.signIn({ user, account: null });

			expect(result).toBe(false);
		});
	});

	describe('jwt callback', () => {
		it('should populate token on initial login', async () => {
			const callbacks = getCallbacks();
			const token = {} as JWT;
			const user = {
				user: { pk: 1, email: 'test@example.com' },
				access: 'access-token',
				refresh: 'refresh-token',
				access_expiration: '2025-12-31',
				refresh_expiration: '2026-01-15',
			} as unknown as User;
			const account = { provider: 'credentials' } as Account;

			const result = await callbacks.jwt({ token, account, user });

			expect(result.access).toBe('access-token');
			expect(result.refresh).toBe('refresh-token');
			expect(result.access_expiration).toBe('2025-12-31');
			expect(result.refresh_expiration).toBe('2026-01-15');
			expect(result.user).toEqual(user.user);
		});

		it('should refresh token when access token is expired', async () => {
			mockedPostApi.mockResolvedValueOnce({
				status: 200,
				data: {
					access: 'new-access-token',
					access_expiration: '2026-01-01T00:00:00Z',
					refresh: 'new-refresh-token',
				},
			});

			const callbacks = getCallbacks();
			const token = {
				access: 'old-access-token',
				refresh: 'old-refresh-token',
				access_expiration: 0, // Already expired
			} as unknown as JWT;

			const result = await callbacks.jwt({ token, account: undefined, user: undefined });

			expect(mockedPostApi).toHaveBeenCalled();
			expect(result.access).toBe('new-access-token');
			expect(result.access_expiration).toBe('2026-01-01T00:00:00Z');
			expect(result.refresh).toBe('new-refresh-token');
		});

		it('should keep old refresh token if not provided in refresh response', async () => {
			mockedPostApi.mockResolvedValueOnce({
				status: 200,
				data: {
					access: 'new-access-token',
					accessTokenExpires: '2026-01-01',
					// No refresh token in response
				},
			});

			const callbacks = getCallbacks();
			const token = {
				access: 'old-access-token',
				refresh: 'old-refresh-token',
				access_expiration: 0,
			} as unknown as JWT;

			const result = await callbacks.jwt({ token, account: undefined, user: undefined });

			expect(result.refresh).toBe('old-refresh-token');
		});

		it('should handle refresh token failure gracefully', async () => {
			mockedPostApi.mockRejectedValueOnce(new Error('Refresh failed'));

			const callbacks = getCallbacks();
			const token = {
				access: 'old-access-token',
				refresh: 'old-refresh-token',
				access_expiration: 0,
			} as unknown as JWT;

			const result = await callbacks.jwt({ token, account: undefined, user: undefined });

			// For transient errors (not 401), the stale token is preserved so the session survives retries.
			expect(result).toEqual(expect.objectContaining({ access: 'old-access-token', refresh: 'old-refresh-token' }));
		});

		it('should not refresh when token is not expired', async () => {
			const callbacks = getCallbacks();
			const futureTimestamp = Date.now() + 1000 * 60 * 60; // 1 hour from now
			const token = {
				access: 'current-access-token',
				refresh: 'current-refresh-token',
				access_expiration: futureTimestamp,
			} as unknown as JWT;

			const result = await callbacks.jwt({ token, account: undefined, user: undefined });

			expect(mockedPostApi).not.toHaveBeenCalled();
			expect(result.access).toBe('current-access-token');
		});

		it('refreshes role and profile from the backend, never the client update payload', async () => {
			const profileGet = jest.fn().mockResolvedValue({ status: 200, data: currentProfile });
			mockedAllowAnyInstance.mockReturnValueOnce({ get: profileGet });
			const token = {
				access: 'signed-access', refresh: 'signed-refresh',
				access_expiration: Date.now() + 60 * 60 * 1000,
				user: signedUser,
			};
			const result = await getCallbacks().jwt({
				token, trigger: 'update',
				session: { access: 'forged-access', user: { ...signedUser, pk: 999, role: 'manager', is_superuser: true } },
			});

			expect(profileGet).toHaveBeenCalledWith(expect.any(String), {
				headers: { Authorization: 'Bearer signed-access' }, timeout: 10_000,
			});
			expect(result.access).toBe('signed-access');
			expect(result.user).toMatchObject({
				pk: 1, name: 'Jane Doe', email: 'updated@example.com', role: 'designer',
				is_staff: false, is_superuser: false, image: '/media/avatar-small.jpg',
			});
			expect(mockedPostApi).not.toHaveBeenCalled();
		});

		it('uses the rotated access token to refresh roles during routine token refresh', async () => {
			const profileGet = jest.fn().mockResolvedValue({ status: 200, data: currentProfile });
			mockedAllowAnyInstance.mockReturnValueOnce({}).mockReturnValueOnce({ get: profileGet });
			mockedPostApi.mockResolvedValueOnce({
				status: 200, data: { access: 'rotated-access', access_expiration: new Date(Date.now() + 3600000).toISOString() },
			});
			const result = await getCallbacks().jwt({ token: {
				access: 'expired-access', refresh: 'signed-refresh', access_expiration: 0, user: signedUser,
			} });

			expect(profileGet).toHaveBeenCalledWith(expect.any(String), {
				headers: { Authorization: 'Bearer rotated-access' }, timeout: 10_000,
			});
			expect(result.user.role).toBe('designer');
		});

		it('does not fetch a profile during ordinary session polling with a current access token', async () => {
			await getCallbacks().jwt({ token: {
				access: 'signed-access', refresh: 'signed-refresh',
				access_expiration: Date.now() + 3600000, user: signedUser,
			} });
			expect(mockedAllowAnyInstance).not.toHaveBeenCalled();
		});

		it.each([401, 403])('clears a session when the profile rejects access (%s)', async (status) => {
			mockedAllowAnyInstance.mockReturnValueOnce({ get: jest.fn().mockRejectedValue({ response: { status } }) });
			const result = await getCallbacks().jwt({ token: {
				access: 'signed-access', access_expiration: Date.now() + 3600000, user: signedUser,
			}, trigger: 'update' });
			expect(result).toBeNull();
		});

		it('does not adopt client privileges if the backend is unavailable', async () => {
			mockedAllowAnyInstance.mockReturnValueOnce({ get: jest.fn().mockRejectedValue(new Error('Offline')) });
			const user = { ...signedUser, role: 'designer', is_staff: false, is_superuser: false };
			const token = { access: 'signed-access', access_expiration: Date.now() + 3600000, user };
			const result = await getCallbacks().jwt({
				token, trigger: 'update', session: { user: { ...user, role: 'manager', is_staff: true } },
			});
			expect(result.user).toEqual(user);
		});

		it('rejects a profile belonging to a different account', async () => {
			mockedAllowAnyInstance.mockReturnValueOnce({ get: jest.fn().mockResolvedValue({
				status: 200, data: { ...currentProfile, id: 999 },
			}) });
			const result = await getCallbacks().jwt({ token: {
				access: 'signed-access', access_expiration: Date.now() + 3600000, user: signedUser,
			}, trigger: 'update' });
			expect(result).toBeNull();
		});
	});

	describe('authoritative server page user', () => {
		it('returns current backend permissions instead of the role captured at login', async () => {
			mockedAllowAnyInstance.mockReturnValueOnce({ get: jest.fn().mockResolvedValue({ status: 200, data: currentProfile }) });
			const result = await getAuthenticatedWorkflowUser({ accessToken: 'signed-access', user: signedUser });
			expect(result).toMatchObject({ role: 'designer', is_staff: false, is_superuser: false });
		});

		it.each([401, 403, 500])('fails closed on a backend error (%s)', async (status) => {
			mockedAllowAnyInstance.mockReturnValueOnce({ get: jest.fn().mockRejectedValue({ error: { status_code: status } }) });
			expect(await getAuthenticatedWorkflowUser({ accessToken: 'signed-access', user: signedUser })).toBeNull();
		});

		it('fails closed on a malformed profile and an absent session', async () => {
			mockedAllowAnyInstance.mockReturnValueOnce({ get: jest.fn().mockResolvedValue({ status: 200, data: { role: 'manager' } }) });
			expect(await getAuthenticatedWorkflowUser({ accessToken: 'signed-access', user: signedUser })).toBeNull();
			expect(await getAuthenticatedWorkflowUser(null)).toBeNull();
		});
	});

	describe('session callback', () => {
		it('should populate session with token data', async () => {
			const callbacks = getCallbacks();
			const session = { user: {} } as {
				user: object;
				accessToken?: string;
				refreshToken?: string;
				accessTokenExpiration?: string;
				refreshTokenExpiration?: string;
			};
			const token = {
				access: 'access-token',
				refresh: 'refresh-token',
				access_expiration: '2025-12-31',
				refresh_expiration: '2026-01-15',
				user: { pk: 1, email: 'test@example.com' },
			} as unknown as JWT;

			const result = await callbacks.session({ session, token });

			expect(result.accessToken).toBe('access-token');
			expect(result.refreshToken).toBe('refresh-token');
			expect(result.accessTokenExpiration).toBe('2025-12-31');
			expect(result.refreshTokenExpiration).toBe('2026-01-15');
			expect(result.user).toEqual({ pk: 1, email: 'test@example.com' });
		});
	});
});
