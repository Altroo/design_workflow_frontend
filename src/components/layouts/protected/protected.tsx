import { ReactNode } from 'react';
import { usePermission, useAppSelector } from '@/utils/hooks';
import { getProfilState } from '@/store/selectors';
import NoPermission from '@/components/shared/noPermission/noPermission';

type PermissionKey = 'is_staff' | 'can_view' | 'can_print' | 'can_create' | 'can_edit' | 'can_delete';

interface ProtectedProps {
	children: ReactNode;
	permission?: PermissionKey;
}

export const Protected = (props: ProtectedProps) => {
	const permissions = usePermission();
	const profil = useAppSelector(getProfilState);
	const required = props.permission ?? 'is_staff';

	if (!profil.id) {
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
