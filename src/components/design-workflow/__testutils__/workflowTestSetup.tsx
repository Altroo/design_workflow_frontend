import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import type {
	DashboardSummary,
	NotificationItem,
	ProjectDetail,
	ProjectSummary,
	TaskCard,
	TaskDetail,
	TimeReportRow,
	WorkflowAnalyticsReport,
	WorkloadRow,
	WorkflowUser,
} from '@/types/designWorkflowTypes';
import { getAccessToken, getProfilState, getWSOnlineUserIdsState } from '@/store/selectors';

jest.setTimeout(15000);

beforeAll(() => {
	Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
		configurable: true,
		value: jest.fn(() => false),
	});
	Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
		configurable: true,
		value: jest.fn(),
	});
	Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
		configurable: true,
		value: jest.fn(),
	});
});

jest.mock('next/link', () => {
	function MockNextLink({ children, href }: { children: ReactNode; href: string }) {
		return <a href={href}>{children}</a>;
	}

	return MockNextLink;
});

jest.mock('next/navigation', () => ({
	useRouter: () => ({
		replace: jest.fn(),
		push: jest.fn(),
		refresh: jest.fn(),
	}),
}));

jest.mock('@/components/layouts/navigationBar/navigationBar', () => {
	function MockNavigationBar({ children }: { children: ReactNode }) {
		return <div data-testid="navigation-shell">{children}</div>;
	}

	return {
		__esModule: true,
		default: MockNavigationBar,
	};
});

const mockUseAppSelector = jest.fn();

const mockOnError = jest.fn();

jest.mock('@/utils/hooks', () => {
	const { en } = jest.requireActual('@/translations/en') as typeof import('@/translations/en');
	return {
		...jest.requireActual('@/utils/hooks'),
		useAppSelector: (selector: unknown) => mockUseAppSelector(selector),
		useLanguage: () => ({ language: 'en', setLanguage: jest.fn(), t: en }),
		useToast: () => ({ onSuccess: jest.fn(), onError: mockOnError }),
	};
});

jest.mock('@dnd-kit/core', () => ({
	DndContext: ({ children }: { children: ReactNode }) => <div data-testid="dnd-context">{children}</div>,
	DragOverlay: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	PointerSensor: function PointerSensor() {
		return null;
	},
	closestCenter: jest.fn(),
	closestCorners: jest.fn(),
	useDroppable: () => ({ setNodeRef: jest.fn(), isOver: false }),
	useSensor: jest.fn(() => ({})),
	useSensors: jest.fn(() => []),
}));

jest.mock('@dnd-kit/sortable', () => ({
	SortableContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	useSortable: () => ({
		attributes: {},
		listeners: {},
		setNodeRef: jest.fn(),
		transform: null,
		transition: undefined,
		isDragging: false,
	}),
	verticalListSortingStrategy: jest.fn(),
}));

jest.mock('@dnd-kit/utilities', () => ({
	CSS: {
		Transform: {
			toString: () => undefined,
		},
	},
}));

jest.mock('react-chartjs-2', () => ({
	Bar: () => <div data-testid="bar-chart" />,
	Doughnut: () => <div data-testid="doughnut-chart" />,
	Line: () => <div data-testid="line-chart" />,
}));

const mockCreateProject = jest.fn();

const mockCreateLabel = jest.fn();

const mockUpdateLabel = jest.fn();

const mockCreateSavedView = jest.fn();

const mockUpdateSavedView = jest.fn();

const mockDeleteSavedView = jest.fn();

const mockUpdateProject = jest.fn();

const mockCreateTask = jest.fn();

const mockUpdateTask = jest.fn();

const mockUpdateTaskStatus = jest.fn();

const mockUpdateTaskReview = jest.fn();

const mockReorderTasks = jest.fn();

const mockToggleTaskCompletion = jest.fn();

const mockArchiveTask = jest.fn();

const mockAddChecklist = jest.fn();

const mockAddChecklistItem = jest.fn();

const mockUpdateChecklistItem = jest.fn();

const mockDeleteChecklist = jest.fn();

const mockDeleteChecklistItem = jest.fn();

