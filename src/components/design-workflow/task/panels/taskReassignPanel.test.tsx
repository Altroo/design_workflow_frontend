import {
	mockReassignTask,
	manager,
	designerB,
	taskDetail,
	mockProfile,
	selectMuiOption,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';

it('covers manager reassignment with mandatory reason', async () => {
	const user = userEvent.setup();
	mockProfile(manager);

	render(<DesignWorkflowShell title="Task detail" variant="task-detail" taskId={taskDetail.id} />);

	expect(screen.getByText('Manager controls')).toBeInTheDocument();
	expect(screen.getByText('Reassign task')).toBeInTheDocument();

	const reassignCard = screen.getByText('Reassign task').closest('section');
	expect(reassignCard).not.toBeNull();

	await selectMuiOption(user, 'New assignee', 'Rami Reviewer');
	await user.type(within(reassignCard as HTMLElement).getByLabelText('Reason'), 'Redistribute review workload');
	await user.click(within(reassignCard as HTMLElement).getByRole('button', { name: 'Reassign' }));

	await waitFor(() => {
		expect(mockReassignTask).toHaveBeenCalledWith({
			id: taskDetail.id,
			assignee_id: designerB.id,
			reason: 'Redistribute review workload',
		});
	});

	expect(screen.getByText('First draft')).toBeInTheDocument();
	expect(screen.getByText(/Spent 1h 30m/i)).toBeInTheDocument();
});
