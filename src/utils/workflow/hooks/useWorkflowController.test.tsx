import {
	mockUpdateTaskReview,
	mockUploadTaskAttachment,
	mockUseGetTaskQuery,
	makeMutationResult,
	manager,
	designerA,
	taskDetail,
	reviewAttachment,
	mockProfile,
	boardTask,
	mockArchiveTask,
	mockReorderTasks,
	mockUseGetTasksQuery,
	mockCreateSavedView,
	mockUpdateSavedView,
	mockDeleteSavedView,
	mockUseGetSavedViewsQuery,
	mockDeleteTaskCover,
	mockDeleteTaskAttachment,
	mockSetTaskCoverFromAttachment,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';
import type { SavedView, TaskDetail } from '@/types/designWorkflowTypes';
import type { DragEndEvent } from '@dnd-kit/core';
import { useWorkflowController } from './useWorkflowController';
import { emptyBoardFilters, savedViewPayloadFromFilters } from '../workflowFormHelpers';

describe('board drag and persistence', () => {
	const dragEvent = (id: string | number, over: string): DragEndEvent => ({
		active: { id, data: { current: {} }, rect: { current: { initial: null, translated: null } } },
		over: {
			id: over,
			data: { current: {} },
			disabled: false,
			rect: { top: 0, left: 0, right: 100, bottom: 100, width: 100, height: 100 },
		},
		activatorEvent: new MouseEvent('pointerdown'),
		delta: { x: 0, y: 0 },
		collisions: null,
	});
	const setup = (canEdit = true) => {
		mockProfile(designerA);
		const refetch = jest.fn().mockResolvedValue({ data: [boardTask] });
		mockUseGetTasksQuery.mockReturnValue({ data: [{ ...boardTask, can_edit: canEdit }], refetch });
		return { ...renderHook(() => useWorkflowController({ title: 'Board', variant: 'board' })), refetch };
	};

	it('allows a designer to move an editable card and refetches authoritative order', async () => {
		const { result, refetch } = setup();
		act(() => result.current.handleDragStart(dragEvent('task-501', 'column-done')));
		expect(result.current.draggedTaskId).toBe(501);
		await act(() => result.current.handleDragEnd(dragEvent('task-501', 'column-done')));
		expect(mockReorderTasks).toHaveBeenCalledWith({
			moved_task_id: 501,
			tasks: [{ id: 501, status: 'done', sort_order: 0 }],
		});
		expect(refetch).toHaveBeenCalledTimes(1);
		expect(result.current.draggedTaskId).toBeNull();
		expect(result.current.boardDragPointerRef.current).toEqual({ x: null, y: null });
	});

	it('ignores read-only cards, non-card drag IDs and unchanged positions', async () => {
		const { result } = setup(false);
		act(() => result.current.handleDragStart(dragEvent('task-501', 'column-done')));
		await act(() => result.current.handleDragEnd(dragEvent('task-501', 'column-done')));
		expect(result.current.draggedTaskId).toBeNull();
		expect(mockReorderTasks).not.toHaveBeenCalled();
	});

	it.each([123, 'column-todo', 'task-999', 'task-501'])('does not send an invalid or no-op drag (%s)', async (id) => {
		const { result } = setup();
		act(() => result.current.handleDragStart(dragEvent(id, 'column-todo')));
		await act(() => result.current.handleDragEnd(dragEvent(id, 'column-todo')));
		expect(mockReorderTasks).not.toHaveBeenCalled();
	});

	it('refetches after a failed move and releases the lock for the next attempt', async () => {
		const { result, refetch } = setup();
		mockReorderTasks.mockReturnValueOnce({ unwrap: () => Promise.reject(new Error('Unavailable')) });
		await act(() => result.current.handleDragEnd(dragEvent('task-501', 'column-done')));
		expect(refetch).toHaveBeenCalledTimes(1);
		await act(() => result.current.handleDragEnd(dragEvent('task-501', 'column-in_progress')));
		expect(mockReorderTasks).toHaveBeenCalledTimes(2);
		expect(refetch).toHaveBeenCalledTimes(2);
	});

	it('does not issue duplicate moves while one request is in flight', async () => {
		const { result } = setup();
		let finish!: () => void;
		mockReorderTasks.mockReturnValueOnce({
			unwrap: () =>
				new Promise<void>((resolve) => {
					finish = resolve;
				}),
		});
		let pending!: Promise<void>;
		act(() => {
			pending = result.current.handleDragEnd(dragEvent('task-501', 'column-done'));
		});
		await act(() => result.current.handleDragEnd(dragEvent('task-501', 'column-in_progress')));
		expect(mockReorderTasks).toHaveBeenCalledTimes(1);
		await act(async () => {
			finish();
			await pending;
		});
	});
});

it('saves, marks default, deletes and resets board views, ignoring missing selections', async () => {
	mockProfile(manager);
	const view: SavedView = {
		...savedViewPayloadFromFilters('Client review', emptyBoardFilters(), 'private'),
		id: 88,
		owner: manager,
		collapsed_lanes: [],
		is_default: false,
		created_at: '',
		updated_at: '',
	};
	mockUseGetSavedViewsQuery.mockReturnValue({ data: [view] });
	mockCreateSavedView.mockReturnValue({ unwrap: async () => view });
	const { result } = renderHook(() => useWorkflowController({ title: 'Board', variant: 'board' }));
	await act(async () => {
		await result.current.saveBoardView();
		await result.current.markCurrentViewDefault();
		await result.current.deleteCurrentSavedView();
	});
	expect(mockCreateSavedView).not.toHaveBeenCalled();
	expect(mockUpdateSavedView).not.toHaveBeenCalled();
	expect(mockDeleteSavedView).not.toHaveBeenCalled();
	act(() => result.current.setSavedViewName(' Client review '));
	await act(() => result.current.saveBoardView());
	expect(mockCreateSavedView).toHaveBeenCalledWith(expect.objectContaining({ name: 'Client review' }));
	expect(result.current.savedViewName).toBe('');
	await act(() => result.current.markCurrentViewDefault());
	expect(mockUpdateSavedView).toHaveBeenCalledWith({ id: 88, data: { is_default: true } });
	await act(() => result.current.deleteCurrentSavedView());
	expect(mockDeleteSavedView).toHaveBeenCalledWith(88);
	expect(result.current.selectedSavedViewId).toBeNull();
	act(() => result.current.updateBoardFiltersManually({ ...emptyBoardFilters(), search: 'Plans' }));
	act(() => result.current.resetBoardFilters());
	expect(result.current.boardFilters).toEqual(emptyBoardFilters());
});

it('archives and restores cards and limits confirmed media deletion to the selected editable card', async () => {
	mockProfile(designerA);
	mockUseGetTaskQuery.mockReturnValue({
		data: { ...taskDetail, can_edit: true, cover_image_url: '/cover.png', attachments: [reviewAttachment] },
		isLoading: false,
	});
	const { result } = renderHook(() =>
		useWorkflowController({ title: 'Task', variant: 'task-detail', taskId: taskDetail.id }),
	);
	await act(() => result.current.handleArchiveTask(boardTask));
	await act(() => result.current.handleArchiveTask({ ...boardTask, archived: true }));
	expect(mockArchiveTask.mock.calls.map(([payload]) => payload.archived)).toEqual([true, false]);
	await act(() => result.current.handleConfirmMediaDelete());
	expect(mockDeleteTaskCover).not.toHaveBeenCalled();
	act(() => result.current.setMediaDeleteTarget({ kind: 'cover', taskId: 999, name: 'Cover' }));
	await act(() => result.current.handleConfirmMediaDelete());
	expect(mockDeleteTaskCover).not.toHaveBeenCalled();
	act(() => result.current.setMediaDeleteTarget({ kind: 'cover', taskId: taskDetail.id, name: 'Cover' }));
	await act(() => result.current.handleConfirmMediaDelete());
	expect(mockDeleteTaskCover).toHaveBeenCalledWith(taskDetail.id);
	expect(result.current.mediaDeleteTarget).toBeNull();
	act(() =>
		result.current.setMediaDeleteTarget({
			kind: 'attachment',
			taskId: taskDetail.id,
			attachmentId: reviewAttachment.id,
			name: reviewAttachment.name,
		}),
	);
	await act(() => result.current.handleConfirmMediaDelete());
	expect(mockDeleteTaskAttachment).toHaveBeenCalledWith({ id: taskDetail.id, attachmentId: reviewAttachment.id });
	await act(() => result.current.handleSetAttachmentAsCover(taskDetail, reviewAttachment));
	expect(mockSetTaskCoverFromAttachment).toHaveBeenCalledWith({ id: taskDetail.id, attachmentId: reviewAttachment.id });
});

it('prefills filenames and preserves optional edits when adding or reselecting files', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	render(<DesignWorkflowShell title="Board" variant="board" />);
	const picker = await openAttachmentPicker(user);
	const input = within(picker).getByLabelText('Choose files') as HTMLInputElement;
	expect(input).toHaveAttribute('multiple');
	const files = ['plan.pdf', 'render.mp4', 'remove.txt'].map(
		(name) => new File(['contents'], name, { lastModified: 1 }),
	);
	await user.upload(input, files.slice(0, 2));
	expect(within(picker).getByLabelText('Description for plan.pdf')).toHaveValue('plan.pdf');
	expect(within(picker).getByLabelText('Description for render.mp4')).toHaveValue('render.mp4');
	expect(within(picker).getByRole('button', { name: 'Add 2 files' })).toBeEnabled();
	await user.clear(within(picker).getByLabelText('Description for plan.pdf'));
	await user.type(within(picker).getByLabelText('Description for plan.pdf'), 'Floor plan');
	await user.upload(input, [files[0], files[2]]);
	expect(within(picker).getAllByRole('textbox')).toHaveLength(3);
	expect(within(picker).getByRole('button', { name: 'Add 3 files' })).toBeEnabled();
	expect(within(picker).getByLabelText('Description for plan.pdf')).toHaveValue('Floor plan');
	expect(within(picker).getByLabelText('Description for remove.txt')).toHaveValue('remove.txt');
	await user.click(within(picker).getByRole('button', { name: 'Remove remove.txt' }));
	await user.click(within(picker).getByRole('button', { name: 'Add 2 files' }));
	await waitFor(() => expect(mockUploadTaskAttachment).toHaveBeenCalledTimes(2));
	for (const [index, label] of ['Floor plan', 'render.mp4'].entries()) {
		const args = mockUploadTaskAttachment.mock.calls[index][0];
		expect(args.id).toBe(taskDetail.id);
		expect(args.data.get('file')).toBe(files[index]);
		expect(args.data.get('name')).toBe(label);
	}
	expect(within(picker).queryByRole('textbox')).not.toBeInTheDocument();
});

