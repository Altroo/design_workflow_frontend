import { createApi } from '@reduxjs/toolkit/query/react';
import { initToken } from '@/store/slices/_initSlice';
import { getInitStateToken } from '@/store/selectors';
import type { RootState } from '@/store/store';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { isAuthenticatedInstance } from '@/utils/helpers';
import type {
	ChatMessage,
	ChatMessagesQuery,
	ChatThread,
	DashboardSummary,
	NotificationItem,
	ProjectDetail,
	ProjectInput,
	ProjectSummary,
	TaskComment,
	TaskDetail,
	TaskAttachment,
	TaskCard,
	TaskChecklistItem,
	TaskLabel,
	TaskFilters,
	TaskInput,
	TimeEntry,
	TimeReportRow,
	WorkloadRow,
} from '@/types/designWorkflowTypes';

const DESIGN_WORKFLOW_ROOT = `${process.env.NEXT_PUBLIC_API_URL}/api/design-workflow/`;

export const designWorkflowApi = createApi({
	reducerPath: 'designWorkflowApi',
	tagTypes: ['Dashboard', 'Project', 'Task', 'Notification', 'Workload', 'Report', 'Label', 'Chat'],
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
		addChecklistItem: builder.mutation<TaskChecklistItem, { id: number; title: string; done?: boolean; sort_order?: number }>({
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
		getNotifications: builder.query<NotificationItem[], { unread?: boolean } | void>({
			query: (params) => ({
				url: `${DESIGN_WORKFLOW_ROOT}notifications/`,
				method: 'GET',
				params: params ?? undefined,
			}),
			providesTags: ['Notification'],
		}),
		getChatThreads: builder.query<ChatThread[], void>({
			query: () => ({ url: `${DESIGN_WORKFLOW_ROOT}chat/threads/`, method: 'GET' }),
			providesTags: ['Chat'],
		}),
		createChatThread: builder.mutation<ChatThread, { kind: 'public' | 'private'; recipient_id?: number; title?: string }>({
			query: (data) => ({ url: `${DESIGN_WORKFLOW_ROOT}chat/threads/`, method: 'POST', data }),
			invalidatesTags: ['Chat'],
		}),
		getChatMessages: builder.query<ChatMessage[], ChatMessagesQuery>({
			query: ({ threadId, before_id, limit, q }) => ({
				url: `${DESIGN_WORKFLOW_ROOT}chat/threads/${threadId}/messages/`,
				method: 'GET',
				params: { before_id, limit, q },
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
		markNotificationRead: builder.mutation<NotificationItem, number>({
			query: (id) => ({
				url: `${DESIGN_WORKFLOW_ROOT}notifications/${id}/read/`,
				method: 'POST',
			}),
			invalidatesTags: ['Notification'],
		}),
	}),
});

export const {
	useGetDashboardSummaryQuery,
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
	useToggleTaskCompletionMutation,
	useArchiveTaskMutation,
	useAddChecklistItemMutation,
	useUpdateChecklistItemMutation,
	useDeleteChecklistItemMutation,
	useUploadTaskAttachmentMutation,
	useDeleteTaskAttachmentMutation,
	useUploadTaskCoverMutation,
	useDeleteTaskCoverMutation,
	useReassignTaskMutation,
	useGetTaskCommentsQuery,
	useAddTaskCommentMutation,
	useGetTaskTimeEntriesQuery,
	useAddTaskTimeEntryMutation,
	useGetWorkloadQuery,
	useGetTimeReportQuery,
	useGetNotificationsQuery,
	useGetChatThreadsQuery,
	useCreateChatThreadMutation,
	useGetChatMessagesQuery,
	useLazyGetChatMessagesQuery,
	useSendChatMessageMutation,
	useMarkChatMessageReadMutation,
	useDeleteChatMessageMutation,
	useMarkNotificationReadMutation,
} = designWorkflowApi;
