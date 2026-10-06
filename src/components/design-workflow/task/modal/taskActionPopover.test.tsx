import {
	manager,
	boardTask,
	taskDetail,
	mockProfile,
	selectMuiOption,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';

it('toggles a card action panel with the same button and suggests @mentions', async () => {
	const user = userEvent.setup();
	mockProfile(manager);

	render(<DesignWorkflowShell title="Board" variant="board" />);
	await user.click(screen.getByText(boardTask.title));
	const dialog = await screen.findByRole('dialog', { name: boardTask.title });
	const labelsButton = within(dialog).getByRole('button', { name: 'Labels' });
	await user.click(labelsButton);
	expect(within(dialog).getByRole('region', { name: 'Labels' })).toBeInTheDocument();
	await user.click(labelsButton);
	expect(within(dialog).queryByRole('region', { name: 'Labels' })).not.toBeInTheDocument();

	await user.click(within(dialog).getByText(taskDetail.description));
	const description = within(dialog).getByPlaceholderText('Short description');
	await user.clear(description);
	await user.type(description, '@ram');
	await user.click(await screen.findByRole('option', { name: /Rami Reviewer.*@rami\.reviewer/i }));
	expect(description).toHaveValue('@rami.reviewer ');
});

it('keeps card action panels open until their close button is used', async () => {
	const user = userEvent.setup();
	mockProfile(manager);

	render(<DesignWorkflowShell title="Board" variant="board" taskId={taskDetail.id} />);
	const dialog = await screen.findByRole('dialog', { name: taskDetail.title });

	for (const panelName of ['Labels', 'Card image', 'Attachments', 'Checklist']) {
		await user.click(within(dialog).getByRole('button', { name: panelName }));
		const panel = within(dialog).getByRole('region', { name: panelName });
		await user.click(within(dialog).getByRole('heading', { name: 'Description' }));
		expect(panel).toBeInTheDocument();
		await user.click(within(panel).getByRole('button', { name: 'Close' }));
		expect(within(dialog).queryByRole('region', { name: panelName })).not.toBeInTheDocument();
	}

	await user.click(within(dialog).getByRole('button', { name: 'Members' }));
	const membersPanel = within(dialog).getByRole('region', { name: 'Members' });
	await selectMuiOption(user, 'Assignee', 'Rami Reviewer', membersPanel);
	await user.click(within(dialog).getByRole('heading', { name: 'Description' }));
	expect(membersPanel).toBeInTheDocument();
	await user.click(within(membersPanel).getByRole('button', { name: 'Close' }));
	expect(within(dialog).queryByRole('region', { name: 'Members' })).not.toBeInTheDocument();
});
