'use client';

import React, { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/utils/hooks';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { initAppAction, initAppSessionTokensAction } from '@/store/actions/_initActions';
import { getAccessToken } from '@/store/selectors';
import { useGetProfilQuery } from '@/store/services/account';
import { accountSetProfilAction } from '@/store/actions/accountActions';
import { DASHBOARD_PASSWORD } from '@/utils/routes';
import { getAccessTokenFromSession } from '@/store/session';

export const InitEffects: React.FC = () => {
	const { data: session, status } = useSession();
	const dispatch = useAppDispatch();
	const router = useRouter();
	const pathname = usePathname();
	const initState = useAppSelector(getAccessToken);
	const sessionAccessToken = session ? getAccessTokenFromSession(session) : undefined;
	const accessToken = initState ?? sessionAccessToken ?? undefined;
	const skip = !accessToken || status !== 'authenticated';

	const appInitializedRef = useRef(false);
	const lastAccessTokenRef = useRef<string | null>(null);

	useEffect(() => {
		if (!appInitializedRef.current) {
			dispatch(initAppAction());
			appInitializedRef.current = true;
		}
	}, [dispatch]);

	const { data: user } = useGetProfilQuery(undefined, { skip });

	// Sync Redux tokens whenever the access token changes (covers initial login + every refresh)
	useEffect(() => {
		if (status === 'authenticated' && session && sessionAccessToken &&
			lastAccessTokenRef.current !== sessionAccessToken) {
			lastAccessTokenRef.current = sessionAccessToken;
			dispatch(initAppSessionTokensAction(session));
		}
		if (status !== 'authenticated') {
			lastAccessTokenRef.current = null;
		}
	}, [status, session, sessionAccessToken, dispatch]);

	// Dispatch user profile to Redux
	useEffect(() => {
		if (user) dispatch(accountSetProfilAction(user));
	}, [dispatch, user]);

	// Redirect if user still has default password
	useEffect(() => {
		if (user && user.default_password_set && pathname !== '/dashboard/settings/password') {
			router.push(DASHBOARD_PASSWORD);
		}
	}, [user, pathname, router]);

	return null;
};