const mockCreateTaskVersion = jest.fn();

const mockCreateAttachmentAnnotation = jest.fn();

const mockUploadTaskAttachment = jest.fn();

const mockDeleteTaskAttachment = jest.fn();

const mockSetTaskCoverFromAttachment = jest.fn();

const mockUploadTaskCover = jest.fn();

const mockDeleteTaskCover = jest.fn();

const mockReassignTask = jest.fn();

const mockAddTaskComment = jest.fn();

const mockAddTaskTimeEntry = jest.fn();

const mockMarkNotificationRead = jest.fn();

const mockSnoozeNotification = jest.fn();

const mockRunNotificationAction = jest.fn();

const mockUpdateNotificationPreferences = jest.fn();

const mockUseGetDashboardSummaryQuery = jest.fn();

const mockUseGetNotificationsQuery = jest.fn();

const mockUseGetNotificationPreferencesQuery = jest.fn();

const mockUseGetProjectQuery = jest.fn();

const mockUseGetProjectsQuery = jest.fn();

const mockUseGetLabelsQuery = jest.fn();

const mockUseGetSavedViewsQuery = jest.fn();

const mockUseGetAttachmentAnnotationsQuery = jest.fn();

const mockUseGetTaskQuery = jest.fn();

const mockUseGetTaskTimeEntriesQuery = jest.fn();

const mockUseGetTasksQuery = jest.fn();

const mockUseGetTimeReportQuery = jest.fn();

const mockUseGetWorkflowReportQuery = jest.fn();

const mockUseGetWorkloadQuery = jest.fn();

const mockUseSearchWorkspaceQuery = jest.fn();

const mockUseGetUsersListQuery = jest.fn();

