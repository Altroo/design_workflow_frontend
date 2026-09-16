import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import DesignWorkflowShell from './designWorkflowShell';
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
	function MockNextLink({ children, href }: { children: React.ReactNode; href: string }) {
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
	function MockNavigationBar({ children }: { children: React.ReactNode }) {
		return <div data-testid="navigation-shell">{children}</div>;
	}

	return {
		__esModule: true,
		default: MockNavigationBar,
	};
});

const mockUseAppSelector = jest.fn();
jest.mock('@/utils/hooks', () => {
	const { en } = jest.requireActual('@/translations/en') as typeof import('@/translations/en');
	return {
		useAppSelector: (selector: unknown) => mockUseAppSelector(selector),
		useLanguage: () => ({ language: 'en', setLanguage: jest.fn(), t: en }),
		useToast: () => ({ onSuccess: jest.fn(), onError: jest.fn() }),
	};
});

jest.mock('@dnd-kit/core', () => ({
	DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
	DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
	SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

describe('Design workflow acceptance flows', () => {
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

	it('covers manager project creation, task creation, board visibility, and dashboard visibility', async () => {
		const user = userEvent.setup();
		mockProfile(manager);

		const { rerender } = render(<DesignWorkflowShell title="Projects" variant="projects" />);

		await user.type(screen.getByLabelText('Project name'), 'Creative sprint');
		await user.click(screen.getByRole('button', { name: 'Create project' }));

		await waitFor(() => {
			expect(mockCreateProject).toHaveBeenCalledWith({
				name: 'Creative sprint',
				description: '',
				manager_id: manager.id,
				start_date: null,
				target_end_date: null,
				priority: 'medium',
				status: 'planned',
				archived: false,
			});
		});

		rerender(<DesignWorkflowShell title="Project detail" variant="project-detail" projectId={projectSummary.id} />);

		await user.type(screen.getByLabelText('Task title'), 'Prepare review deck');
		await selectMuiOption(user, 'Assignee', 'Dina Designer');
		await user.click(screen.getByRole('button', { name: 'Create task' }));

		await waitFor(() => {
			expect(mockCreateTask).toHaveBeenCalledWith({
				project_id: projectSummary.id,
				title: 'Prepare review deck',
				description: '',
				current_assignee_id: designerA.id,
				status: 'backlog',
				priority: 'medium',
				due_date: null,
				estimated_minutes: 480,
				blocked_reason: '',
				sort_order: 0,
			});
		});

		rerender(<DesignWorkflowShell title="Board" variant="board" />);
		expect(screen.getAllByText('Finalize material board').length).toBeGreaterThan(0);
		expect(screen.getAllByText('Showroom Refresh').length).toBeGreaterThan(0);
		await user.click(screen.getByRole('button', { name: 'Calendar' }));
		const calendar = document.querySelector('.workflow-board-calendar');
		expect(calendar).not.toBeNull();
		expect(within(calendar as HTMLElement).getByText('April 2026')).toBeInTheDocument();
		expect(within(calendar as HTMLElement).getByText('Finalize material board')).toBeInTheDocument();

		rerender(<DesignWorkflowShell title="Overview" variant="overview" />);
		expect(screen.getByText('Active projects')).toBeInTheDocument();
		expect(screen.getAllByText('Overdue tasks')).toHaveLength(2);
		expect(screen.getByText('Capacity snapshot')).toBeInTheDocument();
		expect(screen.getByText('3 open • 1 overdue')).toBeInTheDocument();
	});

	it('edits a project task in a focused modal and opens the full preview on demand', async () => {
		const user = userEvent.setup();
		mockProfile(manager);

		render(<DesignWorkflowShell title="Project" variant="project-detail" projectId={projectDetail.id} />);

		await user.click(screen.getByRole('button', { name: /Finalize material board/ }));
		const editDialog = await screen.findByRole('dialog', { name: 'Edit task' });
		expect(within(editDialog).getByLabelText('Task title')).toHaveValue(taskDetail.title);
		expect(within(editDialog).getByLabelText('Description')).toHaveValue(taskDetail.description);

		await user.clear(within(editDialog).getByLabelText('Task title'));
		await user.type(within(editDialog).getByLabelText('Task title'), 'Finalize approved material board');
		await selectMuiOption(user, 'Status', 'In Progress', editDialog);
		await selectMuiOption(user, 'Priority', 'High', editDialog);
		await user.clear(within(editDialog).getByLabelText('Planned days'));
		await user.type(within(editDialog).getByLabelText('Planned days'), '2');
		await user.click(within(editDialog).getByRole('button', { name: 'Save' }));

		await waitFor(() =>
			expect(mockUpdateTask).toHaveBeenCalledWith({
				id: taskDetail.id,
				data: {
					project_id: projectDetail.id,
					title: 'Finalize approved material board',
					description: taskDetail.description,
					current_assignee_id: designerA.id,
					status: 'in_progress',
					priority: 'high',
					due_date: taskDetail.due_date,
					estimated_minutes: 960,
					blocked_reason: '',
					sort_order: 0,
				},
			}),
		);
		expect(screen.queryByRole('dialog', { name: 'Edit task' })).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /Finalize material board/ }));
		await user.click(
			within(await screen.findByRole('dialog', { name: 'Edit task' })).getByRole('button', { name: 'Preview' }),
		);
		expect(await screen.findByRole('dialog', { name: taskDetail.title })).toBeInTheDocument();
	});

	it('allows a regular user to create projects and assign estimated tasks', async () => {
		const user = userEvent.setup();
		mockProfile(designerA);

		const { rerender } = render(<DesignWorkflowShell title="Projects" variant="projects" />);
		await user.type(screen.getByLabelText('Project name'), 'Shared campaign');
		await waitFor(() => expect(screen.getByRole('button', { name: 'Create project' })).toBeEnabled());
		await user.click(screen.getByRole('button', { name: 'Create project' }));

		await waitFor(() =>
			expect(mockCreateProject).toHaveBeenCalledWith({
				name: 'Shared campaign',
				description: '',
				manager_id: designerA.id,
				start_date: null,
				target_end_date: null,
				priority: 'medium',
				status: 'planned',
				archived: false,
			}),
		);

		rerender(<DesignWorkflowShell title="Project" variant="project-detail" projectId={projectDetail.id} />);
		await user.type(screen.getByLabelText('Task title'), 'Prepare shared delivery');
		await selectMuiOption(user, 'Assignee', `${designerB.first_name} ${designerB.last_name}`);
		await user.clear(screen.getByLabelText('Planned days'));
		await user.type(screen.getByLabelText('Planned days'), '2');
		await user.click(screen.getByRole('button', { name: 'Create task' }));

		await waitFor(() =>
			expect(mockCreateTask).toHaveBeenCalledWith({
				project_id: projectDetail.id,
				title: 'Prepare shared delivery',
				description: '',
				current_assignee_id: designerB.id,
				status: 'backlog',
				priority: 'medium',
				due_date: null,
				estimated_minutes: 960,
				blocked_reason: '',
				sort_order: 0,
			}),
		);
	});

	it('shows unassigned projects as read-only directory entries', () => {
		mockProfile(designerA);
		const readOnlyProject: ProjectSummary = {
			...projectSummary,
			id: 202,
			name: 'Assigned to another designer',
			manager: designerB,
			can_work: false,
		};
		mockUseGetProjectsQuery.mockReturnValue({
			data: [projectSummary, readOnlyProject],
			isLoading: false,
		});

		render(<DesignWorkflowShell title="Projects" variant="projects" />);

		expect(mockUseGetProjectsQuery).toHaveBeenCalledWith({ all: true }, expect.objectContaining({ skip: false }));
		const readOnlyCard = screen.getByText(readOnlyProject.name).closest('article');
		expect(readOnlyCard).not.toBeNull();
		expect(within(readOnlyCard as HTMLElement).getByText('Read only')).toBeInTheDocument();
		expect(within(readOnlyCard as HTMLElement).queryByRole('link')).not.toBeInTheDocument();
	});

	it('filters reports by project and user', async () => {
		const user = userEvent.setup();
		mockProfile(manager);

		render(<DesignWorkflowShell title="Time report" variant="report-time" />);
		await selectMuiOption(user, 'Project', projectSummary.name);
		await selectMuiOption(user, 'Assignee', `${designerA.first_name} ${designerA.last_name}`);

		await waitFor(() => {
			expect(mockUseGetTimeReportQuery).toHaveBeenCalledWith(
				expect.objectContaining({ project: projectSummary.id, user: designerA.id }),
				expect.objectContaining({ skip: false }),
			);
			expect(mockUseGetWorkflowReportQuery).toHaveBeenCalledWith(
				expect.objectContaining({ project: projectSummary.id, user: designerA.id }),
				expect.objectContaining({ skip: false }),
			);
		});
	});

	it('filters the board with one of the current user labels', async () => {
		const user = userEvent.setup();
		mockProfile(manager);
		const ownLabel = {
			id: 41,
			name: 'Beta review',
			color: '#6366f1',
			created_by: manager,
			created_at: '2026-04-20T08:00:00Z',
			updated_at: '2026-04-20T08:00:00Z',
		};
		mockUseGetLabelsQuery.mockReturnValue({ data: [ownLabel] });

		render(<DesignWorkflowShell title="Board" variant="board" />);
		await selectMuiOption(user, 'Label', ownLabel.name);

		await waitFor(() =>
			expect(mockUseGetTasksQuery).toHaveBeenCalledWith(
				expect.objectContaining({ label: ownLabel.id }),
				expect.objectContaining({ skip: false }),
			),
		);
	});

	it('covers designer status update, comment, time log, and manager-only restrictions', async () => {
		const user = userEvent.setup();
		mockProfile(designerA);

		render(<DesignWorkflowShell title="Task detail" variant="task-detail" taskId={taskDetail.id} />);

		expect(screen.queryByText('Manager controls')).not.toBeInTheDocument();
		expect(screen.queryByText('Reassign task')).not.toBeInTheDocument();
		expect(screen.getByText('Update my progress')).toBeInTheDocument();

		await selectMuiOption(user, 'Status', 'In Review');
		await user.type(screen.getByLabelText('Blocked reason'), 'Waiting for manager validation');
		await user.click(screen.getByRole('button', { name: 'Update status' }));

		await waitFor(() => {
			expect(mockUpdateTaskStatus).toHaveBeenCalledWith({
				id: taskDetail.id,
				status: 'in_review',
				blocked_reason: 'Waiting for manager validation',
				sort_order: 0,
			});
		});

		await user.type(screen.getByLabelText('Add comment'), 'Blocked by final palette choice.');
		await user.click(screen.getByRole('button', { name: 'Post comment' }));

		await waitFor(() => {
			expect(mockAddTaskComment).toHaveBeenCalledWith({
				id: taskDetail.id,
				body: 'Blocked by final palette choice.',
			});
		});

		expect(screen.queryByLabelText('Minutes')).not.toBeInTheDocument();
		expect(mockAddTaskTimeEntry).not.toHaveBeenCalled();
	});

	it('covers manager reassignment with mandatory reason', async () => {
		const user = userEvent.setup();
		mockProfile(manager);

		render(<DesignWorkflowShell title="Task detail" variant="task-detail" taskId={taskDetail.id} />);

		expect(screen.getByText('Manager controls')).toBeInTheDocument();
		expect(screen.getByText('Reassign task')).toBeInTheDocument();

		const reassignCard = screen.getByText('Reassign task').closest('section');
		expect(reassignCard).not.toBeNull();

		await selectMuiOption(user, 'New assignee', 'Rami Reviewer');
		await user.type(within(reassignCard as HTMLElement).getByLabelText('Reason'), 'Redistribute review workload');
		await user.click(within(reassignCard as HTMLElement).getByRole('button', { name: 'Reassign' }));

		await waitFor(() => {
			expect(mockReassignTask).toHaveBeenCalledWith({
				id: taskDetail.id,
				assignee_id: designerB.id,
				reason: 'Redistribute review workload',
			});
		});

		expect(screen.getByText('First draft')).toBeInTheDocument();
		expect(screen.getByText(/Spent 1h 30m/i)).toBeInTheDocument();
	});

	it('covers task review versions and file annotations', async () => {
		const user = userEvent.setup();
		mockProfile(manager);
		mockUseGetTaskQuery.mockReturnValue({ data: reviewTaskDetail, isLoading: false });
		mockUseGetAttachmentAnnotationsQuery.mockReturnValue({ data: reviewAnnotations });

		render(<DesignWorkflowShell title="Task detail" variant="task-detail" taskId={taskDetail.id} />);

		await user.click(screen.getByRole('tab', { name: 'Review' }));
		const reviewSection = screen.getByText('Approval state stays separate from board status.').closest('section');
		expect(reviewSection).not.toBeNull();
		expect(within(reviewSection as HTMLElement).getByText('Artifact versions')).toBeInTheDocument();
		expect(within(reviewSection as HTMLElement).getByText('v1')).toBeInTheDocument();

		const reviewNotes = within(reviewSection as HTMLElement).getAllByLabelText('Optional note');
		await user.type(reviewNotes[0], 'Needs final swatches');
		await user.click(within(reviewSection as HTMLElement).getByRole('button', { name: 'Request changes' }));

		await waitFor(() => {
			expect(mockUpdateTaskReview).toHaveBeenCalledWith({
				id: taskDetail.id,
				review_state: 'changes_requested',
				notes: 'Needs final swatches',
			});
		});

		await user.type(reviewNotes[1], 'Second upload for handoff');
		await user.click(within(reviewSection as HTMLElement).getByRole('button', { name: 'Add version' }));

		await waitFor(() => {
			expect(mockCreateTaskVersion).toHaveBeenCalledWith({
				id: taskDetail.id,
				attachment_id: reviewAttachment.id,
				notes: 'Second upload for handoff',
				approval_state: 'pending',
			});
		});

		await user.click(screen.getByRole('tab', { name: 'Files' }));
		const filesSection = screen
			.getByText('Review pins stay linked to the selected file and version.')
			.closest('section');
		expect(filesSection).not.toBeNull();
		expect(within(filesSection as HTMLElement).getByText('material-board.png')).toBeInTheDocument();
		expect(within(filesSection as HTMLElement).getByText('Tighten palette contrast.')).toBeInTheDocument();

		await user.clear(within(filesSection as HTMLElement).getByLabelText('X %'));
		await user.type(within(filesSection as HTMLElement).getByLabelText('X %'), '35');
		await user.clear(within(filesSection as HTMLElement).getByLabelText('Y %'));
		await user.type(within(filesSection as HTMLElement).getByLabelText('Y %'), '48');
		await user.type(
			within(filesSection as HTMLElement).getByLabelText('Add comment'),
			'Align callout with fabric sample.',
		);
		await user.click(within(filesSection as HTMLElement).getByRole('button', { name: 'Add annotation' }));

		await waitFor(() => {
			expect(mockCreateAttachmentAnnotation).toHaveBeenCalledWith({
				attachmentId: reviewAttachment.id,
				version_id: null,
				x_percent: '35',
				y_percent: '48',
				body: 'Align callout with fabric sample.',
				resolved: false,
			});
		});
	});

	it('shows manager review actions only after the designer requests review', async () => {
		const user = userEvent.setup();
		mockProfile(manager);
		mockUpdateTaskReview.mockImplementation(({ review_state }: { review_state: TaskDetail['review_state'] }) =>
			makeMutationResult({ ...taskDetail, review_state }),
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
			makeMutationResult({ ...taskDetail, review_state, status: 'done' }),
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
			makeMutationResult({ ...changesRequestedTask, review_state }),
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

	it('keeps card action panels open until their close button is used', async () => {
		const user = userEvent.setup();
		mockProfile(manager);

		render(<DesignWorkflowShell title="Board" variant="board" taskId={taskDetail.id} />);
		const dialog = await screen.findByRole('dialog', { name: taskDetail.title });

		for (const panelName of ['Labels', 'Card image', 'Attachments', 'Checklist']) {
			await user.click(within(dialog).getByRole('button', { name: panelName }));
			const panel = within(dialog).getByRole('region', { name: panelName });
			await user.click(within(dialog).getByRole('heading', { name: 'Description' }));
			expect(panel).toBeInTheDocument();
			await user.click(within(panel).getByRole('button', { name: 'Close' }));
			expect(within(dialog).queryByRole('region', { name: panelName })).not.toBeInTheDocument();
		}

		await user.click(within(dialog).getByRole('button', { name: 'Members' }));
		const membersPanel = within(dialog).getByRole('region', { name: 'Members' });
		await selectMuiOption(user, 'Assignee', 'Rami Reviewer', membersPanel);
		await user.click(within(dialog).getByRole('heading', { name: 'Description' }));
		expect(membersPanel).toBeInTheDocument();
		await user.click(within(membersPanel).getByRole('button', { name: 'Close' }));
		expect(within(dialog).queryByRole('region', { name: 'Members' })).not.toBeInTheDocument();
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

	it('surfaces source chat links on task detail', async () => {
		const user = userEvent.setup();
		mockProfile(manager);
		mockUseGetTaskQuery.mockReturnValue({ data: sourceTaskDetail, isLoading: false });

		const { unmount } = render(
			<DesignWorkflowShell title="Task detail" variant="task-detail" taskId={sourceTaskDetail.id} />,
		);

		expect(screen.getByText('Source chat message')).toBeInTheDocument();
		expect(screen.getByText('This task was created from a chat decision.')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Open source chat' })).toHaveAttribute(
			'href',
			'/dashboard/chat?thread=44&message=555',
		);

		unmount();
		render(<DesignWorkflowShell title="Board" variant="board" taskId={sourceTaskDetail.id} />);

		await waitFor(() => {
			expect(screen.getByRole('dialog', { name: sourceTaskDetail.title })).toBeInTheDocument();
		});
		expect(screen.getByText('Source chat message')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Open source chat' })).toHaveAttribute(
			'href',
			'/dashboard/chat?thread=44&message=555',
		);
		const closeButton = within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' });
		expect(closeButton.parentElement).toHaveClass('workflow-task-modal');
		expect(closeButton.closest('.workflow-task-modal-body')).toBeNull();
		await user.click(closeButton);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('covers overdue signal across dashboard, workload, report, and notifications', async () => {
		const user = userEvent.setup();
		mockProfile(manager);

		const { rerender } = render(<DesignWorkflowShell title="Overview" variant="overview" />);

		expect(screen.getAllByText('Overdue tasks')).toHaveLength(2);
		expect(screen.getByText('Finalize material board')).toBeInTheDocument();
		expect(screen.getByText('Capacity snapshot')).toBeInTheDocument();
		expect(screen.getAllByText('Dina Designer').length).toBeGreaterThan(0);

		rerender(<DesignWorkflowShell title="Time report" variant="report-time" />);
		expect(screen.getByText('Start date')).toBeInTheDocument();
		expect(screen.getAllByText('Showroom Refresh').length).toBeGreaterThan(0);
		expect(screen.getAllByText('3h').length).toBeGreaterThan(0);
		expect(screen.getByText('Lead and cycle time')).toBeInTheDocument();
		expect(screen.getByText('Review bottlenecks')).toBeInTheDocument();
		expect(screen.getByText('Capacity forecast')).toBeInTheDocument();
		expect(screen.getByText('5.2d')).toBeInTheDocument();
		const printMock = jest.fn();
		const openMock = jest.spyOn(window, 'open').mockReturnValue({
			document: { write: jest.fn(), close: jest.fn() },
			focus: jest.fn(),
			print: printMock,
		} as unknown as Window);
		await user.click(screen.getByRole('button', { name: 'Export PDF' }));
		expect(openMock).toHaveBeenCalled();
		expect(printMock).toHaveBeenCalled();
		openMock.mockRestore();

		rerender(<DesignWorkflowShell title="Notifications" variant="notifications" />);
		expect(screen.getByText('Notification center')).toBeInTheDocument();
		expect(screen.getByText('Task overdue')).toBeInTheDocument();
		expect(screen.getByText('Workflow digest')).toBeInTheDocument();
		expect(screen.getByText('Daily - 5 Alerts, 2 Unread')).toBeInTheDocument();

		const notificationCard = screen.getByText('Task overdue').closest('article');
		expect(notificationCard).not.toBeNull();

		await user.click(screen.getByRole('button', { name: 'Mark as read' }));

		await waitFor(() => {
			expect(mockMarkNotificationRead).toHaveBeenCalledWith(301);
		});

		await user.click(within(notificationCard as HTMLElement).getByRole('button', { name: 'Snooze 1h' }));
		await waitFor(() => {
			expect(mockSnoozeNotification).toHaveBeenCalledWith({
				id: 301,
				snoozed_until: expect.any(String),
			});
		});

		await user.click(within(notificationCard as HTMLElement).getByRole('button', { name: 'Accept' }));
		await user.click(within(notificationCard as HTMLElement).getByRole('button', { name: 'Move to progress' }));
		await waitFor(() => {
			expect(mockRunNotificationAction).toHaveBeenCalledWith({
				id: 301,
				action: 'accept_assignment',
				status: undefined,
			});
			expect(mockRunNotificationAction).toHaveBeenCalledWith({
				id: 301,
				action: 'move_status',
				status: 'in_progress',
			});
		});

		await user.type(within(notificationCard as HTMLElement).getByLabelText('Write comment'), 'I am taking this now.');
		await user.click(within(notificationCard as HTMLElement).getByRole('button', { name: 'Post comment' }));
		await waitFor(() => {
			expect(mockRunNotificationAction).toHaveBeenCalledWith({
				id: 301,
				action: 'comment',
				body: 'I am taking this now.',
			});
		});

		await user.click(screen.getByLabelText('Mentions'));
		await user.selectOptions(screen.getByRole('combobox', { name: 'Digest frequency' }), 'weekly');
		await waitFor(() => {
			expect(mockUpdateNotificationPreferences).toHaveBeenCalledWith({ mentions: false });
			expect(mockUpdateNotificationPreferences).toHaveBeenCalledWith({ digest_frequency: 'weekly' });
		});
	});

	it('confirms project archiving with the running task count', async () => {
		const user = userEvent.setup();
		mockProfile(manager);

		render(<DesignWorkflowShell title="Project" variant="project-detail" projectId={projectDetail.id} />);

		await user.click(screen.getByRole('button', { name: 'Archive project' }));
		const dialog = screen.getByRole('dialog', { name: 'Archive this project?' });
		expect(within(dialog).getByText('2 running tasks')).toBeInTheDocument();

		await user.click(within(dialog).getByRole('button', { name: 'Archive project' }));
		await waitFor(() =>
			expect(mockUpdateProject).toHaveBeenCalledWith({ id: projectDetail.id, data: { archived: true } }),
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

	it('shows sorting only for the table and never exposes a redundant blocked-only filter', async () => {
		const user = userEvent.setup();
		mockProfile(manager);

		render(<DesignWorkflowShell title="Board" variant="board" />);
		expect(screen.queryByText('Blocked only')).not.toBeInTheDocument();
		expect(screen.queryByRole('combobox', { name: 'Sort table by' })).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Table' }));
		expect(screen.getByRole('combobox', { name: 'Sort table by' })).toBeInTheDocument();
		await selectMuiOption(user, 'Sort table by', 'Due date descending');

		await user.click(screen.getByRole('button', { name: 'Board' }));
		expect(screen.queryByRole('combobox', { name: 'Sort table by' })).not.toBeInTheDocument();
	});

	it('clears saved-view filters when switching back to the unsaved default', async () => {
		const user = userEvent.setup();
		mockProfile(manager);
		mockUseGetSavedViewsQuery.mockReturnValue({
			data: [
				{
					id: 88,
					name: 'Beta review',
					owner: manager,
					visibility: 'private',
					filters: { q: 'palette' },
					sort: { field: 'due_date' },
					density: 'compact',
					collapsed_lanes: [],
					show_archived: false,
					is_default: false,
					created_at: '2026-04-20T08:00:00Z',
					updated_at: '2026-04-20T08:00:00Z',
				},
			],
		});

		render(<DesignWorkflowShell title="Board" variant="board" />);
		const savedViewBar = document.querySelector('.workflow-saved-view-bar');
		expect(savedViewBar).not.toBeNull();
		const savedViewSelect = within(savedViewBar as HTMLElement).getAllByRole('combobox')[0];

		await user.click(savedViewSelect);
		await user.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Beta review' }));
		expect(screen.getByPlaceholderText('Task, project, description')).toHaveValue('palette');

		await user.click(savedViewSelect);
		await user.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Saved views' }));
		expect(screen.getByPlaceholderText('Task, project, description')).toHaveValue('');
	});
});
