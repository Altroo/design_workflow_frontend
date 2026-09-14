import { render, screen } from '@testing-library/react';
import AuthLayout from './authLayout';
import '@testing-library/jest-dom';
import { translations } from '@/translations';
import { getWorkflowNavigation, getWorkflowUtilities } from '@/components/shared/workflow/workflowNavigation';
import { STATUS_COLUMNS } from '@/components/shared/workflow/boardAppearance';

jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ language: 'fr', setLanguage: jest.fn(), t: jest.requireActual('@/translations').translations.fr }),
}));

describe('AuthLayout', () => {
	it('keeps the login form outside the inert workspace preview', () => {
		render(
			<AuthLayout>
				<div>Login Form</div>
			</AuthLayout>,
		);
		expect(screen.getByText('Login Form')).toBeInTheDocument();
		expect(screen.getByText('Login Form').closest('[inert]')).toBeNull();
		expect(screen.getByRole('button', { name: 'Passer en anglais' })).toBeInTheDocument();
	});

	it('uses the actual workspace menu and board columns in a hidden, inert backdrop', () => {
		const { container } = render(<AuthLayout />);
		const backdrop = container.querySelector('.auth-workspace-backdrop');
		expect(backdrop).toHaveAttribute('aria-hidden', 'true');
		expect(backdrop).toHaveAttribute('inert');
		const menu = [...getWorkflowNavigation(translations.fr, true), ...getWorkflowUtilities(translations.fr, true)];
		expect(Array.from(backdrop!.querySelectorAll('.workflow-nav-text'), (node) => node.textContent)).toEqual(menu.map((item) => item.label));
		expect(Array.from(backdrop!.querySelectorAll('.workflow-column'), (node) => node.getAttribute('data-status'))).toEqual(STATUS_COLUMNS);
		expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
	});
});
