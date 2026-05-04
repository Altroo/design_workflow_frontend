import { createApi } from '@reduxjs/toolkit/query/react';
import { initToken } from '@/store/slices/_initSlice';
import { getInitStateToken } from '@/store/selectors';
import type { RootState } from '@/store/store';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { isAuthenticatedInstance } from '@/utils/helpers';
import type {
	AttachmentAnnotation,
	ChatMessage,
	ChatMessagesQuery,
	ChatThread,
	DashboardSummary,
	NotificationItem,
	NotificationPreference,
	ProjectDetail,
	ProjectInput,
	ProjectSummary,
	SavedView,
	SavedViewInput,
	TaskArtifactVersion,
	TaskComment,
	TaskDetail,
	TaskAttachment,
	TaskCard,
	TaskChecklist,
	TaskChecklistItem,
	TaskLabel,
	TaskFilters,
	TaskInput,
	TimeEntry,
	TimeReportRow,
	WorkflowAnalyticsReport,
	WorkloadRow,
	WorkspaceSearchResult,
} from '@/types/designWorkflowTypes';

const DESIGN_WORKFLOW_ROOT = `${process.env.NEXT_PUBLIC_API_URL}/api/design-workflow/`;

export const designWorkflowApi = createApi({
	reducerPath: 'designWorkflowApi',
	tagTypes: ['Dashboard', 'Project', 'Task', 'Notification', 'NotificationPreference', 'Workload', 'Report', 'Label', 'Chat', 'SavedView'],
	baseQuery: axiosBaseQuery((api) =>
		isAuthenticatedInstance(
			() => getInitStateToken(api.getState() as RootState),
			() => api.dispatch(initToken()),
		),
	),
	endpoints: (builder) => ({
		getDashboardSummary: builder.query<DashboardSummary, void>({
			query: () => ({ url: `${DESIGN_WORKFLOW_ROOT}dashboard/summary/`, method: 'GET' }),
			providesTags: ['Dashboard'],
		}),
		getSavedViews: builder.query<SavedView[], { visibility?: SavedView['visibility'] } | void>({
			query: (params) => ({
				url: `${DESIGN_WORKFLOW_ROOT}views/`,
				method: 'GET',
				params: params ?? undefined,
			}),
			providesTags: ['SavedView'],
		}),
		createSavedView: builder.mutation<SavedView, SavedViewInput>({
			query: (data) => ({
				url: `${DESIGN_WORKFLOW_ROOT}views/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: ['SavedView'],
		}),
		updateSavedView: builder.mutation<SavedView, { id: number; data: Partial<SavedViewInput> }>({
			query: ({ id, data }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}views/${id}/`,
				method: 'PATCH',
				data,
			}),
			invalidatesTags: ['SavedView'],
		}),
		deleteSavedView: builder.mutation<void, number>({
			query: (id) => ({
				url: `${DESIGN_WORKFLOW_ROOT}views/${id}/`,
				method: 'DELETE',
			}),
			invalidatesTags: ['SavedView'],
		}),
		searchWorkspace: builder.query<WorkspaceSearchResult[], { q: string; types?: string }>({
			query: (params) => ({
				url: `${DESIGN_WORKFLOW_ROOT}search/`,
				method: 'GET',
				params,
			}),
		}),
		getProjects: builder.query<ProjectSummary[], { archived?: boolean } | void>({
			query: (params) => ({
				url: `${DESIGN_WORKFLOW_ROOT}projects/`,
				method: 'GET',
				params: params ?? undefined,
			}),
			providesTags: ['Project'],
		}),
		createProject: builder.mutation<ProjectSummary, ProjectInput>({
			query: (data) => ({
				url: `${DESIGN_WORKFLOW_ROOT}projects/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: ['Project', 'Dashboard'],
		}),
		updateProject: builder.mutation<ProjectSummary, { id: number; data: Partial<ProjectInput> }>({
			query: ({ id, data }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}projects/${id}/`,
				method: 'PATCH',
				data,
			}),
			invalidatesTags: (_result, _error, { id }) => [
				'Project',
				{ type: 'Project', id },
				'Dashboard',
			],
		}),
		getProject: builder.query<ProjectDetail, number>({
			query: (id) => ({ url: `${DESIGN_WORKFLOW_ROOT}projects/${id}/`, method: 'GET' }),
			providesTags: (_result, _error, id) => [{ type: 'Project', id }],
		}),
		getLabels: builder.query<TaskLabel[], void>({
			query: () => ({ url: `${DESIGN_WORKFLOW_ROOT}labels/`, method: 'GET' }),
			providesTags: ['Label'],
		}),
		createLabel: builder.mutation<TaskLabel, { name: string; color: string }>({
			query: (data) => ({ url: `${DESIGN_WORKFLOW_ROOT}labels/`, method: 'POST', data }),
			invalidatesTags: ['Label', 'Task'],
		}),
		getTasks: builder.query<TaskCard[], TaskFilters | void>({
			query: (params) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/`,
				method: 'GET',
				params: params ?? undefined,
			}),
			providesTags: ['Task'],
		}),
		createTask: builder.mutation<TaskDetail, TaskInput>({
			query: (data) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: ['Task', 'Project', 'Dashboard', 'Workload', 'Notification'],
		}),
		getTask: builder.query<TaskDetail, number>({
			query: (id) => ({ url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/`, method: 'GET' }),
			providesTags: (_result, _error, id) => [{ type: 'Task', id }],
		}),
		updateTask: builder.mutation<TaskDetail, { id: number; data: Partial<TaskInput> }>({
			query: ({ id, data }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/`,
				method: 'PATCH',
				data,
			}),
			invalidatesTags: (_result, _error, { id }) => [
				'Task',
				{ type: 'Task', id },
				'Project',
				'Dashboard',
				'Workload',
				'Notification',
			],
		}),
		updateTaskStatus: builder.mutation<
			TaskDetail,
			{ id: number; status: string; blocked_reason?: string; sort_order?: number }
		>({
			query: ({ id, ...data }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/status/`,
				method: 'PATCH',
				data,
			}),
			invalidatesTags: (_result, _error, { id }) => [
				'Task',
				{ type: 'Task', id },
				'Dashboard',
				'Project',
				'Workload',
			],
		}),
		updateTaskReview: builder.mutation<TaskDetail, { id: number; review_state: TaskDetail['review_state']; notes?: string }>({
			query: ({ id, ...data }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/review/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: (_result, _error, { id }) => ['Task', { type: 'Task', id }, 'Dashboard', 'Project', 'Notification'],
		}),
		reorderTasks: builder.mutation<
			TaskCard[],
			{ moved_task_id: number; tasks: Array<{ id: number; status: TaskCard['status']; sort_order: number }> }
		>({
			query: (data) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/reorder/`,
				method: 'PATCH',
				data,
			}),
			invalidatesTags: ['Task', 'Dashboard', 'Project', 'Workload'],
		}),
		toggleTaskCompletion: builder.mutation<TaskDetail, { id: number; is_completed: boolean }>({
			query: ({ id, is_completed }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/complete/`,
				method: 'POST',
				data: { is_completed },
			}),
			invalidatesTags: (_result, _error, { id }) => ['Task', { type: 'Task', id }, 'Dashboard', 'Project', 'Workload'],
		}),
		archiveTask: builder.mutation<TaskDetail, { id: number; archived: boolean }>({
			query: ({ id, archived }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/archive/`,
				method: 'POST',
				data: { archived },
			}),
			invalidatesTags: (_result, _error, { id }) => ['Task', { type: 'Task', id }, 'Dashboard', 'Project', 'Workload'],
		}),
		addChecklist: builder.mutation<TaskChecklist, { id: number; title: string; sort_order?: number }>({
			query: ({ id, ...data }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/checklists/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: (_result, _error, { id }) => ['Task', { type: 'Task', id }],
		}),
		addChecklistItem: builder.mutation<TaskChecklistItem, { id: number; checklist_id?: number; title: string; done?: boolean; sort_order?: number }>({
			query: ({ id, ...data }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/checklist/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: (_result, _error, { id }) => ['Task', { type: 'Task', id }],
		}),
		updateChecklistItem: builder.mutation<TaskChecklistItem, { id: number; itemId: number; data: Partial<Pick<TaskChecklistItem, 'title' | 'done' | 'sort_order'>> }>({
			query: ({ id, itemId, data }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/checklist/${itemId}/`,
				method: 'PATCH',
				data,
			}),
			invalidatesTags: (_result, _error, { id }) => ['Task', { type: 'Task', id }],
		}),
		deleteChecklistItem: builder.mutation<void, { id: number; itemId: number }>({
			query: ({ id, itemId }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/checklist/${itemId}/`,
				method: 'DELETE',
			}),
			invalidatesTags: (_result, _error, { id }) => ['Task', { type: 'Task', id }],
		}),
		uploadTaskAttachment: builder.mutation<TaskAttachment, { id: number; data: FormData }>({
			query: ({ id, data }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/attachments/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: (_result, _error, { id }) => ['Task', { type: 'Task', id }],
		}),
		deleteTaskAttachment: builder.mutation<void, { id: number; attachmentId: number }>({
			query: ({ id, attachmentId }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/attachments/${attachmentId}/`,
				method: 'DELETE',
			}),
			invalidatesTags: (_result, _error, { id }) => ['Task', { type: 'Task', id }],
		}),
		setTaskCoverFromAttachment: builder.mutation<TaskDetail, { id: number; attachmentId: number }>({
			query: ({ id, attachmentId }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/attachments/${attachmentId}/`,
				method: 'POST',
			}),
			invalidatesTags: (_result, _error, { id }) => ['Task', { type: 'Task', id }, 'Project'],
		}),
		uploadTaskCover: builder.mutation<TaskDetail, { id: number; data: FormData }>({
			query: ({ id, data }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/cover/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: (_result, _error, { id }) => ['Task', { type: 'Task', id }, 'Project'],
		}),
		deleteTaskCover: builder.mutation<TaskDetail, number>({
			query: (id) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/cover/`,
				method: 'DELETE',
			}),
			invalidatesTags: (_result, _error, id) => ['Task', { type: 'Task', id }, 'Project'],
		}),
		getTaskVersions: builder.query<TaskArtifactVersion[], number>({
			query: (id) => ({ url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/versions/`, method: 'GET' }),
			providesTags: (_result, _error, id) => [{ type: 'Task', id }],
		}),
		createTaskVersion: builder.mutation<
			TaskArtifactVersion,
			{ id: number; attachment_id?: number | null; notes?: string; approval_state?: TaskArtifactVersion['approval_state'] }
		>({
			query: ({ id, ...data }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/versions/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: (_result, _error, { id }) => ['Task', { type: 'Task', id }, 'Project'],
		}),
		getAttachmentAnnotations: builder.query<AttachmentAnnotation[], number>({
			query: (id) => ({ url: `${DESIGN_WORKFLOW_ROOT}attachments/${id}/annotations/`, method: 'GET' }),
			providesTags: ['Task'],
		}),
		createAttachmentAnnotation: builder.mutation<
			AttachmentAnnotation,
			{ attachmentId: number; version_id?: number | null; x_percent: string; y_percent: string; body: string; resolved?: boolean }
		>({
			query: ({ attachmentId, ...data }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}attachments/${attachmentId}/annotations/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: ['Task'],
		}),
		reassignTask: builder.mutation<TaskDetail, { id: number; assignee_id: number; reason: string }>({
			query: ({ id, ...data }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/reassign/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: (_result, _error, { id }) => [
				'Task',
				{ type: 'Task', id },
				'Dashboard',
				'Project',
				'Workload',
				'Notification',
			],
		}),
		getTaskComments: builder.query<TaskComment[], number>({
			query: (id) => ({ url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/comments/`, method: 'GET' }),
			providesTags: ['Task'],
		}),
		addTaskComment: builder.mutation<TaskComment, { id: number; body: string }>({
			query: ({ id, body }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/comments/`,
				method: 'POST',
				data: { body },
			}),
			invalidatesTags: (_result, _error, { id }) => ['Task', { type: 'Task', id }, 'Notification'],
		}),
		getTaskTimeEntries: builder.query<TimeEntry[], number>({
			query: (id) => ({ url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/time-entries/`, method: 'GET' }),
			providesTags: ['Task'],
		}),
		addTaskTimeEntry: builder.mutation<
			TimeEntry,
			{ id: number; minutes: number; work_date: string; note: string }
		>({
			query: ({ id, ...data }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}tasks/${id}/time-entries/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: (_result, _error, { id }) => [
				'Task',
				{ type: 'Task', id },
				'Dashboard',
				'Project',
				'Workload',
				'Report',
			],
		}),
		getWorkload: builder.query<WorkloadRow[], void>({
			query: () => ({ url: `${DESIGN_WORKFLOW_ROOT}workload/`, method: 'GET' }),
			providesTags: ['Workload'],
		}),
		getTimeReport: builder.query<TimeReportRow[], { start_date?: string; end_date?: string } | void>({
			query: (params) => ({
				url: `${DESIGN_WORKFLOW_ROOT}reports/time/`,
				method: 'GET',
				params: params ?? undefined,
			}),
			providesTags: ['Report'],
		}),
		getWorkflowReport: builder.query<WorkflowAnalyticsReport, { start_date?: string; end_date?: string } | void>({
			query: (params) => ({
				url: `${DESIGN_WORKFLOW_ROOT}reports/workflow/`,
				method: 'GET',
				params: params ?? undefined,
			}),
			providesTags: ['Report'],
		}),
		getNotifications: builder.query<NotificationItem[], { unread?: boolean } | void>({
			query: (params) => ({
				url: `${DESIGN_WORKFLOW_ROOT}notifications/`,
				method: 'GET',
				params: params ?? undefined,
			}),
			providesTags: ['Notification'],
		}),
		getNotificationPreferences: builder.query<NotificationPreference, void>({
			query: () => ({ url: `${DESIGN_WORKFLOW_ROOT}notifications/preferences/`, method: 'GET' }),
			providesTags: ['NotificationPreference'],
		}),
		updateNotificationPreferences: builder.mutation<NotificationPreference, Partial<NotificationPreference>>({
			query: (data) => ({ url: `${DESIGN_WORKFLOW_ROOT}notifications/preferences/`, method: 'PATCH', data }),
			invalidatesTags: ['NotificationPreference'],
		}),
		getChatThreads: builder.query<ChatThread[], void>({
			query: () => ({ url: `${DESIGN_WORKFLOW_ROOT}chat/threads/`, method: 'GET' }),
			providesTags: ['Chat'],
		}),
		createChatThread: builder.mutation<
			ChatThread,
			{ kind: ChatThread['kind']; recipient_id?: number; project_id?: number; task_id?: number; title?: string }
		>({
			query: (data) => ({ url: `${DESIGN_WORKFLOW_ROOT}chat/threads/`, method: 'POST', data }),
			invalidatesTags: ['Chat'],
		}),
		getChatMessages: builder.query<ChatMessage[], ChatMessagesQuery>({
			query: ({ threadId, before_id, limit, q, sender_id, date_from, date_to, has_files, has_images, decisions, reference }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}chat/threads/${threadId}/messages/`,
				method: 'GET',
				params: { before_id, limit, q, sender_id, date_from, date_to, has_files, has_images, decisions, reference },
			}),
			providesTags: (_result, _error, { threadId }) => [{ type: 'Chat', id: threadId }],
		}),
		sendChatMessage: builder.mutation<ChatMessage, { threadId: number; data: FormData }>({
			query: ({ threadId, data }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}chat/threads/${threadId}/messages/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: (_result, _error, { threadId }) => ['Chat', { type: 'Chat', id: threadId }],
		}),
		markChatMessageRead: builder.mutation<ChatMessage, number>({
			query: (id) => ({ url: `${DESIGN_WORKFLOW_ROOT}chat/messages/${id}/read/`, method: 'POST' }),
			invalidatesTags: ['Chat'],
		}),
		deleteChatMessage: builder.mutation<ChatMessage, number>({
			query: (id) => ({ url: `${DESIGN_WORKFLOW_ROOT}chat/messages/${id}/delete/`, method: 'POST' }),
			invalidatesTags: ['Chat'],
		}),
		editChatMessage: builder.mutation<ChatMessage, { id: number; body: string }>({
			query: ({ id, body }) => ({ url: `${DESIGN_WORKFLOW_ROOT}chat/messages/${id}/edit/`, method: 'PATCH', data: { body } }),
			invalidatesTags: ['Chat'],
		}),
		reactChatMessage: builder.mutation<ChatMessage, { id: number; emoji: '✅' | '👀' | '👍' | '⚠️' }>({
			query: ({ id, emoji }) => ({ url: `${DESIGN_WORKFLOW_ROOT}chat/messages/${id}/react/`, method: 'POST', data: { emoji } }),
			invalidatesTags: ['Chat'],
		}),
		markChatDecision: builder.mutation<ChatMessage, { id: number; is_decision: boolean }>({
			query: ({ id, is_decision }) => ({ url: `${DESIGN_WORKFLOW_ROOT}chat/messages/${id}/decision/`, method: 'POST', data: { is_decision } }),
			invalidatesTags: ['Chat'],
		}),
		addChatReminder: builder.mutation<ChatMessage, { id: number; task_id?: number | null; remind_at?: string | null; note?: string }>({
			query: ({ id, ...data }) => ({ url: `${DESIGN_WORKFLOW_ROOT}chat/messages/${id}/reminders/`, method: 'POST', data }),
			invalidatesTags: ['Chat'],
		}),
		markNotificationRead: builder.mutation<NotificationItem, number>({
			query: (id) => ({
				url: `${DESIGN_WORKFLOW_ROOT}notifications/${id}/read/`,
				method: 'POST',
			}),
			invalidatesTags: ['Notification'],
		}),
		snoozeNotification: builder.mutation<NotificationItem, { id: number; snoozed_until: string }>({
			query: ({ id, snoozed_until }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}notifications/${id}/snooze/`,
				method: 'POST',
				data: { snoozed_until },
			}),
			invalidatesTags: ['Notification'],
		}),
		runNotificationAction: builder.mutation<
			NotificationItem,
			{ id: number; action: 'mark_read' | 'accept_assignment' | 'move_status' | 'comment'; status?: TaskCard['status']; body?: string }
		>({
			query: ({ id, ...data }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}notifications/${id}/action/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: ['Notification', 'Task', 'Dashboard', 'Project', 'Workload'],
		}),
	}),
});

