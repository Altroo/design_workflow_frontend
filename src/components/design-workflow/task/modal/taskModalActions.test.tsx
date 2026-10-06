import {
	mockUpdateTaskReview,
	mockArchiveTask,
	mockUseGetTaskQuery,
	mockUseGetTasksQuery,
	makeMutationResult,
	manager,
	designerA,
	designerB,
	projectSummary,
	boardTask,
	taskDetail,
	mockProfile,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';
import type { TaskDetail } from '@/types/designWorkflowTypes';

it('enables shared card tools for a collaborator who is not the assignee', async () => {
	const user = userEvent.setup();
	mockProfile(designerB);
	const sharedProject = { ...projectSummary, can_work: true, can_manage: false, collaborators: [designerB] };
	const sharedCard = { ...boardTask, project: sharedProject, can_edit: true, review_state: 'not_submitted' as const };
	mockUseGetTasksQuery.mockReturnValue({ data: [sharedCard], isLoading: false });
	mockUseGetTaskQuery.mockReturnValue({ data: { ...taskDetail, ...sharedCard }, isLoading: false });
	render(<DesignWorkflowShell title="Board" variant="board" />);
	expect(screen.getByTestId(`board-task-${sharedCard.id}`).querySelector('.workflow-board-drag-handle')).not.toBeNull();
	await user.click(screen.getByText(sharedCard.title));
	const dialog = await screen.findByRole('dialog', { name: sharedCard.title });
	for (const action of ['Labels', 'Card image', 'Attachments', 'Checklist', 'Members', 'Request review']) {
		expect(within(dialog).getByRole('button', { name: action })).toBeEnabled();
	}
	expect(within(dialog).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
	await user.click(within(dialog).getByRole('button', { name: 'Attachments' }));
	expect(within(dialog).getByRole('region', { name: 'Attachments' })).toBeInTheDocument();
});

it('shows manager review actions only after the designer requests review', async () => {
	const user = userEvent.setup();
	mockProfile(manager);
	mockUpdateTaskReview.mockImplementation(({ review_state }: { review_state: TaskDetail['review_state'] }) =>
		makeMutationResult({ ...taskDetail, review_state, updated_at: '2026-04-22T12:01:00Z' }),
	);

	render(<DesignWorkflowShell title="Board" variant="board" taskId={taskDetail.id} />);
	const dialog = await screen.findByRole('dialog', { name: taskDetail.title });

	expect(within(dialog).queryByRole('button', { name: 'Request review' })).not.toBeInTheDocument();
	expect(within(dialog).getByRole('button', { name: 'Approve' })).toBeEnabled();
	await user.click(within(dialog).getByRole('button', { name: 'Request changes' }));

	await waitFor(() => {
		expect(within(dialog).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
	});
	expect(within(dialog).queryByRole('button', { name: 'Request changes' })).not.toBeInTheDocument();
	expect(mockUpdateTaskReview.mock.calls.map(([payload]) => payload.review_state)).toEqual(['changes_requested']);
});

it('requires manager confirmation before approval', async () => {
	const user = userEvent.setup();
	mockProfile(manager);
	mockUpdateTaskReview.mockImplementation(({ review_state }: { review_state: TaskDetail['review_state'] }) =>
		makeMutationResult({ ...taskDetail, review_state, status: 'done', updated_at: '2026-04-22T12:01:00Z' }),
	);

	render(<DesignWorkflowShell title="Board" variant="board" taskId={taskDetail.id} />);
	const dialog = await screen.findByRole('dialog', { name: taskDetail.title });

	await user.click(within(dialog).getByRole('button', { name: 'Approve' }));
	expect(mockUpdateTaskReview).not.toHaveBeenCalled();
	const confirmation = screen.getByRole('dialog', { name: 'Approve this task?' });
	expect(within(confirmation).getByText(/automatically move the task to Done/i)).toBeInTheDocument();
	const confirmApproval = within(confirmation).getByRole('button', { name: 'Approve' });
	expect(confirmApproval).toHaveStyle('--ui-modal-action-color: #16a34a');
	await user.click(confirmApproval);

	await waitFor(() =>
		expect(mockUpdateTaskReview).toHaveBeenCalledWith({
			id: taskDetail.id,
			review_state: 'approved',
			notes: undefined,
		}),
	);
});

it('lets the designer submit or resubmit without showing approval actions', async () => {
	const user = userEvent.setup();
	const changesRequestedTask = { ...taskDetail, review_state: 'changes_requested' as const };
	mockProfile(designerA);
	mockUseGetTaskQuery.mockReturnValue({ data: changesRequestedTask, isLoading: false });
	mockUpdateTaskReview.mockImplementation(({ review_state }: { review_state: TaskDetail['review_state'] }) =>
		makeMutationResult({ ...changesRequestedTask, review_state, updated_at: '2026-04-22T12:01:00Z' }),
	);

	render(<DesignWorkflowShell title="Board" variant="board" taskId={taskDetail.id} />);
	const dialog = await screen.findByRole('dialog', { name: taskDetail.title });

	expect(within(dialog).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
	expect(within(dialog).queryByRole('button', { name: 'Request changes' })).not.toBeInTheDocument();
	await user.click(within(dialog).getByRole('button', { name: 'Resubmit for review' }));
	expect(mockUpdateTaskReview).not.toHaveBeenCalled();
	const confirmation = screen.getByRole('dialog', { name: 'Submit task for review?' });
	expect(within(confirmation).getByText(/cannot be changed until a manager responds/i)).toBeInTheDocument();
	const confirmReview = within(confirmation).getByRole('button', { name: 'Resubmit for review' });
	expect(confirmReview).toHaveStyle('--ui-modal-action-color: #d97706');
	await user.click(confirmReview);

	await waitFor(() =>
		expect(mockUpdateTaskReview).toHaveBeenCalledWith({
			id: taskDetail.id,
			review_state: 'needs_review',
			notes: undefined,
		}),
	);
});

it('disables task restoration while its project is archived', () => {
	mockProfile(manager);
	mockUseGetTaskQuery.mockReturnValue({
		data: {
			...taskDetail,
			archived: true,
			archived_at: '2026-04-23T09:00:00Z',
			project: {
				...projectSummary,
				status: 'archived',
				archived: true,
				archived_at: '2026-04-23T09:00:00Z',
			},
		},
		isLoading: false,
	});

	render(<DesignWorkflowShell title="Task" variant="task-detail" taskId={taskDetail.id} />);

	const restoreButtons = screen.getAllByRole('button', { name: 'Unarchive the project before restoring this task.' });
	expect(restoreButtons.length).toBeGreaterThan(0);
	restoreButtons.forEach((button) => expect(button).toBeDisabled());
	expect(mockArchiveTask).not.toHaveBeenCalled();
});

it.each(['approved', 'changes_requested'] as const)(
	'accepts the live %s decision after submitting review, including a return to the original state',
	async (decision) => {
		const user = userEvent.setup();
		mockProfile(designerA);
		const original = { ...taskDetail, review_state: 'changes_requested' as const };
		const submitted = { ...original, review_state: 'needs_review' as const, updated_at: '2026-04-22T12:01:00Z' };
		mockUseGetTaskQuery.mockReturnValue({ data: original, isLoading: false });
		mockUpdateTaskReview.mockReturnValue(makeMutationResult(submitted));
		const { rerender } = render(<DesignWorkflowShell title="Board" variant="board" taskId={taskDetail.id} />);
		const dialog = await screen.findByRole('dialog', { name: taskDetail.title });
		await user.click(within(dialog).getByRole('button', { name: 'Resubmit for review' }));
		await user.click(
			within(screen.getByRole('dialog', { name: 'Submit task for review?' })).getByRole('button', {
				name: 'Resubmit for review',
			}),
		);
		await waitFor(() =>
			expect(within(dialog).queryByRole('button', { name: 'Resubmit for review' })).not.toBeInTheDocument(),
		);
		// A stale query arriving after mutation fulfillment must not undo the optimistic result.
		mockUseGetTaskQuery.mockReturnValue({ data: { ...original }, isLoading: false });
		rerender(<DesignWorkflowShell title="Board" variant="board" taskId={taskDetail.id} />);
		expect(within(dialog).queryByRole('button', { name: 'Resubmit for review' })).not.toBeInTheDocument();
		mockUseGetTaskQuery.mockReturnValue({
			data: { ...original, review_state: decision, updated_at: '2026-04-22T12:02:00Z' },
			isLoading: false,
		});
		rerender(<DesignWorkflowShell title="Board" variant="board" taskId={taskDetail.id} />);
		expect(within(dialog).getByText(decision === 'approved' ? 'Approved' : 'Changes requested')).toBeInTheDocument();
		if (decision === 'changes_requested')
			expect(within(dialog).getByRole('button', { name: 'Resubmit for review' })).toBeEnabled();
	},
);
