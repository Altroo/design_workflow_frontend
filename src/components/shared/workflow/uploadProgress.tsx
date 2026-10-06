'use client';

import { useLanguage } from '@/utils/hooks';

export const UploadProgress = ({ progress }: { progress: number | null }) => {
	const { language } = useLanguage();
	if (progress === null) return null;
	const label =
		progress >= 100
			? language === 'fr'
				? 'Enregistrement du fichier…'
				: 'Saving file…'
			: `${language === 'fr' ? 'Envoi en cours' : 'Uploading'} · ${progress} %`;
	return (
		<div className="workflow-upload-progress">
			<span role="status">{label}</span>
			<progress value={progress} max={100} aria-label={label} />
		</div>
	);
};
