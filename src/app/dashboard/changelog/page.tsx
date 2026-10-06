import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AUTH_LOGIN } from '@/utils/routes';
import Changelog from '@/components/pages/changelog/changelog';

const ChangelogPage = async () => {
	const session = await auth();
	if (!session) redirect(AUTH_LOGIN);
	return <Changelog />;
};

export default ChangelogPage;
