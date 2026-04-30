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
	WorkloadRow,
	WorkflowUser,
} from '@/types/designWorkflowTypes';
import { getProfilState, getWSOnlineUserIdsState } from '@/store/selectors';

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

const mockCreateProject = jest.fn();
const mockCreateLabel = jest.fn();
const mockUpdateProject = jest.fn();
const mockCreateTask = jest.fn();
const mockUpdateTask = jest.fn();
const mockUpdateTaskStatus = jest.fn();
const mockReorderTasks = jest.fn();
const mockToggleTaskCompletion = jest.fn();
const mockArchiveTask = jest.fn();
const mockAddChecklist = jest.fn();
const mockAddChecklistItem = jest.fn();
const mockUpdateChecklistItem = jest.fn();
const mockDeleteChecklistItem = jest.fn();
const mockUploadTaskAttachment = jest.fn();
const mockDeleteTaskAttachment = jest.fn();
const mockUploadTaskCover = jest.fn();
const mockDeleteTaskCover = jest.fn();
const mockReassignTask = jest.fn();
const mockAddTaskComment = jest.fn();
const mockAddTaskTimeEntry = jest.fn();
const mockMarkNotificationRead = jest.fn();

const mockUseGetDashboardSummaryQuery = jest.fn();
const mockUseGetNotificationsQuery = jest.fn();
const mockUseGetProjectQuery = jest.fn();
const mockUseGetProjectsQuery = jest.fn();
const mockUseGetLabelsQuery = jest.fn();
const mockUseGetTaskQuery = jest.fn();
const mockUseGetTasksQuery = jest.fn();
const mockUseGetTimeReportQuery = jest.fn();
const mockUseGetWorkloadQuery = jest.fn();
const mockUseGetUsersListQuery = jest.fn();

