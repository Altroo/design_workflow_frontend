import { taskDetail } from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { en } from '@/translations/en';
import type { SavedView } from '@/types/designWorkflowTypes';
import {
	buildProjectPayload,
	buildTaskEditForm,
	buildTaskPayload,
	emptyBoardFilters,
	emptyProjectForm,
	emptyTaskForm,
	filtersFromSavedView,
	getChecklistTemplates,
	labelColorStyle,
	normalizeTaskDetail,
	savedViewPayloadFromFilters,
	toneForPriority,
	toNullableString,
	toDatePayload,
	stringFromSavedFilter,
	boolFromSavedFilter,
} from './workflowFormHelpers';

it('normalizes empty payload values without losing false, zero or selected dates', () => {
	for (const value of ['', '  ']) expect(toNullableString(value)).toBeNull();
	expect(toNullableString('Keep')).toBe('Keep');
	for (const value of [undefined, null, '', '  ']) expect(toDatePayload(value)).toBeNull();
	expect(toDatePayload('2026-10-06')).toBe('2026-10-06');
	expect(stringFromSavedFilter({ page: 0 }, 'page')).toBe('0');
	expect(stringFromSavedFilter({ page: false }, 'page')).toBe('');
	expect(stringFromSavedFilter({}, 'page')).toBe('');
	for (const value of [true, 'true']) expect(boolFromSavedFilter({ archived: value }, 'archived')).toBe(true);
	for (const value of [false, 'false', 1, undefined])
		expect(boolFromSavedFilter({ archived: value }, 'archived')).toBe(false);
	expect(
		buildTaskPayload(7, { ...emptyTaskForm(), estimated_minutes: '', sort_order: '' }, { includeTime: true }),
	).toMatchObject({ current_assignee_id: null, estimated_minutes: 0, sort_order: 0, due_date: null });
	expect(
		buildTaskEditForm({ ...taskDetail, current_assignee: null, due_date: null, blocked_reason: '' }),
	).toMatchObject({ current_assignee_id: '', due_date: '', blocked_reason: '' });
	expect(emptyProjectForm().manager_id).toBe(0);
	expect(
		buildProjectPayload({ ...emptyProjectForm(), collaborator_ids: undefined, start_date: '2026-10-06' }),
	).toMatchObject({ collaborator_ids: undefined, start_date: '2026-10-06' });
});

it('provides every checklist template without translations and maps all priority tones', () => {
	const templates = getChecklistTemplates({});
	expect(templates.map((template) => template.key)).toEqual([
		'client-brief',
		'site-measurements',
		'concept-design',
		'plans-layout',
		'rendering',
		'delivery',
	]);
	expect(
		templates.every(
			(template) =>
				template.title && template.description && template.items.length === 5 && template.items.every(Boolean),
		),
	).toBe(true);
	expect(
		['urgent', 'high', 'medium', 'low'].map((priority) => toneForPriority(priority as typeof taskDetail.priority)),
	).toEqual(['urgent', 'urgent', 'neutral', 'progress']);
});

it('returns fresh empty forms and normalizes optional task collections', () => {
	const form = emptyProjectForm(1);
	form.collaborator_ids!.push(2);
	expect(emptyProjectForm(1).collaborator_ids).toEqual([]);
	expect(emptyTaskForm().title).toBe('');
	expect(emptyBoardFilters().project).toBe('');
	expect(normalizeTaskDetail(undefined)).toBeUndefined();
	expect(normalizeTaskDetail({ ...taskDetail, comments: undefined! })?.comments).toEqual([]);
});

it('trims project payloads and removes the owner from collaborators', () => {
	expect(
		buildProjectPayload({ ...emptyProjectForm(1), name: ' Plans ', description: ' Scope ', collaborator_ids: [1, 2] }),
	).toMatchObject({
		name: 'Plans',
		description: 'Scope',
		collaborator_ids: [2],
		start_date: null,
		target_end_date: null,
	});
});

it('does not send manager scheduling fields unless requested', () => {
	const form = {
		...emptyTaskForm(),
		title: ' Plans ',
		current_assignee_id: '2',
		due_date: '',
		estimated_minutes: '960',
	};
	expect(buildTaskPayload(101, form)).toMatchObject({ title: 'Plans', project_id: 101, current_assignee_id: 2 });
	expect(buildTaskPayload(101, form)).not.toHaveProperty('estimated_minutes');
	expect(buildTaskPayload(101, form, { includeTime: true })).toMatchObject({ estimated_minutes: 960, due_date: null });
	expect(buildTaskEditForm(taskDetail)).toMatchObject({ title: taskDetail.title, current_assignee_id: '2' });
	expect(buildTaskEditForm(null)).toEqual(emptyTaskForm());
});

it('round-trips saved filters and rejects unsupported review and sorting values', () => {
	const filters = { ...emptyBoardFilters(), project: '101', search: 'palette', overdueOnly: true };
	const payload = savedViewPayloadFromFilters(' My view ', filters, 'private');
	const view: SavedView = {
		...payload,
		id: 1,
		owner: taskDetail.current_assignee!,
		collapsed_lanes: [],
		is_default: false,
		created_at: '',
		updated_at: '',
	};
	expect(payload.name).toBe('My view');
	expect(filtersFromSavedView(view)).toEqual(filters);
	expect(
		filtersFromSavedView({
			...view,
			sort: { field: 'invalid' },
			filters: { project: 2, review_state: 'invalid', overdue: 'true' },
		}),
	).toMatchObject({ project: '2', reviewState: '', sort: 'sort_order', overdueOnly: true });
});

it('uses readable label text and safe fallback colors and fresh checklist templates', () => {
	expect(labelColorStyle('#ffffff')).toMatchObject({ '--label-text': '#243047' });
	expect(labelColorStyle('#000000')).toMatchObject({ '--label-text': '#ffffff' });
	expect(labelColorStyle('transparent')).toMatchObject({ '--label-color': '#4f46e5' });
	expect(toneForPriority('urgent')).toBe('urgent');
	const templates = getChecklistTemplates(en.workflow.labels);
	expect(new Set(templates.map((item) => item.key)).size).toBe(templates.length);
	expect(templates.every((item) => item.items.length > 0)).toBe(true);
	expect(getChecklistTemplates(en.workflow.labels)).not.toBe(templates);
});
