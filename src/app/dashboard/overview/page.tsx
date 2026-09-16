import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AUTH_LOGIN, DASHBOARD_BOARD } from '@/utils/routes';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';
import { hasWorkflowManagerAccess } from '@/utils/workflowAccess';

const DashboardOverviewPage = async () => {
	const session = await auth();
	if (!session) {
		redirect(AUTH_LOGIN);
	}
	if (!hasWorkflowManagerAccess(session.user)) {
		redirect(DASHBOARD_BOARD);
	}
	return <DesignWorkflowShell title="Overview" variant="overview" />;
};

export default DashboardOverviewPage;
