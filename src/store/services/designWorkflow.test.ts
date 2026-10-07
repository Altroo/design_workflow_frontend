import { designWorkflowApi } from './designWorkflow';
import { setupApiStore } from '@/store/setupApiStore';
import { emptyProjectForm, emptyTaskForm, buildTaskPayload } from '@/utils/workflow/workflowFormHelpers';

const mockBaseQuery = jest.fn();
jest.mock('@/utils/axiosBaseQuery', () => ({
	axiosBaseQuery:
		() =>
		(...args: unknown[]) =>
			mockBaseQuery(...args),
}));

const root = `${process.env.NEXT_PUBLIC_API_URL}/api/design-workflow/`;
const api = designWorkflowApi.endpoints;
let store: ReturnType<typeof setupApiStore>['store'];
beforeEach(() => {
	jest.clearAllMocks();
	mockBaseQuery.mockResolvedValue({ data: [] });
	store = setupApiStore(designWorkflowApi).store;
});
afterEach(() => {
	store.dispatch(designWorkflowApi.util.resetApiState());
});

const project = { ...emptyProjectForm(2), name: 'Villa', collaborator_ids: [3] };
const task = buildTaskPayload(7, { ...emptyTaskForm(), title: 'Plans' });
const view = {
	name: 'Review',
	visibility: 'private' as const,
	filters: { project: 7 },
	sort: { field: 'sort_order' },
	density: 'compact' as const,
	show_archived: false,
};
const label = { name: 'Client', color: '#44aa77' };
const report = { project: 7, user: 2, start_date: '2026-10-01', end_date: '2026-10-31' };
const reorder = { moved_task_id: 12, tasks: [{ id: 12, status: 'in_progress' as const, sort_order: 0 }] };
const time = { minutes: 60, work_date: '2026-10-06', note: 'Plans' };

it('loads the changelog through the authenticated API', async () => {
	await store.dispatch(api.getChangelog.initiate());
	expect(mockBaseQuery).toHaveBeenCalledWith(
		expect.objectContaining({ url: `${process.env.NEXT_PUBLIC_API_URL}/api/ws/changelog/`, method: 'GET' }),
		expect.anything(),
		undefined,
	);
});

