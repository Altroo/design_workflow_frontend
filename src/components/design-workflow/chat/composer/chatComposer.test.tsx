import { emit, actionButton, editedMessage } from '@/components/design-workflow/__testutils__/chatTestSetup';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import DesignWorkflowChat from '@/components/pages/design-workflow/designWorkflowChat';

it('keeps remaining file previews alive when one attachment is removed in Strict Mode', () => {
	const createObjectURL = URL.createObjectURL;
	const revokeObjectURL = URL.revokeObjectURL;
	URL.createObjectURL = jest.fn((file: Blob) => `blob:${(file as File).name}`);
	URL.revokeObjectURL = jest.fn();
	try {
		const { unmount } = render(
			<StrictMode>
				<DesignWorkflowChat />
			</StrictMode>,
		);
		const input = document.querySelector<HTMLInputElement>('.workflow-chat-composer input[type="file"]')!;
		const first = new File(['first'], 'first.png', { type: 'image/png' });
		const second = new File(['second'], 'second.png', { type: 'image/png' });
		fireEvent.change(input, { target: { files: [first, second] } });
		const drafts = document.querySelector('.workflow-chat-draft-attachments') as HTMLElement;
		fireEvent.click(within(drafts).getAllByRole('button', { name: /delete/i })[0]);
		expect(screen.getByRole('img', { name: 'second.png' })).toHaveAttribute('src', 'blob:second.png');
		expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first.png');
		expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:second.png');
		unmount();
		expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
		expect(URL.revokeObjectURL).toHaveBeenLastCalledWith('blob:second.png');
	} finally {
		cleanup();
		URL.createObjectURL = createObjectURL;
		URL.revokeObjectURL = revokeObjectURL;
	}
});

it('refreshes a reply preview and removes a deleted reference without losing the composer draft', async () => {
	const user = userEvent.setup();
	render(<DesignWorkflowChat />);
	await user.click(actionButton(100, /^Reply$/));
	const composer = document.querySelector<HTMLTextAreaElement>('.workflow-chat-composer textarea')!;
	fireEvent.change(composer, { target: { value: 'My unsent reply' } });
	emit({ type: 'chat.updated', thread_id: 10, message: editedMessage(100, 'Reply source changed') });
	expect(document.querySelector('.workflow-chat-reply-preview')).toHaveTextContent('Reply source changed');
	emit({ type: 'chat.deleted', thread_id: 10, message: editedMessage(100, '', { is_deleted: true }) });
	expect(document.querySelector('.workflow-chat-reply-preview')).not.toBeInTheDocument();
	expect(composer).toHaveValue('My unsent reply');
});

it('refreshes untouched edit text but preserves typed edits when the source changes or is deleted', async () => {
	const user = userEvent.setup();
	render(<DesignWorkflowChat />);
	await user.click(actionButton(100, /^Edit message$/));
	const editor = document.querySelector<HTMLTextAreaElement>('.workflow-chat-edit-box textarea')!;
	emit({ type: 'chat.updated', thread_id: 10, message: editedMessage(100, 'Other session edit') });
	expect(editor).toHaveValue('Other session edit');
	fireEvent.change(editor, { target: { value: 'My unsaved edit' } });
	emit({ type: 'chat.updated', thread_id: 10, message: editedMessage(100, 'Second other edit') });
	expect(editor).toHaveValue('My unsaved edit');
	emit({ type: 'chat.deleted', thread_id: 10, message: editedMessage(100, '', { is_deleted: true }) });
	expect(editor).toHaveValue('My unsaved edit');
	expect(
		within(document.querySelector<HTMLElement>('.workflow-chat-edit-box')!).getByRole('button', { name: 'Save' }),
	).toBeDisabled();
});
