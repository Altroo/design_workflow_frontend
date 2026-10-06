import { render } from '@testing-library/react';
import AuthWorkspaceBackdrop from './authWorkspaceBackdrop';
import { translations } from '@/translations';
import { STATUS_COLUMNS } from '@/components/shared/workflow/boardAppearance';
import { getWorkflowNavigation, getWorkflowUtilities } from '@/components/shared/workflow/workflowNavigation';

it.each(['fr', 'en'] as const)(
	'mirrors the real board and navigation without exposing interactive controls in %s',
	(language) => {
		const t = translations[language];
		const { container } = render(<AuthWorkspaceBackdrop t={t} language={language} />);
		const backdrop = container.querySelector('.auth-workspace-backdrop')!;
		expect(backdrop).toHaveAttribute('aria-hidden', 'true');
		expect(backdrop).toHaveAttribute('inert');
		expect(
			Array.from(backdrop.querySelectorAll('.workflow-column'), (node) => node.getAttribute('data-status')),
		).toEqual(STATUS_COLUMNS);
		expect(Array.from(backdrop.querySelectorAll('.workflow-nav-text'), (node) => node.textContent)).toEqual(
			[...getWorkflowNavigation(t, true), ...getWorkflowUtilities(t, true)].map((item) => item.label),
		);
	},
);
