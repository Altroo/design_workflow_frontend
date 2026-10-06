import {
	manager,
	mockProfile,
	boardTask,
	projectSummary,
	summary,
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
	expect(screen.getAllByRole('link', { name: new RegExp(projectSummary.name) })[0]).toHaveAttribute(
		'href',
		expect.stringContaining(`/projects/${projectSummary.id}`),
	);
});

it('includes unplanned tasks in the total and explains counts rather than calling them capacity', () => {
	mockProfile(manager);
	renderWorkflowView(WorkflowOverview, { summary: { ...summary, backlog_tasks: 4, todo_tasks: 2 } });
	const total = document.querySelector('.workflow-overview-doughnut-center strong');
	expect(total).toHaveTextContent('6');
	expect(screen.getByText(en.workflow.labels.overviewProjectCountHint)).toBeVisible();
	expect(screen.getByText(en.workflow.labels.overviewTrackedProjects)).toBeVisible();
	expect(screen.getByRole('link', { name: en.workflow.labels.overviewOpenBoard })).toHaveAttribute(
		'href',
		expect.stringContaining('/dashboard/board'),
	);
});
it('shows actionable empty states without rendering empty charts', () => {
	mockProfile(manager);
	renderWorkflowView(WorkflowOverview, { tasks: [], projects: [], busiestUsers: [], summary: undefined });
	expect(screen.getByText(en.workflow.emptyStates.noUrgentCards.title)).toBeInTheDocument();
	expect(screen.getAllByText(en.workflow.emptyStates.noProjects.title).length).toBeGreaterThan(0);
	expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
});
