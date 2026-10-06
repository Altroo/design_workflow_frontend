import {
	mockSubscribe,
	mockSend,
	mockLoadOlder,
	mockRefetch,
	mockUseMessages,
	mockUnsubscribe,
	peer,
	message,
	publicMessages,
	emit,
	deferredHistory,
	actionButton,
	actionModal,
	editedMessage,
} from '@/components/design-workflow/__testutils__/chatTestSetup';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowChat from '@/components/pages/design-workflow/designWorkflowChat';

it('shares one socket subscription across thread switches and sends typing to the selected thread', async () => {
	const user = userEvent.setup();
	const { unmount } = render(<DesignWorkflowChat />);
	expect(mockSubscribe).toHaveBeenCalledTimes(1);
	await user.click(screen.getByRole('button', { name: /Peer Local/ }));
	expect(screen.getByText('Latest private one')).toBeInTheDocument();
	expect(mockSubscribe).toHaveBeenCalledTimes(1);
	const composer = document.querySelector<HTMLTextAreaElement>('.workflow-chat-composer textarea')!;
	fireEvent.change(composer, { target: { value: 'Hello' } });
	expect(mockSend).toHaveBeenCalledWith({ type: 'chat.typing', thread_id: 20, is_typing: true });
	emit({ type: 'chat.typing', thread_id: 10, user: peer, is_typing: true });
	expect(document.querySelector('.workflow-chat-typing')).not.toBeInTheDocument();
	emit({ type: 'chat.typing', thread_id: 20, user: peer, is_typing: true });
	expect(document.querySelector('.workflow-chat-typing')).toHaveTextContent('Peer Local');
	unmount();
	expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
});

it('updates and deletes older history from live payloads without redundant query refetch', async () => {
	const user = userEvent.setup();
	render(<DesignWorkflowChat />);
	await user.click(screen.getByRole('button', { name: /Load older/i }));
	expect(await screen.findByText('Older original')).toBeInTheDocument();
	emit({ type: 'chat.updated', thread_id: 10, message: message(90, 'Older edited live') });
	expect(screen.queryByText('Older original')).not.toBeInTheDocument();
	expect(screen.getByText('Older edited live')).toBeInTheDocument();
	emit({ type: 'chat.deleted', thread_id: 10, message: { ...message(90, ''), is_deleted: true } });
	expect(screen.queryByText('Older edited live')).not.toBeInTheDocument();
	expect(document.getElementById('chat-message-90')).toHaveTextContent('Message deleted');
	expect(mockRefetch).not.toHaveBeenCalled();
});

it('does not let a delayed page overwrite a newer live message', async () => {
	const user = userEvent.setup();
	const resolve = deferredHistory();
	render(<DesignWorkflowChat />);
	await user.click(screen.getByRole('button', { name: /Load older/i }));
	emit({ type: 'chat.updated', thread_id: 10, message: message(90, 'Newer live content') });
	await act(async () => {
		resolve([message(90, 'Stale response')]);
	});
	expect(screen.getByText('Newer live content')).toBeInTheDocument();
	expect(screen.queryByText('Stale response')).not.toBeInTheDocument();
});

it('applies reactions to older messages only in their own thread', async () => {
	const user = userEvent.setup();
	render(<DesignWorkflowChat />);
	await user.click(screen.getByRole('button', { name: /Load older/i }));
	expect(await screen.findByText('Older original')).toBeInTheDocument();
	emit({ type: 'chat.updated', thread_id: 20, message: message(90, 'Different thread', 20) });
	expect(screen.getByText('Older original')).toBeInTheDocument();
	emit({
		type: 'chat.reaction',
		thread_id: 10,
		message: {
			...message(90, 'Older original'),
			reactions: [{ id: 1, emoji: '👍', user: peer, created_at: '2026-10-05T10:00:00Z' }],
		},
	});
	expect(document.querySelector('#chat-message-90 .workflow-chat-reactions')).toHaveTextContent('Peer Local');
});

