import {
	mockCreateProject,
	mockCreateTask,
	mockUpdateTaskStatus,
	mockAddTaskComment,
	mockAddTaskTimeEntry,
	mockMarkNotificationRead,
	mockSnoozeNotification,
	mockRunNotificationAction,
	mockUpdateNotificationPreferences,
	manager,
	designerA,
	projectSummary,
	taskDetail,
	mockProfile,
	selectMuiOption,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';
import { openReportPdf } from '@/utils/workflow/workflowReportExport';

jest.mock('@/utils/workflow/workflowReportExport', () => ({ openReportPdf: jest.fn().mockResolvedValue(undefined) }));

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
			collaborator_ids: [],
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
	expect(screen.getByText('Projects being tracked')).toBeInTheDocument();
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

	expect(screen.queryByLabelText('Minutes')).not.toBeInTheDocument();
	expect(mockAddTaskTimeEntry).not.toHaveBeenCalled();
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
	expect(screen.getAllByText('3 h').length).toBeGreaterThan(0);
	expect(screen.getByText('Average completion times')).toBeInTheDocument();
	expect(screen.getByText('Review progress')).toBeInTheDocument();
	expect(screen.getByText('Remaining work per person')).toBeInTheDocument();
	expect(screen.getByText('No completed tasks to calculate these durations.')).toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: 'Open PDF' }));
	expect(openReportPdf).toHaveBeenCalledWith(expect.objectContaining({ totalMinutes: 180 }));

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
