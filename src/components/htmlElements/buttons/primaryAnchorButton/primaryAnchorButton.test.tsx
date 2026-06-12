import { render, screen, fireEvent } from '@testing-library/react';
import PrimaryAnchorButton from './primaryAnchorButton';
import '@testing-library/jest-dom';

describe('PrimaryAnchorButton', () => {
	const mockClick = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders link with correct text', () => {
		render(<PrimaryAnchorButton buttonText="Continue" active={true} nextPage="/next" />);

		expect(screen.getByRole('link', { name: 'Continue' })).toBeInTheDocument();
	});

	it('renders as aria-disabled when active is false', () => {
		render(<PrimaryAnchorButton buttonText="Continue" active={false} nextPage="/next" />);

		const link = screen.getByRole('link', { name: 'Continue' });
		expect(link).toHaveAttribute('aria-disabled', 'true');
		expect(link).toHaveClass('pointer-events-none');
	});

	it('calls onClick when button is clicked and active is true', () => {
		render(<PrimaryAnchorButton buttonText="Continue" active={true} nextPage="/next" onClick={mockClick} />);

		fireEvent.click(screen.getByRole('link', { name: 'Continue' }));
		expect(mockClick).toHaveBeenCalled();
	});

	it('renders link with correct href', () => {
		render(<PrimaryAnchorButton buttonText="Go" active={true} nextPage="/dashboard" />);

		const link = screen.getByRole('link');
		expect(link).toHaveAttribute('href', '/dashboard');
	});
});
