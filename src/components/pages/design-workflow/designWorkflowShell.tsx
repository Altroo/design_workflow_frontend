'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Select from '@radix-ui/react-select';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { format as formatDateFns, isValid, parseISO } from 'date-fns';
import { HexColorPicker } from 'react-colorful';
import {
	ArcElement,
	BarElement,
	CategoryScale,
	Chart as ChartJS,
	Filler,
	Legend,
	LinearScale,
	LineElement,
	PointElement,
	Tooltip,
} from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
	DndContext,
	DragOverlay,
	type DragEndEvent,
	type DragStartEvent,
	PointerSensor,
	closestCenter,
	useDroppable,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
	Archive,
	ArrowRight,
	Bell,
	Bookmark,
	BriefcaseBusiness,
	CalendarDays,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	Clock3,
	CircleAlert,
	FileText,
	FolderKanban,
	GripVertical,
	ImagePlus,
	ListTodo,
	MessagesSquare,
	Palette,
	Paperclip,
	Pencil,
	Plus,
	RefreshCcw,
	Save,
	Search,
	SlidersHorizontal,
	ShieldCheck,
	Table2,
	Tag,
	Trash2,
	Users,
	X,
} from 'lucide-react';
import NavigationBar from '@/components/layouts/navigationBar/navigationBar';
import {
	useAddChecklistMutation,
	useAddChecklistItemMutation,
	useAddTaskCommentMutation,
	useArchiveTaskMutation,
	useCreateAttachmentAnnotationMutation,
	useCreateLabelMutation,
	useCreateTaskVersionMutation,
	useDeleteChecklistItemMutation,
	useDeleteTaskAttachmentMutation,
	useDeleteTaskCoverMutation,
	useCreateSavedViewMutation,
	useDeleteSavedViewMutation,
	useCreateProjectMutation,
	useCreateTaskMutation,
	useGetDashboardSummaryQuery,
	useGetNotificationsQuery,
	useGetProjectQuery,
	useGetProjectsQuery,
	useGetLabelsQuery,
	useGetNotificationPreferencesQuery,
	useGetSavedViewsQuery,
	useGetAttachmentAnnotationsQuery,
	useGetTaskQuery,
	useGetTasksQuery,
	useGetTimeReportQuery,
	useGetWorkflowReportQuery,
	useGetWorkloadQuery,
	useMarkNotificationReadMutation,
	useRunNotificationActionMutation,
	useReassignTaskMutation,
	useReorderTasksMutation,
	useSnoozeNotificationMutation,
	useSetTaskCoverFromAttachmentMutation,
	useUpdateChecklistItemMutation,
	useUploadTaskAttachmentMutation,
	useUploadTaskCoverMutation,
	useSearchWorkspaceQuery,
	useUpdateSavedViewMutation,
	useUpdateProjectMutation,
	useUpdateNotificationPreferencesMutation,
	useUpdateTaskReviewMutation,
	useUpdateTaskMutation,
	useUpdateTaskStatusMutation,
} from '@/store/services/designWorkflow';
import { useGetUsersListQuery } from '@/store/services/account';
import type {
	AttachmentAnnotation,
	NotificationItem,
	NotificationPreference,
	ProjectDetail,
	ProjectInput,
	ProjectSummary,
	SavedView,
	TaskArtifactVersion,
	TaskCard,
	TaskAttachment,
	TaskChecklist,
	TaskDetail,
	TaskInput,
	TaskStatus,
	WorkspaceSearchResult,
	TimeReportRow,
	WorkflowAnalyticsReport,
	WorkflowUser,
	WorkloadRow,
} from '@/types/designWorkflowTypes';
import { DASHBOARD_BOARD, DASHBOARD_CHAT, DASHBOARD_PROJECT_VIEW, DASHBOARD_TASK_VIEW } from '@/utils/routes';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { getAccessToken, getProfilState, getWSOnlineUserIdsState } from '@/store/selectors';
import type { UserClass } from '@/models/classes';
import type { TranslationDictionary } from '@/types/languageTypes';
import { WorkflowMetricCard as MetricCard, WorkflowPageHero, WorkflowPanelPill, WorkflowSimpleMetric } from '@/components/shared/workflow/workflowPrimitives';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Filler, Tooltip, Legend);

type Variant =
	| 'overview'
	| 'board'
	| 'my-work'
	| 'projects'
	| 'project-detail'
	| 'task-detail'
	| 'team'
	| 'report-time'
	| 'notifications';

type Props = {
	title: string;
	variant: Variant;
	projectId?: number;
	taskId?: number;
};

type UsersListResponse = Array<Partial<UserClass>> | { results?: Array<Partial<UserClass>>; data?: Array<Partial<UserClass>> };
type TaskChecklistGroup = Pick<TaskChecklist, 'id' | 'title' | 'sort_order' | 'items'>;
type TaskDetailTab = 'overview' | 'review' | 'files' | 'activity' | 'time';

