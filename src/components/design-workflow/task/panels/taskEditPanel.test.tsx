import {
	designerA,
	manager,
	mockProfile,
	mockUpdateTask,
	mockUpdateTaskStatus,
	taskDetail,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { renderTaskView } from '@/components/design-workflow/__testutils__/renderWorkflowView';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { en } from '@/translations/en';
import { TaskEditPanel } from '@/components/design-workflow/task/panels/taskEditPanel';

it('saves a changed title with optimistic-concurrency values', async () => {
	mockProfile(manager);
	renderTaskView(TaskEditPanel);
	const user = userEvent.setup();
	const title = screen.getByDisplayValue(taskDetail.title);
	await user.clear(title);
	await user.type(title, 'Updated plans');
	await user.click(screen.getByRole('button', { name: en.workflow.buttons.saveTask }));
	await waitFor(() =>
		expect(mockUpdateTask).toHaveBeenCalledWith({
			id: taskDetail.id,
			data: expect.objectContaining({
				title: 'Updated plans',
				expected_values: expect.objectContaining({ title: taskDetail.title }),
			}),
		}),
	);
});
it('gives designers progress controls without manager estimates', async () => {
	mockProfile(designerA);
	renderTaskView(TaskEditPanel);
	expect(screen.queryByText(en.workflow.labels.estimatedMinutes)).not.toBeInTheDocument();
	await userEvent.setup().click(screen.getByRole('button', { name: en.workflow.buttons.updateStatus }));
	expect(mockUpdateTaskStatus).toHaveBeenCalledWith(
		expect.objectContaining({ id: taskDetail.id, status: taskDetail.status }),
	);
});