jest.mock('@/store/services/designWorkflow', () => ({
	useAddChecklistMutation: jest.fn(() => [mockAddChecklist, { isLoading: false, isError: false }]),
	useAddChecklistItemMutation: jest.fn(() => [mockAddChecklistItem, { isLoading: false, isError: false }]),
	useAddTaskCommentMutation: jest.fn(() => [mockAddTaskComment, { isLoading: false, isError: false }]),
	useAddTaskTimeEntryMutation: jest.fn(() => [mockAddTaskTimeEntry, { isLoading: false, isError: false }]),
	useArchiveTaskMutation: jest.fn(() => [mockArchiveTask, { isLoading: false, isError: false }]),
	useCreateLabelMutation: jest.fn(() => [mockCreateLabel, { isLoading: false, isError: false }]),
	useCreateProjectMutation: jest.fn(() => [mockCreateProject, { isLoading: false, isError: false }]),
	useCreateTaskMutation: jest.fn(() => [mockCreateTask, { isLoading: false, isError: false }]),
	useDeleteChecklistItemMutation: jest.fn(() => [mockDeleteChecklistItem, { isLoading: false, isError: false }]),
	useDeleteTaskAttachmentMutation: jest.fn(() => [mockDeleteTaskAttachment, { isLoading: false, isError: false }]),
	useDeleteTaskCoverMutation: jest.fn(() => [mockDeleteTaskCover, { isLoading: false, isError: false }]),
	useGetDashboardSummaryQuery: (...args: unknown[]) => mockUseGetDashboardSummaryQuery(...args),
	useGetLabelsQuery: (...args: unknown[]) => mockUseGetLabelsQuery(...args),
	useGetNotificationsQuery: (...args: unknown[]) => mockUseGetNotificationsQuery(...args),
	useGetProjectQuery: (...args: unknown[]) => mockUseGetProjectQuery(...args),
	useGetProjectsQuery: (...args: unknown[]) => mockUseGetProjectsQuery(...args),
	useGetTaskQuery: (...args: unknown[]) => mockUseGetTaskQuery(...args),
	useGetTasksQuery: (...args: unknown[]) => mockUseGetTasksQuery(...args),
	useGetTimeReportQuery: (...args: unknown[]) => mockUseGetTimeReportQuery(...args),
	useGetWorkloadQuery: (...args: unknown[]) => mockUseGetWorkloadQuery(...args),
	useMarkNotificationReadMutation: jest.fn(() => [mockMarkNotificationRead, { isLoading: false, isError: false }]),
	useReassignTaskMutation: jest.fn(() => [mockReassignTask, { isLoading: false, isError: false }]),
	useReorderTasksMutation: jest.fn(() => [mockReorderTasks, { isLoading: false, isError: false }]),
	useToggleTaskCompletionMutation: jest.fn(() => [mockToggleTaskCompletion, { isLoading: false, isError: false }]),
	useUpdateChecklistItemMutation: jest.fn(() => [mockUpdateChecklistItem, { isLoading: false, isError: false }]),
	useUpdateProjectMutation: jest.fn(() => [mockUpdateProject, { isLoading: false, isError: false }]),
	useUpdateTaskMutation: jest.fn(() => [mockUpdateTask, { isLoading: false, isError: false }]),
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
	created_at: '2026-04-01T09:00:00Z',
	updated_at: '2026-04-22T12:00:00Z',
};

const boardTask: TaskCard = {
	id: 501,
	project: projectSummary,
	title: 'Finalize material board',
	description: 'Prepare revision before client review.',
	cover_image_url: null,
	current_assignee: designerA,
	status: 'todo',
	priority: 'urgent',
	due_date: '2026-04-20',
	estimated_minutes: 240,
	actual_minutes: 90,
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

const notifications: NotificationItem[] = [
	{
		id: 301,
		type: 'task_overdue',
		task: boardTask,
		project: projectSummary,
		payload: { days_overdue: 3 },
		read_at: null,
		is_read: false,
		created_at: '2026-04-23T08:00:00Z',
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
		if (selector === getWSOnlineUserIdsState) return [];
		return undefined;
	});
};

const selectMuiOption = async (user: ReturnType<typeof userEvent.setup>, label: string, option: string) => {
	const trigger = screen.getByRole('combobox', { name: label });
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
	mockUseGetProjectQuery.mockReturnValue({ data: projectDetail, isLoading: false });
	mockUseGetProjectsQuery.mockReturnValue({ data: [projectSummary], isLoading: false });
	mockUseGetTaskQuery.mockReturnValue({ data: taskDetail, isLoading: false });
	mockUseGetTasksQuery.mockReturnValue({ data: [boardTask], isLoading: false });
	mockUseGetTimeReportQuery.mockReturnValue({ data: reportRows });
	mockUseGetWorkloadQuery.mockReturnValue({ data: workload });
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
		mockCreateProject.mockReturnValue(makeMutationResult());
		mockUpdateProject.mockReturnValue(makeMutationResult());
		mockCreateTask.mockReturnValue(makeMutationResult());
		mockUpdateTask.mockReturnValue(makeMutationResult());
		mockUpdateTaskStatus.mockReturnValue(makeMutationResult());
		mockReorderTasks.mockReturnValue(makeMutationResult());
		mockToggleTaskCompletion.mockReturnValue(makeMutationResult());
		mockArchiveTask.mockReturnValue(makeMutationResult());
		mockAddChecklist.mockReturnValue(makeMutationResult());
		mockAddChecklistItem.mockReturnValue(makeMutationResult());
		mockUpdateChecklistItem.mockReturnValue(makeMutationResult());
		mockDeleteChecklistItem.mockReturnValue(makeMutationResult());
		mockUploadTaskAttachment.mockReturnValue(makeMutationResult());
		mockDeleteTaskAttachment.mockReturnValue(makeMutationResult());
		mockUploadTaskCover.mockReturnValue(makeMutationResult());
		mockDeleteTaskCover.mockReturnValue(makeMutationResult());
		mockReassignTask.mockReturnValue(makeMutationResult());
		mockAddTaskComment.mockReturnValue(makeMutationResult());
		mockAddTaskTimeEntry.mockReturnValue(makeMutationResult());
		mockMarkNotificationRead.mockReturnValue(makeMutationResult());
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
				estimated_minutes: 60,
				blocked_reason: '',
				sort_order: 0,
			});
		});

		rerender(<DesignWorkflowShell title="Board" variant="board" />);
		expect(screen.getAllByText('Finalize material board').length).toBeGreaterThan(0);
		expect(screen.getAllByText('Showroom Refresh').length).toBeGreaterThan(0);

		rerender(<DesignWorkflowShell title="Overview" variant="overview" />);
		expect(screen.getByText('Active projects')).toBeInTheDocument();
		expect(screen.getAllByText('Overdue tasks')).toHaveLength(2);
		expect(screen.getByText('Capacity snapshot')).toBeInTheDocument();
		expect(screen.getByText('3 open • 1 overdue')).toBeInTheDocument();
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

		await user.clear(screen.getByLabelText('Minutes'));
		await user.type(screen.getByLabelText('Minutes'), '45');
		await user.type(screen.getByLabelText('Note'), 'Review prep');
		await user.click(screen.getByRole('button', { name: 'Log time' }));

		await waitFor(() => {
			expect(mockAddTaskTimeEntry).toHaveBeenCalledWith({
				id: taskDetail.id,
				minutes: 45,
				work_date: new Date().toISOString().slice(0, 10),
				note: 'Review prep',
			});
		});
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

	it('covers overdue signal across dashboard, workload, report, and notifications', async () => {
		const user = userEvent.setup();
		mockProfile(manager);

		const { rerender } = render(<DesignWorkflowShell title="Overview" variant="overview" />);

		expect(screen.getAllByText('Overdue tasks')).toHaveLength(2);
		expect(screen.getByText('Finalize material board')).toBeInTheDocument();
		expect(screen.getByText('Most available')).toBeInTheDocument();
		expect(screen.getAllByText('Dina Designer').length).toBeGreaterThan(0);

		rerender(<DesignWorkflowShell title="Time report" variant="report-time" />);
		expect(screen.getByText('Time report filters')).toBeInTheDocument();
		expect(screen.getByText('Showroom Refresh')).toBeInTheDocument();
		expect(screen.getByText('3h')).toBeInTheDocument();

		rerender(<DesignWorkflowShell title="Notifications" variant="notifications" />);
		expect(screen.getByText('Notification center')).toBeInTheDocument();
		expect(screen.getByText('Task Overdue')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Mark as read' }));

		await waitFor(() => {
			expect(mockMarkNotificationRead).toHaveBeenCalledWith(301);
		});
	});
});
