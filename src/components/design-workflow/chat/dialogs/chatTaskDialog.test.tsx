import {
	mockProjects,
	emit,
	actionButton,
	actionModal,
	editedMessage,
} from '@/components/design-workflow/__testutils__/chatTestSetup';
import { fireEvent, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProjectSummary } from '@/types/designWorkflowTypes';
import DesignWorkflowChat from '@/components/pages/design-workflow/designWorkflowChat';

it('preserves a task draft while disabling its remotely deleted source', async () => {
	mockProjects.push({ id: 1, name: 'Writable project', can_work: true, archived: false } as ProjectSummary);
	const user = userEvent.setup();
	render(<DesignWorkflowChat />);
	await user.click(actionButton(100, /^Create task from message$/));
	const title = within(actionModal()).getByRole('textbox', { name: 'Task title' });
	const description = within(actionModal()).getByRole('textbox', { name: 'Description' });
	fireEvent.change(title, { target: { value: 'My task title' } });
	fireEvent.change(description, { target: { value: 'My task description' } });
	emit({ type: 'chat.deleted', thread_id: 10, message: editedMessage(100, '', { is_deleted: true }) });
	expect(actionModal()).toHaveTextContent('Message deleted');
	expect(title).toHaveValue('My task title');
	expect(description).toHaveValue('My task description');
	expect(within(actionModal()).getByRole('button', { name: 'Create task' })).toBeDisabled();
});