it('drops history responses from a previous thread', async () => {
	const user = userEvent.setup();
	const resolve = deferredHistory();
	render(<DesignWorkflowChat />);
	await user.click(screen.getByRole('button', { name: /Load older/i }));
	await user.click(screen.getByRole('button', { name: /Peer Local/ }));
	await act(async () => {
		resolve([message(90, 'Old thread leaked')]);
	});
	expect(screen.queryByText('Old thread leaked')).not.toBeInTheDocument();
	expect(screen.getByText('Latest private one')).toBeInTheDocument();
	expect(screen.getByRole('button', { name: /Load older/i })).toBeEnabled();
});

it('clears older snapshots on reconnect and ignores pre-reconnect loads', async () => {
	const user = userEvent.setup();
	render(<DesignWorkflowChat />);
	await user.click(screen.getByRole('button', { name: /Load older/i }));
	expect(await screen.findByText('Older original')).toBeInTheDocument();
	emit({ type: 'reconnected' });
	expect(screen.queryByText('Older original')).not.toBeInTheDocument();
	const resolve = deferredHistory();
	await user.click(screen.getByRole('button', { name: /Load older/i }));
	emit({ type: 'reconnected' });
	await act(async () => {
		resolve([message(90, 'Offline snapshot')]);
	});
	expect(screen.queryByText('Offline snapshot')).not.toBeInTheDocument();
	expect(mockSubscribe).toHaveBeenCalledTimes(1);
});

it('preserves search filters while paging and discards a response after search changes', async () => {
	const user = userEvent.setup();
	const resolve = deferredHistory();
	render(<DesignWorkflowChat />);
	await user.click(screen.getByRole('button', { name: /Load older/i }));
	await user.click(screen.getByRole('button', { name: /Filter/i }));
	const search = screen.getByPlaceholderText('Search in chat');
	fireEvent.change(search, { target: { value: 'different' } });
	await act(async () => {
		resolve([message(90, 'Old search result')]);
	});
	expect(screen.queryByText('Old search result')).not.toBeInTheDocument();
	await waitFor(() => expect(screen.getByRole('button', { name: /Load older/i })).toBeEnabled());
	await user.click(screen.getByRole('button', { name: /Load older/i }));
	expect(mockLoadOlder).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'different', threadId: 10 }));
});

it('retains boundary messages when the newest page rolls forward beside loaded history', async () => {
	const user = userEvent.setup();
	const { rerender } = render(<DesignWorkflowChat />);
	await user.click(screen.getByRole('button', { name: /Load older/i }));
	expect(await screen.findByText('Older original')).toBeInTheDocument();
	const nextPage = [publicMessages[1], message(102, 'New public message')];
	mockUseMessages.mockReturnValue({ currentData: nextPage, isLoading: false, isFetching: false, refetch: mockRefetch });
	rerender(<DesignWorkflowChat />);
	expect(screen.getByText('Latest public one')).toBeInTheDocument();
	expect(screen.getByText('Latest public two')).toBeInTheDocument();
	expect(screen.getByText('New public message')).toBeInTheDocument();
	expect(screen.getByText('Older original')).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: /Load older/i })).not.toBeInTheDocument();
});

it('retains boundary messages if the latest page rolls forward during an older-page request', async () => {
	const user = userEvent.setup();
	const resolve = deferredHistory();
	const { rerender } = render(<DesignWorkflowChat />);
	await user.click(screen.getByRole('button', { name: /Load older/i }));
	mockUseMessages.mockReturnValue({
		currentData: [publicMessages[1], message(102, 'New message during load')],
		isLoading: false,
		isFetching: false,
	});
	rerender(<DesignWorkflowChat />);
	await act(async () => {
		resolve([message(90, 'Requested older message')]);
	});
	expect(screen.getByText('Latest public one')).toBeInTheDocument();
	expect(screen.getByText('Requested older message')).toBeInTheDocument();
	expect(screen.getByText('New message during load')).toBeInTheDocument();
});

