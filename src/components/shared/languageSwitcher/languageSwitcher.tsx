'use client';

import React from 'react';
import { useLanguage } from '@/utils/hooks';
import { Desktop, TabletAndMobile } from '@/utils/clientHelpers';

const LanguageSwitcher: React.FC = () => {
	const { language, setLanguage } = useLanguage();

	const toggleLanguage = () => {
		setLanguage(language === 'fr' ? 'en' : 'fr');
	};

	const flag = language === 'fr' ? '🇫🇷' : '🇬🇧';
	const currentLabel = language === 'fr' ? 'FR' : 'EN';
	const switchLabel = language === 'fr' ? 'Passer en anglais' : 'Switch to French';

	return (
		<>
			<Desktop>
				<button
					type="button"
					title={switchLabel}
					aria-label={switchLabel}
					onClick={toggleLanguage}
					className="app-pill inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-(--ink)"
				>
					<span>{flag}</span>
					{currentLabel}
				</button>
			</Desktop>
			<TabletAndMobile>
				<button
					type="button"
					title={switchLabel}
					onClick={toggleLanguage}
					aria-label={switchLabel}
					className="app-pill inline-flex h-10 w-10 items-center justify-center text-base"
				>
					{flag}
				</button>
			</TabletAndMobile>
		</>
	);
};

export default LanguageSwitcher;
