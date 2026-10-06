import {
	manager,
	mockProfile,
	boardTask,
	projectSummary,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { renderWorkflowView } from '@/components/design-workflow/__testutils__/renderWorkflowView';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { en } from '@/translations/en';
import { WorkflowOverview } from '@/components/design-workflow/overview/workflowOverview';

it('opens an urgent card and links the project from the dashboard', async () => {
	mockProfile(manager);
	const open = jest.fn();
	renderWorkflowView(WorkflowOverview, { setSelectedTaskId: open }, { title: 'Overview', variant: 'overview' });
	await userEvent.setup().click(screen.getByText(boardTask.title));
	expect(open).toHaveBeenCalledWith(boardTask.id);
	expect(screen.getByRole('link', { name: new RegExp(projectSummary.name) })).toHaveAttribute(
		'href',
		expect.stringContaining(`/projects/${projectSummary.id}`),
	);
});
it('shows actionable empty states without rendering empty charts', () => {
	mockProfile(manager);
	renderWorkflowView(WorkflowOverview, { tasks: [], projects: [], busiestUsers: [], summary: undefined });
	expect(screen.getByText(en.workflow.emptyStates.noUrgentCards.title)).toBeInTheDocument();
	expect(screen.getAllByText(en.workflow.emptyStates.noProjects.title).length).toBeGreaterThan(0);
	expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
});
