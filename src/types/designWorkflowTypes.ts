import type { UserRole } from '@/types/accountTypes';

export type WorkflowUser = {
	id: number;
	first_name: string;
	last_name: string;
	email: string;
	role: UserRole;
};

export type ProjectSummary = {
	id: number;
	name: string;
	description: string;
	manager: WorkflowUser;
	start_date: string | null;
	target_end_date: string | null;
	priority: 'low' | 'medium' | 'high' | 'urgent';
	status: 'planned' | 'active' | 'on_hold' | 'completed' | 'archived';
	archived: boolean;
	archived_at: string | null;
	total_logged_minutes: number;
	open_tasks_count: number;
	created_at: string;
	updated_at: string;
};

export type TaskComment = {
	id: number;
	author: WorkflowUser;
	body: string;
	created_at: string;
	updated_at: string;
};

export type TimeEntry = {
	id: number;
	user: WorkflowUser;
	minutes: number;
	work_date: string;
	note: string;
	created_at: string;
	updated_at: string;
};

export type TaskActivity = {
	id: number;
	actor: WorkflowUser | null;
	action_type: string;
	metadata: Record<string, unknown>;
	created_at: string;
};

export type ProjectComment = TaskComment & {
	task_id: number;
	task_title: string;
};

export type ProjectActivity = TaskActivity & {
	task_id: number;
	task_title: string;
};

export type TaskCard = {
	id: number;
	project: ProjectSummary;
	title: string;
	description: string;
	current_assignee: WorkflowUser | null;
	status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done';
	priority: 'low' | 'medium' | 'high' | 'urgent';
	due_date: string | null;
	estimated_minutes: number;
	actual_minutes: number;
	blocked_reason: string;
	sort_order: number;
	is_overdue: boolean;
	created_at: string;
	updated_at: string;
};

export type TaskStatus = TaskCard['status'];

export type TaskDetail = TaskCard & {
	comments: TaskComment[];
	recent_activity: TaskActivity[];
	time_entries: TimeEntry[];
	contributors: WorkflowUser[];
	total_logged_minutes: number;
};

export type ProjectDetail = ProjectSummary & {
	tasks: TaskCard[];
	recent_comments: ProjectComment[];
	recent_activity: ProjectActivity[];
	contributors: WorkflowUser[];
};

export type ProjectInput = {
	name: string;
	description: string;
	manager_id: number;
	start_date?: string | null;
	target_end_date?: string | null;
	priority?: ProjectSummary['priority'];
	status?: ProjectSummary['status'];
	archived?: boolean;
};

export type TaskInput = {
	project_id: number;
	title: string;
	description: string;
	current_assignee_id?: number | null;
	status?: TaskCard['status'];
	priority?: TaskCard['priority'];
	due_date?: string | null;
	estimated_minutes?: number;
	blocked_reason?: string;
	sort_order?: number;
};

export type NotificationItem = {
	id: number;
	type: string;
	task: TaskCard | null;
	project: ProjectSummary | null;
	payload: Record<string, unknown>;
	read_at: string | null;
	is_read: boolean;
	created_at: string;
};

export type DashboardSummary = {
	active_projects: number;
	todo_tasks: number;
	in_progress_tasks: number;
	in_review_tasks: number;
	blocked_tasks: number;
	overdue_tasks: number;
	completed_tasks: number;
	week_logged_minutes: number;
	recent_reassignments: number;
};

export type WorkloadRow = {
	user: WorkflowUser;
	open_tasks: number;
	overdue_tasks: number;
	estimated_minutes: number;
	actual_minutes: number;
};

export type TimeReportRow = {
	project: ProjectSummary;
	minutes: number;
};

export type TaskFilters = {
	mine?: boolean;
	project?: number;
	status?: string;
	priority?: string;
	assignee?: number;
	overdue?: boolean;
	blocked?: boolean;
	start_date?: string;
	end_date?: string;
};