jest.mock('@/store/services/designWorkflow', () => ({
	useAddChecklistMutation: jest.fn(() => [mockAddChecklist, { isLoading: false, isError: false }]),
	useAddChecklistItemMutation: jest.fn(() => [mockAddChecklistItem, { isLoading: false, isError: false }]),
	useAddTaskCommentMutation: jest.fn(() => [mockAddTaskComment, { isLoading: false, isError: false }]),
	useAddTaskTimeEntryMutation: jest.fn(() => [mockAddTaskTimeEntry, { isLoading: false, isError: false }]),
	useArchiveTaskMutation: jest.fn(() => [mockArchiveTask, { isLoading: false, isError: false }]),
	useCreateAttachmentAnnotationMutation: jest.fn(() => [
		mockCreateAttachmentAnnotation,
		{ isLoading: false, isError: false },
	]),
	useCreateLabelMutation: jest.fn(() => [mockCreateLabel, { isLoading: false, isError: false }]),
	useCreateProjectMutation: jest.fn(() => [mockCreateProject, { isLoading: false, isError: false }]),
	useCreateSavedViewMutation: jest.fn(() => [mockCreateSavedView, { isLoading: false, isError: false }]),
	useCreateTaskMutation: jest.fn(() => [mockCreateTask, { isLoading: false, isError: false }]),
	useCreateTaskVersionMutation: jest.fn(() => [mockCreateTaskVersion, { isLoading: false, isError: false }]),
	useDeleteChecklistMutation: jest.fn(() => [mockDeleteChecklist, { isLoading: false, isError: false }]),
	useDeleteChecklistItemMutation: jest.fn(() => [mockDeleteChecklistItem, { isLoading: false, isError: false }]),
	useDeleteSavedViewMutation: jest.fn(() => [mockDeleteSavedView, { isLoading: false, isError: false }]),
	useDeleteTaskAttachmentMutation: jest.fn(() => [mockDeleteTaskAttachment, { isLoading: false, isError: false }]),
	useDeleteTaskCoverMutation: jest.fn(() => [mockDeleteTaskCover, { isLoading: false, isError: false }]),
	useGetDashboardSummaryQuery: (...args: unknown[]) => mockUseGetDashboardSummaryQuery(...args),
	useGetAttachmentAnnotationsQuery: (...args: unknown[]) => mockUseGetAttachmentAnnotationsQuery(...args),
	useGetLabelsQuery: (...args: unknown[]) => mockUseGetLabelsQuery(...args),
	useGetNotificationPreferencesQuery: (...args: unknown[]) => mockUseGetNotificationPreferencesQuery(...args),
	useGetNotificationsQuery: (...args: unknown[]) => mockUseGetNotificationsQuery(...args),
	useGetProjectQuery: (...args: unknown[]) => mockUseGetProjectQuery(...args),
	useGetProjectsQuery: (...args: unknown[]) => mockUseGetProjectsQuery(...args),
	useGetSavedViewsQuery: (...args: unknown[]) => mockUseGetSavedViewsQuery(...args),
	useGetTaskQuery: (...args: unknown[]) => mockUseGetTaskQuery(...args),
	useGetTaskTimeEntriesQuery: (...args: unknown[]) => mockUseGetTaskTimeEntriesQuery(...args),
	useGetTasksQuery: (...args: unknown[]) => mockUseGetTasksQuery(...args),
	useGetTimeReportQuery: (...args: unknown[]) => mockUseGetTimeReportQuery(...args),
	useGetWorkflowReportQuery: (...args: unknown[]) => mockUseGetWorkflowReportQuery(...args),
	useGetWorkloadQuery: (...args: unknown[]) => mockUseGetWorkloadQuery(...args),
	useMarkNotificationReadMutation: jest.fn(() => [mockMarkNotificationRead, { isLoading: false, isError: false }]),
	useRunNotificationActionMutation: jest.fn(() => [mockRunNotificationAction, { isLoading: false, isError: false }]),
	useReassignTaskMutation: jest.fn(() => [mockReassignTask, { isLoading: false, isError: false }]),
	useReorderTasksMutation: jest.fn(() => [mockReorderTasks, { isLoading: false, isError: false }]),
	useSearchWorkspaceQuery: (...args: unknown[]) => mockUseSearchWorkspaceQuery(...args),
	useSetTaskCoverFromAttachmentMutation: jest.fn(() => [
		mockSetTaskCoverFromAttachment,
		{ isLoading: false, isError: false },
	]),
	useSnoozeNotificationMutation: jest.fn(() => [mockSnoozeNotification, { isLoading: false, isError: false }]),
	useToggleTaskCompletionMutation: jest.fn(() => [mockToggleTaskCompletion, { isLoading: false, isError: false }]),
	useUpdateChecklistItemMutation: jest.fn(() => [mockUpdateChecklistItem, { isLoading: false, isError: false }]),
	useUpdateLabelMutation: jest.fn(() => [mockUpdateLabel, { isLoading: false, isError: false }]),
	useUpdateNotificationPreferencesMutation: jest.fn(() => [
		mockUpdateNotificationPreferences,
		{ isLoading: false, isError: false },
	]),
	useUpdateProjectMutation: jest.fn(() => [mockUpdateProject, { isLoading: false, isError: false }]),
	useUpdateSavedViewMutation: jest.fn(() => [mockUpdateSavedView, { isLoading: false, isError: false }]),
	useUpdateTaskMutation: jest.fn(() => [mockUpdateTask, { isLoading: false, isError: false }]),
	useUpdateTaskReviewMutation: jest.fn(() => [mockUpdateTaskReview, { isLoading: false, isError: false }]),
	useUpdateTaskStatusMutation: jest.fn(() => [mockUpdateTaskStatus, { isLoading: false, isError: false }]),
	useUploadTaskAttachmentMutation: jest.fn(() => [mockUploadTaskAttachment, { isLoading: false, isError: false }]),
	useUploadTaskCoverMutation: jest.fn(() => [mockUploadTaskCover, { isLoading: false, isError: false }]),
}));

jest.mock('@/store/services/account', () => ({
	useGetUsersListQuery: (...args: unknown[]) => mockUseGetUsersListQuery(...args),
}));

const makeMutationResult = <T,>(value?: T) => ({
	unwrap: jest.fn().mockResolvedValue(value),
});

const manager: WorkflowUser = {
	id: 1,
	first_name: 'Mona',
	last_name: 'Manager',
	email: 'mona@example.com',
	role: 'manager',
};

