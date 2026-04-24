'use client';

import React from 'react';
import { useLanguage } from '@/utils/hooks';
import { Desktop, TabletAndMobile } from '@/utils/clientHelpers';

const LanguageSwitcher: React.FC = () => {
	const { language, setLanguage } = useLanguage();

	const toggleLanguage = () => {
		setLanguage(language === 'fr' ? 'en' : 'fr');
	};

	const flag = language === 'fr' ? '🇬🇧' : '🇫🇷';
	const label = language === 'fr' ? 'English' : 'Français';

	return (
		<>
			<Desktop>
				<button
					type="button"
					title={label}
					onClick={toggleLanguage}
					className="app-pill inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--ink)]"
				>
					<span>{flag}</span>
						{language === 'fr' ? 'EN' : 'FR'}
				</button>
			</Desktop>
			<TabletAndMobile>
				<button
					type="button"
					title={label}
					onClick={toggleLanguage}
					aria-label={label}
					className="app-pill inline-flex h-10 w-10 items-center justify-center text-base"
				>
					{flag}
				</button>
			</TabletAndMobile>
		</>
	);
};

export default LanguageSwitcher;
