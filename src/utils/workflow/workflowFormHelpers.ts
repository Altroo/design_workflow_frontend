import type {
	NotificationPreference,
	ProjectInput,
	SavedView,
	TaskCard,
	TaskDetail,
	TaskInput,
} from '@/types/designWorkflowTypes';
import type { BoardFiltersState, ChecklistTemplate, TaskFormState, WorkflowCopy } from '@/types/workflowUiTypes';
import { BOARD_SORT_OPTIONS, REVIEW_STATE_OPTIONS, WORK_DAY_MINUTES } from '@/utils/rawData';
import type { CSSProperties } from 'react';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreference = {
	mentions: true,
	assignments: true,
	review_requests: true,
	due_soon: true,
	digest_frequency: 'daily',
	created_at: '',
	updated_at: '',
};

export const normalizeTaskDetail = (task?: TaskDetail): TaskDetail | undefined => {
	if (!task) return undefined;
	return {
		...task,
		labels: task.labels ?? [],
		checklists: task.checklists ?? [],
		checklist_items: task.checklist_items ?? [],
		attachments: task.attachments ?? [],
		comments: task.comments ?? [],
		artifact_versions: task.artifact_versions ?? [],
		recent_activity: task.recent_activity ?? [],
		time_entries: task.time_entries ?? [],
		contributors: task.contributors ?? [],
	};
};

export const emptyProjectForm = (managerId?: number): ProjectInput => ({
	name: '',
	description: '',
	manager_id: managerId ?? 0,
	collaborator_ids: [],
	start_date: '',
	target_end_date: '',
	priority: 'medium',
	status: 'planned',
	archived: false,
});

export const emptyTaskForm = (): TaskFormState => ({
	title: '',
	description: '',
	current_assignee_id: '',
	status: 'backlog',
	priority: 'medium',
	due_date: '',
	estimated_minutes: String(WORK_DAY_MINUTES),
	blocked_reason: '',
	sort_order: '0',
});

export const emptyBoardFilters = (): BoardFiltersState => ({
	project: '',
	label: '',
	status: '',
	priority: '',
	assignee: '',
	reviewState: '',
	sort: 'sort_order',
	search: '',
	overdueOnly: false,
	archivedOnly: false,
});

export const toneForPriority = (priority: TaskCard['priority']) =>
	priority === 'urgent' || priority === 'high' ? 'urgent' : priority === 'medium' ? 'neutral' : 'progress';

export const getChecklistTemplates = (labels: WorkflowCopy['labels']): ChecklistTemplate[] => [
	{
		key: 'client-brief',
		title: labels.clientBriefChecklist ?? 'Client brief',
		description: labels.clientBriefChecklistHint ?? 'Scope, style, budget, and references before design starts.',
		items: [
			labels.clientBriefItemScope ?? 'Confirm room or villa scope',
			labels.clientBriefItemStyle ?? 'Confirm style direction',
			labels.clientBriefItemBudget ?? 'Confirm budget range',
			labels.clientBriefItemReferences ?? 'Collect references and inspiration',
			labels.clientBriefItemConstraints ?? 'Confirm constraints',
		],
	},
	{
		key: 'site-measurements',
		title: labels.siteMeasurementsChecklist ?? 'Site measurements',
		description: labels.siteMeasurementsChecklistHint ?? 'Measurements, plans, photos, and existing constraints.',
		items: [
			labels.siteMeasurementsItemMeasure ?? 'Add site measurements',
			labels.siteMeasurementsItemPlan ?? 'Attach floor plan and photos',
			labels.siteMeasurementsItemCeiling ?? 'Confirm ceiling heights',
			labels.siteMeasurementsItemTechnical ?? 'Check electrical and plumbing constraints',
			labels.siteMeasurementsItemFurniture ?? 'Validate existing furniture to keep',
		],
	},
	{
		key: 'concept-design',
		title: labels.conceptDesignChecklist ?? 'Concept design',
		description: labels.conceptDesignChecklistHint ?? 'Moodboard, palette, materials, and first client direction.',
		items: [
			labels.conceptDesignItemMoodboard ?? 'Prepare moodboard',
			labels.conceptDesignItemPalette ?? 'Select color palette',
			labels.conceptDesignItemMaterials ?? 'Select material direction',
			labels.conceptDesignItemFurniture ?? 'Select furniture style',
			labels.conceptDesignItemFeedback ?? 'Collect client feedback',
		],
	},
	{
		key: 'plans-layout',
		title: labels.plansLayoutChecklist ?? 'Plans and layout',
		description: labels.plansLayoutChecklistHint ?? 'Space planning, circulation, furniture layout, and approval.',
		items: [
			labels.plansLayoutItemSpace ?? 'Complete space planning',
			labels.plansLayoutItemCirculation ?? 'Check circulation',
			labels.plansLayoutItemFurniture ?? 'Complete furniture layout',
			labels.plansLayoutItemLighting ?? 'Review lighting positions',
			labels.plansLayoutItemApproval ?? 'Receive client approval',
		],
	},
	{
		key: 'rendering',
		title: labels.renderingChecklist ?? '3D and renders',
		description: labels.renderingChecklistHint ?? 'Camera views, materials, lighting, exports, and revisions.',
		items: [
			labels.renderingItemCameras ?? 'Select camera angles',
			labels.renderingItemMaterials ?? 'Apply materials',
			labels.renderingItemLighting ?? 'Check lighting and render settings',
			labels.renderingItemExports ?? 'Export final renders',
			labels.renderingItemRevisions ?? 'Handle client revision notes',
		],
	},
	{
		key: 'delivery',
		title: labels.deliveryChecklist ?? 'Delivery',
		description: labels.deliveryChecklistHint ?? 'Final package for client approval and procurement.',
		items: [
			labels.deliveryItemPlans ?? 'Attach final plans',
			labels.deliveryItemRenders ?? 'Attach final renders',
			labels.deliveryItemMaterials ?? 'Attach materials list',
			labels.deliveryItemShopping ?? 'Attach shopping or procurement list',
			labels.deliveryItemApproval ?? 'Archive final client approval',
		],
	},
];

