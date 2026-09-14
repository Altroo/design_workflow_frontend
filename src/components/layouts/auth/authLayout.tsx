'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import FlagGB from '../../../../public/assets/images/flags/gb.svg';
import FlagFR from '../../../../public/assets/images/flags/fr.svg';
import { useLanguage } from '@/utils/hooks';
import AuthWorkspaceBackdrop from './authWorkspaceBackdrop';

const AuthLayout = ({ children }: { children?: ReactNode }) => {
	const { language, setLanguage, t } = useLanguage();

	return (
		<main id="main-content" className="auth-shell">
			<AuthWorkspaceBackdrop t={t} language={language} />
			<div className="auth-login-layer workflow-shell workflow-shell-expanded">
				<div className="hidden lg:block" aria-hidden="true" />
				<div className="auth-login-stage">
					<section className="auth-login-dock">
						<div className="auth-language-control">
							<button
								type="button"
								onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
								aria-label={language === 'fr' ? 'Passer en anglais' : 'Switch to French'}
								className="workflow-topbar-control workflow-language-toggle workflow-focus-ring inline-flex items-center gap-2 px-3 py-2 text-sm font-bold"
							>
								<Image src={language === 'fr' ? FlagFR : FlagGB} alt="" width={22} height={15} aria-hidden="true" className="workflow-language-flag" />
								<span>{language === 'fr' ? 'FR' : 'EN'}</span>
							</button>
						</div>
						{children}
					</section>
				</div>
			</div>
		</main>
	);
};

export default AuthLayout;
