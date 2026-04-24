import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AUTH_LOGIN } from '@/utils/routes';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';

const DashboardNotificationsPage = async () => {
	const session = await auth();
	if (!session) {
		redirect(AUTH_LOGIN);
	}
	return <DesignWorkflowShell title="Notifications" variant="notifications" />;
};

export default DashboardNotificationsPage;
