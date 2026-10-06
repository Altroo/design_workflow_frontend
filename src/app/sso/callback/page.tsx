import { Suspense } from 'react';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import SSOCallback from '@/components/pages/auth/ssoCallback/ssoCallback';

const SSOCallbackPage = () => (
	<Suspense fallback={<ApiProgress backdropColor="var(--surface)" circularColor="var(--accent)" />}>
		<SSOCallback />
	</Suspense>
);

export default SSOCallbackPage;
