import type { UserClass } from '@/models/classes';
import type { TaskCard, TaskChecklist, TaskStatus } from '@/types/designWorkflowTypes';
import type { TranslationDictionary } from '@/types/languageTypes';

export type Variant =
	'overview' | 'board' | 'projects' | 'project-detail' | 'task-detail' | 'team' | 'report-time' | 'notifications';

export type Props = {
	title: string;
	variant: Variant;
	projectId?: number;
	taskId?: number;
};

export type UsersListResponse =
	Array<Partial<UserClass>> | { results?: Array<Partial<UserClass>>; data?: Array<Partial<UserClass>> };

export type TaskChecklistGroup = Pick<TaskChecklist, 'id' | 'title' | 'sort_order' | 'items'>;

export type TaskDetailTab = 'overview' | 'review' | 'files' | 'activity' | 'time';

export type TaskFormState = {
	title: string;
	description: string;
	current_assignee_id: string;
	status: TaskStatus;
	priority: TaskCard['priority'];
	due_date: string;
	estimated_minutes: string;
	blocked_reason: string;
	sort_order: string;
};

export type BoardViewMode = 'board' | 'table' | 'calendar';

export type BoardFiltersState = {
	project: string;
	label: string;
	status: string;
	priority: string;
	assignee: string;
	reviewState: TaskCard['review_state'] | '';
	sort: string;
	search: string;
	overdueOnly: boolean;
	archivedOnly: boolean;
};

export type WorkflowCopy = TranslationDictionary['workflow'];

export type PrintableReportCopy = {
	brand: string;
	reportStudio: string;
	title: string;
	issuedBy: string;
	generatedOn: string;
	period: string;
	scope: string;
	allProjects: string;
	summary: string;
	projectsIncluded: string;
	trackedTime: string;
	leadTime: string;
	cycleTime: string;
	blockedTime: string;
	blockedTasks: string;
	projectTime: string;
	project: string;
	manager: string;
	status: string;
	priority: string;
	minutes: string;
	hours: string;
	share: string;
	deliveryFlow: string;
	reviewBottlenecks: string;
	estimateVsActual: string;
	statusDistribution: string;
	tasksSampled: string;
	needsReview: string;
	changesRequested: string;
	approved: string;
	pendingReviewMinutes: string;
	estimatedMinutes: string;
	actualMinutes: string;
	varianceMinutes: string;
	designerForecast: string;
	designer: string;
	openTasks: string;
	overdueTasks: string;
	remainingMinutes: string;
	loadPercent: string;
	forecastDays: string;
	risk: string;
	designersIncluded: string;
	page: string;
	noProjectTimeWindow: string;
	noForecastRows: string;
	workdayBasis: string;
	schedule: string;
	trackingHint: string;
	collaborationHint: string;
	periodHint: string;
	calendarHint: string;
	capacityHint: string;
	workDuration: string;
};

export type ChecklistTemplate = {
	key: string;
	title: string;
	description: string;
	items: string[];
};

export type MediaDeleteTarget =
	| { kind: 'cover'; taskId: number; name: string }
	| { kind: 'attachment'; taskId: number; attachmentId: number; name: string };

export type AttachmentPreviewTarget = {
	id: number;
	name: string;
	url: string;
	meta: string;
};
