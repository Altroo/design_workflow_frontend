import { fireEvent, render, screen } from '@testing-library/react';
import ThemeProvider, { useTheme } from './themeProvider';

const ThemeControl = () => {
	const { theme, toggleTheme } = useTheme();
	return <button onClick={toggleTheme}>{theme}</button>;
};

describe('color mode', () => {
	it('uses the server preference and persists toggles for the next navigation', () => {
		render(<ThemeProvider initialTheme="dark"><ThemeControl /></ThemeProvider>);
		expect(document.documentElement.dataset.theme).toBe('dark');
		expect(document.cookie).toContain('app-theme=dark');
		fireEvent.click(screen.getByRole('button', { name: 'dark' }));
		expect(document.documentElement.dataset.theme).toBe('light');
		expect(document.cookie).toContain('app-theme=light');
	});
});
