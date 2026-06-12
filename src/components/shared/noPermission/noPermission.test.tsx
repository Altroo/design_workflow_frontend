import React from 'react';
import { render, screen } from '@testing-library/react';
import NoPermission from './noPermission';

describe('NoPermission', () => {
	test('renders access denied title', () => {
		render(<NoPermission />);
		expect(screen.getByText('Accès Refusé')).toBeInTheDocument();
	});

	test('renders description message', () => {
		render(<NoPermission />);
		expect(
			screen.getByText(
				/Vous n'avez pas la permission d'accéder à cette page. Veuillez contacter un administrateur si vous pensez qu'il s'agit d'une erreur./,
			),
		).toBeInTheDocument();
	});

	test('renders lock icon', () => {
		const { container } = render(<NoPermission />);
		const icon = container.querySelector('.lucide-lock');
		expect(icon).toBeInTheDocument();
	});

	test('renders card container', () => {
		const { container } = render(<NoPermission />);
		expect(container.querySelector('.app-card')).toBeInTheDocument();
	});

	test('applies centered layout classes', () => {
		const { container } = render(<NoPermission />);
		const box = container.firstChild as HTMLElement;
		expect(box).toHaveClass('flex');
		expect(box).toHaveClass('items-center');
		expect(box).toHaveClass('justify-center');
	});

	test('renders with proper semantic structure', () => {
		render(<NoPermission />);

		const heading = screen.getByRole('heading', { level: 2 });
		expect(heading).toHaveTextContent('Accès Refusé');
	});

	test('renders title and body text elements', () => {
		const { container } = render(<NoPermission />);

		expect(container.querySelector('h2')).toBeInTheDocument();
		expect(container.querySelector('p')).toBeInTheDocument();
	});
});
