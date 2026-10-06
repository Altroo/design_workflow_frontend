import {
	mockUseGetTaskQuery,
	mockUseGetTasksQuery,
	designerB,
	boardTask,
	taskDetail,
	mockProfile,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';

it('keeps unassigned cards visible but removes their edit and drag controls', async () => {
	const user = userEvent.setup();
	mockProfile(designerB);
	const readOnlyTask = { ...boardTask, can_edit: false };
	mockUseGetTasksQuery.mockReturnValue({ data: [readOnlyTask], isLoading: false });
	mockUseGetTaskQuery.mockReturnValue({ data: { ...taskDetail, can_edit: false }, isLoading: false });

	render(<DesignWorkflowShell title="Board" variant="board" />);

	expect(document.querySelector('.workflow-board-drag-handle')).toBeNull();
	await user.click(screen.getByText(boardTask.title));
	const dialog = await screen.findByRole('dialog', { name: boardTask.title });
	expect(within(dialog).queryByRole('button', { name: 'Labels' })).not.toBeInTheDocument();
	expect(within(dialog).queryByPlaceholderText('Write a comment…')).not.toBeInTheDocument();
});
