import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AUTH_LOGIN, DASHBOARD_TASK_VIEW } from '@/utils/routes';

const DashboardTaskDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
	const session = await auth();
	if (!session) {
		redirect(AUTH_LOGIN);
	}
	const { id } = await params;
	redirect(DASHBOARD_TASK_VIEW(id));
};

export default DashboardTaskDetailPage;