describe('workflow API request contracts', () => {
	const requests = [
		{
			name: 'dashboard',
			run: () => store.dispatch(api.getDashboardSummary.initiate()),
			path: 'dashboard/summary/',
			method: 'GET',
		},
		{
			name: 'saved views',
			run: () => store.dispatch(api.getSavedViews.initiate({ visibility: 'private' })),
			path: 'views/',
			method: 'GET',
			params: { visibility: 'private' },
		},
		{
			name: 'create saved view',
			run: () => store.dispatch(api.createSavedView.initiate(view)),
			path: 'views/',
			method: 'POST',
			data: view,
		},
		{
			name: 'update saved view',
			run: () => store.dispatch(api.updateSavedView.initiate({ id: 12, data: view })),
			path: 'views/12/',
			method: 'PATCH',
			data: view,
		},
		{
			name: 'delete saved view',
			run: () => store.dispatch(api.deleteSavedView.initiate(12)),
			path: 'views/12/',
			method: 'DELETE',
		},
		{
			name: 'search',
			run: () => store.dispatch(api.searchWorkspace.initiate({ q: 'Plans', types: 'task,project' })),
			path: 'search/',
			method: 'GET',
			params: { q: 'Plans', types: 'task,project' },
		},
		{
			name: 'projects',
			run: () => store.dispatch(api.getProjects.initiate({ all: true, archived: false })),
			path: 'projects/',
			method: 'GET',
			params: { all: true, archived: false },
		},
		{
			name: 'project detail',
			run: () => store.dispatch(api.getProject.initiate(7)),
			path: 'projects/7/',
			method: 'GET',
		},
		{
			name: 'create project',
			run: () => store.dispatch(api.createProject.initiate(project)),
			path: 'projects/',
			method: 'POST',
			data: project,
		},
		{
			name: 'archive project',
			run: () => store.dispatch(api.updateProject.initiate({ id: 7, data: { archived: true } })),
			path: 'projects/7/',
			method: 'PATCH',
			data: { archived: true },
		},
		{ name: 'labels', run: () => store.dispatch(api.getLabels.initiate()), path: 'labels/', method: 'GET' },
		{
			name: 'create label',
			run: () => store.dispatch(api.createLabel.initiate(label)),
			path: 'labels/',
			method: 'POST',
			data: label,
		},
		{
			name: 'update label',
			run: () => store.dispatch(api.updateLabel.initiate({ id: 4, data: label })),
			path: 'labels/4/',
			method: 'PATCH',
			data: label,
		},
		{
			name: 'filtered tasks',
			run: () => store.dispatch(api.getTasks.initiate({ project: 7, label: 4, archived: false })),
			path: 'tasks/',
			method: 'GET',
			params: { project: 7, label: 4, archived: false },
		},
		{
			name: 'create task',
			run: () => store.dispatch(api.createTask.initiate(task)),
			path: 'tasks/',
			method: 'POST',
			data: task,
		},
		{ name: 'task detail', run: () => store.dispatch(api.getTask.initiate(12)), path: 'tasks/12/', method: 'GET' },
		{
			name: 'rename task',
			run: () => store.dispatch(api.updateTask.initiate({ id: 12, data: { title: 'Renamed' } })),
			path: 'tasks/12/',
			method: 'PATCH',
			data: { title: 'Renamed' },
		},
		{
			name: 'task status',
			run: () =>
				store.dispatch(
					api.updateTaskStatus.initiate({ id: 12, status: 'blocked', blocked_reason: 'Client', sort_order: 0 }),
				),
			path: 'tasks/12/status/',
			method: 'PATCH',
			data: { status: 'blocked', blocked_reason: 'Client', sort_order: 0 },
		},
		{
			name: 'request review',
			run: () =>
				store.dispatch(api.updateTaskReview.initiate({ id: 12, review_state: 'needs_review', notes: 'Ready' })),
			path: 'tasks/12/review/',
			method: 'POST',
			data: { review_state: 'needs_review', notes: 'Ready' },
		},
		{
			name: 'reorder',
			run: () => store.dispatch(api.reorderTasks.initiate(reorder)),
			path: 'tasks/reorder/',
			method: 'PATCH',
			data: reorder,
		},
		{
			name: 'reopen task',
			run: () => store.dispatch(api.toggleTaskCompletion.initiate({ id: 12, is_completed: false })),
			path: 'tasks/12/complete/',
			method: 'POST',
			data: { is_completed: false },
		},
		{
			name: 'unarchive task',
			run: () => store.dispatch(api.archiveTask.initiate({ id: 12, archived: false })),
			path: 'tasks/12/archive/',
			method: 'POST',
			data: { archived: false },
		},
		{
			name: 'add checklist',
			run: () => store.dispatch(api.addChecklist.initiate({ id: 12, title: 'Delivery', sort_order: 0 })),
			path: 'tasks/12/checklists/',
			method: 'POST',
			data: { title: 'Delivery', sort_order: 0 },
		},
		{
			name: 'delete checklist',
			run: () => store.dispatch(api.deleteChecklist.initiate({ id: 12, checklistId: 3 })),
			path: 'tasks/12/checklists/3/',
			method: 'DELETE',
		},
		{
			name: 'add checklist item',
			run: () =>
				store.dispatch(api.addChecklistItem.initiate({ id: 12, checklist_id: 3, title: 'Render', done: false })),
			path: 'tasks/12/checklist/',
			method: 'POST',
			data: { checklist_id: 3, title: 'Render', done: false },
		},
		{
			name: 'update checklist item',
			run: () => store.dispatch(api.updateChecklistItem.initiate({ id: 12, itemId: 5, data: { done: true } })),
			path: 'tasks/12/checklist/5/',
			method: 'PATCH',
			data: { done: true },
		},
		{
			name: 'delete checklist item',
			run: () => store.dispatch(api.deleteChecklistItem.initiate({ id: 12, itemId: 5 })),
			path: 'tasks/12/checklist/5/',
			method: 'DELETE',
		},
		{
			name: 'delete attachment',
			run: () => store.dispatch(api.deleteTaskAttachment.initiate({ id: 12, attachmentId: 5 })),
			path: 'tasks/12/attachments/5/',
			method: 'DELETE',
		},
		{
			name: 'rename attachment',
			run: () => store.dispatch(api.renameTaskAttachment.initiate({ id: 12, attachmentId: 5, name: 'Final brief' })),
			path: 'tasks/12/attachments/5/',
			method: 'PATCH',
			data: { name: 'Final brief' },
		},
		{
			name: 'set cover',
			run: () => store.dispatch(api.setTaskCoverFromAttachment.initiate({ id: 12, attachmentId: 5 })),
			path: 'tasks/12/attachments/5/',
			method: 'POST',
		},
		{
			name: 'delete cover',
			run: () => store.dispatch(api.deleteTaskCover.initiate(12)),
			path: 'tasks/12/cover/',
			method: 'DELETE',
		},
		{
			name: 'versions',
			run: () => store.dispatch(api.getTaskVersions.initiate(12)),
			path: 'tasks/12/versions/',
			method: 'GET',
		},
		{
			name: 'create version',
			run: () =>
				store.dispatch(
					api.createTaskVersion.initiate({ id: 12, attachment_id: 5, notes: 'Revision', approval_state: 'pending' }),
				),
			path: 'tasks/12/versions/',
			method: 'POST',
			data: { attachment_id: 5, notes: 'Revision', approval_state: 'pending' },
		},
		{
			name: 'annotations',
			run: () => store.dispatch(api.getAttachmentAnnotations.initiate(5)),
			path: 'attachments/5/annotations/',
			method: 'GET',
		},
		{
			name: 'add annotation',
			run: () =>
				store.dispatch(
					api.createAttachmentAnnotation.initiate({
						attachmentId: 5,
						x_percent: '10',
						y_percent: '20',
						body: 'Adjust',
					}),
				),
			path: 'attachments/5/annotations/',
			method: 'POST',
			data: { x_percent: '10', y_percent: '20', body: 'Adjust' },
		},
		{
			name: 'reassign',
			run: () => store.dispatch(api.reassignTask.initiate({ id: 12, assignee_id: 3, reason: 'Shared project' })),
			path: 'tasks/12/reassign/',
			method: 'POST',
			data: { assignee_id: 3, reason: 'Shared project' },
		},
		{
			name: 'comments',
			run: () => store.dispatch(api.getTaskComments.initiate(12)),
			path: 'tasks/12/comments/',
			method: 'GET',
		},
		{
			name: 'add comment',
			run: () => store.dispatch(api.addTaskComment.initiate({ id: 12, body: '@maryam Ready' })),
			path: 'tasks/12/comments/',
			method: 'POST',
			data: { body: '@maryam Ready' },
		},
		{
			name: 'paginated time entries',
			run: () => store.dispatch(api.getTaskTimeEntries.initiate({ id: 12, page: 2 })),
			path: 'tasks/12/time-entries/',
			method: 'GET',
			params: { page: 2, page_size: 5 },
		},
		{
			name: 'add time entry',
			run: () => store.dispatch(api.addTaskTimeEntry.initiate({ id: 12, ...time })),
			path: 'tasks/12/time-entries/',
			method: 'POST',
			data: time,
		},
		{ name: 'workload', run: () => store.dispatch(api.getWorkload.initiate()), path: 'workload/', method: 'GET' },
		{
			name: 'time report',
			run: () => store.dispatch(api.getTimeReport.initiate(report)),
			path: 'reports/time/',
			method: 'GET',
			params: report,
		},
		{
			name: 'workflow report',
			run: () => store.dispatch(api.getWorkflowReport.initiate(report)),
			path: 'reports/workflow/',
			method: 'GET',
			params: report,
		},
		{
			name: 'notifications',
			run: () => store.dispatch(api.getNotifications.initiate({ unread: true })),
			path: 'notifications/',
			method: 'GET',
			params: { unread: true },
		},
		{
			name: 'notification preferences',
			run: () => store.dispatch(api.getNotificationPreferences.initiate()),
			path: 'notifications/preferences/',
			method: 'GET',
		},
		{
			name: 'save notification preferences',
			run: () => store.dispatch(api.updateNotificationPreferences.initiate({ mentions: false })),
			path: 'notifications/preferences/',
			method: 'PATCH',
			data: { mentions: false },
		},
		{
			name: 'chat threads',
			run: () => store.dispatch(api.getChatThreads.initiate()),
			path: 'chat/threads/',
			method: 'GET',
		},
		{
			name: 'create chat thread',
			run: () => store.dispatch(api.createChatThread.initiate({ kind: 'project', project_id: 7 })),
			path: 'chat/threads/',
			method: 'POST',
			data: { kind: 'project', project_id: 7 },
		},
		{
			name: 'read chat message',
			run: () => store.dispatch(api.markChatMessageRead.initiate(12)),
			path: 'chat/messages/12/read/',
			method: 'POST',
		},
		{
			name: 'delete chat message',
			run: () => store.dispatch(api.deleteChatMessage.initiate(12)),
			path: 'chat/messages/12/delete/',
			method: 'POST',
		},
		{
			name: 'edit chat message',
			run: () => store.dispatch(api.editChatMessage.initiate({ id: 12, body: 'Corrected' })),
			path: 'chat/messages/12/edit/',
			method: 'PATCH',
			data: { body: 'Corrected' },
		},
		{
			name: 'react to chat message',
			run: () => store.dispatch(api.reactChatMessage.initiate({ id: 12, emoji: '👍' })),
			path: 'chat/messages/12/react/',
			method: 'POST',
			data: { emoji: '👍' },
		},
		{
			name: 'reminder',
			run: () =>
				store.dispatch(
					api.addChatReminder.initiate({ id: 12, task_id: 5, note: 'Call client', remind_at: '2026-10-07T09:00:00Z' }),
				),
			path: 'chat/messages/12/reminders/',
			method: 'POST',
			data: { task_id: 5, note: 'Call client', remind_at: '2026-10-07T09:00:00Z' },
		},
		{
			name: 'read notification',
			run: () => store.dispatch(api.markNotificationRead.initiate(12)),
			path: 'notifications/12/read/',
			method: 'POST',
		},
		{
			name: 'snooze notification',
			run: () => store.dispatch(api.snoozeNotification.initiate({ id: 12, snoozed_until: '2026-10-07T09:00:00Z' })),
			path: 'notifications/12/snooze/',
			method: 'POST',
			data: { snoozed_until: '2026-10-07T09:00:00Z' },
		},
		{
			name: 'notification action',
			run: () =>
				store.dispatch(api.runNotificationAction.initiate({ id: 12, action: 'move_status', status: 'in_progress' })),
			path: 'notifications/12/action/',
			method: 'POST',
			data: { action: 'move_status', status: 'in_progress' },
		},
	];

	it.each(requests)('$name sends the correct URL, method and payload', async ({ run, path, method, data, params }) => {
		await run();
		expect(mockBaseQuery).toHaveBeenCalledTimes(1);
		expect(mockBaseQuery.mock.calls[0][0]).toEqual({ url: `${root}${path}`, method, data, params });
	});

	it.each([
		{ name: 'getSavedViews', run: () => store.dispatch(api.getSavedViews.initiate()) },
		{ name: 'getProjects', run: () => store.dispatch(api.getProjects.initiate()) },
		{ name: 'getTasks', run: () => store.dispatch(api.getTasks.initiate()) },
		{ name: 'getTimeReport', run: () => store.dispatch(api.getTimeReport.initiate()) },
		{ name: 'getWorkflowReport', run: () => store.dispatch(api.getWorkflowReport.initiate()) },
		{ name: 'getNotifications', run: () => store.dispatch(api.getNotifications.initiate()) },
	])('$name allows omitted filters', async ({ run }) => {
		await run();
		expect(mockBaseQuery.mock.calls[0][0]).toMatchObject({ method: 'GET', params: undefined });
	});

	it('sends all chat history filters without including the thread ID in query parameters', async () => {
		const params = {
			before_id: 100,
			limit: 40,
			q: 'Plans',
			sender_id: 2,
			date_from: '2026-10-01',
			date_to: '2026-10-06',
			has_files: true,
			has_images: false,
			reference: 'task',
		};
		await store.dispatch(api.getChatMessages.initiate({ threadId: 7, ...params }));
		expect(mockBaseQuery.mock.calls[0][0]).toEqual({ url: `${root}chat/threads/7/messages/`, method: 'GET', params });
	});

	it.each(['attachment', 'cover', 'chat'] as const)(
		'preserves %s multipart uploads and progress callbacks',
		async (kind) => {
			const data = new FormData();
			data.append('file', new File(['contents'], 'plans.pdf', { type: 'application/pdf' }));
			data.append('name', 'Plans');
			const onUploadProgress = jest.fn();
			if (kind === 'attachment')
				await store.dispatch(api.uploadTaskAttachment.initiate({ id: 12, data, onUploadProgress }));
			if (kind === 'cover') await store.dispatch(api.uploadTaskCover.initiate({ id: 12, data }));
			if (kind === 'chat') await store.dispatch(api.sendChatMessage.initiate({ threadId: 7, data, onUploadProgress }));
			const path = { attachment: 'tasks/12/attachments/', cover: 'tasks/12/cover/', chat: 'chat/threads/7/messages/' }[
				kind
			];
			expect(mockBaseQuery.mock.calls[0][0]).toEqual({
				url: `${root}${path}`,
				method: 'POST',
				data,
				...(kind !== 'cover' ? { onUploadProgress } : {}),
			});
			expect(mockBaseQuery.mock.calls[0][0].data).toBe(data);
		},
	);
});