it('keeps spaces, accents and extensions in the default name and validates a cleared field', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	render(<DesignWorkflowShell title="Board" variant="board" />);
	const picker = await openAttachmentPicker(user);
	const file = new File(['contents'], 'Présentation finale.v2.pdf');
	await user.upload(within(picker).getByLabelText('Choose files'), file);
	const name = within(picker).getByLabelText(`Description for ${file.name}`);
	expect(name).toHaveValue(file.name);
	await user.clear(name);
	expect(within(picker).getByRole('button', { name: 'Add 1 file' })).toBeDisabled();
	await user.type(name, 'Présentation client');
	await user.click(within(picker).getByRole('button', { name: 'Add 1 file' }));
	await waitFor(() => expect(mockUploadTaskAttachment).toHaveBeenCalledTimes(1));
	expect(mockUploadTaskAttachment.mock.calls[0][0].data.get('name')).toBe('Présentation client');
});

it('continues after one upload fails and retries only the failed file with its label', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	mockUploadTaskAttachment
		.mockReturnValueOnce(makeMutationResult())
		.mockReturnValueOnce({
			unwrap: () => Promise.reject({ data: { details: { file: 'Temporary upload failure' } } }),
		})
		.mockReturnValueOnce(makeMutationResult());
	render(<DesignWorkflowShell title="Board" variant="board" />);
	const picker = await openAttachmentPicker(user);
	const files = ['one.pdf', 'two.pdf', 'three.pdf'].map((name) => new File(['contents'], name));
	await user.upload(within(picker).getByLabelText('Choose files'), files);
	for (const file of files) {
		const name = within(picker).getByLabelText(`Description for ${file.name}`);
		await user.clear(name);
		await user.type(name, `Label ${file.name}`);
	}
	await user.click(within(picker).getByRole('button', { name: 'Add 3 files' }));
	await waitFor(() => expect(mockUploadTaskAttachment).toHaveBeenCalledTimes(3));
	expect(within(picker).getByLabelText('Description for two.pdf')).toHaveValue('Label two.pdf');
	expect(within(picker).getAllByRole('textbox')).toHaveLength(1);
	expect(within(picker).getByRole('alert')).toHaveTextContent('Temporary upload failure');
	await user.click(within(picker).getByRole('button', { name: 'Add 1 file' }));
	await waitFor(() => expect(mockUploadTaskAttachment).toHaveBeenCalledTimes(4));
	expect(mockUploadTaskAttachment.mock.calls[3][0].data.get('file')).toBe(files[1]);
	expect(mockUploadTaskAttachment.mock.calls[3][0].data.get('name')).toBe('Label two.pdf');
});