type TaskFormState = {
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

type BoardViewMode = 'board' | 'table' | 'calendar';
type BoardFiltersState = {
	project: string;
	status: string;
	priority: string;
	assignee: string;
	reviewState: TaskCard['review_state'] | '';
	sort: string;
	search: string;
	overdueOnly: boolean;
	blockedOnly: boolean;
	archivedOnly: boolean;
};

const STATUS_COLUMNS: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done'];
const PRIORITY_OPTIONS: Array<TaskCard['priority']> = ['low', 'medium', 'high', 'urgent'];
const REVIEW_STATE_OPTIONS: Array<TaskCard['review_state']> = ['not_submitted', 'needs_review', 'changes_requested', 'approved'];
const BOARD_SORT_OPTIONS = ['sort_order', 'due_date', '-due_date', 'priority', '-priority', 'updated_at', '-updated_at', 'title'] as const;
const PROJECT_STATUS_OPTIONS: Array<ProjectSummary['status']> = ['planned', 'active', 'on_hold', 'completed', 'archived'];
const EMPTY_PROJECTS: ProjectSummary[] = [];
const EMPTY_TASKS: TaskCard[] = [];
const EMPTY_WORKLOAD: WorkloadRow[] = [];
const EMPTY_TIME_REPORT: TimeReportRow[] = [];
const EMPTY_NOTIFICATIONS: NotificationItem[] = [];
const EMPTY_ANNOTATIONS: AttachmentAnnotation[] = [];
const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreference = {
	mentions: true,
	assignments: true,
	review_requests: true,
	due_soon: true,
	digest_frequency: 'daily',
	created_at: '',
	updated_at: '',
};
const EMPTY_SELECT_VALUE = '__empty__';
const WORK_DAY_MINUTES = 9 * 60;
type WorkflowCopy = TranslationDictionary['workflow'];
type PrintableReportCopy = {
	title: string;
	trackedTime: string;
	leadTime: string;
	cycleTime: string;
	blockedTime: string;
	projectTime: string;
	project: string;
	manager: string;
	minutes: string;
	hours: string;
	designerForecast: string;
	designer: string;
	openTasks: string;
	overdueTasks: string;
	remainingMinutes: string;
	loadPercent: string;
	risk: string;
	noProjectTimeWindow: string;
	noForecastRows: string;
};
type ChecklistTemplate = {
	key: string;
	title: string;
	description: string;
	items: string[];
};

type MediaDeleteTarget =
	| { kind: 'cover'; taskId: number; name: string }
	| { kind: 'attachment'; taskId: number; attachmentId: number; name: string };

type AttachmentPreviewTarget = {
	name: string;
	url: string;
	meta: string;
};

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

const getMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addCalendarMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1);
const getDateKey = (date: Date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const parseTaskDueDate = (value: string | null | undefined) => {
	if (!value) return null;
	const parsed = parseISO(value);
	return isValid(parsed) ? parsed : null;
};

const getCalendarSeedMonth = (tasks: TaskCard[]) => {
	const firstDueTask = tasks
		.map((task) => parseTaskDueDate(task.due_date))
		.filter((date): date is Date => Boolean(date))
		.sort((left, right) => left.getTime() - right.getTime())[0];
	return firstDueTask ? getMonthStart(firstDueTask) : getMonthStart(new Date());
};

const getCalendarDays = (month: Date) => {
	const monthStart = getMonthStart(month);
	const gridStart = new Date(monthStart);
	gridStart.setDate(monthStart.getDate() - monthStart.getDay());

	return Array.from({ length: 42 }, (_, index) => {
		const day = new Date(gridStart);
		day.setDate(gridStart.getDate() + index);
		return day;
	});
};

const normalizeTaskDetail = (task?: TaskDetail): TaskDetail | undefined => {
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
const getColumnId = (status: TaskStatus) => `column-${status}`;
const getTaskDragId = (taskId: number) => `task-${taskId}`;
const isTaskDragId = (value: string) => value.startsWith('task-');
const isColumnDragId = (value: string) => value.startsWith('column-');
const getTaskIdFromDragId = (value: string) => Number(value.replace('task-', ''));
const isTaskStatus = (value: string): value is TaskStatus => STATUS_COLUMNS.includes(value as TaskStatus);
const isCardInteractiveTarget = (target: EventTarget | null) =>
	target instanceof HTMLElement && Boolean(target.closest('button, a, input, textarea, select, [data-no-card-open]'));
let boardDragPointerY: number | null = null;
let boardDragPointerX: number | null = null;
let boardPointerDragTask: { id: number; startX: number; startY: number } | null = null;
let boardMouseDragTask: { id: number; startX: number; startY: number } | null = null;
let boardReleaseTaskId: number | null = null;

const emptyProjectForm = (managerId?: number): ProjectInput => ({
	name: '',
	description: '',
	manager_id: managerId ?? 0,
	start_date: '',
	target_end_date: '',
	priority: 'medium',
	status: 'planned',
	archived: false,
});

const emptyTaskForm = (): TaskFormState => ({
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

const emptyBoardFilters = (): BoardFiltersState => ({
	project: '',
	status: '',
	priority: '',
	assignee: '',
	reviewState: '',
	sort: 'sort_order',
	search: '',
	overdueOnly: false,
	blockedOnly: false,
	archivedOnly: false,
});

const formatMinutes = (minutes: number) => {
	if (minutes >= WORK_DAY_MINUTES && minutes % WORK_DAY_MINUTES === 0) {
		return `${minutes / WORK_DAY_MINUTES}d`;
	}
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	if (hours === 0) return `${mins}m`;
	if (mins === 0) return `${hours}h`;
	return `${hours}h ${mins}m`;
};

const formatWorkDays = (minutes: number, dayLabel = 'Days') => {
	const days = Math.max(0, minutes / WORK_DAY_MINUTES);
	const rounded = Number.isInteger(days) ? days : Math.round(days * 10) / 10;
	return `${rounded} ${dayLabel.toLowerCase()}`;
};

const csvCell = (value: string | number | null | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const downloadCsv = (filename: string, rows: Array<Array<string | number | null | undefined>>) => {
	if (typeof window === 'undefined') return;
	const blob = new Blob([rows.map((row) => row.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
};
const escapeHtml = (value: string | number | null | undefined) =>
	String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
const openPrintableReport = ({
	dateWindow,
	totalMinutes,
	timeReport,
	workflowReport,
	copy,
	riskLabelFor,
}: {
	dateWindow: string;
	totalMinutes: number;
	timeReport: TimeReportRow[];
	workflowReport?: WorkflowAnalyticsReport;
	copy: PrintableReportCopy;
	riskLabelFor: (risk: string) => string;
}) => {
	if (typeof window === 'undefined') return;
	const printable = window.open('', '_blank', 'width=960,height=720');
	if (!printable) {
		window.print();
		return;
	}
	const forecastRows = workflowReport?.designer_forecast ?? [];
	const projectRows = timeReport
		.map((row) => `
			<tr>
				<td>${escapeHtml(row.project.name)}</td>
				<td>${escapeHtml(`${row.project.manager.first_name} ${row.project.manager.last_name}`.trim() || row.project.manager.email)}</td>
				<td>${escapeHtml(row.minutes)}</td>
				<td>${escapeHtml(Math.round((row.minutes / 60) * 100) / 100)}</td>
			</tr>
		`)
		.join('');
	const forecastHtml = forecastRows
		.map((row) => `
			<tr>
				<td>${escapeHtml(`${row.user.first_name} ${row.user.last_name}`.trim() || row.user.email)}</td>
				<td>${escapeHtml(row.open_tasks)}</td>
				<td>${escapeHtml(row.overdue_tasks)}</td>
				<td>${escapeHtml(row.remaining_minutes)}</td>
				<td>${escapeHtml(`${row.load_percent}%`)}</td>
				<td>${escapeHtml(riskLabelFor(row.risk))}</td>
			</tr>
		`)
		.join('');
	printable.document.write(`<!doctype html>
		<html>
			<head>
				<title>${escapeHtml(copy.title)}</title>
				<style>
					* { box-sizing: border-box; }
					body { margin: 0; padding: 32px; color: #0f172a; font: 13px/1.45 Arial, sans-serif; }
					header { border-bottom: 2px solid #0f172a; margin-bottom: 24px; padding-bottom: 16px; }
					h1 { margin: 0; font-size: 28px; }
					h2 { margin: 24px 0 10px; font-size: 18px; }
					.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
					.kpi { border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; }
					.kpi span { display: block; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; }
					.kpi strong { display: block; margin-top: 6px; font-size: 20px; }
					table { width: 100%; border-collapse: collapse; margin-top: 8px; }
					th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
					th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; }
					@page { margin: 16mm; }
				</style>
			</head>
			<body>
				<header>
					<h1>${escapeHtml(copy.title)}</h1>
					<p>${escapeHtml(dateWindow)}</p>
				</header>
				<section class="kpis">
					<div class="kpi"><span>${escapeHtml(copy.trackedTime)}</span><strong>${escapeHtml(formatMinutes(totalMinutes))}</strong></div>
					<div class="kpi"><span>${escapeHtml(copy.leadTime)}</span><strong>${escapeHtml(workflowReport ? `${workflowReport.lead_time_days}d` : 'n/a')}</strong></div>
					<div class="kpi"><span>${escapeHtml(copy.cycleTime)}</span><strong>${escapeHtml(workflowReport ? `${workflowReport.cycle_time_days}d` : 'n/a')}</strong></div>
					<div class="kpi"><span>${escapeHtml(copy.blockedTime)}</span><strong>${escapeHtml(formatMinutes(workflowReport?.blocked_time_minutes ?? 0))}</strong></div>
				</section>
				<h2>${escapeHtml(copy.projectTime)}</h2>
				<table>
					<thead><tr><th>${escapeHtml(copy.project)}</th><th>${escapeHtml(copy.manager)}</th><th>${escapeHtml(copy.minutes)}</th><th>${escapeHtml(copy.hours)}</th></tr></thead>
					<tbody>${projectRows || `<tr><td colspan="4">${escapeHtml(copy.noProjectTimeWindow)}</td></tr>`}</tbody>
				</table>
				<h2>${escapeHtml(copy.designerForecast)}</h2>
				<table>
					<thead><tr><th>${escapeHtml(copy.designer)}</th><th>${escapeHtml(copy.openTasks)}</th><th>${escapeHtml(copy.overdueTasks)}</th><th>${escapeHtml(copy.remainingMinutes)}</th><th>${escapeHtml(copy.loadPercent)}</th><th>${escapeHtml(copy.risk)}</th></tr></thead>
					<tbody>${forecastHtml || `<tr><td colspan="6">${escapeHtml(copy.noForecastRows)}</td></tr>`}</tbody>
				</table>
			</body>
		</html>`);
	printable.document.close();
	printable.focus();
	printable.print();
};

const formatLabel = (value: unknown) =>
	String(value ?? '')
		.split('_')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');

const toneForPriority = (priority: TaskCard['priority']) => (priority === 'urgent' || priority === 'high' ? 'urgent' : priority === 'medium' ? 'neutral' : 'progress');

const getChecklistTemplates = (labels: WorkflowCopy['labels']): ChecklistTemplate[] => [
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

const WORKFLOW_CHART_PALETTE = ['#111827', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e5e7eb'];

const BOARD_STATUS_META: Record<TaskStatus, { accent: string; text: string; soft: string; icon: ReactNode }> = {
	backlog: { accent: '#64748b', text: '#334155', soft: '#f8fafc', icon: <Archive size={14} /> },
	todo: { accent: '#4f46e5', text: '#312e81', soft: '#eef2ff', icon: <ListTodo size={14} /> },
	in_progress: { accent: '#f59e0b', text: '#92400e', soft: '#fffbeb', icon: <Clock3 size={14} /> },
	in_review: { accent: '#06b6d4', text: '#155e75', soft: '#ecfeff', icon: <ShieldCheck size={14} /> },
	blocked: { accent: '#e11d48', text: '#9f1239', soft: '#fff1f2', icon: <CircleAlert size={14} /> },
	done: { accent: '#22c55e', text: '#166534', soft: '#f0fdf4', icon: <CheckCircle2 size={14} /> },
};

const formatDate = (value?: string | null, emptyLabel = 'No date', locale?: string) => {
	if (!value) return emptyLabel;
	return new Date(value).toLocaleDateString(locale);
};

const formatDateTime = (value?: string | null, emptyLabel = 'No date', locale?: string) => {
	if (!value) return emptyLabel;
	return new Date(value).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
};

const parseLocalCalendarDate = (value?: string | null) => {
	if (!value) return null;
	const [datePart] = value.split('T');
	const [year, month, day] = datePart.split('-').map(Number);
	if (!year || !month || !day) return null;
	return new Date(year, month - 1, day);
};

const startOfLocalDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const isBusinessDay = (value: Date) => value.getDay() !== 0 && value.getDay() !== 6;

const businessDaysBetween = (from: Date, to: Date) => {
	const start = startOfLocalDay(from);
	const end = startOfLocalDay(to);
	if (start.getTime() === end.getTime()) return 0;
	const direction = start < end ? 1 : -1;
	const cursor = new Date(start);
	let count = 0;
	while (cursor.getTime() !== end.getTime()) {
		cursor.setDate(cursor.getDate() + direction);
		if (isBusinessDay(cursor)) count += direction;
	}
	return count;
};

const getDueDeliveryInfo = (
	task: Pick<TaskCard, 'due_date' | 'is_completed'>,
	labels: WorkflowCopy['labels'],
) => {
	const due = parseLocalCalendarDate(task.due_date);
	if (!due) return null;
	if (task.is_completed) {
		return { tone: 'progress' as const, label: labels.completed ?? 'Completed' };
	}
	const businessDays = businessDaysBetween(new Date(), due);
	if (businessDays < 0) {
		return {
			tone: 'urgent' as const,
			label: `${Math.abs(businessDays)} ${labels.businessDaysOverdue ?? 'work days overdue'}`,
		};
	}
	if (businessDays === 0) {
		return { tone: 'urgent' as const, label: labels.dueToday ?? 'Due today' };
	}
	if (businessDays <= 2) {
		return { tone: 'warning' as const, label: `${businessDays} ${labels.businessDaysLeft ?? 'work days left'}` };
	}
	return { tone: 'neutral' as const, label: `${businessDays} ${labels.businessDaysLeft ?? 'work days left'}` };
};

const resolveMediaUrl = (value?: string | null) => {
	if (!value) return '';
	if (/^https?:\/\//.test(value) || value.startsWith('blob:') || value.startsWith('data:')) return value;
	const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
	return `${apiUrl}${value.startsWith('/') ? value : `/${value}`}`;
};

const isImageAttachment = (attachment: Pick<TaskAttachment, 'mime_type' | 'name'>) =>
	attachment.mime_type.startsWith('image/') || /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(attachment.name);

const formatFileSize = (size: number) => {
	if (!size) return '';
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
	return `${Math.round((size / (1024 * 1024)) * 10) / 10} MB`;
};

const AvatarBadge = ({
	user,
	size = 32,
}: {
	user?: WorkflowUser | null;
	size?: number;
}) => {
	const onlineUserIds = useAppSelector(getWSOnlineUserIdsState);
	const label = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : 'System';
	const avatarUrl = resolveMediaUrl(user?.avatar);
	const online = !!user && onlineUserIds.includes(user.id);
	const initials = user
		? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? user.email?.[0] ?? ''}`.trim().toUpperCase() || 'U'
		: 'S';
	return (
		<span
			className="workflow-avatar-presence"
			data-online={online}
			aria-label={`${label} ${online ? 'online' : 'offline'}`}
			style={{ width: size, height: size }}
		>
			{avatarUrl ? (
				<span className="relative block overflow-hidden rounded-full" style={{ width: size, height: size }}>
					<Image src={avatarUrl} alt={label} fill sizes={`${size}px`} unoptimized className="object-cover" />
				</span>
			) : (
				<span
					className="workflow-avatar-initials inline-flex items-center justify-center rounded-full bg-(--surface-strong) text-center text-xs font-bold leading-none text-(--ink)"
					style={{ width: size, height: size }}
				>
					{initials}
				</span>
			)}
			{user ? <span className="workflow-avatar-presence-dot" aria-hidden="true" /> : null}
		</span>
	);
};

const HistoryPager = ({
	page,
	totalPages,
	onChange,
}: {
	page: number;
	totalPages: number;
	onChange: (page: number) => void;
}) =>
	totalPages > 1 ? (
		<div className="mt-4 flex items-center justify-between gap-3">
			<button type="button" className="app-button app-button-secondary px-4 py-2" disabled={page <= 1} onClick={() => onChange(Math.max(1, page - 1))}>
				<ChevronLeft size={16} />
			</button>
			<span className="text-sm font-semibold text-(--ink-soft)">{page}/{totalPages}</span>
			<button type="button" className="app-button app-button-secondary px-4 py-2" disabled={page >= totalPages} onClick={() => onChange(Math.min(totalPages, page + 1))}>
				<ChevronRight size={16} />
			</button>
		</div>
	) : null;

const normalizeUsers = (usersResponse?: UsersListResponse): WorkflowUser[] => {
	if (!usersResponse) return [];
	const source =
		Array.isArray(usersResponse)
			? usersResponse
			: 'results' in usersResponse && Array.isArray(usersResponse.results)
				? usersResponse.results
				: 'data' in usersResponse && Array.isArray(usersResponse.data)
					? usersResponse.data
					: [];
	return source
		.filter(
			(user): user is Partial<UserClass> & { id: number; first_name: string; last_name: string; email: string } =>
				typeof user.id === 'number' &&
				typeof user.first_name === 'string' &&
				typeof user.last_name === 'string' &&
				typeof user.email === 'string',
		)
		.map((user) => ({
			id: user.id,
			first_name: user.first_name,
			last_name: user.last_name,
			email: user.email,
			role: user.role === 'manager' || user.is_staff ? 'manager' : 'designer',
			avatar:
				typeof user.avatar === 'string'
					? user.avatar
					: typeof user.avatar_cropped === 'string'
						? user.avatar_cropped
						: null,
		}));
};

const toNullableString = (value: string) => (value.trim() ? value : null);
const toDatePayload = (value?: string | null) => (value?.trim() ? value : null);

const parseDateValue = (value?: string | null) => {
	if (!value) return null;
	const parsed = parseISO(value);
	return isValid(parsed) ? parsed : null;
};

const toDateValue = (value: Date | null) => (value ? formatDateFns(value, 'yyyy-MM-dd') : '');

const buildProjectPayload = (form: ProjectInput): ProjectInput => ({
	...form,
	name: form.name.trim(),
	description: form.description.trim(),
	start_date: toDatePayload(form.start_date),
	target_end_date: toDatePayload(form.target_end_date),
});

const getApiErrorMessage = (error: unknown, fallback: string) => {
	const maybeError = error as { data?: { message?: unknown; details?: Record<string, string[]> } };
	const details = maybeError.data?.details;
	if (details) {
		return Object.entries(details)
			.map(([field, messages]) => `${formatLabel(field)}: ${messages.join(' ')}`)
			.join(' ');
	}
	return typeof maybeError.data?.message === 'string' ? maybeError.data.message : fallback;
};

const stringFromSavedFilter = (filters: Record<string, unknown>, key: string) => {
	const value = filters[key];
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	return '';
};

const boolFromSavedFilter = (filters: Record<string, unknown>, key: string) => filters[key] === true || filters[key] === 'true';

const filtersFromSavedView = (view: SavedView): BoardFiltersState => {
	const sortField = typeof view.sort.field === 'string' ? view.sort.field : 'sort_order';
	const reviewState = stringFromSavedFilter(view.filters, 'review_state');
	return {
		project: stringFromSavedFilter(view.filters, 'project'),
		status: stringFromSavedFilter(view.filters, 'status'),
		priority: stringFromSavedFilter(view.filters, 'priority'),
		assignee: stringFromSavedFilter(view.filters, 'assignee'),
		reviewState: REVIEW_STATE_OPTIONS.includes(reviewState as TaskCard['review_state']) ? reviewState as TaskCard['review_state'] : '',
		sort: BOARD_SORT_OPTIONS.includes(sortField as (typeof BOARD_SORT_OPTIONS)[number]) ? sortField : 'sort_order',
		search: stringFromSavedFilter(view.filters, 'q'),
		overdueOnly: boolFromSavedFilter(view.filters, 'overdue'),
		blockedOnly: boolFromSavedFilter(view.filters, 'blocked'),
		archivedOnly: view.show_archived || boolFromSavedFilter(view.filters, 'archived'),
	};
};

const savedViewPayloadFromFilters = (name: string, filters: BoardFiltersState, visibility: SavedView['visibility']) => ({
	name: name.trim(),
	visibility,
	filters: {
		project: filters.project,
		status: filters.status,
		priority: filters.priority,
		assignee: filters.assignee,
		review_state: filters.reviewState,
		q: filters.search,
		overdue: filters.overdueOnly,
		blocked: filters.blockedOnly,
		archived: filters.archivedOnly,
	},
	sort: { field: filters.sort },
	density: 'compact' as const,
	show_archived: filters.archivedOnly,
});

const buildTaskPayload = (projectValue: number, form: TaskFormState, options?: { includeTime?: boolean }): TaskInput => ({
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

const buildTaskEditForm = (task?: TaskDetail | null): TaskFormState =>
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

const moveTaskToBoardIndex = (items: TaskCard[], taskId: number, targetStatus: TaskStatus, targetIndex: number) => {
	const movingTask = items.find((item) => item.id === taskId);
	if (!movingTask) return null;

	const columns = Object.fromEntries(
		STATUS_COLUMNS.map((status) => [
			status,
			items
				.filter((item) => item.status === status && item.id !== taskId)
				.sort((left, right) => left.sort_order - right.sort_order || left.id - right.id),
		]),
	) as Record<TaskStatus, TaskCard[]>;

	const targetColumn = [...columns[targetStatus]];
	const insertIndex = Math.max(0, Math.min(targetIndex, targetColumn.length));
	targetColumn.splice(insertIndex, 0, { ...movingTask, status: targetStatus });
	columns[targetStatus] = targetColumn;

	const nextBoard = STATUS_COLUMNS.flatMap((status) =>
		columns[status].map((item, index) => ({
			...item,
			sort_order: index,
		})),
	);
	const nextTask = nextBoard.find((item) => item.id === taskId);
	if (!nextTask) return null;

	return {
		nextBoard,
		nextSortOrder: nextTask.sort_order,
		nextStatus: nextTask.status,
	};
};

const boardChanged = (previousBoard: TaskCard[], nextBoard: TaskCard[]) =>
	nextBoard.some((nextTask) => {
		const previousTask = previousBoard.find((item) => item.id === nextTask.id);
		return !previousTask || previousTask.status !== nextTask.status || previousTask.sort_order !== nextTask.sort_order;
	});

const Surface = ({
	title,
	description,
	action,
	children,
	className,
}: {
	title?: string;
	description?: string;
	action?: ReactNode;
	children: ReactNode;
	className?: string;
}) => (
	<section className={cn('app-card overflow-hidden bg-white p-4 sm:p-5', className)}>
		{title || description || action ? (
			<div className="mb-4 flex flex-col gap-3 border-b border-[color:var(--line)] pb-4 lg:flex-row lg:items-center lg:justify-between">
				<div>
					{title ? <h2 className="text-xl font-semibold text-(--ink)">{title}</h2> : null}
					{description ? <p className="mt-1 text-sm leading-6 text-(--ink-soft)">{description}</p> : null}
				</div>
				{action ? <div className="shrink-0">{action}</div> : null}
			</div>
		) : null}
		{children}
	</section>
);

const FieldLabel = ({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) => (
	<label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-(--ink-soft)">
		{children}
	</label>
);

const Field = ({
	id,
	value,
	onChange,
	type = 'text',
	placeholder,
	min,
	startIcon,
}: {
	id?: string;
	value: string | number;
	onChange: (value: string) => void;
	type?: string;
	placeholder?: string;
	min?: number;
	startIcon?: ReactNode;
}) => (
	<div className="relative">
		{startIcon ? (
			<span className="pointer-events-none absolute left-3 top-0 z-10 flex h-full items-center justify-center text-(--ink-soft)">
				{startIcon}
			</span>
		) : null}
		<input
			id={id}
			type={type}
			min={min}
			value={value}
			onChange={(event) => onChange(event.target.value)}
			placeholder={placeholder}
			className={cn('app-input', startIcon ? 'pl-14' : '')}
		/>
	</div>
);

const Area = ({
	id,
	value,
	onChange,
	rows = 4,
	placeholder,
	startIcon,
}: {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	rows?: number;
	placeholder?: string;
	startIcon?: ReactNode;
}) => (
	<div className="relative">
		{startIcon ? (
			<span className="pointer-events-none absolute left-3 top-5 z-10 text-(--ink-soft)">{startIcon}</span>
		) : null}
		<textarea
			id={id}
			rows={rows}
			value={value}
			onChange={(event) => onChange(event.target.value)}
			placeholder={placeholder}
			className={cn('app-input min-h-[110px] resize-y', startIcon ? 'pl-14' : '')}
		/>
	</div>
);

const SelectField = ({
	id,
	value,
	onChange,
	options,
	startIcon,
	placeholder,
}: {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	options: Array<{ value: string | number; label: string }>;
	startIcon?: ReactNode;
	placeholder?: string;
}) => {
	const hasMatchingOption = value !== '' && options.some((option) => String(option.value) === String(value));
	const normalizedValue = value === '' || !hasMatchingOption ? EMPTY_SELECT_VALUE : String(value);

	return (
		<Select.Root
			value={normalizedValue}
			onValueChange={(nextValue) => onChange(nextValue === EMPTY_SELECT_VALUE ? '' : nextValue)}
		>
			<Select.Trigger id={id} className={cn('app-input app-select-trigger pr-14 text-left', startIcon ? 'pl-14' : '')}>
				{startIcon ? (
					<span className="pointer-events-none absolute left-3 top-0 z-10 flex h-full items-center justify-center text-(--ink-soft)">
						{startIcon}
					</span>
				) : null}
				<Select.Value placeholder={placeholder} />
				<Select.Icon asChild>
					<ChevronDown size={18} />
				</Select.Icon>
			</Select.Trigger>
			<Select.Portal>
				<Select.Content className="app-select-content z-[9999]" position="popper" sideOffset={8}>
					<Select.Viewport className="p-1">
						{options.map((option) => {
							const optionValue = option.value === '' ? EMPTY_SELECT_VALUE : String(option.value);
							return (
								<Select.Item key={optionValue} value={optionValue} className="app-select-item">
									<Select.ItemText>{option.label}</Select.ItemText>
								</Select.Item>
							);
						})}
					</Select.Viewport>
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	);
};

const DateField = ({
	id,
	value,
	onChange,
	placeholder = 'YYYY-MM-DD',
}: {
	id?: string;
	value?: string | null;
	onChange: (value: string) => void;
	placeholder?: string;
}) => {
	const selectedDate = parseDateValue(value);
	const [open, setOpen] = useState(false);

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<div className="relative">
				<span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-(--ink-soft)">
					<CalendarDays size={18} />
				</span>
				<Popover.Trigger id={id} className={cn('app-input app-date-trigger pl-14 pr-14 text-left', !value && 'text-(--ink-muted)')}>
					{value || placeholder}
				</Popover.Trigger>
				{value ? (
					<button
						type="button"
						aria-label="Clear date"
						className="absolute right-5 top-1/2 z-10 -translate-y-1/2 text-(--ink-soft)"
						onClick={() => onChange('')}
					>
						<X size={16} />
					</button>
				) : null}
			</div>
			<Popover.Portal>
				<Popover.Content className="app-day-picker-popover" sideOffset={8} align="start">
					<DayPicker
						mode="single"
						selected={selectedDate ?? undefined}
						onSelect={(date) => {
							onChange(toDateValue(date ?? null));
							if (date) setOpen(false);
						}}
						captionLayout="label"
						navLayout="around"
						className="app-day-picker"
					/>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
};

const WorkDaysField = ({
	id,
	value,
	onChange,
	min = 1,
}: {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	min?: number;
}) => {
	const { t } = useLanguage();
	const numericValue = Number(value || 0);
	const displayValue = numericValue ? String(Math.max(min, Math.round(numericValue / WORK_DAY_MINUTES))) : '';

	return (
		<div className="workflow-work-days-field">
			<Field
				id={id}
				type="number"
				min={min}
				value={displayValue}
				onChange={(nextValue) => onChange(String(Math.max(min, Math.round(Number(nextValue || 0))) * WORK_DAY_MINUTES))}
				startIcon={<CalendarDays size={18} />}
			/>
			<span>{t.workflow.labels.daysUnit ?? 'Days'}</span>
		</div>
	);
};

const ToggleField = ({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) => (
	<label className="inline-flex items-center gap-3 text-sm font-medium text-(--ink-soft)">
		<input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="app-check" suppressHydrationWarning />
		<span>{label}</span>
	</label>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
	<div className="rounded-2xl border border-dashed border-[color:var(--line-strong)] bg-white px-5 py-6 text-center">
		<p className="text-base font-semibold text-(--ink)">{title}</p>
		<p className="mt-2 text-sm leading-6 text-(--ink-soft)">{description}</p>
	</div>
);

const Chip = ({
	children,
	tone,
	status,
}: {
	children: ReactNode;
	tone?: 'urgent' | 'progress' | 'neutral' | 'warning';
	status?: TaskStatus | ProjectSummary['status'];
}) => (
	<span className="workflow-chip" data-tone={tone} data-status={status}>
		{children}
	</span>
);

const TaskPeople = ({ task }: { task: TaskCard }) => {
	const people = [task.current_assignee, task.project.manager].filter(
		(user, index, list): user is WorkflowUser => Boolean(user) && list.findIndex((item) => item?.id === user?.id) === index,
	);
	if (people.length === 0) {
		return <span className="text-xs font-semibold text-(--ink-muted)">{task.project.name}</span>;
	}
	return (
		<div className="flex items-center">
			{people.map((user, index) => (
				<span key={user.id} className={cn('workflow-avatar-stack', index > 0 && '-ml-2')}>
					<AvatarBadge user={user} size={26} />
				</span>
			))}
		</div>
	);
};

const BoardTaskCover = ({
	task,
	labelFor,
}: {
	task: TaskCard;
	labelFor: (value: string) => string;
}) => {
	const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
	const statusMeta = BOARD_STATUS_META[task.status];
	const rawCoverUrl = task.cover_image_url ? resolveMediaUrl(task.cover_image_url) : null;
	const coverUrl = rawCoverUrl && failedCoverUrl !== rawCoverUrl ? rawCoverUrl : null;
	const coverStyle = {
		'--card-cover-accent': statusMeta.accent,
		'--card-cover-soft': statusMeta.soft,
		'--card-cover-text': statusMeta.text,
	} as CSSProperties;

	return (
		<div className={cn('workflow-trello-card-cover', !coverUrl && 'workflow-trello-card-cover-fallback')} style={coverStyle}>
			<div className="workflow-trello-card-cover-art" aria-hidden="true">
				<span />
				<span />
				<span />
			</div>
			<div className="workflow-trello-card-cover-status" aria-hidden="true">
				{statusMeta.icon}
				<span>{labelFor(task.status)}</span>
			</div>
			{coverUrl ? (
				<Image
					src={coverUrl}
					alt={task.title}
					width={420}
					height={160}
					unoptimized
					loading="eager"
					onError={() => setFailedCoverUrl(coverUrl)}
				/>
			) : null}
		</div>
	);
};

const TaskCardItem = ({
	task,
	compact = false,
	copy,
	labelFor,
	dateFor,
	onOpen,
	onArchive,
	variant = 'default',
	showTime = false,
}: {
	task: TaskCard;
	compact?: boolean;
	copy: WorkflowCopy;
	labelFor: (value: string) => string;
	dateFor: (value?: string | null) => string;
	onOpen?: (taskId: number) => void;
	onArchive?: (task: TaskCard) => void;
	variant?: 'default' | 'board';
	showTime?: boolean;
}) => {
	const dueDelivery = getDueDeliveryInfo(task, copy.labels);
	if (variant === 'board') {
		const doneItems = task.checklist_items.filter((item) => item.done).length;
		return (
			<div
				data-status={task.status}
				className={cn('workflow-trello-board-card', task.is_completed && 'is-complete', task.is_overdue && 'is-overdue')}
			>
				<BoardTaskCover task={task} labelFor={labelFor} />
				<div className="workflow-trello-card-body">
					{task.labels.length ? (
						<div className="workflow-trello-card-labels">
							{task.labels.slice(0, 4).map((label) => (
								<span key={label.id} style={{ backgroundColor: label.color, color: '#ffffff' }}>{label.name}</span>
							))}
						</div>
					) : null}
					<div className="workflow-trello-card-title-row">
						<p>{task.title}</p>
						{onArchive ? (
							<button
								type="button"
								data-no-card-open
								aria-label="Archive task"
								onClick={(event) => {
									event.stopPropagation();
									onArchive(task);
								}}
								className="workflow-trello-card-edit"
							>
								<Archive size={13} />
							</button>
						) : null}
					</div>
					<span className="workflow-trello-card-project">{task.project.name}</span>
					{task.description ? <p className="workflow-trello-card-description">{task.description}</p> : null}
					<div className="workflow-trello-card-footer">
						<div className="workflow-trello-card-badges">
							{showTime && task.due_date ? (
								<span data-tone={dueDelivery?.tone} title={dateFor(task.due_date)}>
									<CalendarDays size={12} />
									{dueDelivery?.label ?? dateFor(task.due_date)}
								</span>
							) : null}
							{task.checklist_items.length ? <span data-complete={doneItems === task.checklist_items.length}><CheckCircle2 size={12} />{doneItems}/{task.checklist_items.length}</span> : null}
							{task.attachments.length ? <span><Paperclip size={12} />{task.attachments.length}</span> : null}
							{task.review_state !== 'not_submitted' ? <span data-tone={task.review_state === 'approved' ? 'progress' : task.review_state === 'changes_requested' ? 'urgent' : 'warning'}><ShieldCheck size={12} />{labelFor(task.review_state)}</span> : null}
							{task.priority === 'high' || task.priority === 'urgent' ? <span data-tone="urgent"><CircleAlert size={12} />{labelFor(task.priority)}</span> : null}
						</div>
						{task.current_assignee ? <AvatarBadge user={task.current_assignee} size={24} /> : null}
					</div>
				</div>
			</div>
		);
	}

	return (
	<div
		data-status={task.status}
		role={onOpen ? 'button' : undefined}
		tabIndex={onOpen ? 0 : undefined}
		onClick={onOpen ? () => onOpen(task.id) : undefined}
		onKeyDown={
			onOpen
				? (event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							onOpen(task.id);
						}
					}
				: undefined
		}
		className={cn(
			'workflow-card-hover workflow-task-card overflow-hidden',
			onOpen ? 'cursor-pointer' : '',
			task.is_overdue && 'workflow-task-card-overdue',
		)}
	>
		{task.cover_image_url ? (
			<div className="workflow-task-cover">
				<Image src={resolveMediaUrl(task.cover_image_url)} alt={task.title} width={640} height={260} unoptimized className="h-full w-full object-cover" />
				<div className="workflow-task-cover-shade" />
				<div className="workflow-task-cover-chip" style={{ color: BOARD_STATUS_META[task.status].text, backgroundColor: BOARD_STATUS_META[task.status].soft }}>
					{BOARD_STATUS_META[task.status].icon}
					<span>{labelFor(task.status)}</span>
				</div>
			</div>
		) : (
			<div className="workflow-task-cover workflow-task-cover-empty" style={{ '--status-accent': BOARD_STATUS_META[task.status].accent } as CSSProperties}>
				<div className="workflow-task-cover-mark">{BOARD_STATUS_META[task.status].icon}</div>
				<div className="workflow-task-cover-empty-lines">
					<span />
					<span />
					<span />
				</div>
				<div className="workflow-task-cover-chip" style={{ color: BOARD_STATUS_META[task.status].text, backgroundColor: BOARD_STATUS_META[task.status].soft }}>
					{BOARD_STATUS_META[task.status].icon}
					<span>{labelFor(task.status)}</span>
				</div>
			</div>
		)}
		<div className={cn('p-4', compact ? 'space-y-3' : 'space-y-4')}>
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 flex-1 items-start gap-3">
					<div className="min-w-0">
						<p className={cn('text-base font-semibold leading-5 text-(--ink)', task.is_completed && 'text-emerald-700 line-through decoration-2')}>{task.title}</p>
						<p className="mt-1 truncate text-xs font-semibold uppercase text-(--ink-muted)">{task.project.name}</p>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{onArchive ? (
						<button
							type="button"
							aria-label="Archive task"
							onClick={(event) => {
								event.stopPropagation();
								onArchive(task);
							}}
							className="workflow-focus-ring grid h-8 w-8 place-items-center rounded-lg border border-[color:var(--line)] text-(--ink-soft) hover:bg-(--surface-muted) hover:text-(--ink)"
						>
							<Archive size={15} />
						</button>
					) : null}
				</div>
			</div>
			<p className="line-clamp-3 text-sm leading-6 text-(--ink-soft)">{task.description || copy.labels.noDescription}</p>
			{task.labels.length ? (
				<div className="flex flex-wrap gap-1.5">
					{task.labels.map((label) => (
						<span key={label.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold" style={{ borderColor: label.color, color: label.color }}>
							<span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
							{label.name}
						</span>
					))}
				</div>
			) : null}
			<div className="workflow-card-meta">
				<TaskPeople task={task} />
				<div className="ml-auto flex items-center gap-3 text-[11px] font-bold text-(--ink-muted)">
					{showTime ? <span className="inline-flex items-center gap-1"><Clock3 size={13} />{formatMinutes(task.actual_minutes || task.estimated_minutes)}</span> : null}
					<span className="inline-flex items-center gap-1"><CheckCircle2 size={13} />{task.checklist_items.filter((item) => item.done).length}/{task.checklist_items.length || 0}</span>
					<span className="inline-flex items-center gap-1"><Paperclip size={13} />{task.attachments.length}</span>
				</div>
			</div>
			<div className="flex flex-wrap gap-2">
				<Chip tone={toneForPriority(task.priority)}>
					<span className="inline-flex items-center gap-1.5">
						<CircleAlert size={12} />
						<span>{labelFor(task.priority) || task.priority}</span>
					</span>
				</Chip>
				{task.review_state !== 'not_submitted' ? (
					<Chip tone={task.review_state === 'approved' ? 'progress' : task.review_state === 'changes_requested' ? 'urgent' : 'warning'}>
						<span className="inline-flex items-center gap-1.5">
							<ShieldCheck size={12} />
							<span>{labelFor(task.review_state)}</span>
						</span>
					</Chip>
				) : null}
				{showTime && task.due_date ? <Chip tone={dueDelivery?.tone}>{dueDelivery?.label ?? dateFor(task.due_date)}</Chip> : null}
				{!task.current_assignee ? <Chip>{copy.labels.unassigned}</Chip> : null}
			</div>
			{!onOpen ? (
				<Link href={DASHBOARD_TASK_VIEW(task.id)} className="workflow-focus-ring inline-flex items-center gap-2 text-sm font-semibold text-(--accent-strong)">
					<span>{copy.buttons.openTask}</span>
					<ArrowRight size={14} />
				</Link>
			) : null}
		</div>
	</div>
	);
};

const BoardTaskCard = ({
	task,
	copy,
	labelFor,
	dateFor,
	onOpen,
	onArchive,
	showTime = false,
}: {
	task: TaskCard;
	copy: WorkflowCopy;
	labelFor: (value: string) => string;
	dateFor: (value?: string | null) => string;
	onOpen?: (taskId: number) => void;
	onArchive?: (task: TaskCard) => void;
	showTime?: boolean;
}) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: getTaskDragId(task.id),
		data: {
			type: 'task',
			task,
		},
	});

	return (
		<div
			ref={setNodeRef}
			data-task-id={task.id}
			data-testid={`board-task-${task.id}`}
			{...attributes}
			{...listeners}
			onClick={(event) => {
				if (!onOpen || isCardInteractiveTarget(event.target)) return;
				onOpen(task.id);
			}}
			onKeyDown={(event) => {
				if (!onOpen || isCardInteractiveTarget(event.target)) return;
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					onOpen(task.id);
				}
			}}
			onMouseMove={(event) => {
				boardDragPointerX = event.clientX;
				boardDragPointerY = event.clientY;
			}}
			onMouseDownCapture={(event) => {
				boardMouseDragTask = { id: task.id, startX: event.clientX, startY: event.clientY };
				boardDragPointerX = event.clientX;
				boardDragPointerY = event.clientY;
			}}
			onPointerMove={(event) => {
				boardDragPointerX = event.clientX;
				boardDragPointerY = event.clientY;
			}}
			onPointerDownCapture={(event) => {
				event.currentTarget.setPointerCapture(event.pointerId);
				boardPointerDragTask = { id: task.id, startX: event.clientX, startY: event.clientY };
				boardDragPointerX = event.clientX;
				boardDragPointerY = event.clientY;
			}}
			style={
				{
					transform: CSS.Transform.toString(transform),
					transition,
					opacity: isDragging ? 0.35 : 1,
					touchAction: 'none',
					pointerEvents: isDragging ? 'none' : undefined,
				} as CSSProperties
			}
		>
			<div className="cursor-grab active:cursor-grabbing">
				<div className="workflow-board-card-shell">
					<span className="workflow-board-drag-handle" aria-hidden="true">
						<GripVertical size={15} />
					</span>
					<TaskCardItem task={task} compact copy={copy} labelFor={labelFor} dateFor={dateFor} onArchive={onArchive} variant="board" showTime={showTime} />
				</div>
			</div>
		</div>
	);
};

const BoardColumn = ({
	status,
	tasks,
	copy,
	labelFor,
	dateFor,
	onOpen,
	onArchive,
	quickAddOpen,
	quickAddTitle,
	quickAddProjectName,
	quickAddLoading,
	canQuickAdd,
	onQuickAddOpen,
	onQuickAddTitleChange,
	onQuickAddSubmit,
	onQuickAddCancel,
	showTime = false,
}: {
	status: TaskStatus;
	tasks: TaskCard[];
	copy: WorkflowCopy;
	labelFor: (value: string) => string;
	dateFor: (value?: string | null) => string;
	onOpen?: (taskId: number) => void;
	onArchive?: (task: TaskCard) => void;
	quickAddOpen?: boolean;
	quickAddTitle?: string;
	quickAddProjectName?: string;
	quickAddLoading?: boolean;
	canQuickAdd?: boolean;
	onQuickAddOpen?: (status: TaskStatus) => void;
	onQuickAddTitleChange?: (value: string) => void;
	onQuickAddSubmit?: (status: TaskStatus) => void;
	onQuickAddCancel?: () => void;
	showTime?: boolean;
}) => {
	const { setNodeRef, isOver } = useDroppable({
		id: getColumnId(status),
		data: {
			type: 'column',
			status,
		},
	});
	const doneItems = tasks.reduce((count, task) => count + task.checklist_items.filter((item) => item.done).length, 0);
	const totalItems = tasks.reduce((count, task) => count + task.checklist_items.length, 0);
	const overdueCount = tasks.filter((task) => task.is_overdue).length;
	const totalEffort = tasks.reduce((total, task) => total + (task.actual_minutes || task.estimated_minutes || 0), 0);

	return (
		<div
			ref={setNodeRef}
			data-status={status}
			className={cn(
				'workflow-column flex h-full min-h-[420px] min-w-[320px] flex-col',
				isOver && 'workflow-column-over',
			)}
		>
			<div className="workflow-column-header" style={{ '--status-accent': BOARD_STATUS_META[status].accent, '--status-soft': BOARD_STATUS_META[status].soft, '--status-text': BOARD_STATUS_META[status].text } as CSSProperties}>
				<div className="flex min-w-0 items-center gap-2">
					<span className="workflow-column-icon">{BOARD_STATUS_META[status].icon}</span>
					<div className="min-w-0">
						<p className="truncate text-sm font-bold">{labelFor(status)}</p>
						<p className="text-[11px] font-semibold uppercase">{tasks.length} {copy.labels.cards}</p>
					</div>
				</div>
				<div className="workflow-column-count">
					{tasks.length}
				</div>
			</div>
			<div className="workflow-column-stats">
				{showTime ? <span><Clock3 size={12} />{formatMinutes(totalEffort)}</span> : null}
				<span><CheckCircle2 size={12} />{doneItems}/{totalItems}</span>
				{overdueCount ? <span className="workflow-column-stat-urgent"><CircleAlert size={12} />{overdueCount}</span> : null}
			</div>
			<SortableContext items={tasks.map((task) => getTaskDragId(task.id))} strategy={verticalListSortingStrategy}>
				<div className="workflow-column-cards flex flex-1 flex-col gap-3 overflow-y-auto p-3">
					{tasks.map((task) => (
							<BoardTaskCard key={task.id} task={task} copy={copy} labelFor={labelFor} dateFor={dateFor} onOpen={onOpen} onArchive={onArchive} showTime={showTime} />
					))}
					{tasks.length === 0 ? (
						<div className="workflow-column-empty">
							<span>{BOARD_STATUS_META[status].icon}</span>
							<p>{copy.emptyStates.noCards.title}</p>
							<small>{copy.emptyStates.noCards.description}</small>
						</div>
					) : null}
					{canQuickAdd ? (
						quickAddOpen ? (
							<form
								className="workflow-quick-add-card"
								data-no-card-open
								onSubmit={(event) => {
									event.preventDefault();
									onQuickAddSubmit?.(status);
								}}
							>
								<textarea
									autoFocus
									rows={3}
									value={quickAddTitle ?? ''}
									onChange={(event) => onQuickAddTitleChange?.(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === 'Enter' && !event.shiftKey) {
											event.preventDefault();
											onQuickAddSubmit?.(status);
										}
										if (event.key === 'Escape') {
											event.preventDefault();
											onQuickAddCancel?.();
										}
									}}
									placeholder={copy.labels.quickAddPlaceholder ?? 'Enter a title or paste a link'}
								/>
								{quickAddProjectName ? (
									<div className="workflow-quick-add-project">
										<FolderKanban size={13} />
										<span>{quickAddProjectName}</span>
									</div>
								) : null}
								<div className="workflow-quick-add-actions">
									<button type="submit" className="workflow-quick-add-submit" disabled={!quickAddTitle?.trim() || quickAddLoading}>
										{quickAddLoading ? copy.buttons.creating : copy.labels.addCardSubmit}
									</button>
									<button type="button" className="workflow-quick-add-cancel" onClick={onQuickAddCancel} aria-label={copy.buttons.cancel}>
										<X size={19} />
									</button>
								</div>
							</form>
						) : (
							<button type="button" className="workflow-column-add-card" data-no-card-open onClick={() => onQuickAddOpen?.(status)}>
								<Plus size={18} />
								<span>{copy.labels.addCard}</span>
							</button>
						)
					) : null}
				</div>
			</SortableContext>
		</div>
	);
};

const DesignWorkflowShell = ({ title, variant, projectId, taskId }: Props) => {
	const router = useRouter();
	const profile = useAppSelector(getProfilState);
	const token = useAppSelector(getAccessToken);
	const onlineUserIds = useAppSelector(getWSOnlineUserIdsState);
	const { t, language } = useLanguage();
	const workflow = t.workflow;
	const locale = language === 'en' ? 'en-US' : 'fr-FR';
	const labelFor = (value: string) => workflow.statuses[value] ?? workflow.priorities[value] ?? workflow.activities[value] ?? workflow.labels[value] ?? formatLabel(value);
	const riskLabelFor = (value: string) => workflow.labels[`risk_${value}`] ?? workflow.labels[value] ?? workflow.priorities[value] ?? labelFor(value);
	const dateFor = (value?: string | null) => formatDate(value, workflow.labels.noDate, locale);
	const dateTimeFor = (value?: string | null) => formatDateTime(value, workflow.labels.noDate, locale);
	const calendarWeekdays = useMemo(() => {
		const baseSunday = new Date(Date.UTC(2026, 0, 4));
		return Array.from({ length: 7 }, (_, index) =>
			new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(baseSunday.getTime() + index * 86_400_000)),
		);
	}, [locale]);
	const notificationTitle = (notification: NotificationItem) => {
		return labelFor(notification.type);
	};
	const notificationDescription = (notification: NotificationItem) => {
		const objectTitle = notification.task?.title ?? notification.project?.name ?? '';
		if (notification.type === 'task_overdue' && typeof notification.payload.days_overdue === 'number') {
			return [objectTitle, `${notification.payload.days_overdue} ${workflow.labels.daysOverdue}`].filter(Boolean).join(' - ');
		}
		if (notification.type === 'task_status' && typeof notification.payload.status === 'string') {
			return [objectTitle, `${workflow.labels.statusLabel}: ${labelFor(notification.payload.status)}`].filter(Boolean).join(' - ');
		}
		if (notification.type === 'task_reassigned' && typeof notification.payload.reason === 'string' && notification.payload.reason.trim()) {
			return [objectTitle, notification.payload.reason].filter(Boolean).join(' - ');
		}
		if (notification.type === 'chat_message' && typeof notification.payload.title === 'string' && notification.payload.title.trim()) {
			return notification.payload.title;
		}
		if (notification.type === 'workflow_digest' && typeof notification.payload.total_count === 'number') {
			const frequency = typeof notification.payload.frequency === 'string' ? notification.payload.frequency : 'daily';
			const frequencyLabel = workflow.labels[frequency] ?? formatLabel(frequency);
			const unreadCount = typeof notification.payload.unread_count === 'number' ? notification.payload.unread_count : 0;
			return `${frequencyLabel} - ${notification.payload.total_count} ${workflow.labels.totalAlerts}, ${unreadCount} ${workflow.labels.unread}`;
		}
		return objectTitle || workflow.labels.notificationFallback;
	};
	const describeWorkflowActivity = (taskActivity: TaskDetail['recent_activity'][number] | ProjectDetail['recent_activity'][number]) => {
		const metaEntries = Object.entries(taskActivity.metadata ?? {}).filter(([, value]) => value !== null && value !== '');
		if (metaEntries.length === 0) return labelFor(taskActivity.action_type);
		return `${labelFor(taskActivity.action_type)} • ${metaEntries
			.slice(0, 3)
			.map(([key, value]) => {
				const translatedKey = workflow.labels[`activityMeta_${key}`] ?? workflow.labels[key] ?? labelFor(key);
				const translatedValue = typeof value === 'string' ? labelFor(value) : String(value);
				return `${translatedKey}: ${translatedValue}`;
			})
			.join(' • ')}`;
	};
	const isSuperuser = Boolean((profile as { is_superuser?: boolean }).is_superuser);
	const isManager = profile.role === 'manager' || profile.is_staff || isSuperuser;
	const hasHydratedProfile = typeof profile.id === 'number' || Boolean(profile.email);
	const workflowDataReady = Boolean(token && hasHydratedProfile);
	const [boardFilters, setBoardFilters] = useState<BoardFiltersState>(emptyBoardFilters);
	const [boardViewMode, setBoardViewMode] = useState<BoardViewMode>('board');
	const [boardCalendarMonth, setBoardCalendarMonth] = useState<Date | null>(null);
	const [savedViewName, setSavedViewName] = useState('');
	const [savedViewVisibility, setSavedViewVisibility] = useState<SavedView['visibility']>('private');
	const [selectedSavedViewId, setSelectedSavedViewId] = useState<number | null>(null);
	const [autoAppliedSavedViewId, setAutoAppliedSavedViewId] = useState<number | null>(null);
	const [emptyDefaultSavedViewName, setEmptyDefaultSavedViewName] = useState('');
	const defaultSavedViewAppliedRef = useRef(false);
	const [notificationsUnreadOnly, setNotificationsUnreadOnly] = useState(false);
	const [notificationCommentDrafts, setNotificationCommentDrafts] = useState<Record<number, string>>({});
	const [reportFilters, setReportFilters] = useState({ start_date: '', end_date: '' });
	const [projectForm, setProjectForm] = useState<ProjectInput>(() => emptyProjectForm(profile.id));
	const [projectEditForm, setProjectEditForm] = useState<ProjectInput>(() => emptyProjectForm(profile.id));
	const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
	const [taskEditForm, setTaskEditForm] = useState<TaskFormState>(emptyTaskForm);
	const [reassignForm, setReassignForm] = useState({ assignee_id: '', reason: '' });
	const [commentBody, setCommentBody] = useState('');
	const [newChecklistItemsByChecklist, setNewChecklistItemsByChecklist] = useState<Record<string, string>>({});
	const [newChecklistGroupTitle, setNewChecklistGroupTitle] = useState('');
	const [selectedChecklistTemplate, setSelectedChecklistTemplate] = useState('');
	const [taskAddPanel, setTaskAddPanel] = useState<'labels' | 'checklist' | 'cover' | 'attachments' | 'members' | null>(null);
	const [modalDescriptionEditing, setModalDescriptionEditing] = useState(false);
	const [modalLabelComposerOpen, setModalLabelComposerOpen] = useState(false);
	const [newLabelName, setNewLabelName] = useState('');
	const [newLabelColor, setNewLabelColor] = useState('#7F56D9');
	const [taskAttachmentFile, setTaskAttachmentFile] = useState<File | null>(null);
	const [taskCoverFile, setTaskCoverFile] = useState<File | null>(null);
	const [mediaDeleteTarget, setMediaDeleteTarget] = useState<MediaDeleteTarget | null>(null);
	const [attachmentPreview, setAttachmentPreview] = useState<AttachmentPreviewTarget | null>(null);
	const [boardDraft, setBoardDraft] = useState<TaskCard[]>([]);
	const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
	const [quickAddColumn, setQuickAddColumn] = useState<TaskStatus | null>(null);
	const [quickAddTitle, setQuickAddTitle] = useState('');
	const dragDeltaRef = useRef({ x: 0, y: 0 });
	const dragPointerYRef = useRef<number | null>(null);
	const taskAddPanelRef = useRef<HTMLDivElement | null>(null);
	const taskAddActionsRef = useRef<HTMLDivElement | null>(null);
	const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
	const [taskDetailTab, setTaskDetailTab] = useState<TaskDetailTab>('overview');
	const [reviewNotes, setReviewNotes] = useState('');
	const [versionNotes, setVersionNotes] = useState('');
	const [versionAttachmentId, setVersionAttachmentId] = useState('');
	const [versionApprovalState, setVersionApprovalState] = useState<TaskArtifactVersion['approval_state']>('pending');
	const [selectedAnnotationAttachmentId, setSelectedAnnotationAttachmentId] = useState<number | null>(null);
	const [annotationVersionId, setAnnotationVersionId] = useState('');
	const [annotationBody, setAnnotationBody] = useState('');
	const [annotationX, setAnnotationX] = useState('50');
	const [annotationY, setAnnotationY] = useState('50');
	const [annotationResolved, setAnnotationResolved] = useState(false);
	const [projectCommentsPage, setProjectCommentsPage] = useState(1);
	const [projectTasksPage, setProjectTasksPage] = useState(1);
	const [projectActivityPage, setProjectActivityPage] = useState(1);
	const [taskCommentsPage, setTaskCommentsPage] = useState(1);
	const [taskTimeEntriesPage, setTaskTimeEntriesPage] = useState(1);
	const [taskActivityPage, setTaskActivityPage] = useState(1);
	const [boardFiltersOpen, setBoardFiltersOpen] = useState(false);
	const activeTaskId = selectedTaskId ?? (variant === 'task-detail' ? taskId : null);
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
	);
	const closeTaskModal = useCallback(() => {
		setSelectedTaskId(null);
		setTaskAddPanel(null);
		setModalDescriptionEditing(false);
		setModalLabelComposerOpen(false);
		if (taskId && variant === 'board') {
			router.replace(DASHBOARD_BOARD, { scroll: false });
		}
	}, [router, taskId, variant]);

	useEffect(() => {
		if (variant === 'board' && taskId) {
			setSelectedTaskId(taskId);
		}
	}, [taskId, variant]);

	const { data: summary } = useGetDashboardSummaryQuery(undefined, {
		skip: !workflowDataReady || variant !== 'overview' || !isManager,
	});
	const { data: usersResponse, isLoading: usersLoading } = useGetUsersListQuery({ with_pagination: false }, { skip: !workflowDataReady || !isManager });
	const users = normalizeUsers(usersResponse as UsersListResponse | undefined);
	const currentUserOption =
		typeof profile.id === 'number'
			? {
					id: profile.id,
					first_name: profile.first_name || workflow.labels.currentUserFirst,
					last_name: profile.last_name || workflow.labels.currentUserLast,
					email: profile.email || '',
					role: (profile.role === 'manager' || profile.is_staff ? 'manager' : 'designer') as WorkflowUser['role'],
					avatar: typeof profile.avatar === 'string' ? profile.avatar : null,
				}
			: null;
	const managerUsers = [
		...(currentUserOption && currentUserOption.role === 'manager' ? [currentUserOption] : []),
		...users.filter((user) => user.role === 'manager' && user.id !== currentUserOption?.id),
	];
	const userOptionLabel = (user: WorkflowUser) =>
		`${user.first_name} ${user.last_name}${user.id === profile.id ? ` (${workflow.labels.you})` : ''}`;
	const validReassignAssigneeSelected = users.some((user) => String(user.id) === reassignForm.assignee_id);
	const { data: projectsData, isLoading: projectsLoading } = useGetProjectsQuery(undefined, {
		skip: !workflowDataReady || !['projects', 'overview', 'board', 'project-detail', 'task-detail'].includes(variant),
	});
	const projects = projectsData ?? EMPTY_PROJECTS;
	const { data: savedViews = [] } = useGetSavedViewsQuery(undefined, {
		skip: !workflowDataReady || !['board', 'my-work'].includes(variant),
	});
	const { data: workspaceSearchResults = [] } = useSearchWorkspaceQuery(
		{ q: boardFilters.search.trim(), types: 'task,project,user,chat,file' },
		{ skip: !workflowDataReady || !['board', 'my-work'].includes(variant) || boardFilters.search.trim().length < 2 },
	);
	const { data: project, isLoading: projectLoading } = useGetProjectQuery(projectId ?? 0, {
		skip: !workflowDataReady || variant !== 'project-detail' || !projectId,
	});
	const tasksParams =
		variant === 'overview'
			? { overdue: true }
			: {
					mine: variant === 'my-work' ? true : undefined,
					project: boardFilters.project ? Number(boardFilters.project) : undefined,
					status: boardFilters.status || undefined,
					priority: boardFilters.priority || undefined,
					assignee: boardFilters.assignee ? Number(boardFilters.assignee) : undefined,
					review_state: boardFilters.reviewState || undefined,
					q: boardFilters.search.trim() || undefined,
					sort: boardFilters.sort || undefined,
					overdue: boardFilters.overdueOnly || undefined,
					blocked: boardFilters.blockedOnly || undefined,
					archived: boardFilters.archivedOnly || undefined,
				};
	const { data: tasksData, isLoading: tasksLoading, isFetching: tasksFetching } = useGetTasksQuery(tasksParams, {
		skip: !workflowDataReady || !['board', 'my-work', 'overview'].includes(variant),
	});
	const tasks = tasksData ?? EMPTY_TASKS;
	const { data: unfilteredBoardTasksData = EMPTY_TASKS, isLoading: unfilteredBoardTasksLoading, isFetching: unfilteredBoardTasksFetching } = useGetTasksQuery(
		{
			mine: variant === 'my-work' ? true : undefined,
			sort: 'sort_order',
			archived: false,
		},
		{ skip: !workflowDataReady || !['board', 'my-work'].includes(variant) || !autoAppliedSavedViewId },
	);
	const { data: taskData, isLoading: taskLoading } = useGetTaskQuery(activeTaskId ?? 0, {
		skip: !workflowDataReady || !activeTaskId,
	});
	const projectsBusy = !workflowDataReady || projectsLoading;
	const projectBusy = !workflowDataReady || projectLoading;
	const tasksBusy = !workflowDataReady || tasksLoading || tasksFetching;
	const taskBusy = !workflowDataReady || taskLoading;
	const task = useMemo(() => normalizeTaskDetail(taskData), [taskData]);
	const { data: workloadData } = useGetWorkloadQuery(undefined, {
		skip: !workflowDataReady || !isManager || !['team', 'overview'].includes(variant),
	});
	const workload = workloadData ?? EMPTY_WORKLOAD;
	const { data: timeReportData } = useGetTimeReportQuery(
		{
			start_date: reportFilters.start_date || undefined,
			end_date: reportFilters.end_date || undefined,
		},
		{ skip: !workflowDataReady || variant !== 'report-time' || !isManager },
	);
	const timeReport = timeReportData ?? EMPTY_TIME_REPORT;
	const { data: workflowReport } = useGetWorkflowReportQuery(
		{
			start_date: reportFilters.start_date || undefined,
			end_date: reportFilters.end_date || undefined,
		},
		{ skip: !workflowDataReady || variant !== 'report-time' || !isManager },
	);
	const { data: notificationsData } = useGetNotificationsQuery(
		{ unread: notificationsUnreadOnly || undefined },
		{ skip: !workflowDataReady || variant !== 'notifications' },
	);
	const notifications = notificationsData ?? EMPTY_NOTIFICATIONS;
	const { data: notificationPreferences } = useGetNotificationPreferencesQuery(undefined, {
		skip: !workflowDataReady || variant !== 'notifications',
	});
	const resolvedNotificationPreferences = notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
	const { data: labels = [] } = useGetLabelsQuery(undefined, { skip: !workflowDataReady || (!activeTaskId && variant !== 'project-detail') });
	const { data: selectedAttachmentAnnotations = EMPTY_ANNOTATIONS } = useGetAttachmentAnnotationsQuery(
		selectedAnnotationAttachmentId ?? 0,
		{ skip: !workflowDataReady || !selectedAnnotationAttachmentId },
	);

	const [createProject, createProjectState] = useCreateProjectMutation();
	const [createLabel] = useCreateLabelMutation();
	const [createSavedView, createSavedViewState] = useCreateSavedViewMutation();
	const [updateSavedView] = useUpdateSavedViewMutation();
	const [deleteSavedView] = useDeleteSavedViewMutation();
	const [updateProject, updateProjectState] = useUpdateProjectMutation();
	const [createTask, createTaskState] = useCreateTaskMutation();
	const [updateTask, updateTaskState] = useUpdateTaskMutation();
	const [updateTaskStatus, updateStatusState] = useUpdateTaskStatusMutation();
	const [updateTaskReview, updateTaskReviewState] = useUpdateTaskReviewMutation();
	const [reorderTasks, reorderTasksState] = useReorderTasksMutation();
	const [archiveTask] = useArchiveTaskMutation();
	const [addChecklist, addChecklistState] = useAddChecklistMutation();
	const [addChecklistItem, addChecklistItemState] = useAddChecklistItemMutation();
	const [updateChecklistItem] = useUpdateChecklistItemMutation();
	const [deleteChecklistItem] = useDeleteChecklistItemMutation();
	const [uploadTaskAttachment, uploadTaskAttachmentState] = useUploadTaskAttachmentMutation();
	const [deleteTaskAttachment] = useDeleteTaskAttachmentMutation();
	const [setTaskCoverFromAttachment, setTaskCoverFromAttachmentState] = useSetTaskCoverFromAttachmentMutation();
	const [uploadTaskCover, uploadTaskCoverState] = useUploadTaskCoverMutation();
	const [deleteTaskCover] = useDeleteTaskCoverMutation();
	const [createTaskVersion, createTaskVersionState] = useCreateTaskVersionMutation();
	const [createAttachmentAnnotation, createAnnotationState] = useCreateAttachmentAnnotationMutation();
	const [reassignTask, reassignTaskState] = useReassignTaskMutation();
	const [addTaskComment, addCommentState] = useAddTaskCommentMutation();
	const [markNotificationRead] = useMarkNotificationReadMutation();
	const [snoozeNotification] = useSnoozeNotificationMutation();
	const [runNotificationAction] = useRunNotificationActionMutation();
	const [updateNotificationPreferences] = useUpdateNotificationPreferencesMutation();

	useEffect(() => {
		if (profile.id && !projectForm.manager_id) {
			setProjectForm((current) => ({ ...current, manager_id: profile.id }));
		}
	}, [profile.id, projectForm.manager_id]);

	useEffect(() => {
		if (project) {
			setProjectEditForm({
				name: project.name,
				description: project.description,
				manager_id: project.manager.id,
				start_date: project.start_date ?? '',
				target_end_date: project.target_end_date ?? '',
				priority: project.priority,
				status: project.status,
				archived: project.archived,
			});
			setTaskForm((current) => ({
				...current,
				current_assignee_id: current.current_assignee_id || '',
			}));
		}
	}, [project]);

	useEffect(() => {
		if (!['board', 'my-work', 'overview'].includes(variant)) {
			return;
		}
		setBoardDraft(tasks);
	}, [tasks, variant]);

	useEffect(() => {
		if (!['board', 'my-work'].includes(variant) || defaultSavedViewAppliedRef.current || savedViews.length === 0) {
			return;
		}
		const defaultView = savedViews.find((item) => item.is_default);
		if (!defaultView) return;
		defaultSavedViewAppliedRef.current = true;
		setBoardFilters(filtersFromSavedView(defaultView));
		setSelectedSavedViewId(defaultView.id);
		setAutoAppliedSavedViewId(defaultView.id);
		setEmptyDefaultSavedViewName('');
	}, [savedViews, variant]);

	useEffect(() => {
		if (!autoAppliedSavedViewId || !['board', 'my-work'].includes(variant)) return;
		if (tasksLoading || tasksFetching || unfilteredBoardTasksLoading || unfilteredBoardTasksFetching) return;
		if (tasks.length > 0 || unfilteredBoardTasksData.length === 0) return;
		const emptyView = savedViews.find((view) => view.id === autoAppliedSavedViewId);
		setBoardFilters(emptyBoardFilters());
		setSelectedSavedViewId(null);
		setAutoAppliedSavedViewId(null);
		setEmptyDefaultSavedViewName(emptyView?.name ?? '');
		setBoardFiltersOpen(true);
	}, [
		autoAppliedSavedViewId,
		savedViews,
		tasks.length,
		tasksFetching,
		tasksLoading,
		unfilteredBoardTasksData.length,
		unfilteredBoardTasksFetching,
		unfilteredBoardTasksLoading,
		variant,
	]);

	useEffect(() => {
		const handleMove = (event: MouseEvent | PointerEvent) => {
			boardDragPointerX = event.clientX;
			dragPointerYRef.current = event.clientY;
			boardDragPointerY = event.clientY;
		};
		window.addEventListener('mousemove', handleMove, true);
		window.addEventListener('pointermove', handleMove, true);
		return () => {
			window.removeEventListener('mousemove', handleMove, true);
			window.removeEventListener('pointermove', handleMove, true);
		};
	}, []);

	useEffect(() => {
		setTaskEditForm(buildTaskEditForm(task));
		if (task?.current_assignee?.id) {
			setReassignForm((current) => ({ ...current, assignee_id: String(task.current_assignee?.id ?? '') }));
		}
		setTaskCommentsPage(1);
		setTaskTimeEntriesPage(1);
		setTaskActivityPage(1);
		setTaskAttachmentFile(null);
		setTaskCoverFile(null);
		setMediaDeleteTarget(null);
		setAttachmentPreview(null);
		setTaskAddPanel(null);
		setModalDescriptionEditing(false);
		setModalLabelComposerOpen(false);
	}, [task]);

	useEffect(() => {
		setTaskDetailTab('overview');
		setReviewNotes('');
		setVersionNotes('');
		setVersionAttachmentId(task?.attachments[0]?.id ? String(task.attachments[0].id) : '');
		setVersionApprovalState('pending');
		setSelectedAnnotationAttachmentId(task?.attachments[0]?.id ?? null);
		setAnnotationVersionId('');
		setAnnotationBody('');
		setAnnotationX('50');
		setAnnotationY('50');
		setAnnotationResolved(false);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [task?.id]);

	useEffect(() => {
		if (!selectedTaskId) return;
		const previousOverflow = document.body.style.overflow;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				if (taskAddPanel) {
					setTaskAddPanel(null);
					return;
				}
				closeTaskModal();
			}
		};
		document.body.style.overflow = 'hidden';
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [selectedTaskId, taskAddPanel, closeTaskModal]);

	useEffect(() => {
		if (!taskAddPanel) return;
		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			if (taskAddPanelRef.current?.contains(target) || taskAddActionsRef.current?.contains(target)) return;
			if (target.closest('.workflow-trello-add-menu, .app-day-picker-popover, .app-select-content, [data-radix-popper-content-wrapper]')) return;
			setTaskAddPanel(null);
		};
		document.addEventListener('pointerdown', handlePointerDown, true);
		return () => document.removeEventListener('pointerdown', handlePointerDown, true);
	}, [taskAddPanel]);

	const handleArchiveTask = async (taskItem: TaskCard) => {
		await archiveTask({ id: taskItem.id, archived: !taskItem.archived }).unwrap();
	};

	const handleConfirmMediaDelete = async () => {
		if (!mediaDeleteTarget) return;
		if (mediaDeleteTarget.kind === 'cover') {
			await deleteTaskCover(mediaDeleteTarget.taskId).unwrap();
		} else {
			await deleteTaskAttachment({ id: mediaDeleteTarget.taskId, attachmentId: mediaDeleteTarget.attachmentId }).unwrap();
		}
		setMediaDeleteTarget(null);
	};

	const handleSetAttachmentAsCover = async (taskItem: TaskDetail, attachment: TaskAttachment) => {
		await setTaskCoverFromAttachment({ id: taskItem.id, attachmentId: attachment.id }).unwrap();
		setTaskAddPanel(null);
	};

	const openAttachmentPreview = (attachment: TaskAttachment, url: string, meta: string) => {
		setAttachmentPreview({ name: attachment.name, url, meta });
	};

	const applySavedView = (view: SavedView) => {
		setBoardFilters(filtersFromSavedView(view));
		setSelectedSavedViewId(view.id);
		setAutoAppliedSavedViewId(null);
		setEmptyDefaultSavedViewName('');
		setBoardFiltersOpen(true);
	};

	const saveBoardView = async () => {
		const name = savedViewName.trim();
		if (!name) return;
		const view = await createSavedView(savedViewPayloadFromFilters(name, boardFilters, savedViewVisibility)).unwrap();
		setSavedViewName('');
		setSelectedSavedViewId(view.id);
		setAutoAppliedSavedViewId(null);
		setEmptyDefaultSavedViewName('');
	};

	const markCurrentViewDefault = async () => {
		if (!selectedSavedViewId) return;
		await updateSavedView({ id: selectedSavedViewId, data: { is_default: true } }).unwrap();
	};

	const deleteCurrentSavedView = async () => {
		if (!selectedSavedViewId) return;
		await deleteSavedView(selectedSavedViewId).unwrap();
		setSelectedSavedViewId(null);
		setAutoAppliedSavedViewId(null);
		setEmptyDefaultSavedViewName('');
	};

	const filteredBoardTasks = boardDraft.filter((taskItem) => {
		if (!boardFilters.search.trim()) return true;
		const haystack = `${taskItem.title} ${taskItem.project.name} ${taskItem.description} ${taskItem.labels.map((label) => label.name).join(' ')}`.toLowerCase();
		return haystack.includes(boardFilters.search.trim().toLowerCase());
	});
	const quickAddProject =
		(boardFilters.project ? projects.find((item) => item.id === Number(boardFilters.project)) : null) ??
		projects.find((item) => item.status === 'active') ??
		projects[0];

	const handleQuickAddTask = async (status: TaskStatus) => {
		const title = quickAddTitle.trim();
		if (!title || !quickAddProject) return;
		const columnTasks = boardDraft.filter((item) => item.status === status);
		await createTask(buildTaskPayload(quickAddProject.id, {
			...emptyTaskForm(),
			title,
			status,
			current_assignee_id: profile.id ? String(profile.id) : '',
			sort_order: String(columnTasks.length),
		}, { includeTime: isManager })).unwrap();
		setQuickAddTitle('');
		setQuickAddColumn(status);
	};

	const tasksByStatus = STATUS_COLUMNS.map((status) => ({
		status,
		tasks: filteredBoardTasks
			.filter((item) => item.status === status)
			.sort((left, right) => left.sort_order - right.sort_order || left.id - right.id),
	}));

	const busiestUsers = [...workload].sort((left, right) => right.open_tasks - left.open_tasks).slice(0, 4);
	const isUserOnline = (userId: number) => onlineUserIds.includes(userId);
	const taskMutable = !!task && (isManager || task.current_assignee?.id === profile.id);
	const pageHeading =
		variant === 'project-detail' && project
			? project.name
			: variant === 'task-detail' && task
				? task.title
				: workflow.pageTitles[variant] ?? title;

	const pageHighlights = [
		...(variant === 'overview'
			? [
					`${workflow.labels.active} ${summary?.active_projects ?? 0}`,
					`${workflow.labels.blocked} ${summary?.blocked_tasks ?? 0}`,
					`${workflow.labels.overdue} ${summary?.overdue_tasks ?? 0}`,
				]
			: []),
		...(variant === 'board' || variant === 'my-work' ? [`${workflow.labels.visible} ${filteredBoardTasks.length}`] : []),
		...(variant === 'projects' ? [`${workflow.labels.projects} ${projects.length}`] : []),
		...(variant === 'project-detail' && project ? [`${workflow.labels.open} ${project.open_tasks_count}`, `${workflow.labels.status} ${labelFor(project.status)}`] : []),
		...(variant === 'task-detail' && task ? [`${workflow.labels.status} ${labelFor(task.status)}`, ...(isManager ? [`${workflow.labels.spent} ${formatMinutes(task.total_logged_minutes)}`] : [])] : []),
		...(variant === 'team' ? [`${workflow.labels.contributors} ${workload.length}`] : []),
		...(variant === 'report-time' ? [`${workflow.labels.projects} ${timeReport.length}`] : []),
		...(variant === 'notifications' ? [`${workflow.labels.unread} ${notifications.filter((item) => !item.is_read).length}`] : []),
	];

	const getDropPlacementFromPoint = (movingTaskId: number, x: number | null, y: number | null, fallbackStatus: TaskStatus) => {
		if (typeof document === 'undefined' || x === null || y === null) return null;
		const getLayoutRect = (element: HTMLElement) => {
			const rect = element.getBoundingClientRect();
			const transform = window.getComputedStyle(element).transform;
			if (!transform || transform === 'none') return rect;
			const matrix = new DOMMatrixReadOnly(transform);
			return {
				top: rect.top - matrix.m42,
				height: rect.height,
			};
		};
		const hoveredColumn = document.elementFromPoint(x, y)?.closest<HTMLElement>('.workflow-column[data-status]');
		const statusFromPointer = hoveredColumn?.dataset.status;
		const columnFromBounds = Array.from(document.querySelectorAll<HTMLElement>('.workflow-column[data-status]')).find((column) => {
			const rect = column.getBoundingClientRect();
			return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
		});
		const boundedStatus = columnFromBounds?.dataset.status;
		const targetStatus =
			statusFromPointer && isTaskStatus(statusFromPointer)
				? statusFromPointer
				: boundedStatus && isTaskStatus(boundedStatus)
					? boundedStatus
					: fallbackStatus;
		const targetColumn =
			hoveredColumn?.dataset.status === targetStatus
				? hoveredColumn
				: columnFromBounds?.dataset.status === targetStatus
					? columnFromBounds
					: document.querySelector<HTMLElement>(`.workflow-column[data-status="${targetStatus}"]`);

		if (!targetColumn) return null;

		const cardElements = Array.from(targetColumn.querySelectorAll<HTMLElement>('[data-task-id]'))
			.filter((element) => Number(element.dataset.taskId) !== movingTaskId)
			.sort((left, right) => getLayoutRect(left).top - getLayoutRect(right).top);
		const targetIndex = cardElements.findIndex((element) => {
			const rect = getLayoutRect(element);
			return y < rect.top + rect.height / 2;
		});
		return {
			status: targetStatus,
			index: targetIndex >= 0 ? targetIndex : cardElements.length,
		};
	};

	const applyBoardMove = async (movingTaskId: number, placement: { status: TaskStatus; index: number }) => {
		const nextState = moveTaskToBoardIndex(boardDraft, movingTaskId, placement.status, placement.index);
		if (!nextState) {
			return false;
		}
		if (!boardChanged(boardDraft, nextState.nextBoard)) {
			return false;
		}

		const previousBoard = boardDraft;
		setBoardDraft(nextState.nextBoard);

		try {
			await reorderTasks({
				moved_task_id: movingTaskId,
				tasks: nextState.nextBoard.map((taskItem) => ({
					id: taskItem.id,
					status: taskItem.status,
					sort_order: taskItem.sort_order,
				})),
			}).unwrap();
			return true;
		} catch {
			setBoardDraft(previousBoard);
			return false;
		}
	};

	const handlePointerTaskDrop = (taskId: number, x: number, y: number) => {
		const activeTask = boardDraft.find((item) => item.id === taskId);
		if (!activeTask) {
			return;
		}
		const placement = getDropPlacementFromPoint(taskId, x, y, activeTask.status);
		if (!placement) {
			return;
		}
		void applyBoardMove(taskId, placement);
	};

	useEffect(() => {
		const releaseTask = (taskId: number, startX: number, startY: number, clientX: number, clientY: number) => {
			if (Math.hypot(clientX - startX, clientY - startY) < 8) return;
			if (boardReleaseTaskId === taskId) return;
			boardReleaseTaskId = taskId;
			window.setTimeout(() => {
				if (boardReleaseTaskId === taskId) boardReleaseTaskId = null;
			}, 0);
			handlePointerTaskDrop(taskId, clientX, clientY);
		};

		const handleGlobalPointerUp = (event: PointerEvent) => {
			const pointerTask = boardPointerDragTask;
			if (!pointerTask) return;
			const { id, startX, startY } = pointerTask;
			boardPointerDragTask = null;
			releaseTask(id, startX, startY, event.clientX, event.clientY);
		};

		const handleGlobalMouseUp = (event: MouseEvent) => {
			const mouseTask = boardMouseDragTask;
			if (!mouseTask) return;
			const { id, startX, startY } = mouseTask;
			boardMouseDragTask = null;
			releaseTask(id, startX, startY, event.clientX, event.clientY);
		};

		window.addEventListener('pointerup', handleGlobalPointerUp, true);
		window.addEventListener('mouseup', handleGlobalMouseUp, true);
		return () => {
			window.removeEventListener('pointerup', handleGlobalPointerUp, true);
			window.removeEventListener('mouseup', handleGlobalMouseUp, true);
		};
	});

	const getDropPlacement = (event: DragEndEvent, movingTaskId: number) => {
		const activeId = event.active.id;
		const overId = event.over?.id;
		const activeTask = boardDraft.find((item) => item.id === movingTaskId);
		if (!activeTask || typeof activeId !== 'string') return null;
		const activeRect = event.active.rect.current.translated ?? event.active.rect.current.initial;
		const activeCenterX = activeRect ? activeRect.left + activeRect.width / 2 : boardDragPointerX;
		const activeCenterY = activeRect ? activeRect.top + activeRect.height / 2 : boardDragPointerY;

		let fallbackStatus: TaskStatus = activeTask.status;
		if (typeof overId === 'string' && isColumnDragId(overId)) {
			const statusFromColumn = overId.replace('column-', '');
			if (isTaskStatus(statusFromColumn)) fallbackStatus = statusFromColumn;
		} else if (typeof overId === 'string' && isTaskDragId(overId)) {
			fallbackStatus = boardDraft.find((item) => item.id === getTaskIdFromDragId(overId))?.status ?? fallbackStatus;
		}

		const pointerX = boardDragPointerX ?? activeCenterX;
		const pointerY = boardDragPointerY ?? activeCenterY;
		const pointPlacement = getDropPlacementFromPoint(movingTaskId, pointerX, pointerY, fallbackStatus);
		if (pointPlacement) return pointPlacement;

		if (typeof overId === 'string' && isTaskDragId(overId) && overId !== activeId) {
			const overTaskId = getTaskIdFromDragId(overId);
			const targetStatus = boardDraft.find((item) => item.id === overTaskId)?.status ?? fallbackStatus;
			const targetColumn = boardDraft
				.filter((item) => item.status === targetStatus)
				.sort((left, right) => left.sort_order - right.sort_order || left.id - right.id);
			const overIndex = targetColumn.findIndex((item) => item.id === overTaskId);
			return {
				status: targetStatus,
				index: overIndex >= 0 ? overIndex : targetColumn.length,
			};
		}

		return {
			status: fallbackStatus,
			index: boardDraft.filter((item) => item.status === fallbackStatus && item.id !== movingTaskId).length,
		};
	};

	const handleDragStart = (event: DragStartEvent) => {
		if (typeof event.active.id !== 'string' || !isTaskDragId(event.active.id)) return;
		const taskId = getTaskIdFromDragId(event.active.id);
		dragDeltaRef.current = { x: 0, y: 0 };
		const initialRect = event.active.rect.current.initial;
		dragPointerYRef.current = initialRect ? initialRect.top + initialRect.height / 2 : null;
		setDraggedTaskId(taskId);
	};

	const handleDragMove = (event: { delta: { x: number; y: number } }) => {
		dragDeltaRef.current = event.delta;
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		setDraggedTaskId(null);
		const activeId = event.active.id;
		if (typeof activeId !== 'string' || !isTaskDragId(activeId)) return;

		const movingTaskId = getTaskIdFromDragId(activeId);
		const placement = getDropPlacement(event, movingTaskId);
		if (!placement) return;
		await applyBoardMove(movingTaskId, placement);
	};

	const renderHeader = () => (
		<Surface className="workflow-hero">
			<div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
				<div className="max-w-3xl">
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--ink-muted)">{workflow.labels.workflow}</p>
					<h1 className="mt-3 text-3xl font-semibold text-(--ink) sm:text-4xl">{pageHeading}</h1>
					<p className="mt-3 max-w-2xl text-sm leading-6 text-(--ink-soft)">{workflow.pageDescriptions[variant]}</p>
				</div>
				<div className="rounded-2xl border border-[color:var(--line)] bg-(--surface-muted) p-3">
					<div className="flex flex-wrap gap-2">
						{pageHighlights.map((item) => (
							<Chip key={item} tone="neutral">{item}</Chip>
						))}
					</div>
				</div>
			</div>
		</Surface>
	);

	const renderOverview = () => {
		const projectPreview = projects.slice(0, 4);
		const metricCards = [
			{ icon: <FolderKanban size={16} />, label: workflow.metrics.activeProjects, value: summary?.active_projects ?? 0, tone: 'indigo' as const },
			{ icon: <ListTodo size={16} />, label: workflow.metrics.todo, value: summary?.todo_tasks ?? 0, tone: 'amber' as const },
			{ icon: <CircleAlert size={16} />, label: workflow.metrics.overdueTasks, value: summary?.overdue_tasks ?? 0, tone: 'rose' as const },
			{ icon: <Clock3 size={16} />, label: workflow.metrics.weekLogged, value: formatMinutes(summary?.week_logged_minutes ?? 0), tone: 'green' as const },
		];
		const projectLoadRows = [...projects].sort((left, right) => right.open_tasks_count - left.open_tasks_count).slice(0, 6);
		const taskMixValues = [
			summary?.todo_tasks ?? 0,
			summary?.in_progress_tasks ?? 0,
			summary?.in_review_tasks ?? 0,
			summary?.blocked_tasks ?? 0,
			summary?.completed_tasks ?? 0,
		];
		const totalTaskMix = taskMixValues.reduce((sum, value) => sum + value, 0);
		const overviewBarData: ChartData<'bar', number[], string> = {
			labels: projectLoadRows.map((item) => item.name),
			datasets: [
				{
					label: workflow.labels.openTasksLabel,
					data: projectLoadRows.map((item) => item.open_tasks_count),
					backgroundColor: projectLoadRows.map((_, index) => WORKFLOW_CHART_PALETTE[index % WORKFLOW_CHART_PALETTE.length]),
					borderRadius: 10,
					borderSkipped: false,
					barThickness: 16,
				},
			],
		};
		const overviewBarOptions: ChartOptions<'bar'> = {
			indexAxis: 'y',
			responsive: true,
			maintainAspectRatio: false,
			animation: false,
			plugins: {
				legend: { display: false },
				tooltip: {
					callbacks: {
						label: (context) => `${workflow.labels.openTasksLabel}: ${Number(context.raw) || 0}`,
					},
				},
			},
			scales: {
				x: {
					border: { display: false },
					grid: { color: 'rgba(148, 163, 184, 0.18)' },
					ticks: { color: '#64748b', precision: 0, font: { weight: 'bold' } },
				},
				y: {
					border: { display: false },
					grid: { display: false },
					ticks: {
						color: '#334155',
						font: { weight: 'bold' },
						callback: (value) => `#${Number(value) + 1}`,
					},
				},
			},
		};
		const overviewDoughnutData: ChartData<'doughnut', number[], string> = {
			labels: [labelFor('todo'), labelFor('in_progress'), labelFor('in_review'), labelFor('blocked'), labelFor('done')],
			datasets: [
				{
					data: taskMixValues,
					backgroundColor: taskMixValues.map((_, index) => WORKFLOW_CHART_PALETTE[index % WORKFLOW_CHART_PALETTE.length]),
					borderColor: '#ffffff',
					borderWidth: 4,
					hoverOffset: 8,
				},
			],
		};
		const overviewDoughnutOptions: ChartOptions<'doughnut'> = {
			responsive: true,
			maintainAspectRatio: false,
			animation: false,
			cutout: '66%',
			plugins: {
				legend: {
					position: 'bottom',
					labels: {
						boxWidth: 8,
						boxHeight: 8,
						color: '#475569',
						font: { weight: 'bold' },
						padding: 12,
						usePointStyle: true,
					},
				},
				tooltip: {
					callbacks: {
						label: (context) => `${context.label}: ${Number(context.raw) || 0}`,
					},
				},
			},
		};

		return (
			<div className="workflow-overview-page">
				<WorkflowPageHero
					className="workflow-overview-header"
					eyebrow={workflow.labels.workflow}
					title={workflow.pageTitles.overview}
					actionsClassName="workflow-overview-actions"
					actions={
						<>
						<span>{workflow.labels.active} {summary?.active_projects ?? 0}</span>
						<span>{workflow.labels.blocked} {summary?.blocked_tasks ?? 0}</span>
						<span>{workflow.labels.overdue} {summary?.overdue_tasks ?? 0}</span>
						</>
					}
				/>

				<section className="workflow-overview-metrics">
					{metricCards.map((metric) => (
						<MetricCard key={metric.label} {...metric} />
					))}
				</section>

				<section className="workflow-overview-analytics">
					<article className="workflow-overview-chart-card">
						<WorkflowPanelPill label={workflow.labels.projectLoad} value={projects.length} />
						<div className="workflow-overview-chart-body workflow-overview-chart-body-bar">
							{projectLoadRows.length ? <Bar data={overviewBarData} options={overviewBarOptions} /> : <EmptyState {...workflow.emptyStates.noProjects} />}
						</div>
						<div className="workflow-overview-chart-keys">
							{projectLoadRows.map((item, index) => (
								<span key={item.id}>
									<b>#{index + 1}</b>
									{item.name}
								</span>
							))}
						</div>
					</article>
					<article className="workflow-overview-chart-card workflow-overview-chart-card-compact">
						<WorkflowPanelPill label={workflow.labels.deliveryMix} value={totalTaskMix} />
						<div className="workflow-overview-chart-body workflow-overview-chart-body-doughnut">
							{totalTaskMix ? (
								<>
									<Doughnut data={overviewDoughnutData} options={overviewDoughnutOptions} />
									<div className="workflow-overview-doughnut-center" aria-hidden="true">
										<span>{workflow.labels.cards}</span>
										<strong>{totalTaskMix}</strong>
									</div>
								</>
							) : (
								<EmptyState title={workflow.labels.noCardsTracked} description={workflow.emptyStates.noCards.description} />
							)}
						</div>
					</article>
				</section>

				<section className="workflow-overview-grid">
					<div className={cn('workflow-overview-panel', tasks.length > 0 && 'workflow-overview-panel-wide')} data-tone="rose">
						<WorkflowPanelPill label={workflow.sections.overdueTasks.title} value={tasks.length} />
						<p className="workflow-overview-panel-copy">{workflow.sections.overdueTasks.description}</p>
						<div className="workflow-overview-task-list">
						{tasksBusy ? <EmptyState {...workflow.emptyStates.loadingCards} /> : null}
						{!tasksBusy && tasks.slice(0, 4).map((taskItem) => <TaskCardItem key={taskItem.id} task={taskItem} compact copy={workflow} labelFor={labelFor} dateFor={dateFor} onOpen={setSelectedTaskId} onArchive={handleArchiveTask} showTime={isManager} />)}
						{!tasksBusy && tasks.length === 0 ? (
							<EmptyState {...workflow.emptyStates.noUrgentCards} />
						) : null}
						</div>
					</div>

					<div className="workflow-overview-panel" data-tone="indigo">
						<WorkflowPanelPill label={workflow.sections.capacitySnapshot.title} value={busiestUsers.length} />
						<p className="workflow-overview-panel-copy">{workflow.sections.capacitySnapshot.description}</p>
						<div className="workflow-overview-people">
						{busiestUsers.map((row) => (
							<div key={row.user.id} className="workflow-overview-person">
								<AvatarBadge user={row.user} size={34} />
								<div className="min-w-0 flex-1">
									<p>
										{row.user.first_name} {row.user.last_name}
									</p>
									<span>{labelFor(row.user.role)}</span>
								</div>
								<div className="flex flex-wrap justify-end gap-2">
									<Chip>{row.open_tasks} {workflow.labels.openLower} • {row.overdue_tasks} {workflow.labels.overdueLower}</Chip>
								</div>
							</div>
						))}
						{busiestUsers.length === 0 ? (
							<EmptyState {...workflow.emptyStates.noWorkload} />
						) : null}
						</div>
					</div>

					<div className="workflow-overview-panel" data-tone="green">
						<WorkflowPanelPill label={workflow.sections.projects.title} value={projectPreview.length} />
						<p className="workflow-overview-panel-copy">{workflow.sections.projects.description}</p>
						<div className="workflow-overview-projects">
							{projectsBusy ? <EmptyState {...workflow.emptyStates.loadingProjects} /> : null}
							{!projectsBusy && projectPreview.map((projectItem) => (
								<Link key={projectItem.id} href={DASHBOARD_PROJECT_VIEW(projectItem.id)} className="workflow-overview-project">
									<div>
										<p>{projectItem.name}</p>
										<span>{projectItem.open_tasks_count} {workflow.labels.openTasks}</span>
									</div>
									<Chip status={projectItem.status}>{labelFor(projectItem.status)}</Chip>
								</Link>
							))}
							{!projectsBusy && projectPreview.length === 0 ? <EmptyState {...workflow.emptyStates.noProjects} /> : null}
						</div>
					</div>
				</section>
			</div>
		);
	};

	const resetBoardFilters = () => {
		defaultSavedViewAppliedRef.current = true;
		setBoardFilters(emptyBoardFilters());
		setSelectedSavedViewId(null);
		setAutoAppliedSavedViewId(null);
		setEmptyDefaultSavedViewName('');
	};

	const renderSearchResultIcon = (result: WorkspaceSearchResult) => {
		if (result.type === 'task') return <ListTodo size={15} />;
		if (result.type === 'project') return <FolderKanban size={15} />;
		if (result.type === 'chat') return <MessagesSquare size={15} />;
		if (result.type === 'file') return <Paperclip size={15} />;
		return <Users size={15} />;
	};

	const renderWorkspaceSearchResults = () => {
		if (boardFilters.search.trim().length < 2) return null;
		return (
			<div className="workflow-workspace-search-results">
				<div className="workflow-workspace-search-head">
					<span><Search size={15} />{workflow.labels.workspaceSearch ?? 'Workspace search'}</span>
					<strong>{workspaceSearchResults.length}</strong>
				</div>
				{workspaceSearchResults.slice(0, 8).map((result) => (
					<Link key={`${result.type}-${result.id}-${result.url}`} href={result.url} className="workflow-workspace-search-item">
						<span className="workflow-workspace-search-icon">{renderSearchResultIcon(result)}</span>
						<span className="min-w-0">
							<b>{result.title || (workflow.labels.untitled ?? 'Untitled')}</b>
							<small>{labelFor(result.type)} - {result.subtitle}</small>
						</span>
					</Link>
				))}
				{workspaceSearchResults.length === 0 ? (
					<p className="workflow-workspace-search-empty">{workflow.labels.noSearchResults ?? 'No results found.'}</p>
				) : null}
			</div>
		);
	};

	const renderBoardTable = () => (
		<div className="workflow-board-table-wrap">
			<table className="workflow-board-table">
				<thead>
					<tr>
						<th>{workflow.labels.task ?? 'Task'}</th>
						<th>{workflow.labels.project}</th>
						<th>{workflow.labels.assignee ?? 'Assignee'}</th>
						<th>{workflow.labels.statusLabel}</th>
						<th>{workflow.labels.review ?? 'Review'}</th>
						<th>{workflow.labels.dueDate}</th>
						<th>{workflow.labels.progress ?? 'Progress'}</th>
					</tr>
				</thead>
				<tbody>
					{filteredBoardTasks.map((taskItem) => {
						const doneItems = taskItem.checklist_items.filter((item) => item.done).length;
						const checklistTotal = taskItem.checklist_items.length;
						return (
							<tr key={taskItem.id}>
								<td>
									<button type="button" onClick={() => setSelectedTaskId(taskItem.id)} className="workflow-board-table-task">
										<b>{taskItem.title}</b>
										<span>{taskItem.labels.slice(0, 3).map((label) => label.name).join(', ') || taskItem.description || workflow.labels.noDescription}</span>
									</button>
								</td>
								<td>{taskItem.project.name}</td>
								<td>{taskItem.current_assignee ? `${taskItem.current_assignee.first_name} ${taskItem.current_assignee.last_name}` : workflow.labels.unassigned}</td>
								<td>
									<SelectField
										value={taskItem.status}
										onChange={(value) => {
											if (isTaskStatus(value)) void updateTaskStatus({ id: taskItem.id, status: value });
										}}
										options={STATUS_COLUMNS.map((status) => ({ value: status, label: labelFor(status) }))}
									/>
								</td>
								<td><Chip tone={taskItem.review_state === 'approved' ? 'progress' : taskItem.review_state === 'changes_requested' ? 'urgent' : taskItem.review_state === 'needs_review' ? 'warning' : 'neutral'}>{labelFor(taskItem.review_state)}</Chip></td>
								<td>{dateFor(taskItem.due_date)}</td>
								<td>
									<span className="workflow-board-table-progress">
										<CheckCircle2 size={13} />
										{doneItems}/{checklistTotal || 0}
									</span>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
			{filteredBoardTasks.length === 0 ? <EmptyState {...workflow.emptyStates.noTasks} /> : null}
		</div>
	);

	const renderBoardCalendar = () => {
		const calendarMonth = boardCalendarMonth ?? getCalendarSeedMonth(filteredBoardTasks);
		const calendarDays = getCalendarDays(calendarMonth);
		const calendarMonthKey = `${calendarMonth.getFullYear()}-${calendarMonth.getMonth()}`;
		const todayKey = getDateKey(new Date());
		const tasksByDueDate = filteredBoardTasks.reduce<Map<string, TaskCard[]>>((bucket, taskItem) => {
			const dueDate = parseTaskDueDate(taskItem.due_date);
			if (!dueDate) return bucket;
			const key = getDateKey(dueDate);
			bucket.set(key, [...(bucket.get(key) ?? []), taskItem]);
			return bucket;
		}, new Map());
		const unscheduledTasks = filteredBoardTasks.filter((taskItem) => !parseTaskDueDate(taskItem.due_date));
		const taskLabel = (count: number) => `${count} ${workflow.labels.moreTasks ?? 'more'}`;

		return (
			<div className="workflow-board-calendar">
				<div className="workflow-board-calendar-head">
					<button
						type="button"
						className="workflow-calendar-nav"
						aria-label={workflow.labels.previousMonth ?? 'Previous month'}
						onClick={() => setBoardCalendarMonth(addCalendarMonths(calendarMonth, -1))}
					>
						<ChevronLeft size={16} />
					</button>
					<div>
						<span><CalendarDays size={15} />{workflow.labels.calendar ?? 'Calendar'}</span>
						<strong>{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(calendarMonth)}</strong>
					</div>
					<button
						type="button"
						className="workflow-calendar-nav"
						aria-label={workflow.labels.nextMonth ?? 'Next month'}
						onClick={() => setBoardCalendarMonth(addCalendarMonths(calendarMonth, 1))}
					>
						<ChevronRight size={16} />
					</button>
				</div>
				<div className="workflow-board-calendar-weekdays">
					{calendarWeekdays.map((day) => <span key={day}>{day}</span>)}
				</div>
				<div className="workflow-board-calendar-grid">
					{calendarDays.map((day) => {
						const dayKey = getDateKey(day);
						const dayTasks = tasksByDueDate.get(dayKey) ?? [];
						const isCurrentMonth = `${day.getFullYear()}-${day.getMonth()}` === calendarMonthKey;
						return (
							<div
								key={dayKey}
								className={cn(
									'workflow-calendar-day',
									!isCurrentMonth && 'is-muted',
									dayKey === todayKey && 'is-today',
									dayTasks.some((taskItem) => taskItem.is_overdue) && 'has-overdue',
								)}
							>
								<span className="workflow-calendar-date">{formatDateFns(day, 'd')}</span>
								<div className="workflow-calendar-stack">
									{dayTasks.slice(0, 3).map((taskItem) => (
										<button
											type="button"
											key={taskItem.id}
											onClick={() => setSelectedTaskId(taskItem.id)}
											className={cn('workflow-calendar-task', taskItem.is_overdue && 'is-overdue')}
										>
											<b>{taskItem.title}</b>
											<small>{labelFor(taskItem.status)} - {labelFor(taskItem.review_state)}</small>
										</button>
									))}
									{dayTasks.length > 3 ? <em>{taskLabel(dayTasks.length - 3)}</em> : null}
								</div>
							</div>
						);
					})}
				</div>
				{unscheduledTasks.length > 0 ? (
					<div className="workflow-calendar-unscheduled">
						<div>
							<span>{workflow.labels.unscheduled ?? 'Unscheduled'}</span>
							<strong>{unscheduledTasks.length}</strong>
						</div>
						{unscheduledTasks.slice(0, 6).map((taskItem) => (
							<button type="button" key={taskItem.id} onClick={() => setSelectedTaskId(taskItem.id)}>
								<b>{taskItem.title}</b>
								<small>{taskItem.project.name}</small>
							</button>
						))}
					</div>
				) : null}
			</div>
		);
	};

	const renderBoard = () => {
		const activeBoardCount = boardDraft.filter((item) => !item.archived).length;
		const overdueBoardCount = filteredBoardTasks.filter((item) => item.is_overdue).length;
		const blockedBoardCount = filteredBoardTasks.filter((item) => item.status === 'blocked').length;
		const boardEffort = filteredBoardTasks.reduce((total, item) => total + (item.estimated_minutes || 0), 0);

		return (
			<div className="workflow-kanban-page">
				<WorkflowPageHero
					className="workflow-kanban-header"
					eyebrow={workflow.labels.workflow}
					title={variant === 'my-work' ? workflow.pageTitles['my-work'] : workflow.pageTitles.board}
					actionsWrapper={false}
					actions={
						<>
							<div className="workflow-kanban-header-metrics">
								<span>{workflow.labels.visible} <strong>{filteredBoardTasks.length}</strong></span>
								<span>{workflow.labels.overdue} <strong>{overdueBoardCount}</strong></span>
								<span>{workflow.labels.blocked} <strong>{blockedBoardCount}</strong></span>
								{isManager ? <span>{workflow.labels.estimated} <strong>{formatWorkDays(boardEffort, workflow.labels.daysUnit)}</strong></span> : null}
							</div>
							<div className="workflow-kanban-actions">
						<div className="workflow-board-segment">
							<button
								type="button"
								onClick={() => setBoardViewMode('board')}
								className={boardViewMode === 'board' ? 'is-active' : ''}
							>
								<FolderKanban size={14} />
								<span>{workflow.labels.board ?? 'Board'}</span>
							</button>
							<button
								type="button"
								onClick={() => setBoardViewMode('table')}
								className={boardViewMode === 'table' ? 'is-active' : ''}
							>
								<Table2 size={14} />
								<span>{workflow.labels.table ?? 'Table'}</span>
							</button>
							<button
								type="button"
								onClick={() => setBoardViewMode('calendar')}
								className={boardViewMode === 'calendar' ? 'is-active' : ''}
							>
								<CalendarDays size={14} />
								<span>{workflow.labels.calendar ?? 'Calendar'}</span>
							</button>
						</div>
						<button
							type="button"
							onClick={() => setBoardFiltersOpen((open) => !open)}
							className="app-pill workflow-focus-ring workflow-board-filter-toggle"
							aria-expanded={boardFiltersOpen}
						>
							<SlidersHorizontal size={16} />
							<span>{workflow.labels.search}</span>
						</button>
						<button type="button" onClick={resetBoardFilters} className="app-pill workflow-focus-ring grid h-10 w-10 place-items-center text-(--ink)" aria-label={workflow.buttons.resetFilters}>
							<RefreshCcw size={16} />
						</button>
						<div className="workflow-board-segment">
							<button
								type="button"
								onClick={() => setBoardFilters((current) => ({ ...current, archivedOnly: false }))}
								className={!boardFilters.archivedOnly ? 'is-active' : ''}
							>
								{workflow.labels.activeCards}
							</button>
							<button
								type="button"
								onClick={() => setBoardFilters((current) => ({ ...current, archivedOnly: true }))}
								className={boardFilters.archivedOnly ? 'is-active' : ''}
							>
								<Archive size={14} />
								<span>{workflow.buttons.archive}</span>
							</button>
						</div>
							</div>
						</>
					}
				/>

				<section className="workflow-kanban-toolbar" data-open={boardFiltersOpen}>
					<div className="workflow-kanban-filter-grid">
						<label className="workflow-kanban-search">
							<Search size={16} />
							<input
								id="board-search"
								value={boardFilters.search}
								onChange={(event) => setBoardFilters((current) => ({ ...current, search: event.target.value }))}
								placeholder={workflow.labels.taskProjectDescription}
							/>
						</label>
						<SelectField
							value={boardFilters.project}
							onChange={(value) => setBoardFilters((current) => ({ ...current, project: value }))}
							options={[
								{ value: '', label: workflow.labels.allProjects },
								...projects.map((item) => ({ value: item.id, label: item.name })),
							]}
							startIcon={<FolderKanban size={16} />}
						/>
						<SelectField
							value={boardFilters.status}
							onChange={(value) => setBoardFilters((current) => ({ ...current, status: value }))}
							options={[
								{ value: '', label: workflow.labels.allStatuses },
								...STATUS_COLUMNS.map((item) => ({ value: item, label: labelFor(item) })),
							]}
							startIcon={<ListTodo size={16} />}
						/>
						<SelectField
							value={boardFilters.priority}
							onChange={(value) => setBoardFilters((current) => ({ ...current, priority: value }))}
							options={[
								{ value: '', label: workflow.labels.allPriorities },
								...PRIORITY_OPTIONS.map((item) => ({ value: item, label: labelFor(item) })),
							]}
							startIcon={<CircleAlert size={16} />}
						/>
						<SelectField
							value={boardFilters.assignee}
							onChange={(value) => setBoardFilters((current) => ({ ...current, assignee: value }))}
							options={[
								{ value: '', label: usersLoading ? workflow.labels.loading : workflow.labels.allAssignees },
								...users.map((item) => ({
									value: item.id,
									label: `${item.first_name} ${item.last_name}`,
								})),
							]}
							startIcon={<Users size={16} />}
						/>
						<SelectField
							value={boardFilters.reviewState}
							onChange={(value) => setBoardFilters((current) => ({ ...current, reviewState: value as BoardFiltersState['reviewState'] }))}
							options={[
								{ value: '', label: workflow.labels.allReviews ?? 'All reviews' },
								...REVIEW_STATE_OPTIONS.map((item) => ({ value: item, label: labelFor(item) })),
							]}
							startIcon={<ShieldCheck size={16} />}
						/>
						<SelectField
							value={boardFilters.sort}
							onChange={(value) => setBoardFilters((current) => ({ ...current, sort: value }))}
							options={[
								{ value: 'sort_order', label: workflow.labels.manualOrder ?? 'Manual order' },
								{ value: 'due_date', label: workflow.labels.dueDateAsc ?? 'Due date ascending' },
								{ value: '-due_date', label: workflow.labels.dueDateDesc ?? 'Due date descending' },
								{ value: '-priority', label: workflow.labels.priorityDesc ?? 'Priority high first' },
								{ value: '-updated_at', label: workflow.labels.recentlyUpdated ?? 'Recently updated' },
								{ value: 'title', label: workflow.labels.titleAsc ?? 'Title A-Z' },
							]}
							startIcon={<SlidersHorizontal size={16} />}
						/>
					</div>
					<div className="workflow-kanban-toggles">
						<ToggleField label={workflow.labels.overdueOnly} checked={boardFilters.overdueOnly} onChange={(checked) => setBoardFilters((current) => ({ ...current, overdueOnly: checked }))} />
						<ToggleField label={workflow.labels.blockedOnly} checked={boardFilters.blockedOnly} onChange={(checked) => setBoardFilters((current) => ({ ...current, blockedOnly: checked }))} />
						<Chip tone="neutral">{workflow.labels.active} {activeBoardCount}</Chip>
					</div>
					<div className="workflow-saved-view-bar">
						<SelectField
							value={selectedSavedViewId ? String(selectedSavedViewId) : ''}
							onChange={(value) => {
								const view = savedViews.find((item) => String(item.id) === value);
								if (view) applySavedView(view);
								if (!value) setSelectedSavedViewId(null);
							}}
							options={[
								{ value: '', label: workflow.labels.savedViews ?? 'Saved views' },
								...savedViews.map((view) => ({
									value: view.id,
									label: `${view.is_default ? '* ' : ''}${view.name}${view.visibility === 'team' ? ` - ${workflow.labels.team ?? 'Team'}` : ''}`,
								})),
							]}
							startIcon={<Bookmark size={16} />}
						/>
						<input
							value={savedViewName}
							onChange={(event) => setSavedViewName(event.target.value)}
							placeholder={workflow.labels.saveViewName ?? 'View name'}
							className="app-input"
						/>
						<SelectField
							value={savedViewVisibility}
							onChange={(value) => setSavedViewVisibility(value === 'team' && isManager ? 'team' : 'private')}
							options={[
								{ value: 'private', label: workflow.labels.privateView ?? 'Private' },
								...(isManager ? [{ value: 'team', label: workflow.labels.teamView ?? 'Team' }] : []),
							]}
						/>
						<button type="button" className="app-button" disabled={!savedViewName.trim() || createSavedViewState.isLoading} onClick={() => void saveBoardView()}>
							<Save size={15} />
							<span>{workflow.buttons.save ?? 'Save'}</span>
						</button>
						{selectedSavedViewId ? (
							<>
								<button type="button" className="app-button app-button-secondary" onClick={() => void markCurrentViewDefault()}>
									<Bookmark size={15} />
									<span>{workflow.buttons.setDefault ?? 'Default'}</span>
								</button>
								<button type="button" className="app-button app-button-ghost" onClick={() => void deleteCurrentSavedView()}>
									<Trash2 size={15} />
									<span>{workflow.buttons.delete ?? 'Delete'}</span>
								</button>
							</>
						) : null}
					</div>
					{renderWorkspaceSearchResults()}
				</section>
				{emptyDefaultSavedViewName ? (
					<div className="workflow-board-view-notice" role="status">
						<Bookmark size={16} />
						<span className="workflow-board-view-notice-copy">
							<b>{workflow.labels.emptyDefaultViewSkipped ?? 'Default saved view is empty. Showing all active cards.'}</b>
							<small>{emptyDefaultSavedViewName}</small>
						</span>
					</div>
				) : null}

				<section className="workflow-board-surface overflow-x-auto">
					{tasksBusy ? (
						<EmptyState {...workflow.emptyStates.loadingBoard} />
					) : boardViewMode === 'table' ? (
						renderBoardTable()
					) : boardViewMode === 'calendar' ? (
						renderBoardCalendar()
					) : (
						<div className="workflow-board-layout">
							<DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
								<div className="workflow-board-lanes flex gap-4 overflow-x-auto pb-2">
									{tasksByStatus.map((column) => (
										<BoardColumn
											key={column.status}
											status={column.status}
											tasks={column.tasks}
											copy={workflow}
											labelFor={labelFor}
											dateFor={dateFor}
											onOpen={setSelectedTaskId}
											onArchive={handleArchiveTask}
											quickAddOpen={quickAddColumn === column.status}
											quickAddTitle={quickAddColumn === column.status ? quickAddTitle : ''}
											quickAddProjectName={quickAddProject?.name}
											quickAddLoading={createTaskState.isLoading && quickAddColumn === column.status}
											canQuickAdd={variant === 'board' && Boolean(quickAddProject)}
											onQuickAddOpen={(nextStatus) => {
												setQuickAddColumn(nextStatus);
												setQuickAddTitle('');
											}}
											onQuickAddTitleChange={setQuickAddTitle}
											onQuickAddSubmit={handleQuickAddTask}
											onQuickAddCancel={() => {
												setQuickAddColumn(null);
												setQuickAddTitle('');
											}}
											showTime={isManager}
										/>
									))}
								</div>
								<DragOverlay style={{ pointerEvents: 'none' }}>
									{draggedTaskId ? (
										<div className="w-[260px] rotate-1 shadow-(--shadow-lg)">
											<TaskCardItem task={boardDraft.find((item) => item.id === draggedTaskId)!} compact copy={workflow} labelFor={labelFor} dateFor={dateFor} variant="board" showTime={isManager} />
										</div>
									) : null}
								</DragOverlay>
							</DndContext>
						</div>
					)}
					{updateStatusState.isError || reorderTasksState.isError ? (
						<div className="mt-4 rounded-lg border border-[color:var(--accent)] bg-(--accent-soft) px-4 py-3 text-sm font-semibold text-(--accent-strong)">
							{t.errors.unexpectedError}
						</div>
					) : null}
				</section>
			</div>
		);
	};

	const renderProjects = () => {
		const activeProjectCount = projects.filter((item) => item.status === 'active').length;
		const totalProjectOpenTasks = projects.reduce((total, item) => total + item.open_tasks_count, 0);
		const totalProjectMinutes = projects.reduce((total, item) => total + item.total_logged_minutes, 0);

		return (
		<div className="workflow-projects-page">
			<WorkflowPageHero
				className="workflow-projects-header"
				eyebrow={workflow.labels.workflow}
				title={workflow.pageTitles.projects}
				actionsClassName="workflow-projects-actions"
				actions={
					<>
						<span>{workflow.labels.projects} {projects.length}</span>
						<span>{workflow.labels.active} {activeProjectCount}</span>
						<span>{workflow.labels.open} {totalProjectOpenTasks}</span>
					</>
				}
			/>

			<section className="workflow-projects-metrics">
				<MetricCard icon={<FolderKanban size={16} />} label={workflow.labels.projects} value={projects.length} tone="indigo" />
				<MetricCard icon={<CheckCircle2 size={16} />} label={workflow.labels.active} value={activeProjectCount} tone="green" />
				<MetricCard icon={<ListTodo size={16} />} label={workflow.labels.openTasksLabel} value={totalProjectOpenTasks} tone="amber" />
				<MetricCard icon={<Clock3 size={16} />} label={workflow.labels.logged} value={formatMinutes(totalProjectMinutes)} tone="green" />
			</section>

			<div className={isManager ? 'workflow-projects-layout' : 'workflow-projects-layout workflow-projects-layout-single'}>
			{isManager ? (
				<section className="workflow-projects-create workflow-overview-panel" data-tone="indigo">
					<WorkflowPanelPill label={workflow.sections.createProject.title} value="+" />
					<p className="workflow-overview-panel-copy">{workflow.sections.createProject.description}</p>
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<FieldLabel htmlFor="project-name">{workflow.labels.projectName}</FieldLabel>
							<Field id="project-name" value={projectForm.name} onChange={(value) => setProjectForm((current) => ({ ...current, name: value }))} placeholder={workflow.labels.landingPlaceholder} startIcon={<BriefcaseBusiness size={18} />} />
						</div>
						<div>
							<FieldLabel>{workflow.labels.manager}</FieldLabel>
							<SelectField
								value={String(projectForm.manager_id)}
								onChange={(value) => setProjectForm((current) => ({ ...current, manager_id: Number(value) }))}
								options={[
									{ value: 0, label: usersLoading ? workflow.labels.loadingManagers : workflow.labels.selectManager },
									...managerUsers.map((user) => ({ value: user.id, label: userOptionLabel(user) })),
								]}
								startIcon={<ShieldCheck size={18} />}
							/>
							<details className="workflow-projects-manager-note">
								<summary>{workflow.labels.roleHelp}</summary>
								<p>{workflow.labels.managerHelp}</p>
							</details>
						</div>
						<div className="md:col-span-2">
							<FieldLabel>{workflow.labels.description}</FieldLabel>
							<Area value={projectForm.description} onChange={(value) => setProjectForm((current) => ({ ...current, description: value }))} placeholder={workflow.labels.shortProjectContext} startIcon={<MessagesSquare size={18} />} />
						</div>
						<div>
							<FieldLabel>{workflow.labels.startDate}</FieldLabel>
							<DateField value={projectForm.start_date ?? ''} onChange={(value) => setProjectForm((current) => ({ ...current, start_date: value }))} />
						</div>
						<div>
							<FieldLabel>{workflow.labels.targetEnd}</FieldLabel>
							<DateField value={projectForm.target_end_date ?? ''} onChange={(value) => setProjectForm((current) => ({ ...current, target_end_date: value }))} />
						</div>
						<div>
							<FieldLabel>{workflow.labels.priority}</FieldLabel>
							<SelectField
								value={projectForm.priority ?? 'medium'}
								onChange={(value) => setProjectForm((current) => ({ ...current, priority: value as ProjectSummary['priority'] }))}
								options={PRIORITY_OPTIONS.map((item) => ({ value: item, label: labelFor(item) }))}
								startIcon={<CircleAlert size={18} />}
							/>
						</div>
						<div>
							<FieldLabel>{workflow.labels.status}</FieldLabel>
							<SelectField
								value={projectForm.status ?? 'planned'}
								onChange={(value) => setProjectForm((current) => ({ ...current, status: value as ProjectSummary['status'] }))}
								options={PROJECT_STATUS_OPTIONS.map((item) => ({ value: item, label: labelFor(item) }))}
								startIcon={<ListTodo size={18} />}
							/>
						</div>
					</div>
					<div className="mt-5">
						<button
							type="button"
							onClick={async () => {
								await createProject(buildProjectPayload(projectForm)).unwrap();
								setProjectForm(emptyProjectForm(profile.id));
							}}
							disabled={!projectForm.name.trim() || !projectForm.manager_id}
							className="app-button"
						>
							<Plus size={16} />
							<span>{createProjectState.isLoading ? workflow.buttons.creating : workflow.buttons.createProject}</span>
						</button>
					</div>
					{createProjectState.isError ? (
						<div className="mt-4 rounded-lg border border-[color:var(--accent)] bg-(--accent-soft) px-4 py-3 text-sm text-(--accent-strong)">
							{getApiErrorMessage(createProjectState.error, t.errors.unexpectedError)}
						</div>
					) : null}
				</section>
			) : null}

			<section className="workflow-projects-list workflow-overview-panel" data-tone="green">
				<WorkflowPanelPill label={workflow.sections.projects.title} value={projects.length} />
				<p className="workflow-overview-panel-copy">{workflow.sections.projects.description}</p>
				{projectsBusy ? (
					<EmptyState {...workflow.emptyStates.loadingProjects} />
				) : (
					<div className="workflow-projects-card-grid">
						{projects.map((item) => (
							<article key={item.id} className="workflow-project-card-modern" data-status={item.status}>
								<div className="workflow-project-card-pill">
									<b>{item.name}</b>
									<em>{labelFor(item.status)}</em>
								</div>
								<div className="workflow-project-card-main">
									<div className="min-w-0">
										<p>{item.description || workflow.labels.noDescription}</p>
										<span>{item.manager.first_name} {item.manager.last_name}</span>
									</div>
									<AvatarBadge user={item.manager} size={34} />
								</div>
								<div className="workflow-project-card-stats">
									<span><b>{workflow.labels.open}</b><strong><FolderKanban size={13} />{item.open_tasks_count}</strong></span>
									<span><b>{workflow.labels.logged}</b><strong><Clock3 size={13} />{formatMinutes(item.total_logged_minutes)}</strong></span>
									<span><b>{workflow.labels.target}</b><strong><CalendarDays size={13} />{dateFor(item.target_end_date)}</strong></span>
								</div>
								<div className="mt-4 flex items-center justify-between gap-3">
									<Chip>{labelFor(item.priority)}</Chip>
									<Link href={DASHBOARD_PROJECT_VIEW(item.id)} className="workflow-project-card-open">
										<span>{workflow.buttons.open}</span>
										<ArrowRight size={16} />
									</Link>
								</div>
							</article>
						))}
						{projects.length === 0 ? <EmptyState {...workflow.emptyStates.noProjects} /> : null}
					</div>
				)}
			</section>
			</div>
		</div>
		);
	};

	const renderProjectDetail = () => {
		if (projectBusy) {
			return <EmptyState {...workflow.emptyStates.loadingProject} />;
		}

		if (!project) {
			return <EmptyState {...workflow.emptyStates.missingProject} />;
		}

		const pageSize = 4;
		const projectTasksTotalPages = Math.max(1, Math.ceil(project.tasks.length / pageSize));
		const commentsTotalPages = Math.max(1, Math.ceil(project.recent_comments.length / pageSize));
		const activityTotalPages = Math.max(1, Math.ceil(project.recent_activity.length / pageSize));
		const projectTasksCurrentPage = Math.min(projectTasksPage, projectTasksTotalPages);
		const projectCommentsCurrentPage = Math.min(projectCommentsPage, commentsTotalPages);
		const projectActivityCurrentPage = Math.min(projectActivityPage, activityTotalPages);
		const pagedTasks = project.tasks.slice((projectTasksCurrentPage - 1) * pageSize, projectTasksCurrentPage * pageSize);
		const pagedComments = project.recent_comments.slice((projectCommentsCurrentPage - 1) * pageSize, projectCommentsCurrentPage * pageSize);
		const pagedActivity = project.recent_activity.slice((projectActivityCurrentPage - 1) * pageSize, projectActivityCurrentPage * pageSize);

		return (
			<div className="workflow-project-detail-page">
				<WorkflowPageHero
					className="workflow-project-detail-header"
					eyebrow={workflow.labels.workflow}
					title={project.name}
					actionsClassName="workflow-projects-actions"
					actions={
						<>
							<span>{labelFor(project.status)}</span>
							<span>{project.open_tasks_count} {workflow.labels.openTasks}</span>
							<span>{formatMinutes(project.total_logged_minutes)} {workflow.labels.loggedSuffix}</span>
						</>
					}
				/>

				<div className="workflow-project-detail-grid">
					<section className="workflow-project-detail-panel workflow-project-detail-panel-main" data-tone="indigo">
						<div className="workflow-overview-panel-pill">
							<b>{workflow.sections.projectSnapshot.title}</b>
							<em><FolderKanban size={13} /></em>
						</div>
						<p className="workflow-project-detail-description">{project.description || workflow.labels.noDescription}</p>
						<div className="workflow-project-detail-meta">
							<div className="workflow-project-detail-meta-card">
								<span>{workflow.labels.manager}</span>
								<div className="mt-3 flex items-center gap-3">
									<AvatarBadge user={project.manager} size={34} />
									<p>{project.manager.first_name} {project.manager.last_name}</p>
								</div>
							</div>
							<div className="workflow-project-detail-meta-card">
								<span>{workflow.labels.start}</span>
								<p><CalendarDays size={15} />{dateFor(project.start_date)}</p>
							</div>
							<div className="workflow-project-detail-meta-card">
								<span>{workflow.labels.target}</span>
								<p><Clock3 size={15} />{dateFor(project.target_end_date)}</p>
							</div>
						</div>
					</section>

					{isManager ? (
						<section className="workflow-project-detail-panel workflow-project-detail-edit" data-tone="blue">
							<div className="workflow-overview-panel-pill">
								<b>{workflow.sections.editProject.title}</b>
								<em><Pencil size={13} /></em>
							</div>
							<div className="mt-4 grid gap-4 md:grid-cols-2">
								<div>
									<FieldLabel>{workflow.labels.name}</FieldLabel>
									<Field value={projectEditForm.name} onChange={(value) => setProjectEditForm((current) => ({ ...current, name: value }))} startIcon={<BriefcaseBusiness size={18} />} />
								</div>
								<div>
									<FieldLabel>{workflow.labels.manager}</FieldLabel>
									<SelectField
										value={String(projectEditForm.manager_id)}
										onChange={(value) => setProjectEditForm((current) => ({ ...current, manager_id: Number(value) }))}
										options={managerUsers.map((user) => ({ value: user.id, label: userOptionLabel(user) }))}
										startIcon={<ShieldCheck size={18} />}
									/>
								</div>
								<div className="md:col-span-2">
									<FieldLabel>{workflow.labels.description}</FieldLabel>
									<Area value={projectEditForm.description} onChange={(value) => setProjectEditForm((current) => ({ ...current, description: value }))} startIcon={<MessagesSquare size={18} />} />
								</div>
								<div>
									<FieldLabel>{workflow.labels.priority}</FieldLabel>
									<SelectField
										value={projectEditForm.priority ?? 'medium'}
										onChange={(value) => setProjectEditForm((current) => ({ ...current, priority: value as ProjectSummary['priority'] }))}
										options={PRIORITY_OPTIONS.map((item) => ({ value: item, label: labelFor(item) }))}
										startIcon={<CircleAlert size={18} />}
									/>
								</div>
								<div>
									<FieldLabel>{workflow.labels.status}</FieldLabel>
									<SelectField
										value={projectEditForm.status ?? 'planned'}
										onChange={(value) => setProjectEditForm((current) => ({ ...current, status: value as ProjectSummary['status'] }))}
										options={PROJECT_STATUS_OPTIONS.map((item) => ({ value: item, label: labelFor(item) }))}
										startIcon={<ListTodo size={18} />}
									/>
								</div>
								<div>
									<FieldLabel>{workflow.labels.startDate}</FieldLabel>
									<DateField value={projectEditForm.start_date ?? ''} onChange={(value) => setProjectEditForm((current) => ({ ...current, start_date: value }))} />
								</div>
								<div>
									<FieldLabel>{workflow.labels.targetEnd}</FieldLabel>
									<DateField value={projectEditForm.target_end_date ?? ''} onChange={(value) => setProjectEditForm((current) => ({ ...current, target_end_date: value }))} />
								</div>
							</div>
							<div className="mt-5">
								<button
									type="button"
									onClick={() => updateProject({ id: project.id, data: buildProjectPayload(projectEditForm) })}
									className="app-button"
								>
									<Pencil size={16} />
									<span>{updateProjectState.isLoading ? workflow.buttons.saving : workflow.buttons.saveProject}</span>
								</button>
							</div>
						</section>
					) : null}

					<section className="workflow-project-detail-panel workflow-project-detail-tasks" data-tone="green">
						<div className="workflow-overview-panel-pill">
							<b>{workflow.sections.projectTasks.title}</b>
							<em>{project.tasks.length}</em>
						</div>
						<div className="workflow-project-detail-task-grid mt-4">
							{pagedTasks.map((taskItem) => (
								<TaskCardItem key={taskItem.id} task={taskItem} copy={workflow} labelFor={labelFor} dateFor={dateFor} onOpen={setSelectedTaskId} onArchive={handleArchiveTask} showTime={isManager} />
							))}
							{project.tasks.length === 0 ? <EmptyState {...workflow.emptyStates.noTasks} /> : null}
						</div>
						<div className="workflow-project-detail-pager mt-4">
							<button type="button" aria-label={workflow.buttons.previous} disabled={projectTasksCurrentPage <= 1} onClick={() => setProjectTasksPage((page) => Math.max(1, page - 1))}>
								<ChevronLeft size={16} />
							</button>
							<span>{projectTasksCurrentPage}/{projectTasksTotalPages}</span>
							<button type="button" aria-label={workflow.buttons.next} disabled={projectTasksCurrentPage >= projectTasksTotalPages} onClick={() => setProjectTasksPage((page) => Math.min(projectTasksTotalPages, page + 1))}>
								<ChevronRight size={16} />
							</button>
						</div>
					</section>

					<section className="workflow-project-detail-panel workflow-project-detail-create" data-tone="cyan">
						<div className="workflow-overview-panel-pill">
							<b>{workflow.sections.createTask.title}</b>
							<em>+</em>
						</div>
						<div className="mt-4 grid gap-4 md:grid-cols-2">
						<div>
							<FieldLabel htmlFor="task-title">{workflow.labels.taskTitle}</FieldLabel>
							<Field id="task-title" value={taskForm.title} onChange={(value) => setTaskForm((current) => ({ ...current, title: value }))} placeholder={workflow.labels.taskTitlePlaceholder} startIcon={<ListTodo size={18} />} />
						</div>
						<div>
							<FieldLabel htmlFor="task-assignee">{workflow.labels.assignee}</FieldLabel>
							<SelectField
								id="task-assignee"
								value={taskForm.current_assignee_id}
								onChange={(value) => setTaskForm((current) => ({ ...current, current_assignee_id: value }))}
								options={[
									{ value: '', label: usersLoading ? workflow.labels.loading : workflow.labels.unassigned },
									...users.map((user) => ({ value: user.id, label: `${user.first_name} ${user.last_name}` })),
								]}
								startIcon={<Users size={18} />}
							/>
						</div>
						<div className="md:col-span-2">
							<FieldLabel>{workflow.labels.description}</FieldLabel>
							<Area value={taskForm.description} onChange={(value) => setTaskForm((current) => ({ ...current, description: value }))} startIcon={<MessagesSquare size={18} />} />
						</div>
						<div>
							<FieldLabel>{workflow.labels.status}</FieldLabel>
							<SelectField
								value={taskForm.status}
								onChange={(value) => setTaskForm((current) => ({ ...current, status: value as TaskStatus }))}
								options={STATUS_COLUMNS.map((item) => ({ value: item, label: labelFor(item) }))}
								startIcon={<ListTodo size={18} />}
							/>
						</div>
						<div>
							<FieldLabel>{workflow.labels.priority}</FieldLabel>
							<SelectField
								value={taskForm.priority}
								onChange={(value) => setTaskForm((current) => ({ ...current, priority: value as TaskCard['priority'] }))}
								options={PRIORITY_OPTIONS.map((item) => ({ value: item, label: labelFor(item) }))}
								startIcon={<CircleAlert size={18} />}
							/>
						</div>
						<div>
							<FieldLabel>{workflow.labels.dueDate}</FieldLabel>
							<DateField value={taskForm.due_date} onChange={(value) => setTaskForm((current) => ({ ...current, due_date: value }))} />
						</div>
						{isManager ? (
							<div>
								<FieldLabel>{workflow.labels.estimatedMinutes}</FieldLabel>
								<WorkDaysField value={taskForm.estimated_minutes} onChange={(value) => setTaskForm((current) => ({ ...current, estimated_minutes: value }))} />
							</div>
						) : null}
					</div>
					<div className="mt-5">
						<button
							type="button"
							onClick={async () => {
								await createTask(buildTaskPayload(project.id, taskForm, { includeTime: isManager })).unwrap();
								setTaskForm(emptyTaskForm());
							}}
							disabled={!taskForm.title.trim()}
							className="app-button"
						>
							<Plus size={16} />
							<span>{createTaskState.isLoading ? workflow.buttons.creating : workflow.buttons.createTask}</span>
						</button>
					</div>
					</section>

					<section className="workflow-project-detail-panel workflow-project-detail-comments" data-tone="amber">
						<div className="workflow-overview-panel-pill">
							<b>{workflow.sections.recentComments.title}</b>
							<em>{project.recent_comments.length}</em>
						</div>
						<div className="workflow-project-detail-feed mt-4">
							{pagedComments.map((comment) => (
								<div key={comment.id} className="workflow-project-detail-feed-item">
									<AvatarBadge user={comment.author} size={34} />
									<div className="min-w-0">
										<p>{comment.author.first_name} {comment.author.last_name}</p>
										<span>{comment.body}</span>
										<small>{comment.task_title} - {dateTimeFor(comment.created_at)}</small>
									</div>
								</div>
							))}
							{project.recent_comments.length === 0 ? <EmptyState {...workflow.emptyStates.noComments} /> : null}
							<div className="workflow-project-detail-pager">
								<button type="button" aria-label={workflow.buttons.previous} disabled={projectCommentsCurrentPage <= 1} onClick={() => setProjectCommentsPage((page) => Math.max(1, page - 1))}>
									<ChevronLeft size={16} />
								</button>
								<span>{projectCommentsCurrentPage}/{commentsTotalPages}</span>
								<button type="button" aria-label={workflow.buttons.next} disabled={projectCommentsCurrentPage >= commentsTotalPages} onClick={() => setProjectCommentsPage((page) => Math.min(commentsTotalPages, page + 1))}>
									<ChevronRight size={16} />
								</button>
							</div>
						</div>
					</section>

					<section className="workflow-project-detail-panel workflow-project-detail-activity" data-tone="rose">
						<div className="workflow-overview-panel-pill">
							<b>{workflow.sections.recentActivity.title}</b>
							<em>{project.recent_activity.length}</em>
						</div>
						<div className="workflow-project-detail-feed mt-4">
							{pagedActivity.map((activity) => (
								<div key={activity.id} className="workflow-project-detail-feed-item">
									<div className="workflow-project-detail-feed-icon"><Bell size={15} /></div>
									<div className="min-w-0">
										<p>{activity.actor ? `${activity.actor.first_name} ${activity.actor.last_name}` : workflow.labels.system}</p>
										<span>{describeWorkflowActivity(activity)}</span>
										<small>{activity.task_title} - {dateTimeFor(activity.created_at)}</small>
									</div>
								</div>
							))}
							{project.recent_activity.length === 0 ? <EmptyState {...workflow.emptyStates.noActivity} /> : null}
							<div className="workflow-project-detail-pager">
								<button type="button" aria-label={workflow.buttons.previous} disabled={projectActivityCurrentPage <= 1} onClick={() => setProjectActivityPage((page) => Math.max(1, page - 1))}>
									<ChevronLeft size={16} />
								</button>
								<span>{projectActivityCurrentPage}/{activityTotalPages}</span>
								<button type="button" aria-label={workflow.buttons.next} disabled={projectActivityCurrentPage >= activityTotalPages} onClick={() => setProjectActivityPage((page) => Math.min(activityTotalPages, page + 1))}>
									<ChevronRight size={16} />
								</button>
							</div>
						</div>
					</section>
				</div>
			</div>
		);
	};

	const renderTaskDetail = () => {
		if (taskBusy) {
			return <EmptyState {...workflow.emptyStates.loadingTask} />;
		}
		if (!task) {
			return <EmptyState {...workflow.emptyStates.missingTask} />;
		}
		const taskPageSize = 5;
		const visibleTaskActivity = isManager ? task.recent_activity : task.recent_activity.filter((activity) => activity.action_type !== 'time_logged');
		const taskCommentsTotalPages = Math.max(1, Math.ceil(task.comments.length / taskPageSize));
		const taskTimeEntriesTotalPages = Math.max(1, Math.ceil(task.time_entries.length / taskPageSize));
		const taskActivityTotalPages = Math.max(1, Math.ceil(visibleTaskActivity.length / taskPageSize));
		const pagedTaskComments = task.comments.slice((taskCommentsPage - 1) * taskPageSize, taskCommentsPage * taskPageSize);
		const pagedTaskTimeEntries = task.time_entries.slice((taskTimeEntriesPage - 1) * taskPageSize, taskTimeEntriesPage * taskPageSize);
		const pagedTaskActivity = visibleTaskActivity.slice((taskActivityPage - 1) * taskPageSize, taskActivityPage * taskPageSize);
		const coverInputId = `task-cover-${task.id}`;
		const attachmentInputId = `task-attachment-${task.id}`;
		const checklistGroups: TaskChecklistGroup[] = (task.checklists ?? []).length > 0
			? task.checklists
			: task.checklist_items.length > 0
				? [{
						id: 0,
						title: workflow.labels.checklistPanel ?? 'Checklist',
						sort_order: 0,
						items: task.checklist_items,
					}]
				: [];
		const checklistDoneCount = checklistGroups.reduce((total, group) => total + group.items.filter((item) => item.done).length, 0);
		const checklistItemsCount = checklistGroups.reduce((total, group) => total + group.items.length, 0);
		const checklistProgress = checklistItemsCount ? (checklistDoneCount / checklistItemsCount) * 100 : 0;
		const taskDueDelivery = getDueDeliveryInfo(task, workflow.labels);
		const showLabelsPanel = task.labels.length > 0 || taskAddPanel === 'labels';
		const showChecklistPanel = checklistGroups.length > 0 || taskAddPanel === 'checklist';
		const showAttachmentsPanel = task.attachments.length > 0 || task.cover_image_url || taskAddPanel === 'attachments' || taskAddPanel === 'cover';
		const modalHasLabels = task.labels.length > 0;
		const modalHasDates = Boolean(task.due_date);
		const modalHasChecklist = checklistGroups.length > 0;
		const modalHasAttachments = task.attachments.length > 0 || Boolean(task.cover_image_url);
		const checklistTemplates = getChecklistTemplates(workflow.labels);
		const activeChecklistTemplate = checklistTemplates.find((template) => template.key === selectedChecklistTemplate);
		const selectChecklistTemplate = (template: ChecklistTemplate) => {
			if (selectedChecklistTemplate === template.key) {
				setSelectedChecklistTemplate('');
				return;
			}
			setSelectedChecklistTemplate(template.key);
			setNewChecklistGroupTitle(template.title);
		};
		const createChecklistForTask = async () => {
			const title = newChecklistGroupTitle.trim() || activeChecklistTemplate?.title || (workflow.labels.checklistPanel ?? 'Checklist');
			const checklist = await addChecklist({ id: task.id, title, sort_order: checklistGroups.length }).unwrap();
			if (activeChecklistTemplate) {
				for (const [index, itemTitle] of activeChecklistTemplate.items.entries()) {
					await addChecklistItem({
						id: task.id,
						checklist_id: checklist.id,
						title: itemTitle,
						sort_order: index,
					}).unwrap();
				}
			}
			setNewChecklistGroupTitle('');
			setSelectedChecklistTemplate('');
			setTaskAddPanel(null);
		};
		const addChecklistItemToGroup = async (group: TaskChecklistGroup) => {
			const key = String(group.id);
			const title = (newChecklistItemsByChecklist[key] ?? '').trim();
			if (!title) return;
			await addChecklistItem({
				id: task.id,
				checklist_id: group.id > 0 ? group.id : undefined,
				title,
				sort_order: group.items.length,
			}).unwrap();
			setNewChecklistItemsByChecklist((current) => ({ ...current, [key]: '' }));
		};
		const addOptions = [
			{ key: 'labels' as const, icon: <Tag size={18} />, title: workflow.labels.labelsPanel ?? 'Labels', body: workflow.labels.addLabelsHint ?? 'Organize and classify this card.' },
			{ key: 'checklist' as const, icon: <CheckCircle2 size={18} />, title: workflow.labels.checklistPanel ?? 'Checklist', body: workflow.labels.addChecklistHint ?? 'Add subtasks and track progress.' },
			{ key: 'cover' as const, icon: <ImagePlus size={18} />, title: workflow.labels.cardImage ?? 'Card image', body: workflow.labels.addCoverHint ?? 'Add a visual cover to this card.' },
			{ key: 'attachments' as const, icon: <Paperclip size={18} />, title: workflow.labels.attachmentsPanel ?? 'Attachments', body: workflow.labels.addAttachmentsHint ?? 'Attach files, briefs, and links.' },
			{ key: 'members' as const, icon: <Users size={18} />, title: workflow.labels.membersPanel ?? 'Members', body: workflow.labels.addMembersHint ?? 'Assign or reassign the card.' },
		];
		const detailTabs: Array<{ key: TaskDetailTab; label: string; icon: ReactNode }> = [
			{ key: 'overview', label: workflow.labels.overview ?? 'Overview', icon: <ListTodo size={16} /> },
			{ key: 'review', label: workflow.labels.review ?? 'Review', icon: <ShieldCheck size={16} /> },
			{ key: 'files', label: workflow.labels.files ?? 'Files', icon: <Paperclip size={16} /> },
			{ key: 'activity', label: workflow.sections.activity.title, icon: <MessagesSquare size={16} /> },
			{ key: 'time', label: workflow.sections.timeEntries.title, icon: <Clock3 size={16} /> },
		];
		const selectedAnnotationAttachment = task.attachments.find((attachment) => attachment.id === selectedAnnotationAttachmentId) ?? task.attachments[0] ?? null;
		const selectedAnnotationAttachmentUrl = selectedAnnotationAttachment
			? resolveMediaUrl(selectedAnnotationAttachment.file_url ?? selectedAnnotationAttachment.file)
			: '';
		const selectedAnnotationVersionOptions = task.artifact_versions.filter(
			(version) => !selectedAnnotationAttachment || !version.attachment || version.attachment.id === selectedAnnotationAttachment.id,
		);
		const handoffTemplate = checklistTemplates.find((template) => template.key === 'delivery');
		const reviewTone: 'urgent' | 'progress' | 'neutral' | 'warning' =
			task.review_state === 'approved'
				? 'progress'
				: task.review_state === 'changes_requested'
					? 'urgent'
					: task.review_state === 'needs_review'
						? 'warning'
						: 'neutral';
		const sourceChatHref = task.source_chat_thread_id
			? `${DASHBOARD_CHAT}?thread=${task.source_chat_thread_id}${task.source_chat_message_id ? `&message=${task.source_chat_message_id}` : ''}`
			: DASHBOARD_CHAT;
		const renderSourceChatLink = (mode: 'modal' | 'detail') => {
			if (!task.source_chat_message_id) return null;
			return (
				<section className={mode === 'modal' ? 'workflow-trello-modal-section workflow-trello-modal-section-compact' : 'workflow-source-chat-card'}>
					<div className={mode === 'modal' ? 'workflow-trello-modal-section-head' : 'workflow-source-chat-card-head'}>
						<MessagesSquare size={18} />
						<h3>{workflow.labels.sourceChatMessage ?? 'Source chat message'}</h3>
					</div>
					<p>{workflow.labels.sourceChatHint ?? 'This task was created from a chat decision.'}</p>
					<Link href={sourceChatHref} className={mode === 'modal' ? 'workflow-trello-modal-save' : 'app-button app-button-secondary'}>
						<ArrowRight size={15} />
						<span>{workflow.buttons.openSourceChat ?? 'Open source chat'}</span>
					</Link>
				</section>
			);
		};
		const submitReviewUpdate = async (reviewState: TaskDetail['review_state']) => {
			await updateTaskReview({
				id: task.id,
				review_state: reviewState,
				notes: reviewNotes.trim() || undefined,
			}).unwrap();
			setReviewNotes('');
		};
		const submitArtifactVersion = async () => {
			await createTaskVersion({
				id: task.id,
				attachment_id: versionAttachmentId ? Number(versionAttachmentId) : null,
				notes: versionNotes.trim(),
				approval_state: versionApprovalState,
			}).unwrap();
			setVersionNotes('');
			setVersionApprovalState('pending');
		};
		const submitAnnotation = async () => {
			if (!selectedAnnotationAttachment || !annotationBody.trim()) return;
			await createAttachmentAnnotation({
				attachmentId: selectedAnnotationAttachment.id,
				version_id: annotationVersionId ? Number(annotationVersionId) : null,
				x_percent: annotationX || '50',
				y_percent: annotationY || '50',
				body: annotationBody.trim(),
				resolved: annotationResolved,
			}).unwrap();
			setAnnotationBody('');
			setAnnotationResolved(false);
		};
		const createHandoffChecklist = async () => {
			if (!handoffTemplate) return;
			const checklist = await addChecklist({
				id: task.id,
				title: handoffTemplate.title,
				sort_order: checklistGroups.length,
			}).unwrap();
			for (const [index, itemTitle] of handoffTemplate.items.entries()) {
				await addChecklistItem({
					id: task.id,
					checklist_id: checklist.id,
					title: itemTitle,
					sort_order: index,
				}).unwrap();
			}
		};

		if (selectedTaskId) {
			return (
				<div className="workflow-trello-modal-detail">
					<button
						type="button"
						aria-label={t.common.close}
						onClick={closeTaskModal}
						className="workflow-trello-modal-close"
						style={{
							position: 'absolute',
							top: 14,
							right: 14,
							zIndex: 85,
							display: 'grid',
							width: 38,
							height: 38,
							placeItems: 'center',
							border: '1px solid #dbe3ef',
							borderRadius: 9,
							background: '#ffffff',
							color: '#334155',
							boxShadow: '0 14px 28px -22px rgba(15, 23, 42, 0.55)',
						}}
					>
						<X size={18} />
					</button>
					<main className="workflow-trello-modal-main">
						<div className="workflow-trello-modal-titlebar">
							<div className="min-w-0">
								<div className="workflow-trello-modal-status-row">
									<Chip status={task.status}>{labelFor(task.status)}</Chip>
									<Chip tone={task.review_state === 'approved' ? 'progress' : task.review_state === 'changes_requested' ? 'urgent' : task.review_state === 'needs_review' ? 'warning' : 'neutral'}>
										<span className="inline-flex items-center gap-1.5">
											<ShieldCheck size={12} />
											<span>{labelFor(task.review_state)}</span>
										</span>
									</Chip>
									<span>{task.project.name}</span>
								</div>
								<h2>{task.title}</h2>
							</div>
						</div>

						{renderSourceChatLink('modal')}

						<div className="workflow-trello-modal-actions" ref={taskAddActionsRef}>
							<button
								type="button"
								disabled={updateTaskReviewState.isLoading}
								onClick={() => void updateTaskReview({ id: task.id, review_state: task.review_state === 'needs_review' ? 'changes_requested' : 'needs_review' })}
								className="workflow-trello-modal-action"
							>
								<ShieldCheck size={17} />
								<span>{task.review_state === 'needs_review' ? (workflow.buttons.requestChanges ?? 'Request changes') : (workflow.buttons.requestReview ?? 'Request review')}</span>
							</button>
							{isManager ? (
								<button
									type="button"
									disabled={updateTaskReviewState.isLoading}
									onClick={() => void updateTaskReview({ id: task.id, review_state: 'approved' })}
									className="workflow-trello-modal-action"
								>
									<CheckCircle2 size={17} />
									<span>{workflow.buttons.approve ?? 'Approve'}</span>
								</button>
							) : null}
							<Popover.Root>
								<Popover.Trigger className="workflow-trello-modal-action-primary">
									<Plus size={18} />
									<span>{t.common.add}</span>
								</Popover.Trigger>
								<Popover.Portal>
									<Popover.Content align="start" sideOffset={8} className="workflow-trello-add-menu workflow-trello-modal-add-menu">
										<div className="workflow-trello-add-menu-head">
											<p>{workflow.labels.addToCard ?? 'Add to card'}</p>
											<Popover.Close aria-label={t.common.close}><X size={16} /></Popover.Close>
										</div>
									<div className="workflow-trello-add-options">
											{addOptions.map((option) => (
												<Popover.Close asChild key={option.key}>
													<button type="button" onClick={() => {
														setTaskAddPanel(option.key);
														if (option.key !== 'labels') setModalLabelComposerOpen(false);
													}}>
														<span>{option.icon}</span>
														<span>
															<b>{option.title}</b>
															<small>{option.body}</small>
														</span>
													</button>
												</Popover.Close>
											))}
										</div>
									</Popover.Content>
								</Popover.Portal>
							</Popover.Root>
							<button type="button" onClick={() => { setTaskAddPanel('checklist'); setModalLabelComposerOpen(false); }} className="workflow-trello-modal-action"><CheckCircle2 size={17} /><span>{workflow.labels.checklistPanel ?? 'Checklist'}</span></button>
							<button type="button" onClick={() => { setTaskAddPanel('members'); setModalLabelComposerOpen(false); }} className="workflow-trello-modal-action"><Users size={17} /><span>{workflow.labels.membersPanel ?? 'Members'}</span></button>
							<button type="button" onClick={() => archiveTask({ id: task.id, archived: !task.archived })} className="workflow-trello-modal-action">
								<Archive size={17} />
								<span>{task.archived ? (workflow.buttons.restore ?? 'Restore') : (workflow.buttons.archive ?? 'Archive')}</span>
							</button>
						</div>

						{taskAddPanel ? (
							<div className="workflow-trello-modal-floating-panel" data-panel={taskAddPanel} ref={taskAddPanelRef}>
								<div className="workflow-trello-modal-floating-head">
									<p>{addOptions.find((option) => option.key === taskAddPanel)?.title}</p>
									<button type="button" onClick={() => { setTaskAddPanel(null); setModalLabelComposerOpen(false); }} aria-label={t.common.close}>
										<X size={16} />
									</button>
								</div>
				{taskAddPanel === 'labels' ? (
									<div className="workflow-trello-modal-floating-body">
										<div className="workflow-trello-modal-label-picker">
											{labels.map((label) => {
												const active = task.labels.some((item) => item.id === label.id);
												return (
													<button
														key={label.id}
														type="button"
														data-active={active}
														disabled={!isManager}
														onClick={() => updateTask({
															id: task.id,
															data: {
																label_ids: active
																	? task.labels.filter((item) => item.id !== label.id).map((item) => item.id)
																	: [...task.labels.map((item) => item.id), label.id],
															},
														})}
													>
														<span style={{ backgroundColor: label.color }} />
														{label.name}
													</button>
												);
											})}
										</div>
										{labels.length === 0 ? <div className="workflow-trello-modal-empty-line">{workflow.labels.noLabelYet ?? 'No label yet'}</div> : null}
										{isManager && !modalLabelComposerOpen ? (
											<button type="button" className="workflow-trello-modal-secondary-action" onClick={() => setModalLabelComposerOpen(true)}>
												<Plus size={16} />
												<span>{workflow.labels.newLabel ?? 'New label'}</span>
											</button>
										) : null}
										{isManager && modalLabelComposerOpen ? (
											<div className="workflow-trello-modal-label-create">
												<Field value={newLabelName} onChange={setNewLabelName} placeholder={workflow.labels.newLabelPlaceholder ?? 'New label'} startIcon={<Tag size={16} />} />
												<div>
													<HexColorPicker color={newLabelColor} onChange={setNewLabelColor} />
													<button
														type="button"
														disabled={!newLabelName.trim()}
														onClick={async () => {
															const label = await createLabel({ name: newLabelName.trim(), color: newLabelColor }).unwrap();
															await updateTask({ id: task.id, data: { label_ids: [...task.labels.map((item) => item.id), label.id] } }).unwrap();
															setNewLabelName('');
															setModalLabelComposerOpen(false);
															setTaskAddPanel(null);
														}}
													>
														{t.common.add}
													</button>
												</div>
											</div>
										) : null}
									</div>
								) : null}
								{taskAddPanel === 'checklist' ? (
									<div className="workflow-trello-modal-floating-body">
										<FieldLabel>{workflow.labels.checklistTitle ?? 'Checklist title'}</FieldLabel>
										<Field
											value={newChecklistGroupTitle}
											onChange={setNewChecklistGroupTitle}
											placeholder={workflow.labels.checklistPanel ?? 'Checklist'}
											startIcon={<ListTodo size={16} />}
										/>
										<div className="workflow-checklist-template-picker">
											<p>{workflow.labels.checklistTemplates ?? 'Templates'}</p>
											<div>
												{checklistTemplates.map((template) => (
													<button
														key={template.key}
														type="button"
														data-active={selectedChecklistTemplate === template.key}
														onClick={() => selectChecklistTemplate(template)}
													>
														<b>{template.title}</b>
														<small>{template.description}</small>
													</button>
												))}
											</div>
											{activeChecklistTemplate ? (
												<ul>
													{activeChecklistTemplate.items.map((item) => <li key={item}>{item}</li>)}
												</ul>
											) : null}
										</div>
										<button type="button" className="workflow-trello-modal-save" onClick={createChecklistForTask}>
											{addChecklistState.isLoading ? workflow.buttons.saving : t.common.add}
										</button>
									</div>
								) : null}
								{taskAddPanel === 'cover' || taskAddPanel === 'attachments' ? (
									<div className="workflow-trello-modal-floating-body">
										{taskAddPanel === 'cover' ? (
											<div className="workflow-trello-modal-upload-row">
												<input id={`${coverInputId}-floating`} type="file" accept="image/*" onChange={(event) => setTaskCoverFile(event.target.files?.[0] ?? null)} className="workflow-hidden-file-input" />
												<label htmlFor={`${coverInputId}-floating`}><ImagePlus size={16} />{taskCoverFile?.name ?? (workflow.labels.cardImage ?? 'Card image')}</label>
												<button
													type="button"
													disabled={!taskCoverFile}
													onClick={async () => {
														if (!taskCoverFile) return;
														const data = new FormData();
														data.append('cover_image', taskCoverFile);
														await uploadTaskCover({ id: task.id, data }).unwrap();
														setTaskCoverFile(null);
														setTaskAddPanel(null);
													}}
												>
													{uploadTaskCoverState.isLoading ? workflow.buttons.saving : t.common.add}
												</button>
											</div>
										) : null}
										{taskAddPanel === 'attachments' ? (
											<div className="workflow-trello-modal-upload-row">
												<input id={`${attachmentInputId}-floating`} type="file" onChange={(event) => setTaskAttachmentFile(event.target.files?.[0] ?? null)} className="workflow-hidden-file-input" />
												<label htmlFor={`${attachmentInputId}-floating`}><Paperclip size={16} />{taskAttachmentFile?.name ?? (workflow.labels.uploadFile ?? 'Upload file')}</label>
												<button
													type="button"
													disabled={!taskAttachmentFile}
													onClick={async () => {
														if (!taskAttachmentFile) return;
														const data = new FormData();
														data.append('file', taskAttachmentFile);
														await uploadTaskAttachment({ id: task.id, data }).unwrap();
														setTaskAttachmentFile(null);
														setTaskAddPanel(null);
													}}
												>
													{uploadTaskAttachmentState.isLoading ? workflow.buttons.saving : t.common.add}
												</button>
											</div>
										) : null}
									</div>
								) : null}
								{taskAddPanel === 'members' ? (
									<div className="workflow-trello-modal-floating-body workflow-trello-modal-floating-grid">
										<SelectField
											value={reassignForm.assignee_id}
											onChange={(value) => setReassignForm((current) => ({ ...current, assignee_id: value }))}
											options={[{ value: '', label: workflow.labels.assignee }, ...users.map((user) => ({ value: user.id, label: `${user.first_name} ${user.last_name}` }))]}
											startIcon={<Users size={18} />}
											placeholder={workflow.labels.assignee}
										/>
										<Field value={reassignForm.reason} onChange={(value) => setReassignForm((current) => ({ ...current, reason: value }))} placeholder={workflow.labels.reassignReasonPlaceholder} startIcon={<MessagesSquare size={18} />} />
										<button
											type="button"
											disabled={!isManager || !validReassignAssigneeSelected || !reassignForm.reason.trim()}
											className="workflow-trello-modal-save"
											onClick={async () => {
												await reassignTask({ id: task.id, assignee_id: Number(reassignForm.assignee_id), reason: reassignForm.reason.trim() }).unwrap();
												setReassignForm((current) => ({ ...current, reason: '' }));
												setTaskAddPanel(null);
											}}
										>
											{reassignTaskState.isLoading ? workflow.buttons.moving : workflow.buttons.reassign}
										</button>
									</div>
								) : null}
							</div>
						) : null}

						{modalHasLabels ? (
							<section className="workflow-trello-modal-section workflow-trello-modal-section-compact">
								<div className="workflow-trello-modal-section-head">
									<Tag size={18} />
									<h3>{workflow.labels.labelsPanel ?? 'Labels'}</h3>
								</div>
								<div className="workflow-trello-modal-labels">
									{task.labels.map((label) => (
										<span key={label.id} style={{ backgroundColor: label.color }}>{label.name}</span>
									))}
									<button type="button" onClick={() => setTaskAddPanel('labels')} aria-label={t.common.add}>
										<Plus size={17} />
									</button>
								</div>
							</section>
						) : null}

						<section className="workflow-trello-modal-section">
							<div className="workflow-trello-modal-section-head">
								<ListTodo size={20} />
								<h3>{workflow.labels.description}</h3>
							</div>
							{taskMutable ? (
								modalDescriptionEditing ? (
									<div className="workflow-trello-modal-description-edit">
										<Area value={taskEditForm.description} onChange={(value) => setTaskEditForm((current) => ({ ...current, description: value }))} rows={4} placeholder={workflow.labels.descriptionPlaceholder ?? workflow.labels.noDescription} />
										<div className="workflow-trello-modal-inline-actions">
											<button
												type="button"
												className="workflow-trello-modal-save"
												onClick={async () => {
													await updateTask({ id: task.id, data: buildTaskPayload(task.project.id, taskEditForm, { includeTime: isManager }) }).unwrap();
													setModalDescriptionEditing(false);
												}}
											>
												{updateTaskState.isLoading ? workflow.buttons.saving : t.common.save}
											</button>
											<button
												type="button"
												className="workflow-trello-modal-cancel"
												onClick={() => {
													setTaskEditForm(buildTaskEditForm(task));
													setModalDescriptionEditing(false);
												}}
											>
												{t.common.cancel}
											</button>
										</div>
									</div>
								) : (
									<button
										type="button"
										className="workflow-trello-modal-description-button"
										style={{
											width: '100%',
											minHeight: 92,
											border: '1px solid #dbe3ef',
											borderRadius: 10,
											background: '#ffffff',
											padding: '14px 16px',
											color: '#334155',
											fontSize: 15,
											fontWeight: 700,
											lineHeight: 1.65,
											textAlign: 'left',
											whiteSpace: 'pre-wrap',
											boxShadow: '0 10px 24px -26px rgba(15, 23, 42, 0.5)',
										}}
										onClick={() => setModalDescriptionEditing(true)}
									>
										{task.description || (workflow.labels.descriptionPlaceholder ?? workflow.labels.noDescription)}
									</button>
								)
							) : (
								<p className="workflow-trello-modal-description-text">{task.description || workflow.labels.noDescription}</p>
							)}
						</section>

						{modalHasDates ? (
							<section className="workflow-trello-modal-section workflow-trello-modal-control-panel">
								<div className="workflow-trello-modal-section-head">
									<Clock3 size={20} />
									<h3>{workflow.labels.dueDate}</h3>
								</div>
								<div className="workflow-trello-modal-control-grid">
									<div>
										<FieldLabel>{workflow.labels.dueDate}</FieldLabel>
										<DateField value={taskEditForm.due_date} onChange={(value) => setTaskEditForm((current) => ({ ...current, due_date: value }))} />
									</div>
									{isManager ? (
										<div>
											<FieldLabel>{workflow.labels.estimatedMinutes}</FieldLabel>
											<WorkDaysField value={taskEditForm.estimated_minutes} onChange={(value) => setTaskEditForm((current) => ({ ...current, estimated_minutes: value }))} />
										</div>
									) : null}
									<button type="button" className="workflow-trello-modal-save" onClick={() => updateTask({ id: task.id, data: buildTaskPayload(task.project.id, taskEditForm, { includeTime: isManager }) })}>
										{updateTaskState.isLoading ? workflow.buttons.saving : t.common.save}
									</button>
								</div>
							</section>
						) : null}

						{modalHasChecklist ? checklistGroups.map((group) => {
							const groupDoneCount = group.items.filter((item) => item.done).length;
							const groupProgress = group.items.length ? (groupDoneCount / group.items.length) * 100 : 0;
							const groupKey = String(group.id);
							const groupNewItem = newChecklistItemsByChecklist[groupKey] ?? '';
							return (
								<section key={group.id || `legacy-${task.id}`} className="workflow-trello-modal-section">
									<div className="workflow-trello-modal-section-head">
										<CheckCircle2 size={20} />
										<div className="min-w-0">
											<h3>{group.title}</h3>
											<span>{Math.round(groupProgress)}% - {groupDoneCount}/{group.items.length}</span>
										</div>
									</div>
									<div className="workflow-trello-modal-progress"><span style={{ width: `${groupProgress}%` }} /></div>
									<div className="workflow-trello-modal-checklist">
										{group.items.map((item) => (
											<div key={item.id} className="workflow-trello-modal-checklist-item" data-done={item.done}>
												<button type="button" onClick={() => updateChecklistItem({ id: task.id, itemId: item.id, data: { done: !item.done } })}>
													<CheckCircle2 size={17} />
												</button>
												<span>{item.title}</span>
												<button type="button" onClick={() => deleteChecklistItem({ id: task.id, itemId: item.id })} aria-label={t.common.delete}>
													<Trash2 size={15} />
												</button>
											</div>
										))}
									</div>
									{taskMutable ? (
										<form
											className="workflow-trello-modal-checklist-add"
											onSubmit={async (event) => {
												event.preventDefault();
												await addChecklistItemToGroup(group);
											}}
										>
											<Field
												value={groupNewItem}
												onChange={(value) => setNewChecklistItemsByChecklist((current) => ({ ...current, [groupKey]: value }))}
												placeholder={workflow.labels.addChecklistPlaceholder ?? 'Add checklist item'}
												startIcon={<Plus size={16} />}
											/>
											<button type="submit" disabled={!groupNewItem.trim()}>{addChecklistItemState.isLoading ? workflow.buttons.saving : t.common.add}</button>
										</form>
									) : null}
								</section>
							);
						}) : null}

						{modalHasAttachments ? (
							<section className="workflow-trello-modal-section workflow-trello-modal-media-section">
								<div className="workflow-trello-modal-section-head">
									<Paperclip size={20} />
									<h3>{workflow.labels.attachmentsPanel ?? 'Attachments'}</h3>
								</div>
								<div className="workflow-trello-modal-cover-card">
									<div className="workflow-trello-modal-cover">
										{task.cover_image_url ? (
											<Image src={resolveMediaUrl(task.cover_image_url)} alt={task.title} fill sizes="(min-width: 1024px) 760px, 100vw" unoptimized loading="eager" className="object-contain" />
										) : (
											<div><ImagePlus size={22} /><span>{workflow.labels.noCardImage ?? 'No card image'}</span></div>
										)}
									</div>
									{taskMutable ? (
										<div className="workflow-trello-modal-media-actions">
											<input id={coverInputId} type="file" accept="image/*" onChange={(event) => setTaskCoverFile(event.target.files?.[0] ?? null)} className="workflow-hidden-file-input" />
											<label htmlFor={coverInputId} className="workflow-trello-modal-file-button"><ImagePlus size={16} />{taskCoverFile?.name ?? (workflow.labels.cardImage ?? 'Card image')}</label>
											<button
												type="button"
												className="workflow-trello-modal-save"
												disabled={!taskCoverFile}
												onClick={async () => {
													if (!taskCoverFile) return;
													const data = new FormData();
													data.append('cover_image', taskCoverFile);
													await uploadTaskCover({ id: task.id, data }).unwrap();
													setTaskCoverFile(null);
												}}
											>
												{uploadTaskCoverState.isLoading ? workflow.buttons.saving : t.common.add}
											</button>
											{task.cover_image_url ? (
												<button
													type="button"
													onClick={() => setMediaDeleteTarget({ kind: 'cover', taskId: task.id, name: workflow.labels.cardImage ?? 'Card image' })}
													className="workflow-trello-modal-media-danger"
													aria-label={t.common.delete}
												>
													<Trash2 size={15} />
												</button>
											) : null}
										</div>
									) : null}
								</div>
								<div className="workflow-trello-modal-attachments">
									{task.attachments.map((attachment) => {
										const attachmentUrl = resolveMediaUrl(attachment.file_url ?? attachment.file);
										const isImage = isImageAttachment(attachment);
										const fileMeta = [attachment.mime_type || workflow.labels.uploadFile, formatFileSize(attachment.size)].filter(Boolean).join(' - ');
										return (
											<div key={attachment.id} className="workflow-trello-modal-attachment-item">
												{isImage ? (
													<button
														type="button"
														className="workflow-attachment-preview-trigger"
														onClick={() => openAttachmentPreview(attachment, attachmentUrl, fileMeta)}
														aria-label={`${workflow.labels.preview ?? 'Preview'} ${attachment.name}`}
													>
														<Image src={attachmentUrl} alt={attachment.name} width={92} height={68} unoptimized loading="eager" className="h-auto w-auto" style={{ width: 'auto', height: 'auto' }} />
													</button>
												) : (
													<span><Paperclip size={17} /></span>
												)}
												<div>
													<a href={attachmentUrl} target="_blank" rel="noreferrer">{attachment.name}</a>
													<small>{fileMeta}</small>
												</div>
												<div className="workflow-trello-modal-attachment-actions">
													{isImage ? (
														<button
															type="button"
															className="workflow-trello-modal-attachment-cover-action"
															onClick={() => handleSetAttachmentAsCover(task, attachment)}
															disabled={setTaskCoverFromAttachmentState.isLoading}
														>
															<ImagePlus size={14} />
															<span>{workflow.labels.setAsCover ?? 'Set as cover'}</span>
														</button>
													) : null}
													<button
														type="button"
														className="workflow-trello-modal-media-danger"
														onClick={() => setMediaDeleteTarget({ kind: 'attachment', taskId: task.id, attachmentId: attachment.id, name: attachment.name })}
														aria-label={t.common.delete}
													>
														<Trash2 size={15} />
													</button>
												</div>
											</div>
										);
									})}
								</div>
								{taskMutable ? (
									<div className="workflow-trello-modal-media-actions">
										<input id={attachmentInputId} type="file" onChange={(event) => setTaskAttachmentFile(event.target.files?.[0] ?? null)} className="workflow-hidden-file-input" />
										<label htmlFor={attachmentInputId} className="workflow-trello-modal-file-button"><Paperclip size={16} />{taskAttachmentFile?.name ?? (workflow.labels.uploadFile ?? 'Upload file')}</label>
										<button
											type="button"
											className="workflow-trello-modal-save"
											disabled={!taskAttachmentFile}
											onClick={async () => {
												if (!taskAttachmentFile) return;
												const data = new FormData();
												data.append('file', taskAttachmentFile);
												await uploadTaskAttachment({ id: task.id, data }).unwrap();
												setTaskAttachmentFile(null);
											}}
										>
											{uploadTaskAttachmentState.isLoading ? workflow.buttons.saving : t.common.add}
										</button>
									</div>
								) : null}
							</section>
						) : null}

					</main>

					<aside className="workflow-trello-modal-activity">
						<div className="workflow-trello-modal-activity-head">
							<div>
								<MessagesSquare size={19} />
								<h3>{workflow.sections.comments.title}</h3>
							</div>
						</div>
						{taskMutable ? (
							<div className="workflow-trello-modal-comment-box">
								<Area value={commentBody} onChange={setCommentBody} rows={3} placeholder={workflow.labels.commentPlaceholder} />
								<button
									type="button"
									onClick={async () => {
										await addTaskComment({ id: task.id, body: commentBody.trim() }).unwrap();
										setCommentBody('');
									}}
									disabled={!commentBody.trim()}
								>
									{addCommentState.isLoading ? workflow.buttons.posting : workflow.buttons.postComment}
								</button>
							</div>
						) : null}
						<div className="workflow-trello-modal-feed">
							{pagedTaskComments.map((comment) => (
								<div key={`comment-${comment.id}`} className="workflow-trello-modal-feed-item">
									<AvatarBadge user={comment.author} size={34} />
									<div>
										<p><b>{comment.author.first_name} {comment.author.last_name}</b> {workflow.activities.commented?.toLowerCase?.() ?? 'commented'}</p>
										<span>{comment.body}</span>
										<small>{dateTimeFor(comment.created_at)}</small>
									</div>
								</div>
							))}
							{pagedTaskActivity.map((activity) => (
								<div key={`activity-${activity.id}`} className="workflow-trello-modal-feed-item">
									{activity.actor ? <AvatarBadge user={activity.actor} size={34} /> : <div className="workflow-trello-modal-system-avatar">DW</div>}
									<div>
										<p><b>{activity.actor ? `${activity.actor.first_name} ${activity.actor.last_name}` : workflow.labels.system}</b></p>
										<span>{describeWorkflowActivity(activity)}</span>
										<small>{dateTimeFor(activity.created_at)}</small>
									</div>
								</div>
							))}
							{task.comments.length === 0 && visibleTaskActivity.length === 0 ? <EmptyState {...workflow.emptyStates.noActivity} /> : null}
						</div>
					</aside>
				</div>
			);
		}

		return (
			<div className="workflow-task-detail-page">
				<Surface className="workflow-task-detail-panel workflow-task-detail-hero workflow-task-detail-snapshot" {...workflow.sections.taskSnapshot}>
					<div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_300px]">
						<div className="workflow-task-detail-media" style={{ '--status-accent': BOARD_STATUS_META[task.status].accent } as CSSProperties}>
							{task.cover_image_url ? (
								<Image src={resolveMediaUrl(task.cover_image_url)} alt={task.title} width={640} height={360} unoptimized className="h-full w-full object-cover" />
							) : (
								<div className="workflow-task-detail-media-empty">
									{BOARD_STATUS_META[task.status].icon}
									<span>{labelFor(task.status)}</span>
								</div>
							)}
						</div>
						<div className="space-y-4">
							<div>
								<p className="text-xs font-bold uppercase text-(--ink-muted)">{task.project.name}</p>
								<h2 className="mt-2 text-2xl font-extrabold leading-tight text-(--ink)">{task.title}</h2>
							</div>
							<p className="text-sm leading-7 text-(--ink-soft)">{task.description || workflow.labels.noDescription}</p>
							<div className="flex flex-wrap gap-2">
								<Chip status={task.status}>{labelFor(task.status)}</Chip>
								<Chip>{labelFor(task.priority)}</Chip>
								<Chip>
									<span className="inline-flex items-center gap-2">
										{task.current_assignee ? <AvatarBadge user={task.current_assignee} size={20} /> : null}
										<span>{task.current_assignee ? `${task.current_assignee.first_name} ${task.current_assignee.last_name}` : workflow.labels.unassigned}</span>
									</span>
								</Chip>
								<Chip tone={taskDueDelivery?.tone}>{taskDueDelivery?.label ?? dateFor(task.due_date)}</Chip>
							</div>
							{renderSourceChatLink('detail')}
						</div>
						{isManager ? <div className="workflow-task-stats grid gap-3 p-4">
							<div>
								<p className="text-xs uppercase tracking-[0.16em] text-(--ink-soft)">{workflow.labels.project}</p>
								<p className="mt-1 font-semibold text-(--ink)">{task.project.name}</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-[0.16em] text-(--ink-soft)">{workflow.labels.estimated}</p>
								<p className="mt-1 font-semibold text-(--ink)">{formatWorkDays(task.estimated_minutes, workflow.labels.daysUnit)}</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-[0.16em] text-(--ink-soft)">{workflow.labels.logged}</p>
								<p className="mt-1 font-semibold text-(--ink)">{formatMinutes(task.total_logged_minutes)}</p>
							</div>
						</div> : null}
					</div>
				</Surface>

				<div className="workflow-task-detail-tabs" role="tablist" aria-label="Task detail sections">
					{detailTabs.map((tab) => (
						<button
							key={tab.key}
							type="button"
							role="tab"
							aria-selected={taskDetailTab === tab.key}
							data-active={taskDetailTab === tab.key}
							onClick={() => setTaskDetailTab(tab.key)}
						>
							{tab.icon}
							<span>{tab.label}</span>
						</button>
					))}
				</div>

				{taskDetailTab === 'review' ? (
					<Surface
						className="workflow-task-detail-panel workflow-review-panel"
						title={workflow.labels.review ?? 'Review'}
						description={workflow.labels.reviewWorkflowHint ?? 'Approval state stays separate from board status.'}
						action={<Chip tone={reviewTone}>{labelFor(task.review_state)}</Chip>}
					>
						<div className="workflow-review-grid">
							<div className="workflow-review-state-card">
								<div>
									<span className="workflow-review-kicker">{workflow.labels.statusLabel}</span>
									<h3>{labelFor(task.review_state)}</h3>
									<p>{workflow.labels.boardStatus ?? 'Board status'}: {labelFor(task.status)}</p>
								</div>
								<div className="workflow-review-meta-grid">
									<div>
										<span>{workflow.labels.reviewRequestedBy ?? 'Requested by'}</span>
										<b>{task.review_requested_by ? `${task.review_requested_by.first_name} ${task.review_requested_by.last_name}` : workflow.labels.noDate}</b>
										<small>{dateTimeFor(task.review_requested_at)}</small>
									</div>
									<div>
										<span>{workflow.labels.approvedBy ?? 'Approved by'}</span>
										<b>{task.review_approved_by ? `${task.review_approved_by.first_name} ${task.review_approved_by.last_name}` : workflow.labels.noDate}</b>
										<small>{dateTimeFor(task.review_approved_at)}</small>
									</div>
								</div>
								{taskMutable ? (
									<div className="workflow-review-action-stack">
										<FieldLabel htmlFor="task-review-notes">{workflow.labels.optionalNote}</FieldLabel>
										<Area
											id="task-review-notes"
											value={reviewNotes}
											onChange={setReviewNotes}
											rows={3}
											placeholder={workflow.labels.reviewNotesPlaceholder ?? 'Review notes'}
											startIcon={<MessagesSquare size={17} />}
										/>
										<div className="workflow-review-actions">
											<button
												type="button"
												className="app-button"
												disabled={updateTaskReviewState.isLoading}
												onClick={() => submitReviewUpdate('needs_review')}
											>
												<ShieldCheck size={16} />
												<span>{workflow.buttons.requestReview ?? 'Request review'}</span>
											</button>
											<button
												type="button"
												className="app-button app-button-secondary"
												disabled={updateTaskReviewState.isLoading}
												onClick={() => submitReviewUpdate('changes_requested')}
											>
												<CircleAlert size={16} />
												<span>{workflow.buttons.requestChanges ?? 'Request changes'}</span>
											</button>
											{isManager ? (
												<button
													type="button"
													className="app-button app-button-secondary"
													disabled={updateTaskReviewState.isLoading}
													onClick={() => submitReviewUpdate('approved')}
												>
													<CheckCircle2 size={16} />
													<span>{workflow.buttons.approve ?? 'Approve'}</span>
												</button>
											) : null}
										</div>
									</div>
								) : null}
							</div>

							<div className="workflow-artifact-card">
								<div className="workflow-tool-card-heading">
									<div className="flex items-center gap-2">
										<span className="workflow-tool-icon workflow-tool-icon-cyan"><Paperclip size={15} /></span>
										<p>{workflow.labels.artifactVersions ?? 'Artifact versions'}</p>
									</div>
									<Chip>{task.artifact_versions.length}</Chip>
								</div>
								{taskMutable ? (
									<div className="workflow-artifact-create">
										<div>
											<FieldLabel htmlFor="artifact-attachment">{workflow.labels.attachmentsPanel ?? 'Attachments'}</FieldLabel>
											<SelectField
												id="artifact-attachment"
												value={versionAttachmentId}
												onChange={setVersionAttachmentId}
												options={[
													{ value: '', label: workflow.labels.noLinkedFile ?? 'No linked file' },
													...task.attachments.map((attachment) => ({ value: attachment.id, label: attachment.name })),
												]}
												startIcon={<Paperclip size={18} />}
											/>
										</div>
										<div>
											<FieldLabel htmlFor="artifact-approval">{workflow.labels.statusLabel}</FieldLabel>
											<SelectField
												id="artifact-approval"
												value={versionApprovalState}
												onChange={(value) => setVersionApprovalState(value as TaskArtifactVersion['approval_state'])}
												options={['pending', 'changes_requested', 'approved'].map((value) => ({ value, label: labelFor(value) }))}
												startIcon={<ShieldCheck size={18} />}
											/>
										</div>
										<div className="md:col-span-2">
											<FieldLabel htmlFor="artifact-notes">{workflow.labels.optionalNote}</FieldLabel>
											<Area
												id="artifact-notes"
												value={versionNotes}
												onChange={setVersionNotes}
												rows={3}
												placeholder={workflow.labels.versionNotesPlaceholder ?? 'Version notes'}
												startIcon={<MessagesSquare size={18} />}
											/>
										</div>
										<button type="button" className="app-button" onClick={submitArtifactVersion}>
											<Plus size={16} />
											<span>{createTaskVersionState.isLoading ? workflow.buttons.saving : (workflow.buttons.addVersion ?? 'Add version')}</span>
										</button>
										{handoffTemplate ? (
											<button
												type="button"
												className="app-button app-button-secondary"
												disabled={addChecklistState.isLoading || addChecklistItemState.isLoading}
												onClick={createHandoffChecklist}
											>
												<CheckCircle2 size={16} />
												<span>{workflow.buttons.addHandoffChecklist ?? 'Add handoff checklist'}</span>
											</button>
										) : null}
									</div>
								) : null}
								<div className="workflow-artifact-list">
									{task.artifact_versions.map((version) => (
										<div key={version.id} className="workflow-artifact-row" data-state={version.approval_state}>
											<div>
												<b>v{version.version_number}</b>
												<span>{labelFor(version.approval_state)}</span>
											</div>
											<p>{version.notes || (workflow.labels.optionalNote ?? 'No note')}</p>
											<small>
												{version.attachment?.name ?? (workflow.labels.noLinkedFile ?? 'No linked file')} - {version.uploaded_by.first_name} {version.uploaded_by.last_name} - {dateTimeFor(version.created_at)}
											</small>
										</div>
									))}
									{task.artifact_versions.length === 0 ? <EmptyState title={workflow.labels.artifactVersions ?? 'Artifact versions'} description={workflow.emptyStates.noActivity.description} /> : null}
								</div>
							</div>
						</div>
					</Surface>
				) : null}

				{taskDetailTab === 'files' ? (
					<Surface
						className="workflow-task-detail-panel workflow-files-panel"
						title={workflow.labels.files ?? 'Files'}
						description={workflow.labels.annotationWorkflowHint ?? 'Review pins stay linked to the selected file and version.'}
					>
						<div className="workflow-files-grid">
							<div className="workflow-files-list">
								{task.attachments.map((attachment) => {
									const attachmentUrl = resolveMediaUrl(attachment.file_url ?? attachment.file);
									const isImage = isImageAttachment(attachment);
									return (
										<button
											key={attachment.id}
											type="button"
											className="workflow-file-review-card"
											data-active={selectedAnnotationAttachment?.id === attachment.id}
											onClick={() => setSelectedAnnotationAttachmentId(attachment.id)}
										>
											{isImage ? (
												<Image src={attachmentUrl} alt={attachment.name} width={128} height={88} unoptimized loading="eager" className="h-auto w-auto" style={{ width: 'auto', height: 'auto' }} />
											) : (
												<span><Paperclip size={20} /></span>
											)}
											<b>{attachment.name}</b>
											<small>{formatFileSize(attachment.size)} - {attachment.annotation_count} {workflow.labels.annotations ?? 'annotations'}</small>
										</button>
									);
								})}
								{task.attachments.length === 0 ? <EmptyState title={workflow.labels.files ?? 'Files'} description={workflow.emptyStates.noActivity.description} /> : null}
							</div>

							<div className="workflow-annotation-workbench">
								{selectedAnnotationAttachment ? (
									<>
										<div className="workflow-annotation-stage">
											{isImageAttachment(selectedAnnotationAttachment) ? (
												<Image src={selectedAnnotationAttachmentUrl} alt={selectedAnnotationAttachment.name} width={860} height={520} unoptimized loading="eager" className="h-auto w-auto" style={{ width: 'auto', height: 'auto' }} />
											) : (
												<div className="workflow-annotation-file-placeholder">
													<Paperclip size={26} />
													<span>{selectedAnnotationAttachment.name}</span>
												</div>
											)}
											{selectedAttachmentAnnotations.map((annotation) => (
												<span
													key={annotation.id}
													className="workflow-annotation-pin"
													data-resolved={annotation.resolved}
													style={{ left: `${annotation.x_percent}%`, top: `${annotation.y_percent}%` }}
													title={annotation.body}
												>
													{annotation.resolved ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
												</span>
											))}
										</div>
										<div className="workflow-annotation-body">
											{taskMutable ? (
												<div className="workflow-annotation-form">
													<div>
														<FieldLabel htmlFor="annotation-version">{workflow.labels.artifactVersions ?? 'Artifact versions'}</FieldLabel>
														<SelectField
															id="annotation-version"
															value={annotationVersionId}
															onChange={setAnnotationVersionId}
															options={[
																{ value: '', label: workflow.labels.noLinkedVersion ?? 'No linked version' },
																...selectedAnnotationVersionOptions.map((version) => ({ value: version.id, label: `v${version.version_number} - ${labelFor(version.approval_state)}` })),
															]}
															startIcon={<ShieldCheck size={18} />}
														/>
													</div>
													<div className="workflow-annotation-position-grid">
														<div>
															<FieldLabel htmlFor="annotation-x">X %</FieldLabel>
															<Field id="annotation-x" type="number" min={0} value={annotationX} onChange={setAnnotationX} />
														</div>
														<div>
															<FieldLabel htmlFor="annotation-y">Y %</FieldLabel>
															<Field id="annotation-y" type="number" min={0} value={annotationY} onChange={setAnnotationY} />
														</div>
													</div>
													<div className="md:col-span-2">
														<FieldLabel htmlFor="annotation-body">{workflow.labels.addComment}</FieldLabel>
														<Area
															id="annotation-body"
															value={annotationBody}
															onChange={setAnnotationBody}
															rows={3}
															placeholder={workflow.labels.annotationPlaceholder ?? 'Annotation'}
															startIcon={<MessagesSquare size={18} />}
														/>
													</div>
													<ToggleField label={workflow.labels.resolved ?? 'Resolved'} checked={annotationResolved} onChange={setAnnotationResolved} />
													<button
														type="button"
														className="app-button"
														disabled={!annotationBody.trim() || createAnnotationState.isLoading}
														onClick={submitAnnotation}
													>
														<Plus size={16} />
														<span>{createAnnotationState.isLoading ? workflow.buttons.saving : (workflow.buttons.addAnnotation ?? 'Add annotation')}</span>
													</button>
												</div>
											) : null}
											<div className="workflow-annotation-list">
												{selectedAttachmentAnnotations.map((annotation) => (
													<div key={annotation.id} className="workflow-annotation-row" data-resolved={annotation.resolved}>
														<div>
															<b>{annotation.author.first_name} {annotation.author.last_name}</b>
															<span>{annotation.x_percent}%, {annotation.y_percent}%</span>
														</div>
														<p>{annotation.body}</p>
														<small>{annotation.resolved ? (workflow.labels.resolved ?? 'Resolved') : (workflow.labels.open ?? 'Open')} - {dateTimeFor(annotation.created_at)}</small>
													</div>
												))}
												{selectedAttachmentAnnotations.length === 0 ? <EmptyState title={workflow.labels.annotations ?? 'Annotations'} description={workflow.emptyStates.noCommentsYet.description} /> : null}
											</div>
										</div>
									</>
								) : (
									<EmptyState title={workflow.labels.files ?? 'Files'} description={workflow.emptyStates.noActivity.description} />
								)}
							</div>
						</div>
					</Surface>
				) : null}

				<Surface className="workflow-task-detail-panel workflow-task-tools-panel workflow-trello-tools-panel" title={workflow.labels.cardActions ?? "Card actions"}>
					<div className="workflow-trello-action-row">
						<Popover.Root>
							<Popover.Trigger className="workflow-trello-action-button workflow-trello-action-button-primary">
								<Plus size={17} />
								<span>{t.common.add}</span>
							</Popover.Trigger>
							<Popover.Portal>
								<Popover.Content align="start" sideOffset={8} className="workflow-trello-add-menu">
									<div className="workflow-trello-add-menu-head">
										<p>{workflow.labels.addToCard ?? 'Add to card'}</p>
										<Popover.Close aria-label={t.common.close}><X size={16} /></Popover.Close>
									</div>
									<div className="workflow-trello-add-options">
										{addOptions.map((option) => (
											<Popover.Close asChild key={option.key}>
												<button type="button" onClick={() => setTaskAddPanel(option.key)}>
													<span>{option.icon}</span>
													<span>
														<b>{option.title}</b>
														<small>{option.body}</small>
													</span>
												</button>
											</Popover.Close>
										))}
									</div>
								</Popover.Content>
							</Popover.Portal>
						</Popover.Root>
						<button type="button" onClick={() => setTaskAddPanel('cover')} className="workflow-trello-action-button"><ImagePlus size={16} /><span>{workflow.labels.cardImage ?? 'Card image'}</span></button>
						<button type="button" onClick={() => setTaskAddPanel('checklist')} className="workflow-trello-action-button"><CheckCircle2 size={16} /><span>{workflow.labels.checklistPanel ?? 'Checklist'}</span></button>
						<button type="button" onClick={() => setTaskAddPanel('members')} className="workflow-trello-action-button"><Users size={16} /><span>{workflow.labels.membersPanel ?? 'Members'}</span></button>
					</div>
					<div className="workflow-task-tools-board">
						{showChecklistPanel ? (
						<div className="app-card-muted workflow-checklist-card workflow-tool-card-primary">
							<div className="workflow-tool-card-heading workflow-tool-card-heading-large">
								<div className="flex min-w-0 items-center gap-3">
									<span className="workflow-tool-icon workflow-tool-icon-green"><CheckCircle2 size={17} /></span>
									<div className="min-w-0">
										<p>{workflow.labels.checklistPanel ?? 'Checklist'}</p>
										<span>{Math.round(checklistProgress)}% · {checklistDoneCount}/{task.checklist_items.length}</span>
									</div>
								</div>
								<Chip>{checklistGroups.length}</Chip>
							</div>
							{taskAddPanel === 'checklist' ? (
								<div className="workflow-trello-checklist-create">
									<FieldLabel>{workflow.labels.checklistTitle ?? 'Checklist title'}</FieldLabel>
									<Field
										value={newChecklistGroupTitle}
										onChange={setNewChecklistGroupTitle}
										placeholder={workflow.labels.checklistPanel ?? 'Checklist'}
										startIcon={<ListTodo size={16} />}
									/>
									<div className="workflow-checklist-template-picker">
										<p>{workflow.labels.checklistTemplates ?? 'Templates'}</p>
										<div>
											{checklistTemplates.map((template) => (
												<button
													key={template.key}
													type="button"
													data-active={selectedChecklistTemplate === template.key}
													onClick={() => selectChecklistTemplate(template)}
												>
													<b>{template.title}</b>
													<small>{template.description}</small>
												</button>
											))}
										</div>
										{activeChecklistTemplate ? (
											<ul>
												{activeChecklistTemplate.items.map((item) => <li key={item}>{item}</li>)}
											</ul>
										) : null}
									</div>
									<button type="button" className="app-button px-4" onClick={createChecklistForTask}>
										{addChecklistState.isLoading ? workflow.buttons.saving : t.common.add}
									</button>
								</div>
							) : null}
							<div className="workflow-checklist-progress workflow-checklist-progress-large" aria-hidden="true">
								<span style={{ width: `${checklistProgress}%` }} />
							</div>
							<div className="workflow-checklist-list">
								{checklistGroups.map((group) => {
									const groupDoneCount = group.items.filter((item) => item.done).length;
									const groupProgress = group.items.length ? (groupDoneCount / group.items.length) * 100 : 0;
									const groupKey = String(group.id);
									const groupNewItem = newChecklistItemsByChecklist[groupKey] ?? '';
									return (
										<div key={group.id || `legacy-${task.id}`} className="workflow-checklist-group">
											<div className="workflow-checklist-group-head">
												<p>{group.title}</p>
												<span>{Math.round(groupProgress)}% - {groupDoneCount}/{group.items.length}</span>
											</div>
											<div className="workflow-checklist-progress" aria-hidden="true">
												<span style={{ width: `${groupProgress}%` }} />
											</div>
											{group.items.map((item) => (
												<div key={item.id} className={cn('workflow-checklist-row workflow-checklist-row-modern', item.done && 'is-done')}>
													<button type="button" onClick={() => updateChecklistItem({ id: task.id, itemId: item.id, data: { done: !item.done } })} className="workflow-checklist-toggle" aria-label={item.done ? workflow.buttons.updateStatus : workflow.buttons.updateStatus}>
														<CheckCircle2 size={16} />
													</button>
													<span>{item.title}</span>
													<button type="button" onClick={() => deleteChecklistItem({ id: task.id, itemId: item.id })} className="workflow-tool-icon-button workflow-tool-icon-button-danger" aria-label={t.common.delete}>
														<Trash2 size={15} />
													</button>
												</div>
											))}
											{taskMutable ? (
												<div className="workflow-checklist-add workflow-checklist-add-modern">
													<Field
														value={groupNewItem}
														onChange={(value) => setNewChecklistItemsByChecklist((current) => ({ ...current, [groupKey]: value }))}
														placeholder={workflow.labels.addChecklistPlaceholder ?? "Add checklist item"}
														startIcon={<Plus size={16} />}
													/>
													<button type="button" disabled={!groupNewItem.trim()} onClick={() => addChecklistItemToGroup(group)} className="app-button px-4">
														{addChecklistItemState.isLoading ? workflow.buttons.saving : t.common.add}
													</button>
												</div>
											) : null}
										</div>
									);
								})}
								{checklistGroups.length === 0 ? <div className="workflow-tool-empty-box">{workflow.emptyStates.noChecklist?.description ?? workflow.labels.addChecklistPlaceholder}</div> : null}
							</div>
						</div>
						) : null}

						<div className="workflow-task-tools-side">
							{showLabelsPanel ? (
							<div className="app-card-muted workflow-labels-card workflow-tool-card-compact">
								<div className="workflow-tool-card-heading">
									<div className="flex items-center gap-2">
										<span className="workflow-tool-icon"><Tag size={15} /></span>
										<p>{workflow.labels.labelsPanel ?? "Etiquettes"}</p>
									</div>
									<Chip>{task.labels.length}</Chip>
								</div>
								<div className="workflow-label-zone workflow-label-zone-modern">
									<p>{workflow.labels.activeLabels ?? 'Actives'}</p>
									<div className="workflow-label-chip-row">
										{task.labels.map((label) => (
											<span key={label.id} className="workflow-label-chip" style={{ borderColor: label.color, color: label.color }}>
												<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: label.color }} />
												<span>{label.name}</span>
												{isManager ? (
													<button
														type="button"
														onClick={() => updateTask({ id: task.id, data: { label_ids: task.labels.filter((item) => item.id !== label.id).map((item) => item.id) } })}
														className="text-current opacity-70 transition hover:opacity-100"
														aria-label={`Remove ${label.name}`}
													>
														<X size={12} />
													</button>
												) : null}
											</span>
										))}
										{task.labels.length === 0 ? <p className="workflow-tool-empty-line">{workflow.labels.noLabelYet ?? 'Aucune etiquette'}</p> : null}
									</div>
								</div>
								<div className="workflow-label-zone workflow-label-zone-modern">
									<p>{workflow.labels.availableLabels ?? 'Disponibles'}</p>
									<div className="workflow-label-chip-row">
										{labels
											.filter((label) => !task.labels.some((item) => item.id === label.id))
											.map((label) => (
												<button
													key={label.id}
													type="button"
													disabled={!isManager}
													onClick={() => updateTask({ id: task.id, data: { label_ids: [...task.labels.map((item) => item.id), label.id] } })}
													className="workflow-label-chip workflow-label-chip-action"
													style={{ borderColor: label.color, color: label.color }}
												>
													<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: label.color }} />
													{label.name}
												</button>
											))}
										{labels.filter((label) => !task.labels.some((item) => item.id === label.id)).length === 0 ? <p className="workflow-tool-empty-line">{workflow.labels.noLabelYet ?? 'Aucune etiquette'}</p> : null}
									</div>
								</div>
								{isManager ? (
									<div className="workflow-label-composer workflow-label-composer-modern">
										<div className="workflow-label-composer-head">
											<div className="flex items-center gap-2">
												<Palette size={15} />
												<p>{workflow.labels.newLabel ?? 'Nouvelle etiquette'}</p>
											</div>
											<div className="workflow-label-preview" style={{ borderColor: newLabelColor, color: newLabelColor }}>
												<span className="inline-flex items-center gap-2">
													<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: newLabelColor }} />
													{newLabelName.trim() || (workflow.labels.preview ?? 'Apercu')}
												</span>
											</div>
										</div>
										<Field value={newLabelName} onChange={setNewLabelName} placeholder={workflow.labels.newLabelPlaceholder ?? "New label"} startIcon={<Tag size={16} />} />
										<div className="workflow-label-composer-grid">
											<div className="workflow-label-color-picker">
												<HexColorPicker color={newLabelColor} onChange={setNewLabelColor} style={{ width: '100%' }} />
											</div>
											<button
												type="button"
												disabled={!newLabelName.trim()}
												onClick={async () => {
													const label = await createLabel({ name: newLabelName.trim(), color: newLabelColor }).unwrap();
													await updateTask({ id: task.id, data: { label_ids: [...task.labels.map((item) => item.id), label.id] } }).unwrap();
													setNewLabelName('');
												}}
												className="app-button workflow-label-create-button"
											>
												<Plus size={16} />
												<span>{t.common.add}</span>
											</button>
										</div>
									</div>
								) : null}
							</div>
							) : null}

							{showAttachmentsPanel ? (
							<div className="app-card-muted workflow-attachments-card workflow-tool-card-compact">
								<div className="workflow-tool-card-heading">
									<div className="flex items-center gap-2">
										<span className="workflow-tool-icon workflow-tool-icon-cyan"><Paperclip size={15} /></span>
										<p>{workflow.labels.attachmentsPanel ?? "Attachments"}</p>
									</div>
									<Chip>{task.attachments.length}</Chip>
								</div>
								<div className="workflow-cover-control">
									<div className="workflow-cover-preview">
										{task.cover_image_url ? (
											<Image src={resolveMediaUrl(task.cover_image_url)} alt={task.title} width={520} height={180} unoptimized className="h-full w-full object-cover" />
										) : (
											<div>
												<ImagePlus size={20} />
												<span>{workflow.labels.noCardImage ?? 'Aucune image de carte'}</span>
											</div>
										)}
									</div>
									{taskMutable ? (
										<div className="workflow-upload-actions">
											<input id={coverInputId} type="file" accept="image/*" onChange={(event) => setTaskCoverFile(event.target.files?.[0] ?? null)} className="workflow-hidden-file-input" />
											<label htmlFor={coverInputId} className="workflow-upload-picker">
												<ImagePlus size={15} />
												<span>{taskCoverFile?.name ?? (workflow.labels.cardImage ?? 'Image de carte')}</span>
											</label>
											<button
												type="button"
												disabled={!taskCoverFile}
												onClick={async () => {
													if (!taskCoverFile) return;
													const data = new FormData();
													data.append('cover_image', taskCoverFile);
													await uploadTaskCover({ id: task.id, data }).unwrap();
													setTaskCoverFile(null);
												}}
												className="app-button workflow-upload-submit"
											>
												<ImagePlus size={16} />
												<span>{uploadTaskCoverState.isLoading ? workflow.buttons.saving : (workflow.labels.setCardImage ?? "Modifier l'image")}</span>
											</button>
											{task.cover_image_url ? (
												<button
													type="button"
													onClick={() => setMediaDeleteTarget({ kind: 'cover', taskId: task.id, name: workflow.labels.cardImage ?? 'Card image' })}
													className="workflow-tool-icon-button workflow-tool-icon-button-danger"
													aria-label={t.common.delete}
												>
													<X size={16} />
												</button>
											) : null}
										</div>
									) : null}
								</div>
								<div className="workflow-attachment-list">
									{task.attachments.map((attachment) => {
										const attachmentUrl = resolveMediaUrl(attachment.file_url ?? attachment.file);
										const isImage = isImageAttachment(attachment);
										const fileMeta = [attachment.mime_type || workflow.labels.uploadFile, formatFileSize(attachment.size)].filter(Boolean).join(' - ');
										return (
											<div key={attachment.id} className="workflow-attachment-item">
												{isImage ? (
													<button
														type="button"
														className="workflow-attachment-preview-trigger"
														onClick={() => openAttachmentPreview(attachment, attachmentUrl, fileMeta)}
														aria-label={`${workflow.labels.preview ?? 'Preview'} ${attachment.name}`}
													>
														<Image src={attachmentUrl} alt={attachment.name} width={72} height={52} unoptimized loading="eager" className="workflow-attachment-thumb h-auto w-auto" style={{ width: 'auto', height: 'auto' }} />
													</button>
												) : <span className="workflow-attachment-file-icon"><Paperclip size={16} /></span>}
												<div className="workflow-attachment-copy">
													<a href={attachmentUrl} target="_blank" rel="noreferrer">{attachment.name}</a>
													<small>{fileMeta}</small>
												</div>
												<div className="workflow-attachment-actions">
													{isImage ? (
														<button
															type="button"
															className="workflow-attachment-cover-button"
															onClick={() => handleSetAttachmentAsCover(task, attachment)}
															disabled={setTaskCoverFromAttachmentState.isLoading}
														>
															<ImagePlus size={14} />
															<span>{workflow.labels.setAsCover ?? 'Set as cover'}</span>
														</button>
													) : null}
													<button
														type="button"
														onClick={() => setMediaDeleteTarget({ kind: 'attachment', taskId: task.id, attachmentId: attachment.id, name: attachment.name })}
														className="workflow-tool-icon-button workflow-tool-icon-button-danger"
														aria-label={t.common.delete}
													>
														<Trash2 size={15} />
													</button>
												</div>
											</div>
										);
									})}
									{task.attachments.length === 0 ? <div className="workflow-tool-empty-box">{workflow.labels.attachmentsPanel ?? 'Attachments'}</div> : null}
								</div>
								{taskMutable ? (
									<div className="workflow-upload-actions workflow-upload-actions-flat">
										<input id={attachmentInputId} type="file" onChange={(event) => setTaskAttachmentFile(event.target.files?.[0] ?? null)} className="workflow-hidden-file-input" />
										<label htmlFor={attachmentInputId} className="workflow-upload-picker">
											<Paperclip size={15} />
											<span>{taskAttachmentFile?.name ?? (workflow.labels.uploadFile ?? 'Importer un fichier')}</span>
										</label>
										<button
											type="button"
											disabled={!taskAttachmentFile}
											onClick={async () => {
												if (!taskAttachmentFile) return;
												const data = new FormData();
												data.append('file', taskAttachmentFile);
												await uploadTaskAttachment({ id: task.id, data }).unwrap();
												setTaskAttachmentFile(null);
											}}
											className="app-button workflow-upload-submit"
										>
											<Paperclip size={16} />
											<span>{uploadTaskAttachmentState.isLoading ? workflow.buttons.saving : t.common.add}</span>
										</button>
									</div>
								) : null}
							</div>
							) : null}
							{taskAddPanel === 'members' && isManager ? (
								<div className="app-card-muted workflow-trello-member-panel">
									<div className="workflow-tool-card-heading">
										<div className="flex items-center gap-2">
											<span className="workflow-tool-icon"><Users size={15} /></span>
											<p>{workflow.labels.membersPanel ?? 'Members'}</p>
										</div>
									</div>
									<div className="grid gap-3 md:grid-cols-[minmax(0,0.45fr)_minmax(0,1fr)_auto]">
										<SelectField
											value={reassignForm.assignee_id}
											onChange={(value) => setReassignForm((current) => ({ ...current, assignee_id: value }))}
											options={users.map((user) => ({ value: user.id, label: `${user.first_name} ${user.last_name}` }))}
											startIcon={<Users size={18} />}
											placeholder={workflow.labels.assignee}
										/>
										<Field value={reassignForm.reason} onChange={(value) => setReassignForm((current) => ({ ...current, reason: value }))} placeholder={workflow.labels.reassignReasonPlaceholder} startIcon={<MessagesSquare size={18} />} />
										<button
											type="button"
											onClick={async () => {
												await reassignTask({ id: task.id, assignee_id: Number(reassignForm.assignee_id), reason: reassignForm.reason.trim() }).unwrap();
												setReassignForm((current) => ({ ...current, reason: '' }));
												setTaskAddPanel(null);
											}}
											disabled={!validReassignAssigneeSelected || !reassignForm.reason.trim()}
											className="app-button"
										>
											<ArrowRight size={16} />
											<span>{reassignTaskState.isLoading ? workflow.buttons.moving : workflow.buttons.reassign}</span>
										</button>
									</div>
								</div>
							) : null}
						</div>
					</div>
					<div className="mt-4">
						<button type="button" onClick={() => archiveTask({ id: task.id, archived: !task.archived })} className="app-button app-button-secondary">
							<Archive size={16} />
							<span>{task.archived ? (workflow.buttons.restore ?? 'Restore') : (workflow.buttons.archive ?? 'Archive')}</span>
						</button>
					</div>
				</Surface>


				{(isManager || taskMutable) ? (
					<Surface className="workflow-task-detail-panel workflow-task-edit-panel" title={workflow.sections.editTask.title} description={isManager ? workflow.labels.managerControls : workflow.labels.updateMyProgress}>
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<FieldLabel>{workflow.labels.title}</FieldLabel>
								<Field value={taskEditForm.title} onChange={(value) => setTaskEditForm((current) => ({ ...current, title: value }))} startIcon={<ListTodo size={18} />} />
							</div>
							<div>
								<FieldLabel>{workflow.labels.assignee}</FieldLabel>
								<SelectField
									value={taskEditForm.current_assignee_id}
									onChange={(value) => setTaskEditForm((current) => ({ ...current, current_assignee_id: value }))}
									options={[
										{ value: '', label: workflow.labels.unassigned },
										...users.map((user) => ({ value: user.id, label: `${user.first_name} ${user.last_name}` })),
									]}
									startIcon={<Users size={18} />}
								/>
							</div>
							<div className="md:col-span-2">
								<FieldLabel>{workflow.labels.description}</FieldLabel>
								<Area value={taskEditForm.description} onChange={(value) => setTaskEditForm((current) => ({ ...current, description: value }))} startIcon={<MessagesSquare size={18} />} />
							</div>
							<div>
								<FieldLabel htmlFor="task-edit-status">{workflow.labels.status}</FieldLabel>
								<SelectField
									id="task-edit-status"
									value={taskEditForm.status}
									onChange={(value) => setTaskEditForm((current) => ({ ...current, status: value as TaskStatus }))}
									options={STATUS_COLUMNS.map((item) => ({ value: item, label: labelFor(item) }))}
									startIcon={<ListTodo size={18} />}
								/>
							</div>
							<div>
								<FieldLabel>{workflow.labels.priority}</FieldLabel>
								<SelectField
									value={taskEditForm.priority}
									onChange={(value) => setTaskEditForm((current) => ({ ...current, priority: value as TaskCard['priority'] }))}
									options={PRIORITY_OPTIONS.map((item) => ({ value: item, label: labelFor(item) }))}
									startIcon={<CircleAlert size={18} />}
								/>
							</div>
							<div>
								<FieldLabel>{workflow.labels.dueDate}</FieldLabel>
								<DateField value={taskEditForm.due_date} onChange={(value) => setTaskEditForm((current) => ({ ...current, due_date: value }))} />
							</div>
							{isManager ? (
								<div>
									<FieldLabel>{workflow.labels.estimatedMinutes}</FieldLabel>
									<WorkDaysField value={taskEditForm.estimated_minutes} onChange={(value) => setTaskEditForm((current) => ({ ...current, estimated_minutes: value }))} />
								</div>
							) : null}
							<div>
								<FieldLabel>{workflow.labels.sortOrder}</FieldLabel>
								<Field type="number" min={0} value={taskEditForm.sort_order} onChange={(value) => setTaskEditForm((current) => ({ ...current, sort_order: value }))} startIcon={<ArrowRight size={18} />} />
							</div>
							<div>
								<FieldLabel htmlFor="task-blocked-reason">{workflow.labels.blockedReason}</FieldLabel>
								<Field id="task-blocked-reason" value={taskEditForm.blocked_reason} onChange={(value) => setTaskEditForm((current) => ({ ...current, blocked_reason: value }))} placeholder={workflow.labels.blockedReasonPlaceholder} startIcon={<CircleAlert size={18} />} />
							</div>
						</div>
						<div className="mt-5 flex flex-wrap gap-3">
							<button
								type="button"
								onClick={() => updateTask({ id: task.id, data: buildTaskPayload(task.project.id, taskEditForm, { includeTime: isManager }) })}
								className="app-button"
							>
								<Pencil size={16} />
								<span>{updateTaskState.isLoading ? workflow.buttons.saving : workflow.buttons.saveTask}</span>
							</button>
							{!isManager ? (
								<button
									type="button"
									onClick={() =>
										updateTaskStatus({
											id: task.id,
											status: taskEditForm.status,
											blocked_reason: taskEditForm.blocked_reason,
											sort_order: Number(taskEditForm.sort_order || 0),
										})
									}
									className="app-button app-button-secondary"
								>
									<CheckCircle2 size={16} />
									<span>{updateStatusState.isLoading ? workflow.buttons.updating : workflow.buttons.updateStatus}</span>
								</button>
							) : null}
						</div>
					</Surface>
				) : (
					<Surface className="workflow-task-detail-panel workflow-task-permissions-panel" {...workflow.sections.permissions}>
						<EmptyState {...workflow.emptyStates.readOnly} />
					</Surface>
				)}

				{isManager ? (
					<Surface className="workflow-task-detail-panel workflow-task-reassign-panel" {...workflow.sections.reassignTask}>
						<div className="grid gap-4 md:grid-cols-[0.32fr_1fr_auto]">
							<div>
								<FieldLabel htmlFor="new-assignee">{workflow.labels.newAssignee}</FieldLabel>
								<SelectField
									id="new-assignee"
									value={reassignForm.assignee_id}
									onChange={(value) => setReassignForm((current) => ({ ...current, assignee_id: value }))}
									options={users.map((user) => ({ value: user.id, label: `${user.first_name} ${user.last_name}` }))}
									startIcon={<Users size={18} />}
									placeholder={workflow.labels.assignee}
								/>
							</div>
							<div>
								<FieldLabel htmlFor="reassign-reason">{workflow.labels.reason}</FieldLabel>
								<Field id="reassign-reason" value={reassignForm.reason} onChange={(value) => setReassignForm((current) => ({ ...current, reason: value }))} placeholder={workflow.labels.reassignReasonPlaceholder} startIcon={<MessagesSquare size={18} />} />
							</div>
							<div className="self-end">
								<button
									type="button"
									onClick={async () => {
										await reassignTask({
											id: task.id,
											assignee_id: Number(reassignForm.assignee_id),
											reason: reassignForm.reason.trim(),
										}).unwrap();
										setReassignForm((current) => ({ ...current, reason: '' }));
									}}
									disabled={!validReassignAssigneeSelected || !reassignForm.reason.trim()}
									className="app-button"
								>
									<ArrowRight size={16} />
									<span>{reassignTaskState.isLoading ? workflow.buttons.moving : workflow.buttons.reassign}</span>
								</button>
							</div>
						</div>
					</Surface>
				) : null}

				<div className="workflow-task-history-grid">
					<Surface className="workflow-task-detail-panel workflow-task-comments-panel" {...workflow.sections.comments}>
						{taskMutable ? (
							<div className="space-y-3">
								<FieldLabel htmlFor="add-comment">{workflow.labels.addComment}</FieldLabel>
								<Area id="add-comment" value={commentBody} onChange={setCommentBody} rows={3} placeholder={workflow.labels.commentPlaceholder} startIcon={<MessagesSquare size={18} />} />
								<button
									type="button"
									onClick={async () => {
										await addTaskComment({ id: task.id, body: commentBody.trim() }).unwrap();
										setCommentBody('');
									}}
									disabled={!commentBody.trim()}
									className="app-button"
								>
									<MessagesSquare size={16} />
									<span>{addCommentState.isLoading ? workflow.buttons.posting : workflow.buttons.postComment}</span>
								</button>
							</div>
						) : null}
						<div className="mt-4 space-y-3">
							{pagedTaskComments.map((comment) => (
								<div key={comment.id} className="app-card-muted p-4">
									<div className="flex items-start gap-3">
										<AvatarBadge user={comment.author} size={34} />
										<div className="min-w-0 flex-1">
											<p className="text-sm font-semibold text-(--ink)">
												{comment.author.first_name} {comment.author.last_name}
											</p>
											<p className="mt-1 text-xs uppercase tracking-[0.14em] text-(--ink-soft)">{dateTimeFor(comment.created_at)}</p>
											<p className="mt-2 text-sm leading-6 text-(--ink-soft)">{comment.body}</p>
										</div>
									</div>
								</div>
							))}
							{task.comments.length === 0 ? <EmptyState {...workflow.emptyStates.noCommentsYet} /> : null}
							<HistoryPager page={taskCommentsPage} totalPages={taskCommentsTotalPages} onChange={setTaskCommentsPage} />
						</div>
					</Surface>

					{isManager ? <Surface className="workflow-task-detail-panel workflow-task-time-panel" {...workflow.sections.timeEntries}>
						<div className="app-card-muted flex items-start gap-3 p-4">
							<div className="mt-0.5 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">
								<Clock3 size={16} />
							</div>
							<div className="min-w-0">
								<p className="text-sm font-semibold text-(--ink)">{workflow.labels.timeEntries}</p>
								<p className="mt-1 text-sm leading-6 text-(--ink-soft)">
									{workflow.labels.timeAutomationHint ?? 'Le temps se met a jour automatiquement quand la tache passe en cours ou change d assigne.'}
								</p>
							</div>
						</div>
						<div className="mt-4 space-y-3">
							{pagedTaskTimeEntries.map((entry) => (
                                <div key={entry.id} className="app-card-muted p-4">
                                    <div className="flex items-start gap-3">
                                        <AvatarBadge user={entry.user} size={34} />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-(--ink)">
                                                {entry.user.first_name} {entry.user.last_name} • {formatMinutes(entry.minutes)}
                                            </p>
                                            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-(--ink-soft)">{dateTimeFor(entry.created_at)}</p>
                                            <p className="mt-2 text-sm leading-6 text-(--ink-soft)">{entry.note || workflow.labels.optionalNote}</p>
                                        </div>
                                    </div>
                                </div>
							))}
							{task.time_entries.length === 0 ? <EmptyState {...workflow.emptyStates.noTime} /> : null}
                            <HistoryPager page={taskTimeEntriesPage} totalPages={taskTimeEntriesTotalPages} onChange={setTaskTimeEntriesPage} />
						</div>
					</Surface> : null}
				</div>

				<Surface className="workflow-task-detail-panel workflow-task-activity-panel" {...workflow.sections.activity}>
					<div className="workflow-task-activity-list">
						{pagedTaskActivity.map((activity) => (
                            <div key={activity.id} className="app-card-muted p-4">
                                <div className="flex items-start gap-3">
                                    {activity.actor ? <AvatarBadge user={activity.actor} size={34} /> : <div className="grid h-[34px] w-[34px] place-items-center rounded-full bg-(--surface-strong) text-xs font-bold text-(--ink)">DW</div>}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-(--ink)">
                                            {activity.actor ? `${activity.actor.first_name} ${activity.actor.last_name}` : workflow.labels.system}
                                        </p>
                                        <p className="mt-2 text-sm leading-6 text-(--ink-soft)">{describeWorkflowActivity(activity)}</p>
                                        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-(--ink-soft)">{dateTimeFor(activity.created_at)}</p>
                                    </div>
                                </div>
                            </div>
						))}
						<HistoryPager page={taskActivityPage} totalPages={taskActivityTotalPages} onChange={setTaskActivityPage} />
					</div>
				</Surface>
			</div>
		);
	};

	const renderTeam = () => {
		const totalOpenTasks = workload.reduce((sum, row) => sum + row.open_tasks, 0);
		const totalOverdueTasks = workload.reduce((sum, row) => sum + row.overdue_tasks, 0);
		const totalEstimatedMinutes = workload.reduce((sum, row) => sum + row.estimated_minutes, 0);
		const totalActualMinutes = workload.reduce((sum, row) => sum + row.actual_minutes, 0);
		const maxOpenTasks = Math.max(1, ...workload.map((row) => row.open_tasks));
		const maxEstimatedMinutes = Math.max(1, ...workload.map((row) => row.estimated_minutes));
		const leadUser = [...workload].sort((left, right) => right.open_tasks - left.open_tasks || right.overdue_tasks - left.overdue_tasks)[0];
		const chartRows = [...workload]
			.sort((left, right) => right.estimated_minutes - left.estimated_minutes || right.open_tasks - left.open_tasks)
			.slice(0, 8);
		const teamChartHeight = Math.min(300, Math.max(200, chartRows.length * 38 + 86));
		const teamBarData: ChartData<'bar', number[], string> = {
			labels: chartRows.map((row) => `${row.user.first_name} ${row.user.last_name}`.trim() || row.user.email),
			datasets: [
				{
					label: workflow.labels.estimatedLoad,
					data: chartRows.map((row) => row.estimated_minutes),
					backgroundColor: '#111827',
					borderRadius: 10,
					borderSkipped: false,
					barThickness: 14,
				},
				{
					label: workflow.labels.logged,
					data: chartRows.map((row) => row.actual_minutes),
					backgroundColor: '#94a3b8',
					borderRadius: 10,
					borderSkipped: false,
					barThickness: 14,
				},
			],
		};
		const teamBarOptions: ChartOptions<'bar'> = {
			indexAxis: 'y',
			responsive: true,
			maintainAspectRatio: false,
			animation: false,
			plugins: {
				legend: {
					position: 'bottom',
					labels: {
						boxWidth: 8,
						boxHeight: 8,
						color: '#475569',
						font: { weight: 'bold' },
						padding: 14,
						usePointStyle: true,
					},
				},
				tooltip: {
					callbacks: {
						label: (context) => `${context.dataset.label}: ${formatWorkDays(Number(context.raw) || 0, workflow.labels.daysUnit)}`,
					},
				},
			},
			scales: {
				x: {
					border: { display: false },
					grid: { color: 'rgba(148, 163, 184, 0.18)' },
					ticks: {
						color: '#64748b',
						font: { weight: 'bold' },
						autoSkip: true,
						maxRotation: 0,
						maxTicksLimit: 4,
						minRotation: 0,
						callback: (value) => formatWorkDays(Number(value) || 0, workflow.labels.daysUnit),
					},
				},
				y: {
					border: { display: false },
					grid: { display: false },
					ticks: {
						color: '#334155',
						font: { weight: 'bold' },
						callback: (value) => `#${Number(value) + 1}`,
					},
				},
			},
		};
		const pressureRows = workload
			.filter((row) => row.overdue_tasks > 0 || row.open_tasks >= Math.max(4, Math.ceil(maxOpenTasks * 0.75)))
			.sort((left, right) => right.overdue_tasks - left.overdue_tasks || right.open_tasks - left.open_tasks)
			.slice(0, 4);
		const calmRows = workload
			.filter((row) => row.overdue_tasks === 0)
			.sort((left, right) => left.open_tasks - right.open_tasks)
			.slice(0, 4);

		return (
			<div className="workflow-team-page">
				<WorkflowPageHero
					className="workflow-team-header"
					eyebrow={workflow.labels.workflow}
					title={workflow.pageTitles.team}
					actionsClassName="workflow-team-header-actions"
					actions={
						<>
							<span>{workflow.labels.contributors} {workload.length}</span>
							<span>{workflow.labels.open} {totalOpenTasks}</span>
							<span>{workflow.labels.overdue} {totalOverdueTasks}</span>
						</>
					}
				/>

				<section className="workflow-team-metrics">
					<MetricCard icon={<Users size={16} />} label={workflow.labels.teamMembers ?? 'Team members'} value={workload.length} tone="indigo" />
					<MetricCard icon={<ListTodo size={16} />} label={workflow.labels.openTasksLabel ?? 'Open tasks'} value={totalOpenTasks} tone="amber" />
					<MetricCard icon={<CircleAlert size={16} />} label={workflow.labels.overdueTasksLabel ?? 'Overdue tasks'} value={totalOverdueTasks} tone="rose" />
					<MetricCard icon={<Clock3 size={16} />} label={workflow.labels.estimatedLoad ?? 'Estimated load'} value={formatWorkDays(totalEstimatedMinutes, workflow.labels.daysUnit)} tone="green" />
				</section>

				<section className="workflow-team-grid">
					{workload.length ? (
						<section className="workflow-team-analytics">
							<WorkflowPanelPill baseClassName="workflow-team-panel-pill" label={workflow.labels.teamLoadMap} value={`${formatMinutes(totalActualMinutes)} ${workflow.labels.loggedSuffix}`} labelElement="span" />
							<div className="workflow-team-chart-body" style={{ height: teamChartHeight }}>
								<Bar data={teamBarData} options={teamBarOptions} />
							</div>
							<div className="workflow-team-chart-keys">
								{chartRows.map((row, index) => (
									<span key={row.user.id}>
										<b>#{index + 1}</b>
										{`${row.user.first_name} ${row.user.last_name}`.trim() || row.user.email}
									</span>
								))}
							</div>
						</section>
					) : null}
					<div className="workflow-team-board">
						<WorkflowPanelPill baseClassName="workflow-team-panel-pill" label={workflow.sections.teamWorkload.title} value={`${formatMinutes(totalActualMinutes)} ${workflow.labels.loggedSuffix}`} labelElement="span" />
						<div className="workflow-team-card-grid">
							{workload.map((row: WorkloadRow) => {
								const loadPercent = Math.min(100, Math.round((row.open_tasks / maxOpenTasks) * 100));
								const estimatePercent = Math.min(100, Math.round((row.estimated_minutes / maxEstimatedMinutes) * 100));
								const tone = row.overdue_tasks > 0 ? 'danger' : row.open_tasks >= maxOpenTasks && maxOpenTasks > 1 ? 'heavy' : 'calm';
								const online = isUserOnline(row.user.id);
								return (
									<article
										key={row.user.id}
										className="workflow-team-card"
										data-tone={tone}
										style={{ '--team-load': `${loadPercent}%`, '--team-estimate': `${estimatePercent}%` } as CSSProperties}
									>
										<div className="workflow-team-card-head">
											<div className="workflow-team-person">
												<AvatarBadge user={row.user} size={42} />
												<div className="min-w-0">
													<h3>{row.user.first_name} {row.user.last_name}</h3>
													<p>{labelFor(row.user.role)}</p>
												</div>
											</div>
											<div className="workflow-team-status-chips">
												<Chip tone={online ? 'progress' : 'neutral'}>{online ? workflow.labels.online : workflow.labels.offline}</Chip>
												<Chip tone={row.overdue_tasks > 0 ? 'urgent' : 'neutral'}>{row.overdue_tasks > 0 ? workflow.labels.highPressure : workflow.labels.balanced}</Chip>
											</div>
										</div>
										<div className="workflow-team-bars">
											<div>
												<span>{workflow.labels.openTasksLabel}</span>
												<b>{row.open_tasks}</b>
											</div>
											<div className="workflow-team-load-track"><span /></div>
											<div>
												<span>{workflow.labels.estimatedLoad}</span>
												<b>{formatWorkDays(row.estimated_minutes, workflow.labels.daysUnit)}</b>
											</div>
											<div className="workflow-team-estimate-track"><span /></div>
										</div>
										<div className="workflow-team-card-footer">
											<span><CircleAlert size={13} /> {row.overdue_tasks} {workflow.labels.overdueLower}</span>
											<span><Clock3 size={13} /> {formatMinutes(row.actual_minutes)}</span>
										</div>
									</article>
								);
							})}
							{workload.length === 0 ? <EmptyState {...workflow.emptyStates.noWorkloadData} /> : null}
						</div>
					</div>

					<aside className="workflow-team-side">
						<div className="workflow-team-spotlight">
							<WorkflowPanelPill baseClassName="workflow-team-panel-pill" label={workflow.labels.teamFocus} value={leadUser ? `${leadUser.open_tasks} ${workflow.labels.openLower}` : '0'} labelElement="span" />
							{leadUser ? (
								<>
									<div className="workflow-team-spotlight-body">
										<AvatarBadge user={leadUser.user} size={54} />
										<div className="min-w-0">
											<h3>{leadUser.user.first_name} {leadUser.user.last_name}</h3>
											<p>{labelFor(leadUser.user.role)}</p>
										</div>
									</div>
									<div className="workflow-team-spotlight-stats">
										<span><b>{leadUser.open_tasks}</b>{workflow.labels.openTasksLabel}</span>
										<span><b>{leadUser.overdue_tasks}</b>{workflow.labels.overdueTasksLabel}</span>
										<span><b>{formatWorkDays(leadUser.estimated_minutes, workflow.labels.daysUnit)}</b>{workflow.labels.estimatedLoad}</span>
									</div>
								</>
							) : <EmptyState {...workflow.emptyStates.noWorkloadData} />}
						</div>

						<div className="workflow-team-lane">
							<WorkflowPanelPill baseClassName="workflow-team-panel-pill" className="workflow-team-panel-pill-rose" label={workflow.labels.attentionLane} value={pressureRows.length} labelElement="span" />
							{pressureRows.map((row) => (
								<div key={row.user.id} className="workflow-team-mini-row">
									<AvatarBadge user={row.user} size={30} />
									<div>
										<p>{row.user.first_name} {row.user.last_name}</p>
										<span>{row.open_tasks} {workflow.labels.openLower} - {row.overdue_tasks} {workflow.labels.overdueLower}</span>
									</div>
								</div>
							))}
							{pressureRows.length === 0 ? <div className="workflow-team-empty-line">{workflow.labels.noPressure}</div> : null}
						</div>

						<div className="workflow-team-lane">
							<WorkflowPanelPill baseClassName="workflow-team-panel-pill" className="workflow-team-panel-pill-green" label={workflow.labels.availableLane} value={calmRows.length} labelElement="span" />
							{calmRows.map((row) => (
								<div key={row.user.id} className="workflow-team-mini-row">
									<AvatarBadge user={row.user} size={30} />
									<div>
										<p>{row.user.first_name} {row.user.last_name}</p>
										<span>{row.open_tasks} {workflow.labels.openLower} - {formatWorkDays(row.estimated_minutes, workflow.labels.daysUnit)}</span>
									</div>
								</div>
							))}
							{calmRows.length === 0 ? <div className="workflow-team-empty-line">{workflow.labels.noAvailableLane}</div> : null}
						</div>
					</aside>
				</section>
			</div>
		);
	};

	const renderReport = () => {
		const totalMinutes = timeReport.reduce((sum, row) => sum + row.minutes, 0);
		const sortedReport = [...timeReport].sort((left, right) => right.minutes - left.minutes);
		const topRow = sortedReport[0];
		const maxMinutes = Math.max(...timeReport.map((row) => row.minutes), 1);
		const averageMinutes = timeReport.length ? Math.round(totalMinutes / timeReport.length) : 0;
		const chartRows = sortedReport.slice(0, 8);
		const topDistributionRows = sortedReport.slice(0, 5);
		const otherMinutes = sortedReport.slice(5).reduce((sum, row) => sum + row.minutes, 0);
		const topSharePercent = totalMinutes && topRow ? Math.round((topRow.minutes / totalMinutes) * 100) : 0;
		const remainingProjectCount = Math.max(0, timeReport.length - topDistributionRows.length);
		const reportBarHeight = Math.min(430, Math.max(260, chartRows.length * 44 + 150));
		const reportPalette = WORKFLOW_CHART_PALETTE;
		const reportBarData: ChartData<'bar', number[], string> = {
			labels: chartRows.map((row) => row.project.name),
			datasets: [
				{
					label: workflow.labels.trackedTime,
					data: chartRows.map((row) => row.minutes),
					backgroundColor: chartRows.map((_, index) => reportPalette[index % reportPalette.length]),
					borderRadius: 12,
					borderSkipped: false,
					barThickness: 18,
				},
			],
		};
		const reportBarOptions: ChartOptions<'bar'> = {
			indexAxis: 'y',
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: false },
				tooltip: {
					callbacks: {
						label: (context) => `${workflow.labels.trackedTime}: ${formatMinutes(Number(context.raw) || 0)}`,
					},
				},
			},
			scales: {
				x: {
					border: { display: false },
					grid: { color: 'rgba(148, 163, 184, 0.18)' },
					ticks: {
						color: '#64748b',
						font: { weight: 'bold' },
						autoSkip: true,
						maxRotation: 0,
						maxTicksLimit: 4,
						minRotation: 0,
						callback: (value) => formatMinutes(Number(value) || 0),
					},
				},
				y: {
					border: { display: false },
					grid: { display: false },
					ticks: {
						color: '#334155',
						font: { weight: 'bold' },
						callback: (value) => `#${Number(value) + 1}`,
					},
				},
			},
		};
		const doughnutLabels = [
			...topDistributionRows.map((row) => row.project.name),
			...(otherMinutes > 0 ? [workflow.labels.otherProjects] : []),
		];
		const doughnutValues = [
			...topDistributionRows.map((row) => row.minutes),
			...(otherMinutes > 0 ? [otherMinutes] : []),
		];
		const reportDoughnutData: ChartData<'doughnut', number[], string> = {
			labels: doughnutLabels,
			datasets: [
				{
					data: doughnutValues,
					backgroundColor: doughnutValues.map((_, index) => reportPalette[index % reportPalette.length]),
					borderColor: '#ffffff',
					borderWidth: 4,
					hoverOffset: 8,
				},
			],
		};
		const reportDoughnutOptions: ChartOptions<'doughnut'> = {
			responsive: true,
			maintainAspectRatio: false,
			cutout: '66%',
			plugins: {
				legend: {
					position: 'bottom',
					labels: {
						boxWidth: 8,
						boxHeight: 8,
						color: '#475569',
						font: { weight: 'bold' },
						padding: 14,
						usePointStyle: true,
					},
				},
				tooltip: {
					callbacks: {
						label: (context) => `${context.label}: ${formatMinutes(Number(context.raw) || 0)}`,
					},
				},
			},
		};
		const reportCurveData: ChartData<'line', number[], string> = {
			labels: chartRows.map((_, index) => `#${index + 1}`),
			datasets: [
				{
					label: workflow.labels.effortCurve,
					data: chartRows.map((row) => row.minutes),
					borderColor: '#111827',
					backgroundColor: 'rgba(17, 24, 39, 0.08)',
					fill: true,
					pointBackgroundColor: '#6b7280',
					pointBorderColor: '#ffffff',
					pointBorderWidth: 3,
					pointRadius: 5,
					tension: 0.42,
				},
			],
		};
		const reportCurveOptions: ChartOptions<'line'> = {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: false },
				tooltip: {
					callbacks: {
						label: (context) => `${workflow.labels.trackedTime}: ${formatMinutes(Number(context.raw) || 0)}`,
					},
				},
			},
			scales: {
				x: {
					border: { display: false },
					grid: { display: false },
					ticks: { color: '#64748b', font: { weight: 'bold' } },
				},
				y: {
					border: { display: false },
					grid: { color: 'rgba(148, 163, 184, 0.16)' },
					ticks: {
						color: '#64748b',
						font: { weight: 'bold' },
						autoSkip: true,
						maxRotation: 0,
						maxTicksLimit: 5,
						minRotation: 0,
						callback: (value) => formatMinutes(Number(value) || 0),
					},
				},
			},
		};
		const dateWindow =
			reportFilters.start_date || reportFilters.end_date
				? `${reportFilters.start_date || workflow.labels.noDate} - ${reportFilters.end_date || workflow.labels.noDate}`
				: workflow.labels.allTimeWindow;
		const printableReportCopy: PrintableReportCopy = {
			title: workflow.pageTitles['report-time'],
			trackedTime: workflow.labels.trackedTime,
			leadTime: workflow.labels.leadTime,
			cycleTime: workflow.labels.cycleTime,
			blockedTime: workflow.labels.blockedTime,
			projectTime: workflow.labels.projectTime ?? workflow.labels.timeByProject,
			project: workflow.labels.project,
			manager: workflow.labels.manager,
			minutes: workflow.labels.minutesUnit,
			hours: workflow.labels.hoursUnit,
			designerForecast: workflow.labels.designerForecast,
			designer: workflow.statuses.designer ?? 'Designer',
			openTasks: workflow.labels.openTasksLabel,
			overdueTasks: workflow.labels.overdueTasksLabel,
			remainingMinutes: workflow.labels.remainingMinutes,
			loadPercent: workflow.labels.loadPercent,
			risk: workflow.labels.risk,
			noProjectTimeWindow: workflow.labels.noProjectTimeWindow,
			noForecastRows: workflow.labels.noForecastRows,
		};
		const exportTimeReport = () => {
			downloadCsv('design-workflow-time-report.csv', [
				[workflow.labels.project, workflow.labels.manager, workflow.labels.status, workflow.labels.priority, workflow.labels.minutesUnit, workflow.labels.hoursUnit],
				...sortedReport.map((row) => [
					row.project.name,
					`${row.project.manager.first_name} ${row.project.manager.last_name}`.trim() || row.project.manager.email,
					labelFor(row.project.status),
					labelFor(row.project.priority),
					row.minutes,
					Math.round((row.minutes / 60) * 100) / 100,
				]),
			]);
		};
		const exportWorkflowReport = (report?: WorkflowAnalyticsReport) => {
			if (!report) return;
			downloadCsv('design-workflow-analytics-report.csv', [
				[workflow.labels.metric, t.common.value],
				[workflow.labels.tasksSampled, report.tasks_sampled],
				[workflow.labels.leadTimeDays, report.lead_time_days],
				[workflow.labels.cycleTimeDays, report.cycle_time_days],
				[workflow.labels.blockedTasks, report.blocked_tasks],
				[workflow.labels.blockedTimeMinutes, report.blocked_time_minutes],
				[workflow.labels.needsReview, report.review_bottlenecks.needs_review],
				[workflow.labels.changesRequested, report.review_bottlenecks.changes_requested],
				[workflow.labels.pendingReviewMinutes, report.review_bottlenecks.pending_review_minutes],
				[workflow.labels.estimatedMinutesMetric, report.estimate_vs_actual.estimated_minutes],
				[workflow.labels.actualMinutes, report.estimate_vs_actual.actual_minutes],
				[workflow.labels.varianceMinutes, report.estimate_vs_actual.variance_minutes],
				[],
				[workflow.statuses.designer ?? 'Designer', workflow.labels.openTasksLabel, workflow.labels.overdueTasksLabel, workflow.labels.remainingMinutes, workflow.labels.loadPercent, workflow.labels.forecastDays, workflow.labels.risk],
				...report.designer_forecast.map((row) => [
					`${row.user.first_name} ${row.user.last_name}`.trim() || row.user.email,
					row.open_tasks,
					row.overdue_tasks,
					row.remaining_minutes,
					row.load_percent,
					row.forecast_days,
					riskLabelFor(row.risk),
				]),
			]);
		};
		const exportPrintableReport = () => {
			openPrintableReport({ dateWindow, totalMinutes, timeReport: sortedReport, workflowReport, copy: printableReportCopy, riskLabelFor });
		};
		const reviewBottlenecks = workflowReport?.review_bottlenecks;
		const estimateVsActual = workflowReport?.estimate_vs_actual;
		const forecastRows = workflowReport?.designer_forecast ?? [];
		const statusRows = workflowReport
			? STATUS_COLUMNS.map((statusValue) => ({
					status: statusValue,
					count: workflowReport.status_counts[statusValue] ?? 0,
				}))
			: [];

		return (
			<div className="workflow-report-shell">
				<WorkflowPageHero
					className="workflow-report-hero"
					eyebrow={workflow.labels.reportStudio}
					title={workflow.pageTitles['report-time']}
					actionsWrapper={false}
					actions={
						<div className="workflow-report-window">
							<CalendarDays size={18} />
							<span>{dateWindow}</span>
						</div>
					}
				/>

				<section className="workflow-report-filterbar">
					<div className="workflow-report-date-fields">
						<div>
							<FieldLabel>{workflow.labels.startDate}</FieldLabel>
							<DateField value={reportFilters.start_date} onChange={(value) => setReportFilters((current) => ({ ...current, start_date: value }))} />
						</div>
						<div>
							<FieldLabel>{workflow.labels.endDate}</FieldLabel>
							<DateField value={reportFilters.end_date} onChange={(value) => setReportFilters((current) => ({ ...current, end_date: value }))} />
						</div>
					</div>
					<div className="workflow-report-actions">
						<button type="button" onClick={() => setReportFilters({ start_date: '', end_date: '' })} className="workflow-report-clear">
							<RefreshCcw size={15} />
							<span>{workflow.buttons.clearFilters}</span>
						</button>
						<button type="button" onClick={exportTimeReport} className="workflow-report-clear workflow-report-export" disabled={timeReport.length === 0}>
							<Save size={15} />
							<span>{workflow.buttons.exportCsv ?? 'Export CSV'}</span>
						</button>
						<button type="button" onClick={() => exportWorkflowReport(workflowReport)} className="workflow-report-clear workflow-report-export" disabled={!workflowReport}>
							<Table2 size={15} />
							<span>{workflow.buttons.exportAnalyticsCsv ?? 'Export analytics'}</span>
						</button>
						<button type="button" onClick={exportPrintableReport} className="workflow-report-clear workflow-report-export">
							<FileText size={15} />
							<span>{workflow.buttons.exportPdf ?? 'Export PDF'}</span>
						</button>
					</div>
				</section>

				<section className="workflow-report-metrics">
					<WorkflowSimpleMetric className="workflow-report-metric workflow-report-metric-dark" icon={<Clock3 size={18} />} label={workflow.labels.trackedTime} value={formatMinutes(totalMinutes)} />
					<WorkflowSimpleMetric className="workflow-report-metric workflow-report-metric-cyan" icon={<FolderKanban size={18} />} label={workflow.labels.activeReportProjects} value={timeReport.length} />
					<WorkflowSimpleMetric className="workflow-report-metric workflow-report-metric-green" icon={<BriefcaseBusiness size={18} />} label={workflow.labels.averagePerProject} value={formatMinutes(averageMinutes)} />
					<WorkflowSimpleMetric className="workflow-report-metric workflow-report-metric-rose" icon={<ShieldCheck size={18} />} label={workflow.labels.topProject} value={topRow ? topRow.project.name : workflow.labels.noReportProject} />
				</section>

				{workflowReport ? (
					<section className="workflow-analytics-grid">
						<article className="workflow-analytics-panel workflow-analytics-panel-strong">
							<div className="workflow-analytics-panel-head">
								<p>{workflow.labels.deliveryFlow ?? 'Delivery flow'}</p>
								<h2>{workflow.labels.leadCycleTime ?? 'Lead and cycle time'}</h2>
							</div>
							<div className="workflow-analytics-kpis">
								<div>
									<span>{workflow.labels.leadTime ?? 'Lead time'}</span>
									<strong>{workflowReport.lead_time_days}d</strong>
								</div>
								<div>
									<span>{workflow.labels.cycleTime ?? 'Cycle time'}</span>
									<strong>{workflowReport.cycle_time_days}d</strong>
								</div>
								<div>
									<span>{workflow.labels.blockedTime ?? 'Blocked time'}</span>
									<strong>{formatMinutes(workflowReport.blocked_time_minutes)}</strong>
								</div>
								<div>
									<span>{workflow.labels.blockedTasks ?? 'Blocked tasks'}</span>
									<strong>{workflowReport.blocked_tasks}</strong>
								</div>
							</div>
						</article>

						<article className="workflow-analytics-panel">
							<div className="workflow-analytics-panel-head">
								<p>{workflow.labels.reviewBottlenecks ?? 'Review bottlenecks'}</p>
								<h2>{formatMinutes(reviewBottlenecks?.pending_review_minutes ?? 0)}</h2>
							</div>
							<div className="workflow-analytics-stack">
								<span>{workflow.labels.needsReview ?? 'Needs review'} <b>{reviewBottlenecks?.needs_review ?? 0}</b></span>
								<span>{workflow.labels.changesRequested ?? 'Changes requested'} <b>{reviewBottlenecks?.changes_requested ?? 0}</b></span>
								<span>{workflow.labels.approved ?? 'Approved'} <b>{reviewBottlenecks?.approved ?? 0}</b></span>
								<span>{workflow.labels.averageReviewWait ?? 'Average wait'} <b>{formatMinutes(reviewBottlenecks?.average_pending_review_minutes ?? 0)}</b></span>
							</div>
						</article>

						<article className="workflow-analytics-panel">
							<div className="workflow-analytics-panel-head">
								<p>{workflow.labels.estimateVsActual ?? 'Estimate vs actual'}</p>
								<h2>{formatMinutes(Math.abs(estimateVsActual?.variance_minutes ?? 0))}</h2>
							</div>
							<div className="workflow-analytics-stack">
								<span>{workflow.labels.estimatedLoad ?? 'Estimated'} <b>{formatMinutes(estimateVsActual?.estimated_minutes ?? 0)}</b></span>
								<span>{workflow.labels.trackedTime ?? 'Actual'} <b>{formatMinutes(estimateVsActual?.actual_minutes ?? 0)}</b></span>
								<span>{workflow.labels.variance ?? 'Variance'} <b>{formatMinutes(estimateVsActual?.variance_minutes ?? 0)}</b></span>
								<span>{workflow.labels.actualRatio ?? 'Actual ratio'} <b>{Math.round((estimateVsActual?.actual_to_estimate_ratio ?? 0) * 100)}%</b></span>
							</div>
						</article>
					</section>
				) : null}

				{workflowReport ? (
					<section className="workflow-forecast-board">
						<div className="workflow-report-board-head">
							<div>
								<p>{workflow.labels.designerForecast ?? 'Designer forecast'}</p>
								<h2>{workflow.labels.capacityForecast ?? 'Capacity forecast'}</h2>
							</div>
							<span>{workflowReport.tasks_sampled} {workflow.labels.cards}</span>
						</div>
						<div className="workflow-forecast-layout">
							<div className="workflow-forecast-list">
								{forecastRows.map((row) => (
									<article key={row.user.id} className="workflow-forecast-card" data-risk={row.risk}>
										<div className="workflow-forecast-card-head">
											<AvatarBadge user={row.user} size={34} />
											<div className="min-w-0">
												<h3>{row.user.first_name} {row.user.last_name}</h3>
												<p>{row.open_tasks} {workflow.labels.openLower} - {row.overdue_tasks} {workflow.labels.overdueLower}</p>
											</div>
											<strong>{row.load_percent}%</strong>
										</div>
										<div className="workflow-forecast-track" aria-hidden="true">
											<span style={{ width: `${Math.min(row.load_percent, 100)}%` }} />
										</div>
										<div className="workflow-forecast-card-foot">
											<span>{formatMinutes(row.remaining_minutes)}</span>
											<span>{row.forecast_days} {workflow.labels.daysUnit.toLowerCase()}</span>
											<span>{riskLabelFor(row.risk)}</span>
										</div>
									</article>
								))}
								{forecastRows.length === 0 ? <EmptyState {...workflow.emptyStates.noWorkloadData} /> : null}
							</div>
							<div className="workflow-status-distribution">
								{statusRows.map((row) => (
									<div key={row.status}>
										<span>{labelFor(row.status)}</span>
										<strong>{row.count}</strong>
									</div>
								))}
							</div>
						</div>
					</section>
				) : null}

				{timeReport.length ? (
					<section className="workflow-report-analytics">
						<article className="workflow-report-chart-card workflow-report-chart-card-wide">
							<div className="workflow-report-chart-head">
								<div>
									<p>{workflow.labels.analyticsStudio}</p>
									<h2>{workflow.labels.timeByProject}</h2>
								</div>
								<span>{workflow.labels.topFiveProjects}</span>
							</div>
							<div className="workflow-report-chart-body workflow-report-chart-body-bar" style={{ height: reportBarHeight }}>
								<Bar data={reportBarData} options={reportBarOptions} />
							</div>
							<div className="workflow-report-chart-keys">
								{chartRows.map((row, index) => (
									<span key={row.project.id}>
										<b>#{index + 1}</b>
										{row.project.name}
									</span>
								))}
							</div>
						</article>

						<article className="workflow-report-chart-card workflow-report-doughnut-card">
							<div className="workflow-report-chart-head">
								<div>
									<p>{workflow.labels.reportCharts}</p>
									<h2>{workflow.labels.effortDistribution}</h2>
								</div>
							</div>
							<div className="workflow-report-chart-body workflow-report-chart-body-doughnut">
								<Doughnut data={reportDoughnutData} options={reportDoughnutOptions} />
								<div className="workflow-report-doughnut-center" aria-hidden="true">
									<span>{workflow.labels.chartTotal}</span>
									<strong>{formatMinutes(totalMinutes)}</strong>
								</div>
							</div>
						</article>

						<article className="workflow-report-chart-card workflow-report-line-card">
							<div className="workflow-report-chart-head">
								<div>
									<p>{workflow.labels.reportChartsHint}</p>
									<h2>{workflow.labels.effortCurve}</h2>
								</div>
							</div>
							<div className="workflow-report-chart-body workflow-report-chart-body-line">
								<Line data={reportCurveData} options={reportCurveOptions} />
							</div>
						</article>

						<div className="workflow-report-insights">
							<div className="workflow-report-insight">
								<span>{workflow.labels.topShare}</span>
								<strong>{topSharePercent}%</strong>
							</div>
							<div className="workflow-report-insight">
								<span>{workflow.labels.remainingProjects}</span>
								<strong>{remainingProjectCount}</strong>
							</div>
							<div className="workflow-report-insight">
								<span>{workflow.labels.chartTotal}</span>
								<strong>{formatMinutes(totalMinutes)}</strong>
							</div>
						</div>
					</section>
				) : null}

				<section className="workflow-report-board">
					<div className="workflow-report-board-head">
						<div>
							<p>{workflow.labels.timeLedger}</p>
							<h2>{workflow.sections.projectTotals.title}</h2>
						</div>
						<span>{timeReport.length} {workflow.labels.projects}</span>
					</div>
					<div className="workflow-report-grid">
						{sortedReport.map((row: TimeReportRow, index) => {
							const percent = Math.max(8, Math.round((row.minutes / maxMinutes) * 100));
							return (
								<article key={row.project.id} className="workflow-report-card">
									<div className="workflow-report-card-top">
										<div className="workflow-report-rank">{String(index + 1).padStart(2, '0')}</div>
										<div className="min-w-0">
											<h3>{row.project.name}</h3>
											<p>{row.project.manager.first_name} {row.project.manager.last_name}</p>
										</div>
										<Chip>{formatMinutes(row.minutes)}</Chip>
									</div>
									<div className="workflow-report-bar" aria-hidden="true">
										<span style={{ width: `${percent}%` }} />
									</div>
									<div className="workflow-report-card-foot">
										<span>{workflow.labels.manager}</span>
										<strong>{workflow.labels.loggedSuffix}</strong>
									</div>
								</article>
							);
						})}
						{timeReport.length === 0 ? <EmptyState {...workflow.emptyStates.noReportData} /> : null}
					</div>
				</section>
			</div>
		);
	};

	const renderNotifications = () => {
		const unreadCount = notifications.filter((item) => !item.is_read).length;
		const taskAlertCount = notifications.filter((item) => item.task).length;
		const chatAlertCount = notifications.filter((item) => item.type === 'chat_message').length;
		const markAllNotificationsRead = () => {
			void Promise.all(notifications.filter((item) => !item.is_read).map((item) => markNotificationRead(item.id)));
		};
		const toneForNotification = (notification: NotificationItem) =>
			notification.type === 'chat_message' ? 'cyan' : notification.task ? 'green' : notification.is_read ? 'indigo' : 'rose';
		const updatePreference = (key: 'mentions' | 'assignments' | 'review_requests' | 'due_soon', value: boolean) => {
			void updateNotificationPreferences({ [key]: value });
		};
		const snoozeForOneHour = (notification: NotificationItem) => {
			const snoozedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
			void snoozeNotification({ id: notification.id, snoozed_until: snoozedUntil });
		};
		const runNotificationTaskAction = (notification: NotificationItem, action: 'accept_assignment' | 'move_status', status?: TaskStatus) => {
			void runNotificationAction({ id: notification.id, action, status });
		};
		const submitNotificationComment = (notification: NotificationItem) => {
			const body = notificationCommentDrafts[notification.id]?.trim();
			if (!body) return;
			void runNotificationAction({ id: notification.id, action: 'comment', body });
			setNotificationCommentDrafts((current) => ({ ...current, [notification.id]: '' }));
		};

		return (
			<div className="workflow-notifications-shell">
				<WorkflowPageHero
					className="workflow-notifications-hero"
					eyebrow={workflow.labels.notificationStudio}
					title={workflow.pageTitles.notifications}
					actionsClassName="workflow-notifications-hero-actions"
					actions={
						<>
							<button
								type="button"
								className="workflow-notifications-toggle"
								data-active={notificationsUnreadOnly}
								onClick={() => setNotificationsUnreadOnly(!notificationsUnreadOnly)}
							>
								<span aria-hidden="true">
									{notificationsUnreadOnly ? <CheckCircle2 size={14} /> : <Bell size={14} />}
								</span>
								{workflow.labels.unreadOnly}
							</button>
							{unreadCount ? (
								<button type="button" className="workflow-notifications-mark-all" onClick={markAllNotificationsRead}>
									<CheckCircle2 size={15} />
									<span>{workflow.buttons.markAllAsRead}</span>
								</button>
							) : null}
						</>
					}
				/>

				<section className="workflow-notifications-metrics">
					<WorkflowSimpleMetric className="workflow-notifications-metric" tone="indigo" icon={<Bell size={18} />} label={workflow.labels.totalAlerts} value={notifications.length} />
					<WorkflowSimpleMetric className="workflow-notifications-metric" tone="rose" icon={<CircleAlert size={18} />} label={workflow.labels.unread} value={unreadCount} />
					<WorkflowSimpleMetric className="workflow-notifications-metric" tone="green" icon={<ListTodo size={18} />} label={workflow.labels.taskAlerts} value={taskAlertCount} />
					<WorkflowSimpleMetric className="workflow-notifications-metric" tone="cyan" icon={<MessagesSquare size={18} />} label={workflow.labels.chatAlerts} value={chatAlertCount} />
				</section>

				<section className="workflow-notification-preferences">
					<div>
						<p>{workflow.labels.notificationPreferences ?? 'Notification preferences'}</p>
						<h2>{workflow.labels.digestFrequency ?? 'Digest frequency'}</h2>
					</div>
					<div className="workflow-notification-preference-grid">
						{[
							['mentions', workflow.labels.mentions ?? 'Mentions'],
							['assignments', workflow.labels.assignments ?? 'Assignments'],
							['review_requests', workflow.labels.reviewRequests ?? 'Review requests'],
							['due_soon', workflow.labels.dueSoon ?? 'Due soon'],
						].map(([key, label]) => (
							<label key={key} className="workflow-notification-preference-toggle">
								<input
									type="checkbox"
									checked={Boolean(resolvedNotificationPreferences[key as keyof NotificationPreference])}
									onChange={(event) => updatePreference(key as 'mentions' | 'assignments' | 'review_requests' | 'due_soon', event.target.checked)}
									suppressHydrationWarning
								/>
								<span>{label}</span>
							</label>
						))}
						<label className="workflow-notification-digest-select">
							<span>{workflow.labels.digestFrequency ?? 'Digest frequency'}</span>
							<select
								value={resolvedNotificationPreferences.digest_frequency}
								onChange={(event) => void updateNotificationPreferences({ digest_frequency: event.target.value as NotificationPreference['digest_frequency'] })}
							>
								<option value="instant">{workflow.labels.instant ?? 'Instant'}</option>
								<option value="daily">{workflow.labels.daily ?? 'Daily'}</option>
								<option value="weekly">{workflow.labels.weekly ?? 'Weekly'}</option>
								<option value="off">{workflow.labels.off ?? 'Off'}</option>
							</select>
						</label>
					</div>
				</section>

				<section className="workflow-notifications-board">
					<div className="workflow-notifications-board-head">
						<div>
							<p>{workflow.labels.alertFeed}</p>
							<h2>{workflow.sections.notifications.title}</h2>
						</div>
						<span>{notifications.length} {workflow.labels.totalAlerts}</span>
					</div>
					<div className="workflow-notifications-list">
						{notifications.map((notification: NotificationItem) => {
							const tone = toneForNotification(notification);
							const contextName = notification.task?.project.name ?? notification.project?.name;
							const NotificationIcon = notification.type === 'chat_message' ? MessagesSquare : notification.task ? ListTodo : Bell;
							const entityLabel = notification.type === 'chat_message'
								? (workflow.labels.notificationChat ?? 'Chat')
								: notification.task
									? (workflow.labels.notificationTask ?? 'Task')
									: notification.project
										? (workflow.labels.notificationProject ?? 'Project')
										: (workflow.labels.notificationWorkflow ?? 'Workflow');
							const chatThreadId = typeof notification.payload.thread_id === 'number'
								? notification.payload.thread_id
								: typeof notification.payload.thread_id === 'string'
									? Number(notification.payload.thread_id)
									: 0;
							const chatHref = Number.isFinite(chatThreadId) && chatThreadId > 0 ? `${DASHBOARD_CHAT}?thread=${chatThreadId}` : DASHBOARD_CHAT;
							return (
							<article key={notification.id} className="workflow-notifications-card" data-unread={!notification.is_read} data-tone={tone}>
								<div className="workflow-notifications-card-rail" aria-hidden="true" />
								<div className="workflow-notifications-card-icon" data-tone={tone}>
									<NotificationIcon size={17} />
								</div>
								<div className="workflow-notifications-card-main">
									<div className="workflow-notifications-card-kicker">
										<span className="workflow-notifications-type">{entityLabel}</span>
										<span className="workflow-notifications-read-state" data-unread={!notification.is_read}>
											{notification.is_read ? workflow.labels.read : workflow.labels.unread}
										</span>
									</div>
									<h3>{notificationTitle(notification)}</h3>
									<p>{notificationDescription(notification)}</p>
									<div className="workflow-notifications-meta">
										<span><CalendarDays size={13} />{dateTimeFor(notification.created_at)}</span>
										{contextName ? <span><FolderKanban size={13} />{contextName}</span> : null}
										{notification.snoozed_until ? <span><Clock3 size={13} />{workflow.labels.snoozedUntil ?? 'Snoozed until'} {dateTimeFor(notification.snoozed_until)}</span> : null}
										{notification.action_taken_at ? <span><CheckCircle2 size={13} />{workflow.labels.actionTaken ?? 'Action taken'}</span> : null}
									</div>
								</div>
								<div className="workflow-notifications-actions">
									{notification.task ? (
										<button type="button" onClick={() => setSelectedTaskId(notification.task!.id)} className="workflow-notifications-action-button">
											<ArrowRight size={16} />
											<span>{workflow.buttons.openTask}</span>
										</button>
									) : null}
									{notification.type === 'chat_message' ? (
										<Link href={chatHref} className="workflow-notifications-action-button">
											<MessagesSquare size={16} />
											<span>{workflow.buttons.openChat}</span>
										</Link>
									) : null}
									{!notification.is_read ? (
										<button type="button" onClick={() => void markNotificationRead(notification.id)} className="workflow-notifications-action-button workflow-notifications-action-primary">
											<CheckCircle2 size={16} />
											<span>{workflow.buttons.markAsRead}</span>
										</button>
									) : null}
									<button type="button" onClick={() => snoozeForOneHour(notification)} className="workflow-notifications-action-button">
										<Clock3 size={16} />
										<span>{workflow.buttons.snooze ?? 'Snooze 1h'}</span>
									</button>
									{notification.task && !notification.action_taken_at ? (
										<>
											<button type="button" onClick={() => runNotificationTaskAction(notification, 'accept_assignment')} className="workflow-notifications-action-button">
												<Users size={16} />
												<span>{workflow.buttons.acceptAssignment ?? 'Accept'}</span>
											</button>
											<button type="button" onClick={() => runNotificationTaskAction(notification, 'move_status', 'in_progress')} className="workflow-notifications-action-button">
												<ArrowRight size={16} />
												<span>{workflow.buttons.moveToProgress ?? 'Move to progress'}</span>
											</button>
										</>
									) : null}
								</div>
								{notification.task && !notification.action_taken_at ? (
									<form
										className="workflow-notifications-comment-action"
										onSubmit={(event) => {
											event.preventDefault();
											submitNotificationComment(notification);
										}}
									>
										<input
											value={notificationCommentDrafts[notification.id] ?? ''}
											onChange={(event) => setNotificationCommentDrafts((current) => ({ ...current, [notification.id]: event.target.value }))}
											placeholder={workflow.labels.commentPlaceholder ?? 'Write comment'}
											aria-label={workflow.labels.commentPlaceholder ?? 'Write comment'}
										/>
										<button type="submit" disabled={!notificationCommentDrafts[notification.id]?.trim()}>
											<MessagesSquare size={15} />
											<span>{workflow.buttons.postComment ?? 'Post comment'}</span>
										</button>
									</form>
								) : null}
							</article>
							);
						})}
						{notifications.length === 0 ? <EmptyState {...workflow.emptyStates.noNotifications} /> : null}
					</div>
				</section>
			</div>
		);
	};

	let content: ReactNode = null;
	if (variant === 'overview') content = renderOverview();
	if (variant === 'board' || variant === 'my-work') content = renderBoard();
	if (variant === 'projects') content = renderProjects();
	if (variant === 'project-detail') content = renderProjectDetail();
	if (variant === 'task-detail') content = renderTaskDetail();
	if (variant === 'team') content = renderTeam();
	if (variant === 'report-time') content = renderReport();
	if (variant === 'notifications') content = renderNotifications();

	const isKanbanView = variant === 'board' || variant === 'my-work' || variant === 'overview' || variant === 'projects' || variant === 'project-detail' || variant === 'team' || variant === 'report-time' || variant === 'notifications';

	return (
		<NavigationBar title={pageHeading}>
			<div className={isKanbanView ? '' : 'space-y-4'}>
				{isKanbanView ? null : renderHeader()}
				{content}
			</div>
			{selectedTaskId ? (
				<div
					className="workflow-task-modal-backdrop fixed inset-0 z-[120] flex items-center justify-center px-3 py-4 sm:px-6"
					role="dialog"
					aria-modal="true"
					onClick={closeTaskModal}
				>
						<div
						className="workflow-task-modal flex h-[calc(100vh-32px)] w-[min(1480px,calc(100vw-32px))] flex-col overflow-hidden"
						onClick={(event) => event.stopPropagation()}
						onWheel={(event) => event.stopPropagation()}
					>
						<div className="workflow-task-modal-body min-h-0 flex-1 overscroll-contain overflow-y-auto p-4 sm:p-5">{renderTaskDetail()}</div>
					</div>
				</div>
			) : null}
			{mediaDeleteTarget ? (
				<div className="workflow-media-confirm-backdrop" role="dialog" aria-modal="true" onClick={() => setMediaDeleteTarget(null)}>
					<div className="workflow-media-confirm" onClick={(event) => event.stopPropagation()}>
						<span><Trash2 size={19} /></span>
						<h3>{mediaDeleteTarget.kind === 'cover' ? (workflow.labels.deleteCoverTitle ?? 'Remove card image?') : (workflow.labels.deleteAttachmentTitle ?? 'Delete attachment?')}</h3>
						<p>
							{mediaDeleteTarget.kind === 'cover'
								? (workflow.labels.deleteCoverBody ?? 'This removes the card image from the task.')
								: (workflow.labels.deleteAttachmentBody ?? 'This file will be removed from the task.')}
						</p>
						<strong>{mediaDeleteTarget.name}</strong>
						<div>
							<button type="button" className="workflow-media-confirm-cancel" onClick={() => setMediaDeleteTarget(null)}>{t.common.cancel}</button>
							<button type="button" className="workflow-media-confirm-danger" onClick={handleConfirmMediaDelete}>
								{t.common.delete}
							</button>
						</div>
					</div>
				</div>
			) : null}
			{attachmentPreview ? (
				<div className="workflow-attachment-preview-backdrop" role="dialog" aria-modal="true" onClick={() => setAttachmentPreview(null)}>
					<div className="workflow-attachment-preview-modal" onClick={(event) => event.stopPropagation()}>
						<header>
							<div>
								<p>{workflow.labels.preview ?? 'Preview'}</p>
								<h3>{attachmentPreview.name}</h3>
								<small>{attachmentPreview.meta}</small>
							</div>
							<button type="button" onClick={() => setAttachmentPreview(null)} aria-label={t.common.close}>
								<X size={18} />
							</button>
						</header>
						<div className="workflow-attachment-preview-frame">
							<Image src={attachmentPreview.url} alt={attachmentPreview.name} width={1200} height={820} unoptimized loading="eager" />
						</div>
						<footer>
							<a href={attachmentPreview.url} target="_blank" rel="noreferrer">{workflow.buttons.open ?? 'Open'}</a>
						</footer>
					</div>
				</div>
			) : null}
		</NavigationBar>
	);
};

export default DesignWorkflowShell;

