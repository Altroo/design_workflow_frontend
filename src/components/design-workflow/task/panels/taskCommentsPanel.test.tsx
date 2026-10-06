import {
	designerA,
	mockProfile,
	mockAddTaskComment,
	taskDetail,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { renderTaskView } from '@/components/design-workflow/__testutils__/renderWorkflowView';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { en } from '@/translations/en';
import { TaskCommentsPanel } from '@/components/design-workflow/task/panels/taskCommentsPanel';

it('rejects an empty comment, posts trimmed text and clears the successful draft', async () => {
	mockProfile(designerA);
	renderTaskView(TaskCommentsPanel);
	const user = userEvent.setup();
	const post = screen.getByRole('button', { name: en.workflow.buttons.postComment });
	expect(post).toBeDisabled();
	const input = screen.getByLabelText(en.workflow.labels.addComment);
	await user.type(input, '  Final palette attached  ');
	await user.click(post);
	await waitFor(() =>
		expect(mockAddTaskComment).toHaveBeenCalledWith({ id: taskDetail.id, body: 'Final palette attached' }),
	);
	expect(input).toHaveValue('');
	expect(screen.getByText(taskDetail.comments[0].body)).toBeInTheDocument();
});
it('keeps comments readable without exposing the editor on a read-only card', () => {
	mockProfile(designerA);
	renderTaskView(TaskCommentsPanel, { taskMutable: false });
	expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
	expect(screen.getByText(taskDetail.comments[0].body)).toBeInTheDocument();
});
