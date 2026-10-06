import '@/components/design-workflow/__testutils__/chatTestSetup';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { en } from '@/translations/en';
import DesignWorkflowChat from '@/components/pages/design-workflow/designWorkflowChat';

it('toggles filters without changing the active conversation and displays active filters', async () => {
	const user = userEvent.setup();
	render(<DesignWorkflowChat />);
	const header = within(document.querySelector('.workflow-chat-room-header') as HTMLElement);
	const toggle = header.getByRole('button', { name: en.common.filterBy });
	expect(toggle).toHaveAttribute('aria-expanded', 'false');
	await user.click(toggle);
	expect(toggle).toHaveAttribute('aria-expanded', 'true');
	await user.click(header.getByRole('button', { name: en.workflow.labels.attachments }));
	expect(toggle).toHaveTextContent('1');
	await user.click(toggle);
	expect(header.queryByPlaceholderText(en.workflow.labels.searchMessages)).not.toBeInTheDocument();
	expect(screen.getByText('Latest public one')).toBeInTheDocument();
});
