import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AUTH_LOGIN } from '@/utils/routes';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';
import type {IdRouteProps} from '@/types/routeTypes';

const DashboardTaskDetailPage = async ({ params }: IdRouteProps) => {
	const session = await auth();
	if (!session) {
		redirect(AUTH_LOGIN);
	}
	const { id } = await params;
	const taskId = Number(id);
	if (!Number.isInteger(taskId) || taskId <= 0) {
		notFound();
	}
	return <DesignWorkflowShell title="Task detail" variant="task-detail" taskId={taskId} />;
};

export default DashboardTaskDetailPage;
