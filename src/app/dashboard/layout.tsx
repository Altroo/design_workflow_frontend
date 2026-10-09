import { type ReactNode } from 'react';
import DesktopNotificationsProvider from '@/providers/desktopNotificationsProvider';
import ChatAssistant from '@/components/chat-ai/chatAssistant';

const DashboardLayout = ({ children }: { children: ReactNode }) => {
	return (
		<DesktopNotificationsProvider>
			<section>{children}</section>
			<ChatAssistant />
		</DesktopNotificationsProvider>
	);
};

export default DashboardLayout;
