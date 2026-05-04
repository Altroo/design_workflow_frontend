import type { UserRole } from '@/types/accountTypes';

export type WorkflowUser = {
	id: number;
	first_name: string;
	last_name: string;
	email: string;
	role: UserRole;
	avatar?: string | null;
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

export type TaskLabel = {
	id: number;
	name: string;
	color: string;
	created_at: string;
	updated_at: string;
};

export type TaskChecklistItem = {
	id: number;
	checklist_id: number | null;
	title: string;
	done: boolean;
	sort_order: number;
	created_by: WorkflowUser;
	completed_by: WorkflowUser | null;
	completed_at: string | null;
	created_at: string;
	updated_at: string;
};

export type TaskChecklist = {
	id: number;
	title: string;
	sort_order: number;
	created_by: WorkflowUser;
	items: TaskChecklistItem[];
	created_at: string;
	updated_at: string;
};

export type TaskAttachment = {
	id: number;
	uploaded_by: WorkflowUser;
	file: string;
	file_url: string | null;
	name: string;
	mime_type: string;
	size: number;
	annotation_count: number;
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
	cover_image_url: string | null;
	current_assignee: WorkflowUser | null;
	status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done';
	priority: 'low' | 'medium' | 'high' | 'urgent';
	due_date: string | null;
	estimated_minutes: number;
	actual_minutes: number;
	review_state: 'not_submitted' | 'needs_review' | 'changes_requested' | 'approved';
	review_requested_by: WorkflowUser | null;
	review_requested_at: string | null;
	review_approved_by: WorkflowUser | null;
	review_approved_at: string | null;
	blocked_reason: string;
	sort_order: number;
	labels: TaskLabel[];
	checklists: TaskChecklist[];
	checklist_items: TaskChecklistItem[];
	attachments: TaskAttachment[];
	archived: boolean;
	archived_at: string | null;
	is_completed: boolean;
	completed_at: string | null;
	is_overdue: boolean;
	source_chat_message_id: number | null;
	source_chat_thread_id: number | null;
	created_at: string;
	updated_at: string;
};

export type TaskStatus = TaskCard['status'];
export type TaskReviewState = TaskCard['review_state'];

export type TaskArtifactVersion = {
	id: number;
	task: number;
	attachment: TaskAttachment | null;
	version_number: number;
	uploaded_by: WorkflowUser;
	notes: string;
	approval_state: 'pending' | 'changes_requested' | 'approved';
	approved_by: WorkflowUser | null;
	approved_at: string | null;
	created_at: string;
	updated_at: string;
};

export type AttachmentAnnotation = {
	id: number;
	attachment: number;
	version: number | null;
	author: WorkflowUser;
	x_percent: string;
	y_percent: string;
	body: string;
	resolved: boolean;
	resolved_by: WorkflowUser | null;
	resolved_at: string | null;
	created_at: string;
	updated_at: string;
};

export type TaskDetail = TaskCard & {
	comments: TaskComment[];
	artifact_versions: TaskArtifactVersion[];
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
	label_ids?: number[];
	archived?: boolean;
	source_chat_message_id?: number | null;
};

export type ChatAttachment = {
	id: number;
	file: string;
	file_url: string | null;
	name: string;
	mime_type: string;
	size: number;
	created_at: string;
	updated_at: string;
};

export type ChatMessageReply = {
	id: number;
	sender: WorkflowUser;
	body: string;
	deleted_at: string | null;
	is_deleted: boolean;
	created_at: string;
};

export type ChatReaction = {
	id: number;
	user: WorkflowUser;
	emoji: '✅' | '👀' | '👍' | '⚠️';
	created_at: string;
};

export type ChatReminder = {
	id: number;
	task: TaskCard | null;
	created_by: WorkflowUser | null;
	remind_at: string | null;
	note: string;
	done_at: string | null;
	created_at: string;
	updated_at: string;
};

export type ChatMessage = {
	id: number;
	thread: number;
	sender: WorkflowUser;
	body: string;
	attachments: ChatAttachment[];
	read_by: WorkflowUser[];
	mentions: WorkflowUser[];
	reply_to: ChatMessageReply | null;
	reactions: ChatReaction[];
	reminders: ChatReminder[];
	is_read: boolean;
	deleted_at: string | null;
	is_deleted: boolean;
	edited_by: WorkflowUser | null;
	edited_at: string | null;
	edit_count: number;
	decision_by: WorkflowUser | null;
	decision_at: string | null;
	created_at: string;
	updated_at: string;
};

export type ChatThread = {
	id: number;
	kind: 'public' | 'private' | 'project' | 'task';
	title: string;
	project: ProjectSummary | null;
	task: TaskCard | null;
	participants: WorkflowUser[];
	last_message: ChatMessage | null;
	unread_count: number;
	context_url: string | null;
	created_at: string;
	updated_at: string;
};

export type NotificationItem = {
	id: number;
	type: string;
	task: TaskCard | null;
	project: ProjectSummary | null;
	payload: Record<string, unknown>;
	read_at: string | null;
	snoozed_until: string | null;
	action_taken_at: string | null;
	is_read: boolean;
	created_at: string;
};

export type SavedView = {
	id: number;
	name: string;
	owner: WorkflowUser;
	visibility: 'private' | 'team';
	filters: Record<string, unknown>;
	sort: Record<string, unknown>;
	density: 'comfortable' | 'compact';
	collapsed_lanes: string[];
	show_archived: boolean;
	is_default: boolean;
	created_at: string;
	updated_at: string;
};

export type SavedViewInput = {
	name: string;
	visibility?: SavedView['visibility'];
	filters?: Record<string, unknown>;
	sort?: Record<string, unknown>;
	density?: SavedView['density'];
	collapsed_lanes?: string[];
	show_archived?: boolean;
	is_default?: boolean;
};

export type WorkspaceSearchResult = {
	type: 'task' | 'project' | 'user' | 'chat' | 'file';
	id: number;
	title: string;
	subtitle: string;
	url: string;
	metadata: Record<string, unknown>;
};

export type NotificationPreference = {
	mentions: boolean;
	assignments: boolean;
	review_requests: boolean;
	due_soon: boolean;
	digest_frequency: 'instant' | 'daily' | 'weekly' | 'off';
	created_at: string;
	updated_at: string;
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

export type WorkflowCapacityRow = {
	user: WorkflowUser;
	open_tasks: number;
	overdue_tasks: number;
	remaining_minutes: number;
	capacity_minutes: number;
	load_percent: number;
	forecast_days: number;
	risk: 'normal' | 'medium' | 'high';
};

export type WorkflowAnalyticsReport = {
	generated_at: string;
	tasks_sampled: number;
	lead_time_days: number;
	cycle_time_days: number;
	blocked_tasks: number;
	blocked_time_minutes: number;
	review_bottlenecks: {
		needs_review: number;
		changes_requested: number;
		approved: number;
		pending_review_minutes: number;
		average_pending_review_minutes: number;
	};
	estimate_vs_actual: {
		estimated_minutes: number;
		actual_minutes: number;
		variance_minutes: number;
		actual_to_estimate_ratio: number;
	};
	capacity: WorkflowCapacityRow[];
	designer_forecast: WorkflowCapacityRow[];
	status_counts: Record<string, number>;
};

export type TaskFilters = {
	mine?: boolean;
	project?: number;
	status?: string;
	priority?: string;
	assignee?: number;
	review_state?: TaskReviewState;
	label?: number;
	q?: string;
	sort?: string;
	overdue?: boolean;
	blocked?: boolean;
	start_date?: string;
	end_date?: string;
	archived?: boolean;
};

export type ChatMessagesQuery = {
	threadId: number;
	before_id?: number;
	limit?: number;
	q?: string;
	sender_id?: number;
	date_from?: string;
	date_to?: string;
	has_files?: boolean;
	has_images?: boolean;
	decisions?: boolean;
	reference?: string;
};
