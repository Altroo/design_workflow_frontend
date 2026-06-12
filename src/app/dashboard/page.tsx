import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AUTH_LOGIN, DASHBOARD_MY_WORK, DASHBOARD_OVERVIEW } from '@/utils/routes';
import { hasWorkflowManagerAccess } from '@/utils/workflowAccess';

const DashboardPage = async () => {
	const session = await auth();

	if (!session) {
		return redirect(AUTH_LOGIN);
	}

	return redirect(hasWorkflowManagerAccess(session.user) ? DASHBOARD_OVERVIEW : DASHBOARD_MY_WORK);
};

export default DashboardPage;