it('validates the 10 GB limit per file rather than the combined selection', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	render(<DesignWorkflowShell title="Board" variant="board" />);
	const picker = await openAttachmentPicker(user);
	const files = ['six-a.mp4', 'six-b.mp4', 'too-large.mp4'].map((name) => new File(['x'], name));
	files.forEach((file, index) => Object.defineProperty(file, 'size', { value: (index === 2 ? 11 : 6) * 1024 ** 3 }));
	await user.upload(within(picker).getByLabelText('Choose files'), files);
	expect(within(picker).getAllByRole('textbox')).toHaveLength(2);
	expect(within(picker).queryByText('too-large.mp4')).not.toBeInTheDocument();
	await user.click(within(picker).getByRole('button', { name: 'Add 2 files' }));
	await waitFor(() => expect(mockUploadTaskAttachment).toHaveBeenCalledTimes(2));
});

it('keeps the queue and labels during task refresh and sends one file at a time', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	let finishFirst!: () => void;
	mockUploadTaskAttachment.mockReturnValueOnce({
		unwrap: () =>
			new Promise<void>((resolve) => {
				finishFirst = resolve;
			}),
	});
	const { rerender } = render(<DesignWorkflowShell title="Board" variant="board" />);
	const picker = await openAttachmentPicker(user);
	const files = ['one.pdf', 'two.pdf'].map((name) => new File(['contents'], name));
	await user.upload(within(picker).getByLabelText('Choose files'), files);
	await user.click(within(picker).getByRole('button', { name: 'Add 2 files' }));
	expect(mockUploadTaskAttachment).toHaveBeenCalledTimes(1);
	expect(within(picker).getByLabelText('Choose files')).toBeDisabled();
	mockUseGetTaskQuery.mockReturnValue({ data: { ...taskDetail, attachments: [reviewAttachment] }, isLoading: false });
	rerender(<DesignWorkflowShell title="Board" variant="board" />);
	expect(within(picker).getByLabelText('Description for two.pdf')).toHaveValue('two.pdf');
	await act(async () => {
		finishFirst();
	});
	await waitFor(() => expect(mockUploadTaskAttachment).toHaveBeenCalledTimes(2));
	expect(mockUploadTaskAttachment.mock.calls[1][0].data.get('name')).toBe('two.pdf');
});

