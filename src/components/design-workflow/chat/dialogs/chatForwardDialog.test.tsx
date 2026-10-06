import {
	mockMutation,
	emit,
	actionButton,
	actionModal,
	editedMessage,
} from '@/components/design-workflow/__testutils__/chatTestSetup';
import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowChat from '@/components/pages/design-workflow/designWorkflowChat';

it('forwards the live source instead of the snapshot selected before an edit', async () => {
	const user = userEvent.setup();
	render(<DesignWorkflowChat />);
	await user.click(actionButton(100, /^Forward/));
	emit({ type: 'chat.updated', thread_id: 20, message: editedMessage(100, 'Wrong thread', { thread: 20 }) });
	expect(actionModal()).toHaveTextContent('Latest public one');
	emit({ type: 'chat.updated', thread_id: 10, message: editedMessage(100, 'Forward the corrected text') });
	expect(actionModal()).toHaveTextContent('Forward the corrected text');
	await user.click(within(actionModal()).getByRole('button', { name: /Peer Local/ }));
	const call = mockMutation.mock.calls.at(-1) as unknown as [{ threadId: number; data: FormData }];
	expect(call[0].threadId).toBe(20);
	expect(call[0].data.get('body')).toBe('Forward the corrected text');
});

it('closes forwarding when its source was deleted remotely', async () => {
	const user = userEvent.setup();
	render(<DesignWorkflowChat />);
	await user.click(actionButton(100, /^Forward/));
	emit({ type: 'chat.deleted', thread_id: 10, message: editedMessage(100, '', { is_deleted: true }) });
	expect(document.querySelector('.workflow-chat-forward-list')).not.toBeInTheDocument();
	expect(mockMutation).not.toHaveBeenCalled();
});
