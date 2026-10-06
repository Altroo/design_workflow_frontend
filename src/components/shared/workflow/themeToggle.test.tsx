import { fireEvent, render, screen } from '@testing-library/react';
import ThemeProvider from '@/providers/themeProvider';
import { ThemeToggle } from './themeToggle';

it('switches themes and updates the accessible action label', () => {
	render(
		<ThemeProvider initialTheme="light">
			<ThemeToggle />
		</ThemeProvider>,
	);
	fireEvent.click(screen.getByRole('button', { name: 'Activer le mode sombre' }));
	expect(document.documentElement.dataset.theme).toBe('dark');
	fireEvent.click(screen.getByRole('button', { name: 'Activer le mode clair' }));
	expect(document.documentElement.dataset.theme).toBe('light');
});
