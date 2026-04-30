'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DASHBOARD } from '@/utils/routes';
import { useLanguage } from '@/utils/hooks';
import { ArrowLeft, Home, OctagonAlert } from 'lucide-react';

const NotFound = () => {
	const router = useRouter();
	const { t } = useLanguage();

	return (
		<div className="flex min-h-screen items-center justify-center px-4 py-8">
			<div className="app-card w-full max-w-[560px] p-8 text-center">
				<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-lg bg-(--surface-muted) text-(--ink-soft)">
					<OctagonAlert size={42} />
				</div>
				<p className="mt-5 text-5xl font-semibold text-(--ink)">404</p>
				<h1 className="mt-3 text-2xl font-semibold text-(--ink)">{t.errors.pageNotFound}</h1>
				<p className="mt-3 text-sm leading-7 text-(--ink-soft)">{t.errors.pageNotFoundText}</p>
				<div className="mt-6 flex flex-wrap justify-center gap-3">
					<button type="button" onClick={() => router.push(DASHBOARD)} className="app-button">
						<Home size={16} />
						<span>{t.common.dashboard}</span>
					</button>
					<button type="button" onClick={() => router.back()} className="app-button app-button-secondary">
						<ArrowLeft size={16} />
						<span>{t.common.back}</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default NotFound;
