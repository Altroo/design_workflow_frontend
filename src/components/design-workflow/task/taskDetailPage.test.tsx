import {
	mockUseGetTaskQuery,
	manager,
	sourceTaskDetail,
	mockProfile,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';

it('surfaces source chat links on task detail', async () => {
	const user = userEvent.setup();
	mockProfile(manager);
	mockUseGetTaskQuery.mockReturnValue({ data: sourceTaskDetail, isLoading: false });

	const { unmount } = render(
		<DesignWorkflowShell title="Task detail" variant="task-detail" taskId={sourceTaskDetail.id} />,
	);

	expect(screen.getByText('Source chat message')).toBeInTheDocument();
	expect(screen.getByText('This task was created from a chat decision.')).toBeInTheDocument();
	expect(screen.getByRole('link', { name: 'Open source chat' })).toHaveAttribute(
		'href',
		'/dashboard/chat?thread=44&message=555',
	);

	unmount();
	render(<DesignWorkflowShell title="Board" variant="board" taskId={sourceTaskDetail.id} />);

	await waitFor(() => {
		expect(screen.getByRole('dialog', { name: sourceTaskDetail.title })).toBeInTheDocument();
	});
	expect(screen.getByText('Source chat message')).toBeInTheDocument();
	expect(screen.getByRole('link', { name: 'Open source chat' })).toHaveAttribute(
		'href',
		'/dashboard/chat?thread=44&message=555',
	);
	const closeButton = within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' });
	expect(closeButton.parentElement).toHaveClass('workflow-task-modal');
	expect(closeButton.closest('.workflow-task-modal-body')).toBeNull();
	await user.click(closeButton);
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
