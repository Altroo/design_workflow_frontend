import { useLanguage } from '@/utils/hooks';
import { Lock } from 'lucide-react';

const NoPermission = () => {
	const { t } = useLanguage();
	return (
		<div className="flex min-h-[60vh] items-center justify-center px-4">
			<div className="app-card w-full max-w-[520px] p-8 text-center">
				<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-(--surface-muted) text-(--ink-soft)">
					<Lock size={40} />
				</div>
				<h2 className="mt-5 text-2xl font-semibold text-(--ink)">{t.errors.accessDenied}</h2>
				<p className="mt-3 text-sm leading-7 text-(--ink-soft)">{t.errors.accessDeniedText}</p>
			</div>
		</div>
	);
};

export default NoPermission;
