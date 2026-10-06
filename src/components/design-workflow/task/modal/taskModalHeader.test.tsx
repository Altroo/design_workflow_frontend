import {
	mockUpdateTask,
	mockUseGetTaskQuery,
	makeMutationResult,
	designerA,
	designerB,
	boardTask,
	taskDetail,
	mockProfile,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';

it.each([designerA, designerB])(
	'lets $first_name rename an editable card by double-clicking its title',
	async (person) => {
		const user = userEvent.setup();
		mockProfile(person);
		render(<DesignWorkflowShell title="Board" variant="board" />);
		await user.click(screen.getByText(boardTask.title));
		const dialog = await screen.findByRole('dialog', { name: boardTask.title });
		const heading = within(dialog).getByRole('heading', { name: boardTask.title });
		await user.click(heading);
		expect(within(dialog).queryByLabelText('Card title')).not.toBeInTheDocument();
		await user.dblClick(heading);
		const input = within(dialog).getByLabelText('Card title');
		expect(input).toHaveFocus();
		expect(input).toHaveValue(boardTask.title);
		expect(input).toHaveAttribute('maxlength', '255');
		await user.clear(input);
		await user.type(input, '  Revised material board  {Enter}');
		await waitFor(() =>
			expect(mockUpdateTask).toHaveBeenCalledWith({
				id: boardTask.id,
				data: { title: 'Revised material board', expected_values: { title: boardTask.title } },
			}),
		);
		await waitFor(() => expect(within(dialog).queryByLabelText('Card title')).not.toBeInTheDocument());
	},
);

it('rejects blank or unchanged titles and cancels renaming without closing the card', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	render(<DesignWorkflowShell title="Board" variant="board" />);
	await user.click(screen.getByText(boardTask.title));
	const dialog = await screen.findByRole('dialog', { name: boardTask.title });
	const heading = within(dialog).getByRole('heading', { name: boardTask.title });
	await user.dblClick(heading);
	let form = within(dialog).getByRole('form', { name: 'Rename card' });
	expect(within(form).getByRole('button', { name: 'Save' })).toBeDisabled();
	await user.clear(within(form).getByLabelText('Card title'));
	await user.type(within(form).getByLabelText('Card title'), '   {Enter}{Escape}');
	expect(mockUpdateTask).not.toHaveBeenCalled();
	expect(dialog).toBeInTheDocument();
	expect(heading).toHaveFocus();
	await user.keyboard('{F2}');
	form = within(dialog).getByRole('form', { name: 'Rename card' });
	expect(within(form).getByLabelText('Card title')).toHaveValue(boardTask.title);
	await user.clear(within(form).getByLabelText('Card title'));
	await user.type(within(form).getByLabelText('Card title'), 'Discard this');
	await user.click(within(form).getByRole('button', { name: 'Cancel' }));
	expect(mockUpdateTask).not.toHaveBeenCalled();
	expect(within(dialog).queryByLabelText('Card title')).not.toBeInTheDocument();
});

it('keeps the rename draft after an error or task refresh and allows retry', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	mockUpdateTask
		.mockReturnValueOnce({ unwrap: () => Promise.reject({ status: 500 }) })
		.mockReturnValue(makeMutationResult());
	const { rerender } = render(<DesignWorkflowShell title="Board" variant="board" />);
	await user.click(screen.getByText(boardTask.title));
	const dialog = await screen.findByRole('dialog', { name: boardTask.title });
	await user.dblClick(within(dialog).getByRole('heading', { name: boardTask.title }));
	await user.clear(within(dialog).getByLabelText('Card title'));
	await user.type(within(dialog).getByLabelText('Card title'), 'Keep my draft');
	const form = within(dialog).getByRole('form', { name: 'Rename card' });
	await user.click(within(form).getByRole('button', { name: 'Save' }));
	await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledTimes(1));
	mockUseGetTaskQuery.mockReturnValue({ data: { ...taskDetail, description: 'Teammate update' }, isLoading: false });
	rerender(<DesignWorkflowShell title="Board" variant="board" />);
	expect(within(dialog).getByLabelText('Card title')).toHaveValue('Keep my draft');
	await user.click(within(form).getByRole('button', { name: 'Save' }));
	await waitFor(() => expect(within(dialog).queryByLabelText('Card title')).not.toBeInTheDocument());
	expect(mockUpdateTask).toHaveBeenCalledTimes(2);
});

it('does not allow renaming a read-only card', async () => {
	const user = userEvent.setup();
	mockProfile(designerB);
	mockUseGetTaskQuery.mockReturnValue({ data: { ...taskDetail, can_edit: false }, isLoading: false });
	render(<DesignWorkflowShell title="Board" variant="board" />);
	await user.click(screen.getByText(boardTask.title));
	const dialog = await screen.findByRole('dialog', { name: boardTask.title });
	await user.dblClick(within(dialog).getByRole('heading', { name: boardTask.title }));
	expect(within(dialog).queryByLabelText('Card title')).not.toBeInTheDocument();
	expect(mockUpdateTask).not.toHaveBeenCalled();
});

it('keeps the title visible if editing permission is revoked during renaming', async () => {
	const user = userEvent.setup();
	mockProfile(designerB);
	const { rerender } = render(<DesignWorkflowShell title="Board" variant="board" />);
	await user.click(screen.getByText(boardTask.title));
	const dialog = await screen.findByRole('dialog', { name: boardTask.title });
	await user.dblClick(within(dialog).getByRole('heading', { name: boardTask.title }));
	expect(within(dialog).getByLabelText('Card title')).toBeInTheDocument();
	mockUseGetTaskQuery.mockReturnValue({ data: { ...taskDetail, can_edit: false }, isLoading: false });
	rerender(<DesignWorkflowShell title="Board" variant="board" />);
	expect(within(dialog).queryByLabelText('Card title')).not.toBeInTheDocument();
	expect(within(dialog).getByRole('heading', { name: boardTask.title })).not.toHaveClass('sr-only');
	expect(mockUpdateTask).not.toHaveBeenCalled();
});
