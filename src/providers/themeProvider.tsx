'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ColorMode = 'light' | 'dark';
const ThemeContext = createContext<{ theme: ColorMode; toggleTheme: () => void }>({
	theme: 'light',
	toggleTheme: () => {},
});
export const useTheme = () => useContext(ThemeContext);

const ThemeProvider = ({ children, initialTheme = 'light' }: { children: ReactNode; initialTheme?: ColorMode }) => {
	const [theme, setTheme] = useState<ColorMode>(initialTheme);
	useEffect(() => {
		document.documentElement.dataset.theme = theme;
		document.cookie = `app-theme=${theme};path=/;max-age=31536000;SameSite=Lax`;
	}, [theme]);
	return (
		<ThemeContext value={{ theme, toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')) }}>
			{children}
		</ThemeContext>
	);
};

export default ThemeProvider;
