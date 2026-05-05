'use client';

import { ReactNode, useEffect } from 'react';
import { usePermission, useAppSelector, useAppDispatch } from '@/utils/hooks';
import { getProfilState } from '@/store/selectors';
import NoPermission from '@/components/shared/noPermission/noPermission';
import { useSession } from 'next-auth/react';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useGetProfilQuery } from '@/store/services/account';
import { accountSetProfilAction } from '@/store/actions/accountActions';
import type { UserClass } from '@/models/classes';

type PermissionKey = 'is_staff' | 'can_view' | 'can_print' | 'can_create' | 'can_edit' | 'can_delete';

interface ProtectedProps {
	children: ReactNode;
	permission?: PermissionKey;
}

const permissionsFor = (profile?: Partial<UserClass>) => {
	const isStaff = !!profile?.is_staff;
	return {
		is_staff: isStaff,
		can_view: isStaff || !!profile?.can_view,
		can_print: isStaff || !!profile?.can_print,
		can_create: isStaff || !!profile?.can_create,
		can_edit: isStaff || !!profile?.can_edit,
		can_delete: isStaff || !!profile?.can_delete,
	};
};

export const Protected = (props: ProtectedProps) => {
	const dispatch = useAppDispatch();
	const { data: session, status } = useSession();
	const token = useInitAccessToken(session ?? undefined);
	const storePermissions = usePermission();
	const profil = useAppSelector(getProfilState);
	const shouldFetchProfile = !profil.id && status === 'authenticated' && !!token;
	const { data: fetchedProfile, isLoading, isFetching } = useGetProfilQuery(undefined, {
		skip: !shouldFetchProfile,
	});
	const required = props.permission ?? 'is_staff';
	const activeProfile = profil.id ? profil : fetchedProfile;
	const permissions = profil.id ? storePermissions : permissionsFor(fetchedProfile);

	useEffect(() => {
		if (fetchedProfile) dispatch(accountSetProfilAction(fetchedProfile));
	}, [dispatch, fetchedProfile]);

	if (!activeProfile?.id) {
		if (status === 'unauthenticated' || (status === 'authenticated' && !token && !isLoading && !isFetching)) {
			return <NoPermission />;
		}
		return (
			<div className="flex items-center justify-center py-12">
				<div className="h-10 w-10 animate-spin rounded-full border-4 border-[color:var(--line)] border-t-[color:var(--accent)]" />
			</div>
		);
	}

	if (!permissions[required]) {
		return <NoPermission />;
	}

	return <>{props.children}</>;
};
