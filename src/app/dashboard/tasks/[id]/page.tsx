import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AUTH_LOGIN } from '@/utils/routes';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';

const DashboardTaskDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
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
