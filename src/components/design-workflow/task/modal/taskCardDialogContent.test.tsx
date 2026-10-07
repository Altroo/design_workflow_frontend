import {
	mockUpdateLabel,
	mockUpdateTask,
	mockRenameTaskAttachment,
	mockUpdateChecklistItem,
	mockUseGetLabelsQuery,
	mockUseGetTaskQuery,
	mockUseGetTasksQuery,
	manager,
	designerA,
	boardTask,
	taskDetail,
	reviewTaskDetail,
	reviewAttachment,
	mockProfile,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';
import type { TaskDetail } from '@/types/designWorkflowTypes';

it('uses small attachment previews and groups rename with the other actions', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	mockUseGetTaskQuery.mockReturnValue({ data: reviewTaskDetail, isLoading: false });
	render(<DesignWorkflowShell title="Board" variant="board" taskId={reviewTaskDetail.id} />);
	const card = await screen.findByRole('dialog', { name: reviewTaskDetail.title });
	expect(within(card).getByRole('img', { name: reviewAttachment.name })).toHaveAttribute(
		'src',
		expect.stringContaining(reviewAttachment.thumbnail_url),
	);
	expect(within(card).getByRole('link', { name: reviewAttachment.name })).toHaveAttribute(
		'href',
		expect.stringContaining(reviewAttachment.file),
	);
	const rename = within(card).getByRole('button', { name: `Rename attachment: ${reviewAttachment.name}` });
	const actions = rename.parentElement as HTMLElement;
	expect(within(actions).getByRole('button', { name: 'Set as cover' })).toBeInTheDocument();
	expect(within(actions).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
	await user.click(within(card).getByRole('button', { name: `Preview ${reviewAttachment.name}` }));
	const preview = document.querySelector('.workflow-attachment-preview-modal') as HTMLElement;
	expect(within(preview).getByRole('img')).toHaveAttribute(
		'src',
		expect.stringContaining(reviewAttachment.thumbnail_url),
	);
	expect(within(preview).getByRole('link')).toHaveAttribute('href', expect.stringContaining(reviewAttachment.file));
});

it('does not load a full-size attachment as a fallback when no preview exists', async () => {
	mockProfile(designerA);
	mockUseGetTaskQuery.mockReturnValue({
		data: { ...reviewTaskDetail, attachments: [{ ...reviewAttachment, thumbnail_url: null }] },
		isLoading: false,
	});
	render(<DesignWorkflowShell title="Board" variant="board" taskId={reviewTaskDetail.id} />);
	const card = await screen.findByRole('dialog', { name: reviewTaskDetail.title });
	expect(within(card).queryByRole('img', { name: reviewAttachment.name })).not.toBeInTheDocument();
	expect(within(card).getByRole('link', { name: reviewAttachment.name })).toHaveAttribute(
		'href',
		expect.stringContaining(reviewAttachment.file),
	);
});

it('renames an attachment from the card without closing it', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	mockUseGetTaskQuery.mockReturnValue({ data: reviewTaskDetail, isLoading: false });
	render(<DesignWorkflowShell title="Board" variant="board" taskId={reviewTaskDetail.id} />);
	const dialog = await screen.findByRole('dialog', { name: reviewTaskDetail.title });
	await user.click(within(dialog).getByRole('button', { name: `Rename attachment: ${reviewAttachment.name}` }));
	const input = within(dialog).getByRole('textbox', { name: 'Attachment name' });
	expect(input).toHaveValue(reviewAttachment.name);
	await user.clear(input);
	await user.type(input, 'Final material board{Enter}');
	await waitFor(() =>
		expect(mockRenameTaskAttachment).toHaveBeenCalledWith({
			id: reviewTaskDetail.id,
			attachmentId: reviewAttachment.id,
			name: 'Final material board',
		}),
	);
	expect(dialog).toBeInTheDocument();
});

it('keeps an unfinished description and an open card tool during live refresh', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	const { rerender } = render(<DesignWorkflowShell title="Board" variant="board" />);
	await user.click(screen.getByText(boardTask.title));
	const dialog = await screen.findByRole('dialog', { name: boardTask.title });
	await user.click(within(dialog).getByRole('button', { name: 'Labels' }));
	await user.click(within(dialog).getByText(taskDetail.description));
	const description = within(dialog).getByPlaceholderText('Short description');
	await user.clear(description);
	await user.type(description, 'Unfinished personal draft');
	mockUseGetTaskQuery.mockReturnValue({
		data: { ...taskDetail, title: 'Remote title', description: 'Remote description' },
		isLoading: false,
	});
	rerender(<DesignWorkflowShell title="Board" variant="board" />);
	expect(within(dialog).getByRole('heading', { name: 'Remote title' })).toBeInTheDocument();
	expect(description).toHaveValue('Unfinished personal draft');
	expect(within(dialog).getByRole('region', { name: 'Labels' })).toBeInTheDocument();
});

