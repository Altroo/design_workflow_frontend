import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AUTH_LOGIN } from '@/utils/routes';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';

const DashboardTaskDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
	const session = await auth();
	if (!session) {
		redirect(AUTH_LOGIN);
	}
	const { id } = await params;
	return <DesignWorkflowShell title="Task detail" variant="task-detail" taskId={Number(id)} />;
};

export default DashboardTaskDetailPage;
