import { render, screen } from '@testing-library/react';
import { en } from '@/translations/en';
import { emptyBoardFilters } from '@/utils/workflow/workflowFormHelpers';
import type { ComponentProps } from 'react';
import { WorkflowWorkspaceSearchResults } from '@/components/design-workflow/search/workflowWorkspaceSearchResults';

const model: ComponentProps<typeof WorkflowWorkspaceSearchResults>['model'] = {
	boardFilters: { ...emptyBoardFilters(), search: 'plan' },
	workflow: en.workflow,
	workspaceSearchResults: [],
	labelFor: String,
};
it('hides short searches and shows an empty result message for a submitted query', () => {
	const { rerender, container } = render(
		<WorkflowWorkspaceSearchResults model={{ ...model, boardFilters: { ...model.boardFilters, search: ' a ' } }} />,
	);
	expect(container).toBeEmptyDOMElement();
	rerender(<WorkflowWorkspaceSearchResults model={model} />);
	expect(screen.getByText(en.workflow.labels.noSearchResults)).toBeInTheDocument();
});
it('limits previews to eight results while displaying the complete count and destination links', () => {
	const results = Array.from({ length: 10 }, (_, id) => ({
		id,
		type: 'task' as const,
		title: id ? `Plan ${id}` : '',
		subtitle: 'Showroom',
		url: `/dashboard/tasks/${id}`,
		metadata: {},
	}));
	render(<WorkflowWorkspaceSearchResults model={{ ...model, workspaceSearchResults: results }} />);
	expect(screen.getAllByRole('link')).toHaveLength(8);
	expect(screen.getByText('10')).toBeInTheDocument();
	expect(screen.getByRole('link', { name: /Untitled/ })).toHaveAttribute('href', '/dashboard/tasks/0');
});
