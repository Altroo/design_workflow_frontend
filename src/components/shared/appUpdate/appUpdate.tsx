'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import ActionModals from '@/components/htmlElements/modals/actionModal/actionModals';
import { useAppSelector, useLanguage, useToast } from '@/utils/hooks';
import { getAppVersions } from '@/store/selectors';
import { isNewerAppVersion } from '@/utils/appVersion';
import { APP_UPDATE_PARAM, getAppUpdateUrl, reloadApp } from '@/utils/updateApp';

const AppUpdate = () => {
	const { localVersion, serverVersion, maintenance } = useAppSelector(getAppVersions);
	const { t } = useLanguage();
	const { onError } = useToast();
	const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
	const [updating, setUpdating] = useState(false);
	const inFlight = useRef(false);
	const latestState = useRef({ serverVersion, maintenance });
	useEffect(() => {
		latestState.current = { serverVersion, maintenance };
	}, [serverVersion, maintenance]);

	useEffect(() => {
		const url = new URL(window.location.href);
		const target = url.searchParams.get(APP_UPDATE_PARAM)?.split('-')[0];
		if (target && !isNewerAppVersion(target, localVersion)) {
			url.searchParams.delete(APP_UPDATE_PARAM);
			window.history.replaceState(window.history.state, '', url.href);
		}
	}, [localVersion]);

	if (maintenance || !isNewerAppVersion(serverVersion, localVersion) || dismissedVersion === serverVersion) return null;
	const dismiss = () => {
		if (!inFlight.current) setDismissedVersion(serverVersion);
	};
	const update = async () => {
		if (!serverVersion || inFlight.current) return;
		inFlight.current = true;
		setUpdating(true);
		try {
			const url = await getAppUpdateUrl(serverVersion, window.location.href);
			if (latestState.current.maintenance || latestState.current.serverVersion !== serverVersion) {
				onError(t.appUpdate.error);
				return;
			}
			reloadApp(url);
		} catch {
			onError(t.appUpdate.error);
		} finally {
			setUpdating(false);
			inFlight.current = false;
		}
	};

	return (
		<ActionModals
			title={t.appUpdate.title}
			body={t.appUpdate.body}
			titleIcon={<RefreshCw size={20} className={updating ? 'animate-spin motion-reduce:animate-none' : ''} />}
			titleIconColor="var(--accent)"
			onClose={dismiss}
			actions={[
				{ active: false, text: t.appUpdate.later, onClick: dismiss, disabled: updating },
				{
					active: true,
					text: updating ? t.appUpdate.updating : t.appUpdate.update,
					onClick: () => void update(),
					disabled: updating,
					color: 'var(--accent)',
				},
			]}
		>
			<p className="text-sm text-(--ink-soft)">
				{t.appUpdate.version} {serverVersion}
			</p>
		</ActionModals>
	);
};

export default AppUpdate;
