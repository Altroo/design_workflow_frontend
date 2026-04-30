import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AUTH_LOGIN } from '@/utils/routes';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';

const DashboardBoardPage = async ({ searchParams }: { searchParams?: Promise<{ task?: string | string[] }> }) => {
	const session = await auth();
	if (!session) {
		redirect(AUTH_LOGIN);
	}
	const params = await searchParams;
	const taskParam = Array.isArray(params?.task) ? params?.task[0] : params?.task;
	const taskId = taskParam && Number.isFinite(Number(taskParam)) ? Number(taskParam) : undefined;
	return <DesignWorkflowShell key={taskId ?? 'board'} title="Board" variant="board" taskId={taskId} />;
};

export default DashboardBoardPage;
