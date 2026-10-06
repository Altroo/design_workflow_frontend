'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { getProfilState } from '@/store/selectors';
import { useGetNotificationsQuery } from '@/store/services/designWorkflow';
import { useDesktopNotifications } from '@/utils/workflow/hooks/useDesktopNotifications';

const DesktopNotificationsContext = createContext<ReturnType<typeof useDesktopNotifications> | null>(null);

export const useDesktopNotificationControls = () => {
	const context = useContext(DesktopNotificationsContext);
	if (!context) throw new Error('DesktopNotificationsProvider is required inside the dashboard.');
	return context;
};

// The dashboard layout persists between pages: notifications and their click
// handlers must outlive individual navigation bars, but not the signed-in user.
const DesktopNotificationsProvider = ({ children }: { children: ReactNode }) => {
	const { data: session } = useSession();
	const profile = useAppSelector(getProfilState);
	const { t, language } = useLanguage();
	const router = useRouter();
	const allowed = Boolean(
		session && (profile.role || profile.is_staff || (profile as { is_superuser?: boolean }).is_superuser),
	);
	const { data } = useGetNotificationsQuery({ unread: true }, { skip: !allowed });
	const controls = useDesktopNotifications({
		userId: allowed ? profile.id : null,
		notifications: data,
		copy: t.workflow,
		language,
		onNavigate: (href) => router.push(href),
	});
	return <DesktopNotificationsContext value={controls}>{children}</DesktopNotificationsContext>;
};

export default DesktopNotificationsProvider;
