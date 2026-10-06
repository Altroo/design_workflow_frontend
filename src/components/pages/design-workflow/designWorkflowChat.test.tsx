import { emit, actionButton, editedMessage } from '@/components/design-workflow/__testutils__/chatTestSetup';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowChat from '@/components/pages/design-workflow/designWorkflowChat';

it('closes an obsolete delete confirmation after remote deletion', async () => {
	const user = userEvent.setup();
	render(<DesignWorkflowChat />);
	await user.click(actionButton(100, /^Delete message$/));
	expect(document.querySelector('.workflow-chat-confirm-modal')).toBeInTheDocument();
	emit({ type: 'chat.deleted', thread_id: 10, message: editedMessage(100, '', { is_deleted: true }) });
	expect(document.querySelector('.workflow-chat-confirm-modal')).not.toBeInTheDocument();
});
