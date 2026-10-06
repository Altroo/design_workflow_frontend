import { manager, mockProfile, selectMuiOption } from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';

it('shows sorting only for the table and never exposes a redundant blocked-only filter', async () => {
	const user = userEvent.setup();
	mockProfile(manager);

	render(<DesignWorkflowShell title="Board" variant="board" />);
	expect(screen.queryByText('Blocked only')).not.toBeInTheDocument();
	expect(screen.queryByRole('combobox', { name: 'Sort table by' })).not.toBeInTheDocument();

	await user.click(screen.getByRole('button', { name: 'Table' }));
	expect(screen.getByRole('combobox', { name: 'Sort table by' })).toBeInTheDocument();
	await selectMuiOption(user, 'Sort table by', 'Due date descending');

	await user.click(screen.getByRole('button', { name: 'Board' }));
	expect(screen.queryByRole('combobox', { name: 'Sort table by' })).not.toBeInTheDocument();
});
