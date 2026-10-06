import {
	mockUpdateProject,
	mockUpdateTask,
	mockUpdateTaskReview,
	mockDeleteTaskAttachment,
	mockUseGetProjectQuery,
	mockUseGetTaskQuery,
	manager,
	designerA,
	boardTask,
	projectDetail,
	taskDetail,
	reviewAttachment,
	reviewTaskDetail,
	mockProfile,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';

it('keeps the card and rename draft open when a title selection ends on the backdrop', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	render(<DesignWorkflowShell title="Board" variant="board" />);
	await user.click(screen.getByText(boardTask.title));
	const dialog = await screen.findByRole('dialog', { name: boardTask.title });
	await user.dblClick(within(dialog).getByRole('heading', { name: boardTask.title }));
	const input = within(dialog).getByLabelText('Card title');
	await user.clear(input);
	await user.type(input, 'Keep this unsaved title');
	await user.pointer([
		{ keys: '[MouseLeft>]', target: input, offset: 22 },
		{ target: input, offset: 0 },
		{ target: dialog },
	]);
	expect(dialog).toBeInTheDocument();
	await user.pointer({ keys: '[/MouseLeft]', target: dialog });

	expect(dialog).toBeInTheDocument();
	expect(input).toHaveValue('Keep this unsaved title');
	expect(mockUpdateTask).not.toHaveBeenCalled();

	await user.click(dialog);
	expect(dialog).not.toBeInTheDocument();
	expect(mockUpdateTask).not.toHaveBeenCalled();
});

it('ignores a drag from the backdrop into the title and still supports Escape dismissal', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	render(<DesignWorkflowShell title="Board" variant="board" />);
	await user.click(screen.getByText(boardTask.title));
	const dialog = await screen.findByRole('dialog', { name: boardTask.title });
	const heading = within(dialog).getByRole('heading', { name: boardTask.title });
	await user.pointer([
		{ keys: '[MouseLeft>]', target: dialog },
		{ keys: '[/MouseLeft]', target: heading },
	]);

	expect(dialog).toBeInTheDocument();
	await user.click(heading);
	expect(dialog).toBeInTheDocument();
	await user.keyboard('{Escape}');
	expect(dialog).not.toBeInTheDocument();
});

it('does not keep an editable card visible after access is rejected', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	const { rerender } = render(<DesignWorkflowShell title="Board" variant="board" />);
	await user.click(screen.getByText(boardTask.title));
	await screen.findByRole('dialog', { name: boardTask.title });
	mockUseGetTaskQuery.mockReturnValue({ data: taskDetail, error: { status: 403 }, isLoading: false });
	rerender(<DesignWorkflowShell title="Board" variant="board" />);
	expect(screen.queryByRole('dialog', { name: boardTask.title })).not.toBeInTheDocument();
});

it('closes an attachment preview after the attachment is deleted remotely', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	mockUseGetTaskQuery.mockReturnValue({ data: reviewTaskDetail, isLoading: false });
	const { rerender } = render(<DesignWorkflowShell title="Board" variant="board" taskId={taskDetail.id} />);
	const dialog = await screen.findByRole('dialog', { name: taskDetail.title });
	await user.click(within(dialog).getByRole('button', { name: `Preview ${reviewAttachment.name}` }));
	expect(document.querySelector('.workflow-attachment-preview-backdrop')).not.toBeNull();
	mockUseGetTaskQuery.mockReturnValue({ data: { ...reviewTaskDetail, attachments: [] }, isLoading: false });
	rerender(<DesignWorkflowShell title="Board" variant="board" taskId={taskDetail.id} />);
	expect(document.querySelector('.workflow-attachment-preview-backdrop')).toBeNull();
	expect(screen.getByRole('dialog', { name: taskDetail.title })).toBeInTheDocument();
});

it.each(['permission revoked', 'review completed'])(
	'closes an approval confirmation when %s remotely',
	async (change) => {
		const user = userEvent.setup();
		mockProfile(manager);
		const { rerender } = render(<DesignWorkflowShell title="Board" variant="board" taskId={taskDetail.id} />);
		const card = await screen.findByRole('dialog', { name: taskDetail.title });
		await user.click(within(card).getByRole('button', { name: 'Approve' }));
		expect(screen.getByRole('dialog', { name: 'Approve this task?' })).toBeInTheDocument();
		if (change === 'permission revoked') mockProfile(designerA);
		else mockUseGetTaskQuery.mockReturnValue({ data: { ...taskDetail, review_state: 'approved' }, isLoading: false });
		rerender(<DesignWorkflowShell title="Board" variant="board" taskId={taskDetail.id} />);
		expect(screen.queryByRole('dialog', { name: 'Approve this task?' })).not.toBeInTheDocument();
		expect(screen.getByRole('dialog', { name: taskDetail.title })).toBeInTheDocument();
		expect(mockUpdateTaskReview).not.toHaveBeenCalled();
	},
);

it.each(['permission revoked', 'attachment deleted'])(
	'closes a file deletion confirmation when %s remotely',
	async (change) => {
		const user = userEvent.setup();
		mockProfile(designerA);
		mockUseGetTaskQuery.mockReturnValue({ data: reviewTaskDetail, isLoading: false });
		const { rerender } = render(<DesignWorkflowShell title="Board" variant="board" taskId={taskDetail.id} />);
		const card = await screen.findByRole('dialog', { name: taskDetail.title });
		const attachment = within(card)
			.getByRole('link', { name: reviewAttachment.name })
			.closest('.workflow-trello-modal-attachment-item') as HTMLElement;
		await user.click(within(attachment).getByRole('button', { name: 'Delete' }));
		expect(screen.getByText('Delete attachment?')).toBeInTheDocument();
		mockUseGetTaskQuery.mockReturnValue({
			data: { ...reviewTaskDetail, ...(change === 'permission revoked' ? { can_edit: false } : { attachments: [] }) },
			isLoading: false,
		});
		rerender(<DesignWorkflowShell title="Board" variant="board" taskId={taskDetail.id} />);
		expect(screen.queryByText('Delete attachment?')).not.toBeInTheDocument();
		expect(screen.getByRole('dialog', { name: taskDetail.title })).toBeInTheDocument();
		expect(mockDeleteTaskAttachment).not.toHaveBeenCalled();
	},
);

it.each(['permission revoked', 'archived'])(
	'closes a project archive confirmation when %s remotely',
	async (change) => {
		const user = userEvent.setup();
		mockProfile(designerA);
		mockUseGetProjectQuery.mockReturnValue({ data: { ...projectDetail, can_manage: true }, isLoading: false });
		const { rerender } = render(
			<DesignWorkflowShell title="Project" variant="project-detail" projectId={projectDetail.id} />,
		);
		await user.click(screen.getByRole('button', { name: 'Archive project' }));
		expect(screen.getByRole('dialog', { name: 'Archive this project?' })).toBeInTheDocument();
		mockUseGetProjectQuery.mockReturnValue({
			data: { ...projectDetail, can_manage: change !== 'permission revoked', archived: change === 'archived' },
			isLoading: false,
		});
		rerender(<DesignWorkflowShell title="Project" variant="project-detail" projectId={projectDetail.id} />);
		expect(screen.queryByRole('dialog', { name: 'Archive this project?' })).not.toBeInTheDocument();
		expect(screen.queryByRole('dialog', { name: 'Unarchive this project?' })).not.toBeInTheDocument();
		expect(mockUpdateProject).not.toHaveBeenCalled();
	},
);
