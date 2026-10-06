import {
	designerA,
	manager,
	mockProfile,
	taskDetail,
	mockAddChecklist,
	mockAddChecklistItem,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { act, renderHook } from '@testing-library/react';
import { createTaskDetailModel } from '@/components/design-workflow/task/model/taskDetailModel';
import { useWorkflowController } from '@/utils/workflow/hooks/useWorkflowController';

const renderDetailModel = () => {
	mockProfile(designerA);
	mockAddChecklist.mockReturnValue({ unwrap: async () => ({ id: 42 }) });
	return renderHook(() => {
		const model = useWorkflowController({ title: 'Task', variant: 'task-detail', taskId: taskDetail.id });
		return createTaskDetailModel({ ...model, task: taskDetail });
	});
};

it('toggles checklist templates and creates all template items in order', async () => {
	const { result } = renderDetailModel();
	const template = result.current.checklistTemplates[0];
	act(() => result.current.selectChecklistTemplate(template));
	expect(result.current.selectedChecklistTemplate).toBe(template.key);
	act(() => result.current.selectChecklistTemplate(template));
	expect(result.current.selectedChecklistTemplate).toBe('');
	act(() => result.current.selectChecklistTemplate(template));
	await act(() => result.current.createChecklistForTask());
	expect(mockAddChecklist).toHaveBeenCalledWith({ id: taskDetail.id, title: template.title, sort_order: 0 });
	expect(mockAddChecklistItem.mock.calls.map(([item]) => item)).toEqual(
		template.items.map((title, sort_order) => ({ id: taskDetail.id, checklist_id: 42, title, sort_order })),
	);
	expect(result.current.selectedChecklistTemplate).toBe('');
	expect(result.current.newChecklistGroupTitle).toBe('');
});

it('creates a named empty checklist without adding template items', async () => {
	const { result } = renderDetailModel();
	act(() => result.current.setNewChecklistGroupTitle('  Client notes  '));
	await act(() => result.current.createChecklistForTask());
	expect(mockAddChecklist).toHaveBeenCalledWith({ id: taskDetail.id, title: 'Client notes', sort_order: 0 });
	expect(mockAddChecklistItem).not.toHaveBeenCalled();
});

it.each([0, 42])('validates and adds a checklist item to group %s', async (id) => {
	const { result } = renderDetailModel();
	const group = { id, title: 'Delivery', sort_order: 0, items: [] };
	await act(() => result.current.addChecklistItemToGroup(group));
	expect(mockAddChecklistItem).not.toHaveBeenCalled();
	act(() => result.current.setNewChecklistItemsByChecklist({ [String(id)]: '  Final render  ' }));
	await act(() => result.current.addChecklistItemToGroup(group));
	expect(mockAddChecklistItem).toHaveBeenCalledWith({
		id: taskDetail.id,
		checklist_id: id || undefined,
		title: 'Final render',
		sort_order: 0,
	});
	expect(result.current.newChecklistItemsByChecklist[String(id)]).toBe('');
});

it('creates the handoff checklist with every delivery item', async () => {
	const { result } = renderDetailModel();
	const template = result.current.handoffTemplate!;
	await act(() => result.current.createHandoffChecklist());
	expect(mockAddChecklist).toHaveBeenCalledWith({ id: taskDetail.id, title: template.title, sort_order: 0 });
	expect(mockAddChecklistItem.mock.calls.map(([item]) => item.title)).toEqual(template.items);
});

it('paginates comments and hides time events from designers', () => {
	mockProfile(designerA);
	const { result } = renderHook(() =>
		useWorkflowController({ title: 'Task', variant: 'task-detail', taskId: taskDetail.id }),
	);
	const task = {
		...taskDetail,
		comments: Array.from({ length: 7 }, (_, id) => ({ ...taskDetail.comments[0], id })),
		recent_activity: [
			...taskDetail.recent_activity,
			{ ...taskDetail.recent_activity[0], id: 200, action_type: 'time_logged' },
		],
	};
	const detail = createTaskDetailModel({ ...result.current, task, taskCommentsPage: 2 });
	expect(detail.taskCommentsTotalPages).toBe(2);
	expect(detail.pagedTaskComments.map((item) => item.id)).toEqual([5, 6]);
	expect(detail.pagedTaskActivity.map((item) => item.id)).not.toContain(200);
});
it('locks restoration under an archived project and handles empty checklist progress', () => {
	mockProfile(manager);
	const { result } = renderHook(() =>
		useWorkflowController({ title: 'Task', variant: 'task-detail', taskId: taskDetail.id }),
	);
	const detail = createTaskDetailModel({
		...result.current,
		task: { ...taskDetail, archived: true, project: { ...taskDetail.project, archived: true } },
	});
	expect(detail.taskRestoreLocked).toBe(true);
	expect(detail.checklistProgress).toBe(0);
	expect(detail.checklistGroups).toEqual([]);
	expect(detail.showAttachmentsPanel).toBe(false);
});
