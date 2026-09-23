import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AUTH_LOGIN } from '@/utils/routes';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';
import type {IdRouteProps} from '@/types/routeTypes';

const DashboardProjectDetailPage = async ({ params }: IdRouteProps) => {
	const session = await auth();
	if (!session) {
		redirect(AUTH_LOGIN);
	}
	const { id } = await params;
	const projectId = Number(id);
	if (!Number.isInteger(projectId) || projectId <= 0) notFound();
	return <DesignWorkflowShell title="Project" variant="project-detail" projectId={projectId} />;
};

export default DashboardProjectDetailPage;
