import {
	emit,
	actionButton,
	actionModal,
	editedMessage,
} from '@/components/design-workflow/__testutils__/chatTestSetup';
import { fireEvent, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowChat from '@/components/pages/design-workflow/designWorkflowChat';

it('updates reminder context without resetting its note and disables a deleted source', async () => {
	const user = userEvent.setup();
	render(<DesignWorkflowChat />);
	await user.click(actionButton(100, /^Add reminder$/));
	const note = within(actionModal()).getByRole('textbox', { name: 'Note' });
	fireEvent.change(note, { target: { value: 'Keep my reminder note' } });
	emit({ type: 'chat.updated', thread_id: 10, message: editedMessage(100, 'Reminder source corrected') });
	expect(actionModal()).toHaveTextContent('Reminder source corrected');
	expect(note).toHaveValue('Keep my reminder note');
	emit({ type: 'chat.deleted', thread_id: 10, message: editedMessage(100, '', { is_deleted: true }) });
	expect(actionModal()).toHaveTextContent('Message deleted');
	expect(note).toHaveValue('Keep my reminder note');
	expect(within(actionModal()).getByRole('button', { name: 'Add reminder' })).toBeDisabled();
});
