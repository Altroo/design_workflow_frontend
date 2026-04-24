import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AUTH_LOGIN, DASHBOARD_MY_WORK } from '@/utils/routes';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';
import { hasWorkflowManagerAccess } from '@/utils/workflowAccess';

const DashboardTeamPage = async () => {
	const session = await auth();
	if (!session) {
		redirect(AUTH_LOGIN);
	}
	if (!hasWorkflowManagerAccess(session.user)) {
		redirect(DASHBOARD_MY_WORK);
	}
	return <DesignWorkflowShell title="Team workload" variant="team" />;
};

export default DashboardTeamPage;
