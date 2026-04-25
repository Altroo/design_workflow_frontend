import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AUTH_LOGIN } from '@/utils/routes';
import NavigationBar from '@/components/layouts/navigationBar/navigationBar';
import DesignWorkflowChat from '@/components/pages/design-workflow/designWorkflowChat';

const DashboardChatPage = async () => {
	const session = await auth();
	if (!session) {
		redirect(AUTH_LOGIN);
	}
	return (
		<NavigationBar title="Chat">
			<DesignWorkflowChat />
		</NavigationBar>
	);
};

export default DashboardChatPage;
