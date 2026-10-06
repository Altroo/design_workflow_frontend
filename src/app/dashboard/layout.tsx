import { type ReactNode } from 'react';
import DesktopNotificationsProvider from '@/providers/desktopNotificationsProvider';

const DashboardLayout = ({ children }: { children: ReactNode }) => {
	return (
		<DesktopNotificationsProvider>
			<section>{children}</section>
		</DesktopNotificationsProvider>
	);
};

export default DashboardLayout;
