import { createApi } from '@reduxjs/toolkit/query/react';
import { initToken } from '@/store/slices/_initSlice';
import { getInitStateToken } from '@/store/selectors';
import type { RootState } from '@/store/store';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { isAuthenticatedInstance } from '@/utils/helpers';
import type {
	DashboardSummary,
	NotificationItem,
	ProjectDetail,
	ProjectInput,
	ProjectSummary,
	TaskComment,
	TaskDetail,
	TaskCard,
	TaskFilters,
	TaskInput,
	TimeEntry,
	TimeReportRow,
	WorkloadRow,
} from '@/types/designWorkflowTypes';

const DESIGN_WORKFLOW_ROOT = `${process.env.NEXT_PUBLIC_API_URL}/api/design-workflow/`;

export const designWorkflowApi = createApi({
	reducerPath: 'designWorkflowApi',
	tagTypes: ['Dashboard', 'Project', 'Task', 'Notification', 'Workload', 'Report'],
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
	useGetTasksQuery,
	useCreateTaskMutation,
	useGetTaskQuery,
	useUpdateTaskMutation,
	useUpdateTaskStatusMutation,
	useReassignTaskMutation,
	useGetTaskCommentsQuery,
	useAddTaskCommentMutation,
	useGetTaskTimeEntriesQuery,
	useAddTaskTimeEntryMutation,
	useGetWorkloadQuery,
	useGetTimeReportQuery,
	useGetNotificationsQuery,
	useMarkNotificationReadMutation,
} = designWorkflowApi;
