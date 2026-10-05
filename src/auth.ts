import NextAuth, { type Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import z from 'zod';
import { allowAnyInstance } from '@/utils/helpers';
import { postApi } from '@/utils/apiHelpers';
import type { AccountPostLoginResponseType } from '@/types/accountTypes';
import type { tokenUser } from '@/types/next-auth';

const workflowProfileSchema = z.object({
	id: z.number().int().positive().optional(),
	pk: z.number().int().positive().optional(),
	email: z.email(),
	first_name: z.string(),
	last_name: z.string(),
	role: z.enum(['manager', 'designer']),
	is_staff: z.boolean(),
	is_superuser: z.boolean(),
	avatar: z.string().nullable().optional(),
	avatar_cropped: z.string().nullable().optional(),
});

const getAuthErrorStatus = (error: unknown): number | undefined => {
	const value = error as { error?: { status_code?: number }; response?: { status?: number } } | null;
	return value?.error?.status_code ?? value?.response?.status;
};

const fetchAuthenticatedWorkflowUser = async (
	accessToken: string,
	currentUser: tokenUser,
): Promise<tokenUser | null> => {
	if (!accessToken || !currentUser?.pk) return null;
	const response = await allowAnyInstance().get(`${process.env.NEXT_PUBLIC_ACCOUNT_PROFIL}`, {
		headers: { Authorization: `Bearer ${accessToken}` },
		timeout: 10_000,
	});
	if (response.status !== 200) return null;
	const parsed = workflowProfileSchema.safeParse(response.data);
	if (!parsed.success) return null;
	const profile = parsed.data;
	// Profile identity must match the signed session, never update()'s client payload.
	if ((profile.id ?? profile.pk) !== currentUser.pk) return null;
	return {
		id: String(currentUser.pk),
		pk: currentUser.pk,
		email: profile.email,
		emailVerified: currentUser.emailVerified,
		name: `${profile.first_name} ${profile.last_name}`.trim(),
		first_name: profile.first_name,
		last_name: profile.last_name,
		role: profile.role,
		is_staff: profile.is_staff || profile.is_superuser,
		is_superuser: profile.is_superuser,
		image: profile.avatar_cropped || profile.avatar || null,
	};
};

// Server-rendered authorization must not rely on the role captured at login.
// The caller denies access when the authoritative profile cannot be checked.
export const getAuthenticatedWorkflowUser = async (
	session: Pick<Session, 'accessToken' | 'user'> | null,
): Promise<tokenUser | null> => {
	if (!session) return null;
	try {
		return await fetchAuthenticatedWorkflowUser(session.accessToken, session.user);
	} catch {
		return null;
	}
};

const getAuthCookies = (prefix: string) => {
	const secure = process.env.NEXTAUTH_URL?.startsWith('https://') ?? process.env.NODE_ENV === 'production';
	const baseOptions = { path: '/', sameSite: 'lax' as const, secure };

	return {
		sessionToken: {
			name: `${secure ? '__Secure-' : ''}${prefix}.session-token`,
			options: { ...baseOptions, httpOnly: true },
		},
		callbackUrl: {
			name: `${secure ? '__Secure-' : ''}${prefix}.callback-url`,
			options: { ...baseOptions, httpOnly: true },
		},
		csrfToken: {
			name: `${secure ? '__Host-' : ''}${prefix}.csrf-token`,
			options: { ...baseOptions, httpOnly: true },
		},
	};
};

const parseExpirationToMs = (expiration: unknown): number => {
	if (typeof expiration === 'number') {
		return Number.isFinite(expiration) ? expiration : 0;
	}

	if (typeof expiration === 'string') {
		const parsedDate = Date.parse(expiration);
		if (!Number.isNaN(parsedDate)) {
			return parsedDate;
		}

		const parsedNumber = Number(expiration);
		if (Number.isFinite(parsedNumber)) {
			return parsedNumber;
		}
	}

	return 0;
};

const getJwtExpirationIso = (token: string): string | null => {
	try {
		const payload = token.split('.')[1];
		if (!payload) {
			return null;
		}

		const decodedPayload = Buffer.from(payload, 'base64url').toString('utf8');
		const parsed = JSON.parse(decodedPayload) as { exp?: number };
		if (!parsed.exp || !Number.isFinite(parsed.exp)) {
			return null;
		}

		return new Date(parsed.exp * 1000).toISOString();
	} catch {
		return null;
	}
};

export const { handlers, auth } = NextAuth({
	providers: [
		Credentials({
			type: 'credentials',
			name: 'credentials',
			credentials: {
				email: { label: 'Email', type: 'email', placeholder: 'email' },
				password: { label: 'Password', type: 'password', placeholder: 'password' },
			},
			// used in login page ex :
			// await signIn('credentials', {email: values.email,password: values.password,redirect: false});
			async authorize(credentials) {
				const validatedCredentials = z
					.object({
						email: z.email(),
						password: z.string(),
					})
					.safeParse(credentials);

				if (!validatedCredentials.success) {
					return null;
				}

				const { email, password } = validatedCredentials.data;
				const url = `${process.env.NEXT_PUBLIC_ACCOUNT_LOGIN}`;

				try {
					const instance = allowAnyInstance();
					const response: AccountPostLoginResponseType = await postApi(url, instance, {
						email,
						password,
					});

					if (response.status === 200) {
						const { user, access, refresh, access_expiration, refresh_expiration } = response.data;
						let resolvedUser = user;
						try {
							const profileResponse = await instance.get(`${process.env.NEXT_PUBLIC_ACCOUNT_PROFIL}`, {
								headers: { Authorization: `Bearer ${access}` },
							});
							if (profileResponse.status === 200 && profileResponse.data) {
								resolvedUser = { ...user, ...profileResponse.data, pk: user.pk, email: user.email };
							}
						} catch {
							resolvedUser = user;
						}
						const isStaff = Boolean(resolvedUser.is_staff || resolvedUser.is_superuser);

						return {
							id: String(resolvedUser.pk ?? user.pk),
							email: resolvedUser.email ?? user.email,
							name: `${resolvedUser.first_name ?? user.first_name} ${resolvedUser.last_name ?? user.last_name}`,
							image: null,
							user: {
								id: String(resolvedUser.pk ?? user.pk),
								pk: resolvedUser.pk ?? user.pk,
								email: resolvedUser.email ?? user.email,
								emailVerified: null,
								name: `${resolvedUser.first_name ?? user.first_name} ${resolvedUser.last_name ?? user.last_name}`,
								first_name: resolvedUser.first_name ?? user.first_name,
								last_name: resolvedUser.last_name ?? user.last_name,
								role: resolvedUser.role ?? user.role ?? (isStaff ? 'manager' : 'designer'),
								is_staff: isStaff,
								is_superuser: Boolean(resolvedUser.is_superuser),
								image: null,
							},
							access,
							access_expiration,
							refresh,
							refresh_expiration,
						};
					} else {
						return null;
					}
				} catch (error) {
					console.error('[Auth] Login failed:', error instanceof Error ? error.message : error);
				}

				return null;
			},
		}),
		Credentials({
			id: 'sso-code',
			type: 'credentials',
			name: 'sso-code',
			credentials: {
				code: { label: 'Code', type: 'text' },
			},
			async authorize(credentials) {
				const validatedCredentials = z
					.object({
						code: z.string().min(1),
					})
					.safeParse(credentials);

				if (!validatedCredentials.success) {
					return null;
				}

				try {
					const instance = allowAnyInstance();
					const response: AccountPostLoginResponseType = await postApi(
						`${process.env.NEXT_PUBLIC_ACCOUNT_SSO_EXCHANGE}`,
						instance,
						{ code: validatedCredentials.data.code },
					);

					if (response.status === 200) {
						const { user, access, refresh, access_expiration, refresh_expiration } = response.data;
						let resolvedUser = user;
						try {
							const profileResponse = await instance.get(`${process.env.NEXT_PUBLIC_ACCOUNT_PROFIL}`, {
								headers: { Authorization: `Bearer ${access}` },
							});
							if (profileResponse.status === 200 && profileResponse.data) {
								resolvedUser = { ...user, ...profileResponse.data, pk: user.pk, email: user.email };
							}
						} catch {
							resolvedUser = user;
						}
						const isStaff = Boolean(resolvedUser.is_staff || resolvedUser.is_superuser);
						const role = resolvedUser.role ?? user.role ?? (isStaff ? 'manager' : 'designer');
						return {
							id: String(resolvedUser.pk ?? user.pk),
							email: resolvedUser.email ?? user.email,
							name: `${resolvedUser.first_name ?? user.first_name} ${resolvedUser.last_name ?? user.last_name}`,
							image: null,
							user: {
								id: String(resolvedUser.pk ?? user.pk),
								pk: resolvedUser.pk ?? user.pk,
								email: resolvedUser.email ?? user.email,
								emailVerified: null,
								name: `${resolvedUser.first_name ?? user.first_name} ${resolvedUser.last_name ?? user.last_name}`,
								first_name: resolvedUser.first_name ?? user.first_name,
								last_name: resolvedUser.last_name ?? user.last_name,
								role,
								is_staff: isStaff,
								is_superuser: Boolean(resolvedUser.is_superuser),
								image: null,
							},
							access,
							access_expiration,
							refresh,
							refresh_expiration,
						};
					}
				} catch (error) {
					console.error('[Auth] SSO login failed:', error instanceof Error ? error.message : error);
				}

				return null;
			},
		}),
	],

	secret: process.env.NEXTAUTH_SECRET, // Ensure this is set securely
	session: {
		strategy: 'jwt', // Persist the session using JWTs
		maxAge: 6 * 24 * 60 * 60,    // 6 days — safely within 7-day backend refresh window
		updateAge: 60 * 60, // Update JWT every 1 hour
	},
	jwt: {
		maxAge: 6 * 24 * 60 * 60,    // 6 days
	},

	cookies: getAuthCookies('ebh-design-workflow'),

	pages: {
		signIn: '/login',
		error: '/login',
	},

	callbacks: {
		async signIn({ user, account }) {
			if (account) {
				if (account.provider === 'credentials' || account.provider === 'sso-code') {
					account.user = user.user;
					account.access = user.access;
					account.refresh = user.refresh;
					account.access_expiration = user.access_expiration;
					account.refresh_expiration = user.refresh_expiration;
					return true;
				}
				return false;
			}
			return false;
		},

		async jwt({ token, account, user, trigger }) {
			if (account && user) {
				// On initial login
				token.access = user.access; // access token
				token.refresh = user.refresh; // refresh token
				token.access_expiration = user.access_expiration;
				token.refresh_expiration = user.refresh_expiration;
				token.user = user.user; // user object
				return token;
			}

			// NEW GUARD: if refresh token is itself expired, force re-auth immediately
			if (token.refresh_expiration && Date.now() >= parseExpirationToMs(token.refresh_expiration)) {
				return null;
			}

			// Proactively refresh the access token 5 minutes before it expires.
			// With refetchInterval polling every 4 minutes and a 15-minute access
			// token lifetime, this ensures a refresh happens at ~t=12min instead
			// of waiting until after expiry at t=16min.
			const REFRESH_BUFFER_MS = 5 * 60 * 1000;
			let refreshProfile = trigger === 'update';
			if (token.refresh && Date.now() >= parseExpirationToMs(token.access_expiration) - REFRESH_BUFFER_MS) {
				try {
					// Call your refresh token API if necessary
					const instance = allowAnyInstance();
					const refreshed = await postApi(`${process.env.NEXT_PUBLIC_ACCOUNT_REFRESH_TOKEN}`, instance, {
						refresh: token.refresh,
					});

					if (refreshed.status === 200) {
						const refreshedAccessToken = refreshed.data.access ?? refreshed.data.accessToken;
						if (!refreshedAccessToken) {
							return token;
						}

						token.access = refreshedAccessToken;
						refreshProfile = true;
						const refreshedAccessExpiration =
							refreshed.data.access_expiration ??
							refreshed.data.accessTokenExpires ??
							getJwtExpirationIso(refreshedAccessToken);

						if (refreshedAccessExpiration) {
							token.access_expiration = String(refreshedAccessExpiration);
						}
						if (refreshed.data.refresh) {
							token.refresh = refreshed.data.refresh;
						}
						if (refreshed.data.refresh_expiration) {
							token.refresh_expiration = String(refreshed.data.refresh_expiration);
						}
					}
				} catch (error) {
					console.error('[Auth] Token refresh failed:', error instanceof Error ? error.message : error);
					// Check if the backend explicitly rejected the refresh token (401)
					const statusCode = getAuthErrorStatus(error);
					if (statusCode === 401) {
						return null;
					}
					// For transient errors (network, 5xx) keep the stale token so the
					// session survives and retries on the next poll.
				}
			}
			if (refreshProfile && token.user) {
				try {
					const currentUser = await fetchAuthenticatedWorkflowUser(token.access, token.user);
					if (!currentUser) return null;
					token.user = currentUser;
				} catch (error) {
					const statusCode = getAuthErrorStatus(error);
					if (statusCode === 401 || statusCode === 403) return null;
					// A temporary backend outage must not erase the session. Server page
					// gates independently fail closed; the next update retries this fetch.
				}
			}
			return token;
		},

		async session({ session, token }) {
			session.accessToken = String(token.access);
			session.refreshToken = String(token.refresh);
			session.accessTokenExpiration = String(token.access_expiration);
			session.refreshTokenExpiration = String(token.refresh_expiration);
			// @ts-expect-error next-auth augmented AdapterUser extends User, creating an intersection type
			session.user = token.user;
			return session;
		},
	},
	debug: process.env.NEXTAUTH_DEBUG === 'true' || process.env.AUTH_DEBUG === 'true',
});
