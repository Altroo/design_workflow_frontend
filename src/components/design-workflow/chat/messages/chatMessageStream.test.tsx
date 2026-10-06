import { mockUseMessages, message, peer } from '@/components/design-workflow/__testutils__/chatTestSetup';
import { render, screen, within } from '@testing-library/react';
import DesignWorkflowChat from '@/components/pages/design-workflow/designWorkflowChat';
import { en } from '@/translations/en';

it('hides deleted message content and removes its edit/forward actions', () => {
	mockUseMessages.mockReturnValue({
		currentData: [{ ...message(100, 'Confidential old body'), is_deleted: true }],
		isLoading: false,
		isFetching: false,
	});
	render(<DesignWorkflowChat />);
	const row = within(document.getElementById('chat-message-100')!);
	expect(row.getByText(en.workflow.labels.messageDeleted)).toBeInTheDocument();
	expect(screen.queryByText('Confidential old body')).not.toBeInTheDocument();
	expect(row.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
	expect(row.queryByRole('button', { name: /^Forward/ })).not.toBeInTheDocument();
});
it('does not expose edit/delete for another designer message', () => {
	mockUseMessages.mockReturnValue({
		currentData: [{ ...message(100, 'Peer content'), sender: peer }],
		isLoading: false,
		isFetching: false,
	});
	render(<DesignWorkflowChat />);
	const row = within(document.getElementById('chat-message-100')!);
	expect(row.getByText('Peer content')).toBeInTheDocument();
	expect(row.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
	expect(row.queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument();
	expect(row.getByRole('button', { name: /^Reply/ })).toBeInTheDocument();
});
