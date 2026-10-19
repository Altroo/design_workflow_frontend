'use client';

import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import { useLanguage } from '@/utils/hooks';

const DashboardLoading = () => {
	const { t } = useLanguage();
	return (
		<div role="status" aria-label={t.common.loading}>
			<ApiProgress backdropColor="var(--surface)" circularColor="var(--accent)" />
		</div>
	);
};

export default DashboardLoading;