const designerA: WorkflowUser = {
	id: 2,
	first_name: 'Dina',
	last_name: 'Designer',
	email: 'dina@example.com',
	role: 'designer',
};

const designerB: WorkflowUser = {
	id: 3,
	first_name: 'Rami',
	last_name: 'Reviewer',
	email: 'rami@example.com',
	role: 'designer',
};

const projectSummary: ProjectSummary = {
	id: 101,
	name: 'Showroom Refresh',
	description: 'Pilot redesign for internal showroom.',
	manager,
	start_date: '2026-04-01',
	target_end_date: '2026-04-30',
	priority: 'high',
	status: 'active',
	archived: false,
	archived_at: null,
	total_logged_minutes: 180,
	open_tasks_count: 2,
	can_work: true,
	created_at: '2026-04-01T09:00:00Z',
	updated_at: '2026-04-22T12:00:00Z',
};

const boardTask: TaskCard = {
	id: 501,
	can_edit: true,
	project: projectSummary,
	title: 'Finalize material board',
	description: 'Prepare revision before client review.',
	cover_image_url: null,
	cover_image_label: '',
	current_assignee: designerA,
	status: 'todo',
	priority: 'urgent',
	due_date: '2026-04-20',
	estimated_minutes: 240,
	actual_minutes: 90,
	review_state: 'needs_review',
	review_requested_by: designerA,
	review_requested_at: '2026-04-21T12:00:00Z',
	review_approved_by: null,
	review_approved_at: null,
	blocked_reason: '',
	sort_order: 0,
	labels: [],
	checklists: [],
	checklist_items: [],
	attachments: [],
	archived: false,
	archived_at: null,
	is_completed: false,
	completed_at: null,
	is_overdue: true,
	source_chat_message_id: null,
	source_chat_thread_id: null,
	created_at: '2026-04-10T09:00:00Z',
	updated_at: '2026-04-22T12:00:00Z',
};

const projectDetail: ProjectDetail = {
	...projectSummary,
	tasks: [boardTask],
	contributors: [designerA, designerB],
	recent_comments: [
		{
			id: 71,
			task_id: boardTask.id,
			task_title: boardTask.title,
			author: designerA,
			body: 'Need final approval on palette.',
			created_at: '2026-04-21T10:00:00Z',
			updated_at: '2026-04-21T10:00:00Z',
		},
	],
	recent_activity: [
		{
			id: 81,
			task_id: boardTask.id,
			task_title: boardTask.title,
			actor: manager,
			action_type: 'reassigned',
			metadata: { from_user: 'Mona', to_user: 'Dina', reason: 'balance load' },
			created_at: '2026-04-21T11:00:00Z',
		},
	],
};

const taskDetail: TaskDetail = {
	...boardTask,
	comments: [
		{
			id: 91,
			author: manager,
			body: 'Please push this to review today.',
			created_at: '2026-04-21T08:00:00Z',
			updated_at: '2026-04-21T08:00:00Z',
		},
	],
	artifact_versions: [],
	recent_activity: [
		{
			id: 92,
			actor: manager,
			action_type: 'status_changed',
			metadata: { from_status: 'backlog', to_status: 'todo' },
			created_at: '2026-04-21T08:30:00Z',
		},
	],
	time_entries: [
		{
			id: 93,
			user: designerA,
			minutes: 90,
			work_date: '2026-04-21',
			note: 'First draft',
			created_at: '2026-04-21T09:00:00Z',
			updated_at: '2026-04-21T09:00:00Z',
		},
	],
	contributors: [designerA],
	total_logged_minutes: 90,
};

const sourceTaskDetail: TaskDetail = {
	...taskDetail,
	title: 'Task created from source chat',
	source_chat_message_id: 555,
	source_chat_thread_id: 44,
};

const reviewAttachment = {
	id: 701,
	uploaded_by: designerA,
	file: '/media/tasks/material-board.png',
	file_url: '/media/tasks/material-board.png',
	name: 'material-board.png',
	mime_type: 'image/png',
	size: 2048,
	annotation_count: 1,
	created_at: '2026-04-21T09:10:00Z',
	updated_at: '2026-04-21T09:10:00Z',
};