describe('query results and cache invalidation', () => {
	it('returns server data and preserves server validation errors', async () => {
		const result = { id: 12, title: 'Plans' };
		mockBaseQuery.mockResolvedValueOnce({ data: result });
		await expect(store.dispatch(api.getTask.initiate(12)).unwrap()).resolves.toEqual(result);
		const error = { status: 403, data: { message: 'Read only' } };
		mockBaseQuery.mockResolvedValueOnce({ error });
		await expect(
			store.dispatch(api.updateTask.initiate({ id: 12, data: { title: 'Blocked' } })).unwrap(),
		).rejects.toEqual(error);
	});

	it('refetches subscribed task, project, notification and workload data after review', async () => {
		await Promise.all([
			store.dispatch(api.getTask.initiate(12)),
			store.dispatch(api.getTasks.initiate()),
			store.dispatch(api.getProject.initiate(7)),
			store.dispatch(api.getDashboardSummary.initiate()),
			store.dispatch(api.getNotifications.initiate()),
			store.dispatch(api.getWorkload.initiate()),
		]);
		mockBaseQuery.mockClear();
		await store.dispatch(api.updateTaskReview.initiate({ id: 12, review_state: 'approved' }));
		const urls = mockBaseQuery.mock.calls.map(([request]) => request.url);
		for (const path of ['tasks/12/', 'tasks/', 'projects/7/', 'dashboard/summary/', 'notifications/', 'workload/'])
			expect(urls).toContain(`${root}${path}`);
	});

	it('refetches time reports after a manual time entry', async () => {
		await store.dispatch(api.getTimeReport.initiate(report));
		await store.dispatch(api.getWorkflowReport.initiate(report));
		mockBaseQuery.mockClear();
		await store.dispatch(api.addTaskTimeEntry.initiate({ id: 12, ...time }));
		expect(mockBaseQuery.mock.calls.map(([request]) => request.url)).toEqual(
			expect.arrayContaining([`${root}reports/time/`, `${root}reports/workflow/`]),
		);
	});

	it('refreshes task access and chat context after project collaborators change', async () => {
		await store.dispatch(api.getTask.initiate(12));
		await store.dispatch(api.getChatThreads.initiate());
		mockBaseQuery.mockClear();
		await store.dispatch(api.updateProject.initiate({ id: 7, data: { collaborator_ids: [2, 3] } }));
		expect(mockBaseQuery.mock.calls.map(([request]) => request.url)).toEqual(
			expect.arrayContaining([`${root}tasks/12/`, `${root}chat/threads/`]),
		);
	});

	it('refreshes the room and unread counts after a message is sent', async () => {
		await store.dispatch(api.getChatMessages.initiate({ threadId: 7 }));
		await store.dispatch(api.getChatThreads.initiate());
		mockBaseQuery.mockClear();
		await store.dispatch(api.sendChatMessage.initiate({ threadId: 7, data: new FormData() }));
		expect(
			mockBaseQuery.mock.calls.filter(([request]) => request.method === 'GET').map(([request]) => request.url),
		).toEqual(expect.arrayContaining([`${root}chat/threads/7/messages/`, `${root}chat/threads/`]));
	});
});
