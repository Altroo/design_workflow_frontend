'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/providers/themeProvider';
import { useLanguage } from '@/utils/hooks';

export const ThemeToggle = () => {
	const { theme, toggleTheme } = useTheme();
	const { language } = useLanguage();
	const dark = theme === 'dark';
	const label = dark
		? (language === 'fr' ? 'Activer le mode clair' : 'Switch to light mode')
		: (language === 'fr' ? 'Activer le mode sombre' : 'Switch to dark mode');
	return (
		<button type="button" className="workflow-theme-toggle workflow-focus-ring" onClick={toggleTheme} aria-label={label} title={label}>
			{dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
		</button>
	);
};
