import '@/components/design-workflow/__testutils__/chatTestSetup';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { en } from '@/translations/en';
import DesignWorkflowChat from '@/components/pages/design-workflow/designWorkflowChat';

it.each([
	[en.workflow.labels.linkedReferences, en.workflow.labels.chatReferencesEmpty],
	[en.workflow.labels.mediaFiles, en.workflow.labels.emptyState],
])('opens and closes the empty %s drawer without requiring a selected preview', async (label, emptyText) => {
	const user = userEvent.setup();
	render(<DesignWorkflowChat />);
	await user.click(screen.getByRole('button', { name: en.common.filterBy }));
	await user.click(screen.getByRole('button', { name: label }));
	const drawer = screen.getByRole('complementary', { name: label });
	expect(within(drawer).getByText(emptyText)).toBeInTheDocument();
	await user.click(within(drawer).getByRole('button', { name: en.common.close }));
	expect(screen.queryByRole('complementary', { name: label })).not.toBeInTheDocument();
});
