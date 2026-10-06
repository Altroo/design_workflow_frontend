'use client';

import { WifiOff } from 'lucide-react';
import { useAppSelector, useLanguage } from '@/utils/hooks';

export default function RealtimeStatus() {
	const status = useAppSelector((state) => state.ws.connectionStatus);
	const { language } = useLanguage();
	if (status !== 'reconnecting') return null;
	return (
		<div role="status" aria-live="polite" className="workflow-realtime-status">
			<WifiOff size={17} aria-hidden="true" />
			<span>
				{language === 'fr'
					? 'Connexion interrompue. Reconnexion en cours… Les mises à jour reprendront automatiquement.'
					: 'Connection interrupted. Reconnecting… Live updates will resume automatically.'}
			</span>
		</div>
	);
}