it('stops the remaining queue when the card closes and does not leak files on reopening', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	let finishFirst!: () => void;
	mockUploadTaskAttachment.mockReturnValueOnce({
		unwrap: () =>
			new Promise<void>((resolve) => {
				finishFirst = resolve;
			}),
	});
	render(<DesignWorkflowShell title="Board" variant="board" />);
	const picker = await openAttachmentPicker(user);
	const files = ['one.pdf', 'two.pdf'].map((name) => new File(['contents'], name));
	await user.upload(within(picker).getByLabelText('Choose files'), files);
	await user.click(within(picker).getByRole('button', { name: 'Add 2 files' }));
	await user.click(document.querySelector('.workflow-trello-modal-close') as HTMLButtonElement);
	await act(async () => {
		finishFirst();
	});
	expect(mockUploadTaskAttachment).toHaveBeenCalledTimes(1);
	const reopened = await openAttachmentPicker(user);
	expect(within(reopened).queryByRole('textbox')).not.toBeInTheDocument();
});

it('does not let a late review response erase another card’s notes or review state', async () => {
	const user = userEvent.setup();
	mockProfile(manager);
	let finishReview!: (task: TaskDetail) => void;
	mockUpdateTaskReview.mockReturnValue({
		unwrap: () =>
			new Promise<TaskDetail>((resolve) => {
				finishReview = resolve;
			}),
	});
	const { rerender } = render(<DesignWorkflowShell title="Task" variant="task-detail" taskId={taskDetail.id} />);
	await user.click(screen.getByRole('tab', { name: 'Review' }));
	await user.click(screen.getByRole('button', { name: 'Request changes' }));
	const otherTask = { ...taskDetail, id: 502, title: 'Other card' };
	mockUseGetTaskQuery.mockReturnValue({ data: otherTask, isLoading: false });
	rerender(<DesignWorkflowShell title="Task" variant="task-detail" taskId={otherTask.id} />);
	await user.click(screen.getByRole('tab', { name: 'Review' }));
	const notes = screen.getAllByLabelText('Optional note')[0];
	await user.type(notes, 'My notes for the other card');
	await act(async () => {
		finishReview({ ...taskDetail, review_state: 'changes_requested', updated_at: '2026-04-22T12:01:00Z' });
	});
	expect(notes).toHaveValue('My notes for the other card');
	expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
	expect(screen.getByRole('button', { name: 'Request changes' })).toBeEnabled();
});
import { openAttachmentPicker } from '@/components/design-workflow/__testutils__/workflowTestSetup';