export const toNullableString = (value: string) => (value.trim() ? value : null);

export const toDatePayload = (value?: string | null) => (value?.trim() ? value : null);

export const buildProjectPayload = (form: ProjectInput): ProjectInput => ({
	...form,
	collaborator_ids: form.collaborator_ids?.filter((id) => id !== form.manager_id),
	name: form.name.trim(),
	description: form.description.trim(),
	start_date: toDatePayload(form.start_date),
	target_end_date: toDatePayload(form.target_end_date),
});

export const stringFromSavedFilter = (filters: Record<string, unknown>, key: string) => {
	const value = filters[key];
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	return '';
};

export const boolFromSavedFilter = (filters: Record<string, unknown>, key: string) =>
	filters[key] === true || filters[key] === 'true';

export const filtersFromSavedView = (view: SavedView): BoardFiltersState => {
	const sortField = typeof view.sort.field === 'string' ? view.sort.field : 'sort_order';
	const reviewState = stringFromSavedFilter(view.filters, 'review_state');
	return {
		project: stringFromSavedFilter(view.filters, 'project'),
		label: stringFromSavedFilter(view.filters, 'label'),
		status: stringFromSavedFilter(view.filters, 'status'),
		priority: stringFromSavedFilter(view.filters, 'priority'),
		assignee: stringFromSavedFilter(view.filters, 'assignee'),
		reviewState: REVIEW_STATE_OPTIONS.includes(reviewState as TaskCard['review_state'])
			? (reviewState as TaskCard['review_state'])
			: '',
		sort: BOARD_SORT_OPTIONS.includes(sortField as (typeof BOARD_SORT_OPTIONS)[number]) ? sortField : 'sort_order',
		search: stringFromSavedFilter(view.filters, 'q'),
		overdueOnly: boolFromSavedFilter(view.filters, 'overdue'),
		archivedOnly: view.show_archived || boolFromSavedFilter(view.filters, 'archived'),
	};
};

export const savedViewPayloadFromFilters = (
	name: string,
	filters: BoardFiltersState,
	visibility: SavedView['visibility'],
) => ({
	name: name.trim(),
	visibility,
	filters: {
		project: filters.project,
		label: filters.label,
		status: filters.status,
		priority: filters.priority,
		assignee: filters.assignee,
		review_state: filters.reviewState,
		q: filters.search,
		overdue: filters.overdueOnly,
		archived: filters.archivedOnly,
	},
	sort: { field: filters.sort },
	density: 'compact' as const,
	show_archived: filters.archivedOnly,
});

export const buildTaskPayload = (
	projectValue: number,
	form: TaskFormState,
	options?: { includeTime?: boolean },
): TaskInput => ({
	project_id: projectValue,
	title: form.title.trim(),
	description: form.description.trim(),
	current_assignee_id: form.current_assignee_id ? Number(form.current_assignee_id) : null,
	status: form.status,
	priority: form.priority,
	...(options?.includeTime ? { estimated_minutes: Number(form.estimated_minutes || 0) } : {}),
	...(options?.includeTime ? { due_date: toNullableString(form.due_date) } : {}),
	blocked_reason: form.blocked_reason.trim(),
	sort_order: Number(form.sort_order || 0),
});

export const buildTaskEditForm = (task?: TaskDetail | null): TaskFormState =>
	task
		? {
				title: task.title,
				description: task.description,
				current_assignee_id: task.current_assignee?.id ? String(task.current_assignee.id) : '',
				status: task.status,
				priority: task.priority,
				due_date: task.due_date ?? '',
				estimated_minutes: String(task.estimated_minutes),
				blocked_reason: task.blocked_reason ?? '',
				sort_order: String(task.sort_order),
			}
		: emptyTaskForm();

export const labelColorStyle = (color: string) => {
	const safeColor = /^#[0-9a-f]{6}$/i.test(color) ? color : '#4f46e5';
	const red = Number.parseInt(safeColor.slice(1, 3), 16);
	const green = Number.parseInt(safeColor.slice(3, 5), 16);
	const blue = Number.parseInt(safeColor.slice(5, 7), 16);
	const textColor = (red * 299 + green * 587 + blue * 114) / 1000 > 150 ? '#243047' : '#ffffff';
	return { '--label-color': safeColor, '--label-text': textColor } as CSSProperties;
};