it('does not restore an item removed inside the newest filtered page', async () => {
	const user = userEvent.setup();
	const { rerender } = render(<DesignWorkflowChat />);
	await user.click(screen.getByRole('button', { name: /Load older/i }));
	expect(await screen.findByText('Older original')).toBeInTheDocument();
	mockUseMessages.mockReturnValue({
		currentData: [message(99, 'Newly included result'), publicMessages[1]],
		isLoading: false,
		isFetching: false,
	});
	rerender(<DesignWorkflowChat />);
	expect(screen.queryByText('Latest public one')).not.toBeInTheDocument();
	expect(screen.getByText('Newly included result')).toBeInTheDocument();
	expect(screen.getByText('Older original')).toBeInTheDocument();
});

it.each([
	{ type: 'receive_group_message', message: { type: 'WORKFLOW_EVENT', scope: 'users' } },
	{ message: { type: 'USER_AVATAR', pk: 2, avatar: '/updated-avatar.webp' } },
])('discards stale embedded user snapshots after a user event', async (payload) => {
	const user = userEvent.setup();
	render(<DesignWorkflowChat />);
	await user.click(screen.getByRole('button', { name: /Load older/i }));
	expect(await screen.findByText('Older original')).toBeInTheDocument();
	emit(payload);
	expect(screen.queryByText('Older original')).not.toBeInTheDocument();
	expect(screen.getByRole('button', { name: /Load older/i })).toBeEnabled();
	expect(mockRefetch).not.toHaveBeenCalled();
});

it('reconciles open actions from query refreshes as well as socket payloads', async () => {
	const user = userEvent.setup();
	const { rerender } = render(<DesignWorkflowChat />);
	await user.click(actionButton(100, /^Forward/));
	mockUseMessages.mockReturnValue({
		currentData: [editedMessage(100, 'Updated from query'), publicMessages[1]],
		isLoading: false,
		isFetching: false,
	});
	rerender(<DesignWorkflowChat />);
	expect(actionModal()).toHaveTextContent('Updated from query');
	mockUseMessages.mockReturnValue({
		currentData: [editedMessage(100, '', { is_deleted: true }), publicMessages[1]],
		isLoading: false,
		isFetching: false,
	});
	rerender(<DesignWorkflowChat />);
	expect(document.querySelector('.workflow-chat-forward-list')).not.toBeInTheDocument();
});

it('verifies an older forward source after reconnect before allowing forwarding', async () => {
	const user = userEvent.setup();
	render(<DesignWorkflowChat />);
	await user.click(screen.getByRole('button', { name: /Load older/i }));
	await user.click(actionButton(90, /^Forward/));
	const resolve = deferredHistory();
	emit({ type: 'reconnected' });
	expect(mockLoadOlder).toHaveBeenLastCalledWith({ threadId: 10, before_id: 91, limit: 1 });
	expect(within(actionModal()).getByRole('button', { name: /Peer Local/ })).toBeDisabled();
	await act(async () => {
		resolve([editedMessage(90, 'Fresh after reconnect')]);
	});
	expect(actionModal()).toHaveTextContent('Fresh after reconnect');
	expect(within(actionModal()).getByRole('button', { name: /Peer Local/ })).toBeEnabled();
	expect(document.getElementById('chat-message-90')).not.toBeInTheDocument();
});

it('ignores a pre-reconnect action response after switching conversations', async () => {
	const user = userEvent.setup();
	render(<DesignWorkflowChat />);
	await user.click(actionButton(100, /^Reply$/));
	const resolve = deferredHistory();
	emit({ type: 'reconnected' });
	await user.click(screen.getByRole('button', { name: /Peer Local/ }));
	await act(async () => {
		resolve([editedMessage(100, 'Old conversation source')]);
	});
	expect(document.querySelector('.workflow-chat-reply-preview')).not.toBeInTheDocument();
	expect(screen.queryByText('Old conversation source')).not.toBeInTheDocument();
});
