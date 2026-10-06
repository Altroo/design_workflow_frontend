import { render, screen } from '@testing-library/react';
import { en } from '@/translations/en';
import { WorkflowHeader } from '@/components/shared/workflow/workflowHeader';

it('renders the supplied heading, variant description and highlights', () => {
	render(
		<WorkflowHeader
			model={{
				workflow: en.workflow,
				pageHeading: 'Material board',
				variant: 'task-detail',
				pageHighlights: ['Urgent', 'Needs review'],
			}}
		/>,
	);
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Material board');
	expect(screen.getByText(en.workflow.pageDescriptions['task-detail'])).toBeInTheDocument();
	expect(screen.getByText('Urgent')).toHaveClass('workflow-chip');
	expect(screen.getByText('Needs review')).toHaveAttribute('data-tone', 'neutral');
});
