'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import AuthLayout from '@/components/layouts/auth/authLayout';
import SuccessIlluSVG from '../../../../../public/assets/images/success-illu.svg';
import { AUTH_LOGIN } from '@/utils/routes';
import { useLanguage } from '@/utils/hooks';

const SetPasswordCompleteClient: React.FC = () => {
	const { t } = useLanguage();

	return (
		<AuthLayout>
			<div className="app-card px-5 py-6 sm:px-7 sm:py-7">
				<div className="app-card-muted flex items-center justify-center p-6">
					<Image src={SuccessIlluSVG} alt="" width={240} height={180} className="h-auto w-full max-w-[240px]" priority />
				</div>
				<p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-(--ink-soft)">Done</p>
				<h1 className="mt-3 text-4xl font-semibold text-(--ink)">{t.auth.passwordChanged}</h1>
				<p className="mt-3 text-sm leading-6 text-(--ink-soft)">{t.auth.passwordChangedMessage}</p>
				<Link href={AUTH_LOGIN} className="app-button mt-6 w-full justify-center">
					<span>{t.auth.loginButton}</span>
					<ArrowRight size={16} />
				</Link>
			</div>
		</AuthLayout>
	);
};

export default SetPasswordCompleteClient;