const reviewTaskDetail: TaskDetail = {
	...taskDetail,
	attachments: [reviewAttachment],
	artifact_versions: [
		{
			id: 801,
			task: taskDetail.id,
			attachment: reviewAttachment,
			version_number: 1,
			uploaded_by: designerA,
			notes: 'Initial upload',
			approval_state: 'pending',
			approved_by: null,
			approved_at: null,
			created_at: '2026-04-21T09:20:00Z',
			updated_at: '2026-04-21T09:20:00Z',
		},
	],
};

const reviewAnnotations = [
	{
		id: 901,
		attachment: reviewAttachment.id,
		version: 801,
		author: manager,
		x_percent: '45.00',
		y_percent: '62.00',
		body: 'Tighten palette contrast.',
		resolved: false,
		resolved_by: null,
		resolved_at: null,
		created_at: '2026-04-21T10:00:00Z',
		updated_at: '2026-04-21T10:00:00Z',
	},
];

const summary: DashboardSummary = {
	backlog_tasks: 2,
	daily_activity: [
		{ date: '2026-04-22', created: 3, completed: 1 },
		{ date: '2026-04-23', created: 1, completed: 2 },
	],
	active_projects: 1,
	todo_tasks: 1,
	in_progress_tasks: 0,
	in_review_tasks: 0,
	blocked_tasks: 0,
	overdue_tasks: 1,
	completed_tasks: 0,
	week_logged_minutes: 180,
	recent_reassignments: 1,
};

const workload: WorkloadRow[] = [
	{
		user: designerA,
		open_tasks: 3,
		overdue_tasks: 1,
		estimated_minutes: 600,
		actual_minutes: 240,
	},
	{
		user: designerB,
		open_tasks: 1,
		overdue_tasks: 0,
		estimated_minutes: 120,
		actual_minutes: 30,
	},
];

const reportRows: TimeReportRow[] = [
	{
		project: projectSummary,
		minutes: 180,
	},
];

const workflowReport: WorkflowAnalyticsReport = {
	generated_at: '2026-04-23T08:00:00Z',
	tasks_sampled: 4,
	lead_time_days: 5.2,
	cycle_time_days: 3.1,
	blocked_tasks: 1,
	blocked_time_minutes: 120,
	review_bottlenecks: {
		needs_review: 1,
		changes_requested: 1,
		approved: 2,
		pending_review_minutes: 360,
		average_pending_review_minutes: 180,
	},
	estimate_vs_actual: {
		estimated_minutes: 960,
		actual_minutes: 720,
		variance_minutes: -240,
		actual_to_estimate_ratio: 0.75,
	},
	capacity: [
		{
			user: designerA,
			open_tasks: 3,
			overdue_tasks: 1,
			remaining_minutes: 720,
			capacity_minutes: 2700,
			load_percent: 26.7,
			forecast_days: 1.3,
			risk: 'high',
		},
	],
	designer_forecast: [
		{
			user: designerA,
			open_tasks: 3,
			overdue_tasks: 1,
			remaining_minutes: 720,
			capacity_minutes: 2700,
			load_percent: 26.7,
			forecast_days: 1.3,
			risk: 'high',
		},
	],
	status_counts: {
		backlog: 0,
		todo: 1,
		in_progress: 1,
		in_review: 1,
		blocked: 1,
		done: 0,
	},
};

const notifications: NotificationItem[] = [
	{
		id: 301,
		type: 'task_overdue',
		task: boardTask,
		project: projectSummary,
		payload: { days_overdue: 3 },
		read_at: null,
		snoozed_until: null,
		action_taken_at: null,
		is_read: false,
		created_at: '2026-04-23T08:00:00Z',
	},
	{
		id: 302,
		type: 'workflow_digest',
		task: null,
		project: null,
		payload: {
			frequency: 'daily',
			total_count: 5,
			unread_count: 2,
			by_type: { task_assigned: 3, chat_message: 2 },
		},
		read_at: '2026-04-23T09:00:00Z',
		snoozed_until: null,
		action_taken_at: null,
		is_read: true,
		created_at: '2026-04-23T09:00:00Z',
	},
];

