import { manager, mockProfile, taskDetail } from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { renderTaskView } from '@/components/design-workflow/__testutils__/renderWorkflowView';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { en } from '@/translations/en';
import { TaskActivityPanel } from '@/components/design-workflow/task/panels/taskActivityPanel';

it('shows the system fallback and paginates activity without losing authors', async () => {
	mockProfile(manager);
	const recent_activity = Array.from({ length: 6 }, (_, id) => ({
		...taskDetail.recent_activity[0],
		id,
		actor: id === 0 ? null : manager,
	}));
	renderTaskView(TaskActivityPanel, {
		task: { ...taskDetail, recent_activity },
		describeWorkflowActivity: (entry) => `Activity ${entry.id}`,
	});
	expect(screen.getByText(en.workflow.labels.system)).toBeInTheDocument();
	expect(screen.getByText('Activity 0')).toBeInTheDocument();
	expect(screen.queryByText('Activity 5')).not.toBeInTheDocument();
	await userEvent.setup().click(screen.getAllByRole('button').at(-1)!);
	expect(screen.getByText('Activity 5')).toBeInTheDocument();
	expect(screen.queryByText('Activity 0')).not.toBeInTheDocument();
	expect(screen.getByText('Mona Manager')).toBeInTheDocument();
});
