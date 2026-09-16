import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AUTH_LOGIN, DASHBOARD_BOARD } from '@/utils/routes';

const DashboardMyWorkPage = async () => {
	const session = await auth();
	if (!session) {
		redirect(AUTH_LOGIN);
	}
	redirect(DASHBOARD_BOARD);
};

export default DashboardMyWorkPage;
