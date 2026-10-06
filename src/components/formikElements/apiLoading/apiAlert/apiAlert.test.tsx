import { render, screen } from '@testing-library/react';
import ApiAlert from './apiAlert';

it('renders each field error once', () => {
	render(<ApiAlert errorDetails={{ email: ['Invalid email'], password: ['Too short'] }} />);
	const text = screen.getByRole('alert').textContent!;
	expect(text.match(/Invalid email/g)).toHaveLength(1);
	expect(text.match(/Too short/g)).toHaveLength(1);
});

it('uses the translated fallback when no errors are supplied', () => {
	render(<ApiAlert />);
	expect(screen.getByRole('alert').textContent).not.toBe('');
});