const mockProfile = (profile: WorkflowUser) => {
	const profileState = {
		id: profile.id,
		role: profile.role,
		first_name: profile.first_name,
		last_name: profile.last_name,
		is_staff: profile.role === 'manager',
	};
	mockUseAppSelector.mockImplementation((selector: unknown) => {
		if (selector === getProfilState) return profileState;
		if (selector === getAccessToken) return 'test-access-token';
		if (selector === getWSOnlineUserIdsState) return [];
		return undefined;
	});
};

const selectMuiOption = async (
	user: ReturnType<typeof userEvent.setup>,
	label: string,
	option: string,
	root?: HTMLElement,
) => {
	const scope = root ? within(root) : screen;
	const trigger = scope.getByRole('combobox', { name: label });
	if (trigger instanceof HTMLSelectElement) {
		await user.selectOptions(trigger, within(trigger).getByRole('option', { name: option }));
		return;
	}
	await user.click(trigger);
	const listbox = await screen.findByRole('listbox');
	await user.click(within(listbox).getByRole('option', { name: option }));
};

const setDefaultHookData = () => {
	mockUseGetDashboardSummaryQuery.mockReturnValue({ data: summary });
	mockUseGetLabelsQuery.mockReturnValue({ data: [] });
	mockUseGetNotificationsQuery.mockReturnValue({ data: notifications });
	mockUseGetNotificationPreferencesQuery.mockReturnValue({
		data: {
			mentions: true,
			assignments: true,
			review_requests: true,
			due_soon: true,
			digest_frequency: 'instant',
			created_at: '2026-04-20T08:00:00Z',
			updated_at: '2026-04-20T08:00:00Z',
		},
	});
	mockUseGetProjectQuery.mockReturnValue({ data: projectDetail, isLoading: false });
	mockUseGetProjectsQuery.mockReturnValue({ data: [projectSummary], isLoading: false });
	mockUseGetSavedViewsQuery.mockReturnValue({ data: [] });
	mockUseGetAttachmentAnnotationsQuery.mockReturnValue({ data: [] });
	mockUseGetTaskQuery.mockReturnValue({ data: taskDetail, isLoading: false });
	mockUseGetTaskTimeEntriesQuery.mockReturnValue({
		currentData: { count: taskDetail.time_entries.length, results: taskDetail.time_entries },
		isFetching: false,
		isError: false,
	});
	mockUseGetTasksQuery.mockReturnValue({ data: [boardTask], isLoading: false });
	mockUseGetTimeReportQuery.mockReturnValue({ data: reportRows });
	mockUseGetWorkflowReportQuery.mockReturnValue({ data: workflowReport });
	mockUseGetWorkloadQuery.mockReturnValue({ data: workload });
	mockUseSearchWorkspaceQuery.mockReturnValue({ data: [] });
	mockUseGetUsersListQuery.mockReturnValue({
		data: {
			results: [manager, designerA, designerB],
		},
		isLoading: false,
	});
};

