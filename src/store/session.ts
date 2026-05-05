import type { AppSession } from '@/types/_initTypes';
import { UserClass } from '@/models/classes';

export const getAccessTokenFromSession = (session?: AppSession): string | undefined => {
	if (!session) return undefined;
	if (session.accessToken?.length && session.accessToken.length > 0) return session.accessToken;
	if (session.user && typeof session.user.accessToken === 'string' && session.user.accessToken.length > 0) {
		return session.user.accessToken;
	}
	return undefined;
};

export const getUserProfileFromSession = (session?: AppSession): UserClass | undefined => {
	const user = session?.user;
	if (!user) return undefined;

	const rawId = user.pk ?? user.id;
	const id = typeof rawId === 'number' ? rawId : Number(rawId);
	if (!Number.isFinite(id)) return undefined;

	const isStaff = Boolean(user.is_staff || user.is_superuser);
	const firstName = user.first_name ?? user.name?.split(' ')[0] ?? '';
	const lastName = user.last_name ?? user.name?.split(' ').slice(1).join(' ') ?? '';
	const role = user.role ?? (isStaff ? 'manager' : 'designer');

	return new UserClass(
		id,
		firstName,
		lastName,
		user.email ?? '',
		'',
		null,
		null,
		isStaff,
		true,
		false,
		null,
		null,
		null,
		isStaff || Boolean(user.can_view),
		isStaff || Boolean(user.can_print),
		isStaff || Boolean(user.can_create),
		isStaff || Boolean(user.can_edit),
		isStaff || Boolean(user.can_delete),
		role,
	);
};