it('uses a two-column date row for designers and keeps Save level with the date field', async () => {
	mockProfile(designerA);

	render(<DesignWorkflowShell title="Board" variant="board" taskId={taskDetail.id} />);
	const dialog = await screen.findByRole('dialog', { name: taskDetail.title });
	const targetDateSection = within(dialog).getByRole('heading', { name: 'Target date' }).closest('section');
	const controls = targetDateSection?.querySelector('.workflow-trello-modal-control-grid');

	expect(controls).toHaveAttribute('data-single-field', 'true');
	expect(within(controls as HTMLElement).getByRole('button', { name: 'Save' })).toHaveClass(
		'workflow-trello-modal-save',
	);
});

it('toggles a checklist row and supports removing and editing labels', async () => {
	const user = userEvent.setup();
	mockProfile(manager);
	const betaLabel = {
		id: 41,
		name: 'Beta review',
		color: '#6366f1',
		created_by: manager,
		created_at: '2026-04-20T08:00:00Z',
		updated_at: '2026-04-20T08:00:00Z',
	};
	const checklistItem = {
		id: 61,
		checklist_id: 60,
		title: 'Join final plans',
		done: false,
		sort_order: 0,
		created_by: manager,
		completed_by: null,
		completed_at: null,
		created_at: '2026-04-20T08:00:00Z',
		updated_at: '2026-04-20T08:00:00Z',
	};
	const enrichedTask: TaskDetail = {
		...taskDetail,
		labels: [betaLabel],
		checklists: [
			{
				id: 60,
				title: 'Handoff',
				sort_order: 0,
				created_by: manager,
				items: [checklistItem],
				created_at: '2026-04-20T08:00:00Z',
				updated_at: '2026-04-20T08:00:00Z',
			},
		],
		checklist_items: [checklistItem],
	};
	mockUseGetTaskQuery.mockReturnValue({ data: enrichedTask, isLoading: false });
	mockUseGetTasksQuery.mockReturnValue({ data: [enrichedTask], isLoading: false });
	mockUseGetLabelsQuery.mockReturnValue({ data: [betaLabel] });

	render(<DesignWorkflowShell title="Board" variant="board" taskId={enrichedTask.id} />);
	const dialog = await screen.findByRole('dialog', { name: enrichedTask.title });
	const checklistRow = within(dialog).getByRole('checkbox', { name: /Join final plans/ });
	await user.click(checklistRow);
	expect(mockUpdateChecklistItem).toHaveBeenCalledWith({
		id: enrichedTask.id,
		itemId: checklistItem.id,
		data: { done: true },
	});

	await user.click(within(dialog).getByText('Beta review'));
	expect(mockUpdateTask).not.toHaveBeenCalled();
	await user.click(within(dialog).getByRole('button', { name: 'Remove label: Beta review' }));
	expect(mockUpdateTask).toHaveBeenCalledWith({ id: enrichedTask.id, data: { label_ids: [] } });

	await user.click(within(dialog).getByRole('button', { name: 'Labels' }));
	await user.click(within(dialog).getByRole('button', { name: 'Edit: Beta review' }));
	const labelInput = within(dialog).getByDisplayValue('Beta review');
	await user.clear(labelInput);
	await user.type(labelInput, 'Client review');
	const editPanel = labelInput.closest('.workflow-trello-modal-label-edit');
	expect(editPanel).not.toBeNull();
	await user.click(within(editPanel as HTMLElement).getByRole('button', { name: 'Save' }));
	await waitFor(() =>
		expect(mockUpdateLabel).toHaveBeenCalledWith({
			id: betaLabel.id,
			data: { name: 'Client review', color: betaLabel.color },
		}),
	);
});

it('rebases the description after cancelling a conflicted draft', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	const { rerender } = render(<DesignWorkflowShell title="Board" variant="board" taskId={taskDetail.id} />);
	const dialog = await screen.findByRole('dialog', { name: taskDetail.title });
	await user.click(within(dialog).getByText(taskDetail.description));
	await user.type(within(dialog).getByPlaceholderText('Short description'), ' My discarded draft');
	mockUseGetTaskQuery.mockReturnValue({
		data: { ...taskDetail, description: 'Remote description' },
		isLoading: false,
	});
	rerender(<DesignWorkflowShell title="Board" variant="board" taskId={taskDetail.id} />);
	expect(within(dialog).getByRole('alert')).toHaveTextContent('Someone else changed this task');
	await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
	await user.click(within(dialog).getByText('Remote description'));
	const input = within(dialog).getByPlaceholderText('Short description');
	expect(input).toHaveValue('Remote description');
	await user.type(input, ' plus my new edit');
	const editor = input.closest('.workflow-trello-modal-description-edit') as HTMLElement;
	await user.click(within(editor).getByRole('button', { name: 'Save' }));
	expect(mockUpdateTask).toHaveBeenCalledWith({
		id: taskDetail.id,
		data: {
			description: 'Remote description plus my new edit',
			expected_values: { description: 'Remote description' },
		},
	});
});