beforeEach(() => {
	jest.clearAllMocks();
	setDefaultHookData();
	mockCreateLabel.mockReturnValue(makeMutationResult());
	mockUpdateLabel.mockReturnValue(makeMutationResult());
	mockCreateProject.mockReturnValue(makeMutationResult());
	mockCreateSavedView.mockReturnValue(makeMutationResult());
	mockUpdateProject.mockReturnValue(makeMutationResult());
	mockUpdateSavedView.mockReturnValue(makeMutationResult());
	mockDeleteSavedView.mockReturnValue(makeMutationResult());
	mockCreateTask.mockReturnValue(makeMutationResult());
	mockUpdateTask.mockReturnValue(makeMutationResult());
	mockUpdateTaskStatus.mockReturnValue(makeMutationResult());
	mockUpdateTaskReview.mockReturnValue(makeMutationResult());
	mockReorderTasks.mockReturnValue(makeMutationResult());
	mockToggleTaskCompletion.mockReturnValue(makeMutationResult());
	mockArchiveTask.mockReturnValue(makeMutationResult());
	mockAddChecklist.mockReturnValue(makeMutationResult());
	mockAddChecklistItem.mockReturnValue(makeMutationResult());
	mockUpdateChecklistItem.mockReturnValue(makeMutationResult());
	mockDeleteChecklist.mockReturnValue(makeMutationResult());
	mockDeleteChecklistItem.mockReturnValue(makeMutationResult());
	mockCreateTaskVersion.mockReturnValue(makeMutationResult());
	mockCreateAttachmentAnnotation.mockReturnValue(makeMutationResult());
	mockUploadTaskAttachment.mockReturnValue(makeMutationResult());
	mockDeleteTaskAttachment.mockReturnValue(makeMutationResult());
	mockSetTaskCoverFromAttachment.mockReturnValue(makeMutationResult());
	mockUploadTaskCover.mockReturnValue(makeMutationResult());
	mockDeleteTaskCover.mockReturnValue(makeMutationResult());
	mockReassignTask.mockReturnValue(makeMutationResult());
	mockAddTaskComment.mockReturnValue(makeMutationResult());
	mockAddTaskTimeEntry.mockReturnValue(makeMutationResult());
	mockMarkNotificationRead.mockReturnValue(makeMutationResult());
	mockSnoozeNotification.mockReturnValue(makeMutationResult());
	mockRunNotificationAction.mockReturnValue(makeMutationResult());
	mockUpdateNotificationPreferences.mockReturnValue(makeMutationResult());
});

export const openAttachmentPicker = async (user: ReturnType<typeof userEvent.setup>) => {
	await user.click(screen.getByTestId(`board-task-${boardTask.id}`));
	await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Attachments$/ }));
	return screen.getAllByTestId('task-attachment-picker')[0];
};

export {
	mockUseAppSelector,
	mockOnError,
	mockCreateProject,
	mockCreateLabel,
	mockUpdateLabel,
	mockCreateSavedView,
	mockUpdateSavedView,
	mockDeleteSavedView,
	mockUpdateProject,
	mockCreateTask,
	mockUpdateTask,
	mockUpdateTaskStatus,
	mockUpdateTaskReview,
	mockReorderTasks,
	mockToggleTaskCompletion,
	mockArchiveTask,
	mockAddChecklist,
	mockAddChecklistItem,
	mockUpdateChecklistItem,
	mockDeleteChecklist,
	mockDeleteChecklistItem,
	mockCreateTaskVersion,
	mockCreateAttachmentAnnotation,
	mockUploadTaskAttachment,
	mockDeleteTaskAttachment,
	mockSetTaskCoverFromAttachment,
	mockUploadTaskCover,
	mockDeleteTaskCover,
	mockReassignTask,
	mockAddTaskComment,
	mockAddTaskTimeEntry,
	mockMarkNotificationRead,
	mockSnoozeNotification,
	mockRunNotificationAction,
	mockUpdateNotificationPreferences,
	mockUseGetDashboardSummaryQuery,
	mockUseGetNotificationsQuery,
	mockUseGetNotificationPreferencesQuery,
	mockUseGetProjectQuery,
	mockUseGetProjectsQuery,
	mockUseGetLabelsQuery,
	mockUseGetSavedViewsQuery,
	mockUseGetAttachmentAnnotationsQuery,
	mockUseGetTaskQuery,
	mockUseGetTaskTimeEntriesQuery,
	mockUseGetTasksQuery,
	mockUseGetTimeReportQuery,
	mockUseGetWorkflowReportQuery,
	mockUseGetWorkloadQuery,
	mockUseSearchWorkspaceQuery,
	mockUseGetUsersListQuery,
	makeMutationResult,
	manager,
	designerA,
	designerB,
	projectSummary,
	boardTask,
	projectDetail,
	taskDetail,
	sourceTaskDetail,
	reviewAttachment,
	reviewTaskDetail,
	reviewAnnotations,
	summary,
	workload,
	reportRows,
	workflowReport,
	notifications,
	mockProfile,
	selectMuiOption,
	setDefaultHookData,
};