export const {
	useGetDashboardSummaryQuery,
	useGetSavedViewsQuery,
	useCreateSavedViewMutation,
	useUpdateSavedViewMutation,
	useDeleteSavedViewMutation,
	useSearchWorkspaceQuery,
	useLazySearchWorkspaceQuery,
	useGetProjectsQuery,
	useCreateProjectMutation,
	useUpdateProjectMutation,
	useGetProjectQuery,
	useGetLabelsQuery,
	useCreateLabelMutation,
	useGetTasksQuery,
	useCreateTaskMutation,
	useGetTaskQuery,
	useUpdateTaskMutation,
	useUpdateTaskStatusMutation,
	useUpdateTaskReviewMutation,
	useReorderTasksMutation,
	useToggleTaskCompletionMutation,
	useArchiveTaskMutation,
	useAddChecklistMutation,
	useAddChecklistItemMutation,
	useUpdateChecklistItemMutation,
	useDeleteChecklistItemMutation,
	useUploadTaskAttachmentMutation,
	useDeleteTaskAttachmentMutation,
	useSetTaskCoverFromAttachmentMutation,
	useUploadTaskCoverMutation,
	useDeleteTaskCoverMutation,
	useGetTaskVersionsQuery,
	useCreateTaskVersionMutation,
	useGetAttachmentAnnotationsQuery,
	useCreateAttachmentAnnotationMutation,
	useReassignTaskMutation,
	useGetTaskCommentsQuery,
	useAddTaskCommentMutation,
	useGetTaskTimeEntriesQuery,
	useAddTaskTimeEntryMutation,
	useGetWorkloadQuery,
	useGetTimeReportQuery,
	useGetWorkflowReportQuery,
	useGetNotificationsQuery,
	useGetNotificationPreferencesQuery,
	useUpdateNotificationPreferencesMutation,
	useGetChatThreadsQuery,
	useCreateChatThreadMutation,
	useGetChatMessagesQuery,
	useLazyGetChatMessagesQuery,
	useSendChatMessageMutation,
	useMarkChatMessageReadMutation,
	useDeleteChatMessageMutation,
	useEditChatMessageMutation,
	useReactChatMessageMutation,
	useMarkChatDecisionMutation,
	useAddChatReminderMutation,
	useMarkNotificationReadMutation,
	useSnoozeNotificationMutation,
	useRunNotificationActionMutation,
} = designWorkflowApi;
