'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Select from '@radix-ui/react-select';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { format as formatDateFns, isValid, parseISO } from 'date-fns';
import { HexColorPicker } from 'react-colorful';
import {
	DndContext,
	DragOverlay,
	type DragEndEvent,
	type DragStartEvent,
	PointerSensor,
	closestCorners,
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
	BriefcaseBusiness,
	CalendarDays,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	Clock3,
	CircleAlert,
	FolderKanban,
	ImagePlus,
	ListTodo,
	MessagesSquare,
	Palette,
	Paperclip,
	Pencil,
	Plus,
	RefreshCcw,
	Search,
	ShieldCheck,
	Tag,
	Trash2,
	Users,
	X,
} from 'lucide-react';
import NavigationBar from '@/components/layouts/navigationBar/navigationBar';
import {
	useAddChecklistItemMutation,
	useAddTaskCommentMutation,
	useArchiveTaskMutation,
	useCreateLabelMutation,
	useDeleteChecklistItemMutation,
	useDeleteTaskAttachmentMutation,
	useDeleteTaskCoverMutation,
	useCreateProjectMutation,
	useCreateTaskMutation,
	useGetDashboardSummaryQuery,
	useGetNotificationsQuery,
	useGetProjectQuery,
	useGetProjectsQuery,
	useGetLabelsQuery,
	useGetTaskQuery,
	useGetTasksQuery,
	useGetTimeReportQuery,
	useGetWorkloadQuery,
	useMarkNotificationReadMutation,
	useReassignTaskMutation,
	useUpdateChecklistItemMutation,
	useUploadTaskAttachmentMutation,
	useUploadTaskCoverMutation,
	useUpdateProjectMutation,
	useUpdateTaskMutation,
	useUpdateTaskStatusMutation,
	useToggleTaskCompletionMutation,
} from '@/store/services/designWorkflow';
import { useGetUsersListQuery } from '@/store/services/account';
import type {
	NotificationItem,
	ProjectDetail,
	ProjectInput,
	ProjectSummary,
	TaskCard,
	TaskDetail,
	TaskInput,
	TaskStatus,
	TimeReportRow,
	WorkflowUser,
	WorkloadRow,
} from '@/types/designWorkflowTypes';
import { DASHBOARD_CHAT, DASHBOARD_PROJECT_VIEW, DASHBOARD_TASK_VIEW } from '@/utils/routes';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { getProfilState } from '@/store/selectors';
import type { UserClass } from '@/models/classes';
import type { TranslationDictionary } from '@/types/languageTypes';

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

const STATUS_COLUMNS: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done'];
const PRIORITY_OPTIONS: Array<TaskCard['priority']> = ['low', 'medium', 'high', 'urgent'];
const PROJECT_STATUS_OPTIONS: Array<ProjectSummary['status']> = ['planned', 'active', 'on_hold', 'completed', 'archived'];
const EMPTY_PROJECTS: ProjectSummary[] = [];
const EMPTY_TASKS: TaskCard[] = [];
const EMPTY_WORKLOAD: WorkloadRow[] = [];
const EMPTY_TIME_REPORT: TimeReportRow[] = [];
const EMPTY_NOTIFICATIONS: NotificationItem[] = [];
const EMPTY_SELECT_VALUE = '__empty__';

type WorkflowCopy = TranslationDictionary['workflow'];

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');
const getColumnId = (status: TaskStatus) => `column-${status}`;
const getTaskDragId = (taskId: number) => `task-${taskId}`;
const isTaskDragId = (value: string) => value.startsWith('task-');
const isColumnDragId = (value: string) => value.startsWith('column-');

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
	estimated_minutes: '60',
	blocked_reason: '',
	sort_order: '0',
});

type DurationUnit = 'minutes' | 'hours' | 'days';

const WORK_DAY_MINUTES = 8 * 60;

const DURATION_UNITS: Array<{ value: DurationUnit; label: string; multiplier: number }> = [
	{ value: 'minutes', label: 'Minutes', multiplier: 1 },
	{ value: 'hours', label: 'Hours', multiplier: 60 },
	{ value: 'days', label: 'Days', multiplier: WORK_DAY_MINUTES },
];

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

const formatLabel = (value: string) =>
	value
		.split('_')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');

const toneForPriority = (priority: TaskCard['priority']) => (priority === 'urgent' || priority === 'high' ? 'urgent' : priority === 'medium' ? 'neutral' : 'progress');

const toneForStatus = (status: TaskStatus) => (status === 'done' || status === 'in_progress' || status === 'in_review' ? 'progress' : status === 'blocked' ? 'urgent' : 'neutral');
const statusSurfaceClass = (status: TaskStatus) => ({ backlog: 'border-l-slate-300', todo: 'border-l-sky-400', in_progress: 'border-l-amber-400', in_review: 'border-l-violet-400', blocked: 'border-l-rose-500', done: 'border-l-emerald-500' }[status] ?? 'border-l-slate-300');

const formatDate = (value?: string | null, emptyLabel = 'No date') => {
	if (!value) return emptyLabel;
	return new Date(value).toLocaleDateString();
};

const formatDateTime = (value?: string | null, emptyLabel = 'No date') => {
	if (!value) return emptyLabel;
	return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const resolveMediaUrl = (value?: string | null) => {
	if (!value) return '';
	if (/^https?:\/\//.test(value) || value.startsWith('blob:') || value.startsWith('data:')) return value;
	const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
	return `${apiUrl}${value.startsWith('/') ? value : `/${value}`}`;
};

const AvatarBadge = ({
	user,
	size = 32,
}: {
	user?: WorkflowUser | null;
	size?: number;
}) => {
	const label = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : 'System';
	const avatarUrl = resolveMediaUrl(user?.avatar);
	const initials = user
		? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? user.email?.[0] ?? ''}`.trim().toUpperCase() || 'U'
		: 'S';
	if (avatarUrl) {
		return <img src={avatarUrl} alt={label} className="rounded-full object-cover" style={{ width: size, height: size }} />;
	}
	return (
		<span
			className="grid place-items-center rounded-full bg-[var(--surface-strong)] text-xs font-bold text-[var(--ink)]"
			style={{ width: size, height: size }}
		>
			{initials}
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
			<span className="text-sm font-semibold text-[var(--ink-soft)]">{page}/{totalPages}</span>
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

const buildTaskPayload = (projectValue: number, form: TaskFormState): TaskInput => ({
	project_id: projectValue,
	title: form.title.trim(),
	description: form.description.trim(),
	current_assignee_id: form.current_assignee_id ? Number(form.current_assignee_id) : null,
	status: form.status,
	priority: form.priority,
	due_date: toNullableString(form.due_date),
	estimated_minutes: Number(form.estimated_minutes || 0),
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

const resequenceBoard = (items: TaskCard[]) =>
	STATUS_COLUMNS.flatMap((status) =>
		items
			.filter((item) => item.status === status)
			.sort((left, right) => left.sort_order - right.sort_order)
			.map((item, index) => ({
				...item,
				sort_order: index,
			})),
	);

const moveTaskInBoard = (items: TaskCard[], taskId: number, targetStatus: TaskStatus, overTaskId?: number) => {
	const movingTask = items.find((item) => item.id === taskId);
	if (!movingTask) return null;

	const columns = Object.fromEntries(
		STATUS_COLUMNS.map((status) => [
			status,
			items
				.filter((item) => item.status === status && item.id !== taskId)
				.sort((left, right) => left.sort_order - right.sort_order),
		]),
	) as Record<TaskStatus, TaskCard[]>;

	const targetColumn = [...columns[targetStatus]];
	const insertIndex =
		overTaskId !== undefined
			? Math.max(
					targetColumn.findIndex((item) => item.id === overTaskId),
					0,
				)
			: targetColumn.length;

	targetColumn.splice(insertIndex, 0, { ...movingTask, status: targetStatus });
	columns[targetStatus] = targetColumn;

	const nextBoard = resequenceBoard(STATUS_COLUMNS.flatMap((status) => columns[status]));
	const nextTask = nextBoard.find((item) => item.id === taskId);
	if (!nextTask) return null;

	return {
		nextBoard,
		nextSortOrder: nextTask.sort_order,
		nextStatus: nextTask.status,
	};
};

const Surface = ({
	title,
	description,
	action,
	children,
	className,
}: {
	title?: string;
	description?: string;
	action?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}) => (
	<section className={cn('app-card overflow-hidden p-4 sm:p-5', className)}>
		{title || description || action ? (
			<div className="mb-4 flex flex-col gap-3 border-b border-[color:var(--line)] pb-4 lg:flex-row lg:items-end lg:justify-between">
				<div>
					{title ? <h2 className="text-xl font-semibold text-[var(--ink)]">{title}</h2> : null}
					{description ? <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">{description}</p> : null}
				</div>
				{action ? <div className="shrink-0">{action}</div> : null}
			</div>
		) : null}
		{children}
	</section>
);

const MetricCard = ({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: React.ReactNode;
}) => (
	<div className="app-card-muted workflow-card-hover overflow-hidden p-4">
		<div className="flex items-center justify-between gap-3">
			<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">{label}</p>
			<div className="rounded-[8px] border border-[color:var(--line)] bg-[var(--accent-soft)] p-2 text-[var(--accent-strong)]">{icon}</div>
		</div>
		<p className="mt-4 text-3xl font-semibold text-[var(--ink)]">{value}</p>
	</div>
);

const FieldLabel = ({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) => (
	<label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-[var(--ink)]">
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
	startIcon?: React.ReactNode;
}) => (
	<div className="relative">
		{startIcon ? (
			<span className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-[var(--ink-soft)]">
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
	startIcon?: React.ReactNode;
}) => (
	<div className="relative">
		{startIcon ? (
			<span className="pointer-events-none absolute left-5 top-4 z-10 text-[var(--ink-soft)]">{startIcon}</span>
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
}: {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	options: Array<{ value: string | number; label: string }>;
	startIcon?: React.ReactNode;
}) => {
	const normalizedValue = value === '' ? EMPTY_SELECT_VALUE : value;

	return (
		<Select.Root
			value={normalizedValue}
			onValueChange={(nextValue) => onChange(nextValue === EMPTY_SELECT_VALUE ? '' : nextValue)}
		>
			<Select.Trigger id={id} className={cn('app-input app-select-trigger pr-14 text-left', startIcon ? 'pl-14' : '')}>
				{startIcon ? (
					<span className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-[var(--ink-soft)]">
						{startIcon}
					</span>
				) : null}
				<Select.Value />
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

	return (
		<Popover.Root>
			<div className="relative">
				<span className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-[var(--ink-soft)]">
					<CalendarDays size={18} />
				</span>
				<Popover.Trigger id={id} className={cn('app-input app-date-trigger pl-14 pr-14 text-left', !value && 'text-[var(--ink-muted)]')}>
					{value || placeholder}
				</Popover.Trigger>
				{value ? (
					<button
						type="button"
						aria-label="Clear date"
						className="absolute right-5 top-1/2 z-10 -translate-y-1/2 text-[var(--ink-soft)]"
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
						onSelect={(date) => onChange(toDateValue(date ?? null))}
						captionLayout="dropdown"
						navLayout="around"
						className="app-day-picker"
					/>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
};

const DurationField = ({
	id,
	value,
	onChange,
	min = 0,
}: {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	min?: number;
}) => {
	const { t } = useLanguage();
	const durationUnits: Array<{ value: DurationUnit; label: string; multiplier: number }> = [
		{ value: 'minutes', label: t.workflow.labels.minutesUnit ?? 'Minutes', multiplier: 1 },
		{ value: 'hours', label: t.workflow.labels.hoursUnit ?? 'Hours', multiplier: 60 },
		{ value: 'days', label: t.workflow.labels.daysUnit ?? 'Days', multiplier: WORK_DAY_MINUTES },
	];
	const numericValue = Number(value || 0);
	const initialUnit: DurationUnit =
		numericValue >= WORK_DAY_MINUTES && numericValue % WORK_DAY_MINUTES === 0
			? 'days'
			: numericValue >= 60 && numericValue % 60 === 0
				? 'hours'
				: 'minutes';
	const [unit, setUnit] = useState<DurationUnit>(initialUnit);
	const activeUnit = durationUnits.find((item) => item.value === unit) ?? durationUnits[0];
	const displayValue = numericValue ? String(numericValue / activeUnit.multiplier) : '';

	const updateUnit = (nextUnit: DurationUnit) => {
		const next = durationUnits.find((item) => item.value === nextUnit) ?? durationUnits[0];
		setUnit(nextUnit);
		const currentAmount = Number(displayValue || 0);
		onChange(String(Math.max(min, Math.round(currentAmount * next.multiplier))));
	};

	return (
		<div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
			<Field
				id={id}
				type="number"
				min={min}
				value={displayValue}
				onChange={(nextValue) => onChange(String(Math.max(min, Math.round(Number(nextValue || 0) * activeUnit.multiplier))))}
				startIcon={<Clock3 size={18} />}
			/>
			<SelectField
				value={unit}
				onChange={(nextUnit) => updateUnit(nextUnit as DurationUnit)}
				options={durationUnits.map((item) => ({ value: item.value, label: item.label }))}
			/>
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
	<label className="inline-flex items-center gap-3 text-sm font-medium text-[var(--ink-soft)]">
		<input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="app-check" />
		<span>{label}</span>
	</label>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
	<div className="rounded-[8px] border border-dashed border-[color:var(--line)] bg-[var(--surface-muted)] px-5 py-6 text-center">
		<p className="text-base font-semibold text-[var(--ink)]">{title}</p>
		<p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{description}</p>
	</div>
);

const Chip = ({
	children,
	tone,
	status,
}: {
	children: React.ReactNode;
	tone?: 'urgent' | 'progress' | 'neutral';
	status?: TaskStatus | ProjectSummary['status'];
}) => (
	<span className="workflow-chip" data-tone={tone} data-status={status}>
		{children}
	</span>
);

const TaskCardItem = ({
	task,
	compact = false,
	copy,
	labelFor,
	dateFor,
	onOpen,
	onToggleDone,
	onArchive,
}: {
	task: TaskCard;
	compact?: boolean;
	copy: WorkflowCopy;
	labelFor: (value: string) => string;
	dateFor: (value?: string | null) => string;
	onOpen?: (taskId: number) => void;
	onToggleDone?: (task: TaskCard) => void;
	onArchive?: (task: TaskCard) => void;
}) => (
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
			'app-card workflow-card-hover workflow-task-card overflow-hidden border-l-4',
			statusSurfaceClass(task.status),
			onOpen ? 'cursor-pointer' : '',
			task.is_overdue ? 'border-[color:var(--accent)] bg-[var(--accent-tint)]' : 'bg-white',
		)}
	>
		{task.cover_image_url ? (
			<div className="relative h-40 w-full overflow-hidden border-b border-[color:var(--line)] bg-[var(--surface-muted)]">
				<img src={resolveMediaUrl(task.cover_image_url)} alt={task.title} className="h-full w-full object-cover" />
			</div>
		) : null}
		<div className={cn('p-4', compact ? 'space-y-3' : 'space-y-4')}>
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 flex-1 items-start gap-3">
					<button
						type="button"
						aria-label={task.is_completed ? 'Mark task open' : 'Mark task done'}
						onClick={(event) => {
							event.stopPropagation();
							onToggleDone?.(task);
						}}
						className={cn(
							'workflow-focus-ring mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border transition',
							task.is_completed ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-[color:var(--line-strong)] bg-white text-transparent hover:text-[var(--ink-soft)]',
						)}
					>
						<CheckCircle2 size={17} />
					</button>
					<div className="min-w-0">
					<p className={cn('text-base font-semibold text-[var(--ink)]', task.is_completed && 'text-emerald-700 line-through decoration-2')}>{task.title}</p>
					<p className="mt-1 truncate text-sm text-[var(--ink-soft)]">{task.project.name}</p>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Chip tone={toneForPriority(task.priority)}>
						<span className="inline-flex items-center gap-1.5">
							<CircleAlert size={12} />
							<span>{copy.labels.priority}: {labelFor(task.priority) || task.priority}</span>
						</span>
					</Chip>
					{onArchive ? (
						<button
							type="button"
							aria-label="Archive task"
							onClick={(event) => {
								event.stopPropagation();
								onArchive(task);
							}}
							className="workflow-focus-ring inline-flex items-center gap-2 rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-sm font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]"
						>
							<Archive size={15} />
							{!compact ? <span>{task.archived ? (copy.buttons.restore ?? 'Restore') : (copy.buttons.archive ?? 'Archive')}</span> : null}
						</button>
					) : null}
				</div>
			</div>
			<p className="text-sm leading-6 text-[var(--ink-soft)]">{task.description || copy.labels.noDescription}</p>
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
			<div className="flex flex-wrap gap-2">
				<Chip tone={toneForStatus(task.status)} status={task.status}>{labelFor(task.status)}</Chip>
				<Chip>
					<span className="inline-flex items-center gap-2">
						{task.current_assignee ? <AvatarBadge user={task.current_assignee} size={20} /> : null}
						<span>{task.current_assignee ? `${task.current_assignee.first_name} ${task.current_assignee.last_name}` : copy.labels.unassigned}</span>
					</span>
				</Chip>
				<Chip>{copy.labels.estShort} {formatMinutes(task.estimated_minutes)}</Chip>
				<Chip>{copy.labels.spentShort} {formatMinutes(task.actual_minutes)}</Chip>
				{task.due_date ? <Chip tone={task.is_overdue ? 'urgent' : undefined}>{dateFor(task.due_date)}</Chip> : null}
				{task.checklist_items.length ? <Chip>{task.checklist_items.filter((item) => item.done).length}/{task.checklist_items.length} {copy.labels.checklistShort ?? 'checks'}</Chip> : null}
				{task.attachments.length ? <Chip>{task.attachments.length} {copy.labels.attachmentsShort ?? 'files'}</Chip> : null}
			</div>
			{!onOpen ? (
				<Link href={DASHBOARD_TASK_VIEW(task.id)} className="workflow-focus-ring inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
					<span>{copy.buttons.openTask}</span>
					<ArrowRight size={14} />
				</Link>
			) : null}
		</div>
	</div>
);

const BoardTaskCard = ({
	task,
	copy,
	labelFor,
	dateFor,
	onOpen,
	onToggleDone,
	onArchive,
}: {
	task: TaskCard;
	copy: WorkflowCopy;
	labelFor: (value: string) => string;
	dateFor: (value?: string | null) => string;
	onOpen?: (taskId: number) => void;
	onToggleDone?: (task: TaskCard) => void;
	onArchive?: (task: TaskCard) => void;
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
			style={
				{
					transform: CSS.Transform.toString(transform),
					transition,
					opacity: isDragging ? 0.35 : 1,
				} as React.CSSProperties
			}
		>
			<div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
				<TaskCardItem task={task} compact copy={copy} labelFor={labelFor} dateFor={dateFor} onOpen={onOpen} onToggleDone={onToggleDone} onArchive={onArchive} />
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
	onToggleDone,
	onArchive,
}: {
	status: TaskStatus;
	tasks: TaskCard[];
	copy: WorkflowCopy;
	labelFor: (value: string) => string;
	dateFor: (value?: string | null) => string;
	onOpen?: (taskId: number) => void;
	onToggleDone?: (task: TaskCard) => void;
	onArchive?: (task: TaskCard) => void;
}) => {
	const { setNodeRef, isOver } = useDroppable({
		id: getColumnId(status),
		data: {
			type: 'column',
			status,
		},
	});

	return (
		<div
			ref={setNodeRef}
			data-status={status}
			className={cn(
				'workflow-column app-card-muted flex h-full min-h-[420px] min-w-[292px] flex-col',
				isOver && 'border-[color:var(--accent)] bg-[var(--accent-tint)]',
			)}
		>
			<div className="flex items-center justify-between border-b border-[color:var(--line)] px-4 py-4">
				<div>
					<p className="text-lg font-semibold text-[var(--ink)]">{labelFor(status)}</p>
					<p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">{tasks.length} {copy.labels.cards}</p>
				</div>
				<div className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-sm font-semibold text-[var(--accent-strong)]">
					{tasks.length}
				</div>
			</div>
			<SortableContext items={tasks.map((task) => getTaskDragId(task.id))} strategy={verticalListSortingStrategy}>
				<div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
					{tasks.map((task) => (
							<BoardTaskCard key={task.id} task={task} copy={copy} labelFor={labelFor} dateFor={dateFor} onOpen={onOpen} onToggleDone={onToggleDone} onArchive={onArchive} />
					))}
					{tasks.length === 0 ? <EmptyState {...copy.emptyStates.noCards} /> : null}
				</div>
			</SortableContext>
		</div>
	);
};

const DesignWorkflowShell = ({ title, variant, projectId, taskId }: Props) => {
	const profile = useAppSelector(getProfilState);
	const { t } = useLanguage();
	const workflow = t.workflow;
	const labelFor = (value: string) => workflow.statuses[value] ?? workflow.priorities[value] ?? workflow.activities[value] ?? formatLabel(value);
	const dateFor = (value?: string | null) => formatDate(value, workflow.labels.noDate);
	const dateTimeFor = (value?: string | null) => formatDateTime(value, workflow.labels.noDate);
	const notificationTitle = (notification: NotificationItem) => {
		const payloadTitle = notification.payload.title;
		if (typeof payloadTitle === 'string' && payloadTitle.trim()) return payloadTitle;
		return labelFor(notification.type);
	};
	const notificationDescription = (notification: NotificationItem) => {
		if (notification.type === 'task_overdue' && typeof notification.payload.days_overdue === 'number') return `${notification.payload.days_overdue} ${workflow.labels.daysOverdue}`;
		if (notification.type === 'task_status' && typeof notification.payload.status === 'string') return `${workflow.labels.statusLabel}: ${labelFor(notification.payload.status)}`;
		if (notification.type === 'task_reassigned' && typeof notification.payload.reason === 'string' && notification.payload.reason.trim()) return notification.payload.reason;
		return notification.task?.title ?? notification.project?.name ?? workflow.labels.notificationFallback;
	};
	const describeWorkflowActivity = (taskActivity: TaskDetail['recent_activity'][number] | ProjectDetail['recent_activity'][number]) => {
		const metaEntries = Object.entries(taskActivity.metadata ?? {}).filter(([, value]) => value !== null && value !== '');
		if (metaEntries.length === 0) return labelFor(taskActivity.action_type);
		return `${labelFor(taskActivity.action_type)} • ${metaEntries
			.slice(0, 3)
			.map(([key, value]) => `${labelFor(key)}: ${typeof value === 'string' ? labelFor(value) : String(value)}`)
			.join(' • ')}`;
	};
	const isSuperuser = Boolean((profile as { is_superuser?: boolean }).is_superuser);
	const isManager = profile.role === 'manager' || profile.is_staff || isSuperuser;
	const [boardFilters, setBoardFilters] = useState({
		project: '',
		status: '',
		priority: '',
		assignee: '',
		search: '',
		overdueOnly: false,
		blockedOnly: false,
		archivedOnly: false,
	});
	const [notificationsUnreadOnly, setNotificationsUnreadOnly] = useState(false);
	const [reportFilters, setReportFilters] = useState({ start_date: '', end_date: '' });
	const [projectForm, setProjectForm] = useState<ProjectInput>(() => emptyProjectForm(profile.id));
	const [projectEditForm, setProjectEditForm] = useState<ProjectInput>(() => emptyProjectForm(profile.id));
	const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
	const [taskEditForm, setTaskEditForm] = useState<TaskFormState>(emptyTaskForm);
	const [reassignForm, setReassignForm] = useState({ assignee_id: '', reason: '' });
	const [commentBody, setCommentBody] = useState('');
	const [newChecklistTitle, setNewChecklistTitle] = useState('');
	const [newLabelName, setNewLabelName] = useState('');
	const [newLabelColor, setNewLabelColor] = useState('#111827');
	const [taskAttachmentFile, setTaskAttachmentFile] = useState<File | null>(null);
	const [taskCoverFile, setTaskCoverFile] = useState<File | null>(null);
	const [boardDraft, setBoardDraft] = useState<TaskCard[]>([]);
	const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
	const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
	const [projectCommentsPage, setProjectCommentsPage] = useState(1);
	const [projectActivityPage, setProjectActivityPage] = useState(1);
	const [taskCommentsPage, setTaskCommentsPage] = useState(1);
	const [taskTimeEntriesPage, setTaskTimeEntriesPage] = useState(1);
	const [taskActivityPage, setTaskActivityPage] = useState(1);
	const activeTaskId = taskId ?? selectedTaskId;
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
	);

	const { data: summary } = useGetDashboardSummaryQuery(undefined, {
		skip: variant !== 'overview' || !isManager,
	});
	const { data: usersResponse, isLoading: usersLoading } = useGetUsersListQuery({ with_pagination: false }, { skip: !isManager });
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
	const { data: projectsData, isLoading: projectsLoading } = useGetProjectsQuery(undefined, {
		skip: !['projects', 'overview', 'board', 'project-detail', 'task-detail'].includes(variant),
	});
	const projects = projectsData ?? EMPTY_PROJECTS;
	const { data: project, isLoading: projectLoading } = useGetProjectQuery(projectId ?? 0, {
		skip: variant !== 'project-detail' || !projectId,
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
					overdue: boardFilters.overdueOnly || undefined,
					blocked: boardFilters.blockedOnly || undefined,
					archived: boardFilters.archivedOnly || undefined,
				};
	const { data: tasksData, isLoading: tasksLoading } = useGetTasksQuery(tasksParams, {
		skip: !['board', 'my-work', 'overview'].includes(variant),
	});
	const tasks = tasksData ?? EMPTY_TASKS;
	const { data: task, isLoading: taskLoading } = useGetTaskQuery(activeTaskId ?? 0, {
		skip: !activeTaskId,
	});
	const { data: workloadData } = useGetWorkloadQuery(undefined, {
		skip: !isManager || !['team', 'overview'].includes(variant),
	});
	const workload = workloadData ?? EMPTY_WORKLOAD;
	const { data: timeReportData } = useGetTimeReportQuery(
		{
			start_date: reportFilters.start_date || undefined,
			end_date: reportFilters.end_date || undefined,
		},
		{ skip: variant !== 'report-time' || !isManager },
	);
	const timeReport = timeReportData ?? EMPTY_TIME_REPORT;
	const { data: notificationsData } = useGetNotificationsQuery(
		{ unread: notificationsUnreadOnly || undefined },
		{ skip: variant !== 'notifications' },
	);
	const notifications = notificationsData ?? EMPTY_NOTIFICATIONS;
	const { data: labels = [] } = useGetLabelsQuery(undefined, { skip: !activeTaskId && variant !== 'project-detail' });

	const [createProject, createProjectState] = useCreateProjectMutation();
	const [createLabel] = useCreateLabelMutation();
	const [updateProject, updateProjectState] = useUpdateProjectMutation();
	const [createTask, createTaskState] = useCreateTaskMutation();
	const [updateTask, updateTaskState] = useUpdateTaskMutation();
	const [updateTaskStatus, updateStatusState] = useUpdateTaskStatusMutation();
	const [toggleTaskCompletion] = useToggleTaskCompletionMutation();
	const [archiveTask] = useArchiveTaskMutation();
	const [addChecklistItem, addChecklistItemState] = useAddChecklistItemMutation();
	const [updateChecklistItem] = useUpdateChecklistItemMutation();
	const [deleteChecklistItem] = useDeleteChecklistItemMutation();
	const [uploadTaskAttachment, uploadTaskAttachmentState] = useUploadTaskAttachmentMutation();
	const [deleteTaskAttachment] = useDeleteTaskAttachmentMutation();
	const [uploadTaskCover, uploadTaskCoverState] = useUploadTaskCoverMutation();
	const [deleteTaskCover] = useDeleteTaskCoverMutation();
	const [reassignTask, reassignTaskState] = useReassignTaskMutation();
	const [addTaskComment, addCommentState] = useAddTaskCommentMutation();
	const [markNotificationRead] = useMarkNotificationReadMutation();

	useEffect(() => {
		if (profile.id && !projectForm.manager_id) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setProjectForm((current) => ({ ...current, manager_id: profile.id }));
		}
	}, [profile.id, projectForm.manager_id]);

	useEffect(() => {
		if (project) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
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
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setBoardDraft(tasks);
	}, [tasks, variant]);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setTaskEditForm(buildTaskEditForm(task));
		if (task?.current_assignee?.id) {
			setReassignForm((current) => ({ ...current, assignee_id: String(task.current_assignee?.id ?? '') }));
		}
		setTaskCommentsPage(1);
		setTaskTimeEntriesPage(1);
		setTaskActivityPage(1);
		setTaskAttachmentFile(null);
		setTaskCoverFile(null);
	}, [task]);

	useEffect(() => {
		if (!selectedTaskId) return;
		const previousOverflow = document.body.style.overflow;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setSelectedTaskId(null);
			}
		};
		document.body.style.overflow = 'hidden';
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [selectedTaskId]);

	const handleToggleTaskDone = async (taskItem: TaskCard) => {
		await toggleTaskCompletion({ id: taskItem.id, is_completed: !taskItem.is_completed }).unwrap();
	};

	const handleArchiveTask = async (taskItem: TaskCard) => {
		await archiveTask({ id: taskItem.id, archived: !taskItem.archived }).unwrap();
	};

	const filteredBoardTasks = boardDraft.filter((taskItem) => {
		if (!boardFilters.search.trim()) return true;
		const haystack = `${taskItem.title} ${taskItem.project.name} ${taskItem.description}`.toLowerCase();
		return haystack.includes(boardFilters.search.trim().toLowerCase());
	});

	const tasksByStatus = STATUS_COLUMNS.map((status) => ({
		status,
		tasks: filteredBoardTasks
			.filter((item) => item.status === status)
			.sort((left, right) => left.sort_order - right.sort_order),
	}));

	const busiestUsers = [...workload].sort((left, right) => right.open_tasks - left.open_tasks).slice(0, 4);
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
		...(variant === 'task-detail' && task ? [`${workflow.labels.status} ${labelFor(task.status)}`, `${workflow.labels.spent} ${formatMinutes(task.total_logged_minutes)}`] : []),
		...(variant === 'team' ? [`${workflow.labels.contributors} ${workload.length}`] : []),
		...(variant === 'report-time' ? [`${workflow.labels.projects} ${timeReport.length}`] : []),
		...(variant === 'notifications' ? [`${workflow.labels.unread} ${notifications.filter((item) => !item.is_read).length}`] : []),
	];

	const handleDragStart = (event: DragStartEvent) => {
		if (typeof event.active.id !== 'string' || !isTaskDragId(event.active.id)) return;
		const taskId = Number(event.active.id.replace('task-', ''));
		setDraggedTaskId(taskId);
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		setDraggedTaskId(null);
		const activeId = event.active.id;
		const overId = event.over?.id;
		if (typeof activeId !== 'string' || typeof overId !== 'string') return;
		if (!isTaskDragId(activeId) || (!isTaskDragId(overId) && !isColumnDragId(overId))) return;

		const movingTaskId = Number(activeId.replace('task-', ''));
		const targetStatus = isColumnDragId(overId)
			? (overId.replace('column-', '') as TaskStatus)
			: boardDraft.find((item) => item.id === Number(overId.replace('task-', '')))?.status;

		if (!targetStatus) return;

		const nextState = moveTaskInBoard(
			boardDraft,
			movingTaskId,
			targetStatus,
			isTaskDragId(overId) ? Number(overId.replace('task-', '')) : undefined,
		);
		if (!nextState) return;

		const previousBoard = boardDraft;
		setBoardDraft(nextState.nextBoard);

		try {
			await updateTaskStatus({
				id: movingTaskId,
				status: nextState.nextStatus,
				sort_order: nextState.nextSortOrder,
			}).unwrap();
		} catch {
			setBoardDraft(previousBoard);
		}
	};

	const renderHeader = () => (
		<Surface className="workflow-hero">
			<div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
				<div className="max-w-3xl">
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">{workflow.labels.workflow}</p>
					<h1 className="mt-3 text-4xl font-semibold text-[var(--ink)] sm:text-5xl">{pageHeading}</h1>
					<p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">{workflow.pageDescriptions[variant]}</p>
				</div>
				<div className="app-card-muted p-3">
					<div className="flex flex-wrap gap-2">
						{pageHighlights.map((item) => (
							<Chip key={item} tone="neutral">{item}</Chip>
						))}
					</div>
				</div>
			</div>
		</Surface>
	);

	const renderOverview = () => (
		<div className="space-y-4">
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<MetricCard icon={<FolderKanban size={18} />} label={workflow.metrics.activeProjects} value={summary?.active_projects ?? 0} />
				<MetricCard icon={<ListTodo size={18} />} label={workflow.metrics.todo} value={summary?.todo_tasks ?? 0} />
				<MetricCard icon={<CircleAlert size={18} />} label={workflow.metrics.overdueTasks} value={summary?.overdue_tasks ?? 0} />
				<MetricCard icon={<Clock3 size={18} />} label={workflow.metrics.weekLogged} value={formatMinutes(summary?.week_logged_minutes ?? 0)} />
			</div>

			<div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
				<Surface {...workflow.sections.overdueTasks}>
					<div className="grid gap-3">
						{tasksLoading ? <EmptyState {...workflow.emptyStates.loadingCards} /> : null}
						{!tasksLoading && tasks.slice(0, 6).map((taskItem) => <TaskCardItem key={taskItem.id} task={taskItem} copy={workflow} labelFor={labelFor} dateFor={dateFor} onOpen={setSelectedTaskId} onToggleDone={handleToggleTaskDone} onArchive={handleArchiveTask} />)}
						{!tasksLoading && tasks.length === 0 ? (
							<EmptyState {...workflow.emptyStates.noUrgentCards} />
						) : null}
					</div>
				</Surface>

				<Surface {...workflow.sections.capacitySnapshot}>
					<div className="space-y-3">
						<p className="text-sm font-semibold text-[var(--ink)]">{workflow.labels.mostAvailable}</p>
						{busiestUsers.map((row) => (
							<div key={row.user.id} className="app-card-muted flex items-center justify-between gap-3 p-4">
								<div className="min-w-0">
									<p className="text-base font-semibold text-[var(--ink)]">
										{row.user.first_name} {row.user.last_name}
									</p>
									<p className="text-sm text-[var(--ink-soft)]">{labelFor(row.user.role)}</p>
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
				</Surface>
			</div>
		</div>
	);

	const renderBoard = () => (
		<div className="space-y-4">
			<Surface
				{...(variant === 'my-work' ? workflow.sections.myBoardFilters : workflow.sections.boardFilters)}
				action={
					<button
						type="button"
						onClick={() =>
							setBoardFilters({
								project: '',
								status: '',
								priority: '',
								assignee: '',
								search: '',
								overdueOnly: false,
								blockedOnly: false,
								archivedOnly: false,
							})
						}
						className="app-button app-button-secondary"
					>
						<RefreshCcw size={16} />
						<span>{workflow.buttons.resetFilters}</span>
					</button>
				}
			>
				<div className="space-y-3">
					<div>
						<FieldLabel htmlFor="board-search">{workflow.labels.search}</FieldLabel>
							<Field id="board-search" value={boardFilters.search} onChange={(value) => setBoardFilters((current) => ({ ...current, search: value }))} placeholder={workflow.labels.taskProjectDescription} startIcon={<Search size={18} />} />
					</div>
					<div className="workflow-five-field-row">
						<div>
							<FieldLabel>{workflow.labels.project}</FieldLabel>
							<SelectField
								value={boardFilters.project}
								onChange={(value) => setBoardFilters((current) => ({ ...current, project: value }))}
								options={[
									{ value: '', label: workflow.labels.allProjects },
									...projects.map((item) => ({ value: item.id, label: item.name })),
								]}
								startIcon={<FolderKanban size={18} />}
							/>
						</div>
						<div>
							<FieldLabel>{workflow.labels.status}</FieldLabel>
							<SelectField
								value={boardFilters.status}
								onChange={(value) => setBoardFilters((current) => ({ ...current, status: value }))}
								options={[
									{ value: '', label: workflow.labels.allStatuses },
									...STATUS_COLUMNS.map((item) => ({ value: item, label: labelFor(item) })),
								]}
								startIcon={<ListTodo size={18} />}
							/>
						</div>
						<div>
							<FieldLabel>{workflow.labels.priority}</FieldLabel>
							<SelectField
								value={boardFilters.priority}
								onChange={(value) => setBoardFilters((current) => ({ ...current, priority: value }))}
								options={[
									{ value: '', label: workflow.labels.allPriorities },
									...PRIORITY_OPTIONS.map((item) => ({ value: item, label: labelFor(item) })),
								]}
								startIcon={<CircleAlert size={18} />}
							/>
						</div>
						<div>
							<FieldLabel>{workflow.labels.assignee}</FieldLabel>
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
								startIcon={<Users size={18} />}
							/>
						</div>
					</div>
				</div>

				<div className="mt-4 flex flex-wrap gap-4">
					<div className="app-pill flex items-center gap-2 px-2 py-2">
						<button
							type="button"
							onClick={() => setBoardFilters((current) => ({ ...current, archivedOnly: false }))}
							className={boardFilters.archivedOnly ? 'app-button app-button-secondary' : 'app-button'}
						>
							<span>{workflow.labels.activeCards}</span>
						</button>
						<button
							type="button"
							onClick={() => setBoardFilters((current) => ({ ...current, archivedOnly: true }))}
							className={boardFilters.archivedOnly ? 'app-button' : 'app-button app-button-secondary'}
						>
							<Archive size={16} />
							<span>{workflow.buttons.archive ?? 'Archive'}</span>
						</button>
					</div>
					<ToggleField label={workflow.labels.overdueOnly} checked={boardFilters.overdueOnly} onChange={(checked) => setBoardFilters((current) => ({ ...current, overdueOnly: checked }))} />
					<ToggleField label={workflow.labels.blockedOnly} checked={boardFilters.blockedOnly} onChange={(checked) => setBoardFilters((current) => ({ ...current, blockedOnly: checked }))} />
				</div>
			</Surface>

			<Surface className="overflow-x-auto" {...workflow.sections.boardLanes}>
				{tasksLoading ? (
					<EmptyState {...workflow.emptyStates.loadingBoard} />
				) : (
					<DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
						<div className="flex gap-3 overflow-x-auto pb-2">
							{tasksByStatus.map((column) => (
								<BoardColumn key={column.status} status={column.status} tasks={column.tasks} copy={workflow} labelFor={labelFor} dateFor={dateFor} onOpen={setSelectedTaskId} onToggleDone={handleToggleTaskDone} onArchive={handleArchiveTask} />
							))}
						</div>
						<DragOverlay>
							{draggedTaskId ? (
								<div className="w-[292px] rotate-1 shadow-[var(--shadow-lg)]">
									<TaskCardItem task={boardDraft.find((item) => item.id === draggedTaskId)!} compact copy={workflow} labelFor={labelFor} dateFor={dateFor} />
								</div>
							) : null}
						</DragOverlay>
					</DndContext>
				)}
				{updateStatusState.isError ? (
					<div className="mt-4 rounded-[8px] border border-[color:var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--accent-strong)]">
						{t.errors.unexpectedError}
					</div>
				) : null}
			</Surface>
		</div>
	);

	const renderProjects = () => (
		<div className="space-y-4">
			{isManager ? (
				<Surface {...workflow.sections.createProject}>
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
							<p className="mt-2 text-xs leading-5 text-[var(--ink-soft)]">
								{workflow.labels.managerHelp}
							</p>
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
						<div className="mt-4 rounded-[8px] border border-[color:var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-strong)]">
							{getApiErrorMessage(createProjectState.error, t.errors.unexpectedError)}
						</div>
					) : null}
				</Surface>
			) : null}

			<Surface {...workflow.sections.projects}>
				{projectsLoading ? (
					<EmptyState {...workflow.emptyStates.loadingProjects} />
				) : (
					<div className="grid gap-4 xl:grid-cols-2">
						{projects.map((item) => (
							<div key={item.id} className="app-card-muted p-5">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<h3 className="text-xl font-semibold text-[var(--ink)]">{item.name}</h3>
										<p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{item.description}</p>
									</div>
									<Chip status={item.status}>{labelFor(item.status)}</Chip>
								</div>
								<div className="mt-4 flex flex-wrap gap-2">
									<Chip>{labelFor(item.priority)}</Chip>
									<Chip>{item.open_tasks_count} {workflow.labels.openTasks}</Chip>
									<Chip>{formatMinutes(item.total_logged_minutes)}</Chip>
								</div>
								<div className="mt-5 flex items-center justify-between gap-3 text-sm text-[var(--ink-soft)]">
									<div>
										<p className="font-semibold text-[var(--ink)]">
											{item.manager.first_name} {item.manager.last_name}
										</p>
										<p>{dateFor(item.target_end_date)}</p>
									</div>
									<Link href={DASHBOARD_PROJECT_VIEW(item.id)} className="app-button app-button-secondary">
										<span>{workflow.buttons.open}</span>
										<ArrowRight size={16} />
									</Link>
								</div>
							</div>
						))}
						{projects.length === 0 ? <EmptyState {...workflow.emptyStates.noProjects} /> : null}
					</div>
				)}
			</Surface>
		</div>
	);

	const renderProjectDetail = () => {
		if (projectLoading) {
			return <EmptyState {...workflow.emptyStates.loadingProject} />;
		}

		if (!project) {
			return <EmptyState {...workflow.emptyStates.missingProject} />;
		}

		const pageSize = 4;
		const commentsTotalPages = Math.max(1, Math.ceil(project.recent_comments.length / pageSize));
		const activityTotalPages = Math.max(1, Math.ceil(project.recent_activity.length / pageSize));
		const pagedComments = project.recent_comments.slice((projectCommentsPage - 1) * pageSize, projectCommentsPage * pageSize);
		const pagedActivity = project.recent_activity.slice((projectActivityPage - 1) * pageSize, projectActivityPage * pageSize);

		return (
			<div className="space-y-4">
				<Surface {...workflow.sections.projectSnapshot}>
					<div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
						<div className="space-y-4">
							<p className="text-sm leading-7 text-[var(--ink-soft)]">{project.description}</p>
							<div className="flex flex-wrap gap-2">
								<Chip status={project.status as TaskStatus}>{labelFor(project.status)}</Chip>
								<Chip>{labelFor(project.priority)}</Chip>
								<Chip>{project.open_tasks_count} {workflow.labels.openTasks}</Chip>
								<Chip>{formatMinutes(project.total_logged_minutes)} {workflow.labels.loggedSuffix}</Chip>
							</div>
						</div>
						<div className="app-card-muted grid gap-3 p-4">
							<div>
								<p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">{workflow.labels.manager}</p>
								<p className="mt-1 font-semibold text-[var(--ink)]">
									{project.manager.first_name} {project.manager.last_name}
								</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">{workflow.labels.start}</p>
								<p className="mt-1 font-semibold text-[var(--ink)]">{dateFor(project.start_date)}</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">{workflow.labels.target}</p>
								<p className="mt-1 font-semibold text-[var(--ink)]">{dateFor(project.target_end_date)}</p>
							</div>
						</div>
					</div>
				</Surface>

				{isManager ? (
					<Surface {...workflow.sections.editProject}>
						<div className="grid gap-4 md:grid-cols-2">
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
					</Surface>
				) : null}

				<Surface {...workflow.sections.projectTasks}>
					<div className="grid gap-3 lg:grid-cols-2">
						{project.tasks.map((taskItem) => (
							<TaskCardItem key={taskItem.id} task={taskItem} copy={workflow} labelFor={labelFor} dateFor={dateFor} onOpen={setSelectedTaskId} onToggleDone={handleToggleTaskDone} onArchive={handleArchiveTask} />
						))}
						{project.tasks.length === 0 ? <EmptyState {...workflow.emptyStates.noTasks} /> : null}
					</div>
				</Surface>

				<Surface {...workflow.sections.createTask}>
					<div className="grid gap-4 md:grid-cols-2">
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
						<div>
							<FieldLabel>{workflow.labels.estimatedMinutes}</FieldLabel>
							<DurationField value={taskForm.estimated_minutes} onChange={(value) => setTaskForm((current) => ({ ...current, estimated_minutes: value }))} />
						</div>
					</div>
					<div className="mt-5">
						<button
							type="button"
							onClick={async () => {
								await createTask(buildTaskPayload(project.id, taskForm)).unwrap();
								setTaskForm(emptyTaskForm());
							}}
							disabled={!taskForm.title.trim()}
							className="app-button"
						>
							<Plus size={16} />
							<span>{createTaskState.isLoading ? workflow.buttons.creating : workflow.buttons.createTask}</span>
						</button>
					</div>
				</Surface>

				<div className="grid gap-4 xl:grid-cols-2">
					<Surface {...workflow.sections.recentComments}>
						<div className="space-y-3">
							{pagedComments.map((comment) => (
								<div key={comment.id} className="app-card-muted p-4">
									<div className="flex items-start gap-3">
										<AvatarBadge user={comment.author} size={34} />
										<div className="min-w-0 flex-1">
											<p className="text-sm font-semibold text-[var(--ink)]">
												{comment.author.first_name} {comment.author.last_name}
											</p>
											<p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{comment.body}</p>
											<p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">{comment.task_title} - {dateTimeFor(comment.created_at)}</p>
										</div>
									</div>
								</div>
							))}
							{project.recent_comments.length > pageSize ? (
								<div className="flex items-center justify-between gap-3 pt-1">
									<button type="button" className="app-button app-button-secondary px-4 py-2" disabled={projectCommentsPage <= 1} onClick={() => setProjectCommentsPage((page) => Math.max(1, page - 1))}>
										{workflow.buttons.previous ?? 'Previous'}
									</button>
									<span className="text-sm font-semibold text-[var(--ink-soft)]">{projectCommentsPage}/{commentsTotalPages}</span>
									<button type="button" className="app-button app-button-secondary px-4 py-2" disabled={projectCommentsPage >= commentsTotalPages} onClick={() => setProjectCommentsPage((page) => Math.min(commentsTotalPages, page + 1))}>
										{workflow.buttons.next ?? 'Next'}
									</button>
								</div>
							) : null}
							{project.recent_comments.length === 0 ? <EmptyState {...workflow.emptyStates.noComments} /> : null}
						</div>
					</Surface>

					<Surface {...workflow.sections.recentActivity}>
						<div className="space-y-3">
							{pagedActivity.map((activity) => (
								<div key={activity.id} className="app-card-muted p-4">
									<p className="text-sm font-semibold text-[var(--ink)]">
										{activity.actor ? `${activity.actor.first_name} ${activity.actor.last_name}` : workflow.labels.system}
									</p>
									<p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{describeWorkflowActivity(activity)}</p>
									<p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">{activity.task_title} - {dateTimeFor(activity.created_at)}</p>
								</div>
							))}
							{project.recent_activity.length > pageSize ? (
								<div className="flex items-center justify-between gap-3 pt-1">
									<button type="button" className="app-button app-button-secondary px-4 py-2" disabled={projectActivityPage <= 1} onClick={() => setProjectActivityPage((page) => Math.max(1, page - 1))}>
										{workflow.buttons.previous ?? 'Previous'}
									</button>
									<span className="text-sm font-semibold text-[var(--ink-soft)]">{projectActivityPage}/{activityTotalPages}</span>
									<button type="button" className="app-button app-button-secondary px-4 py-2" disabled={projectActivityPage >= activityTotalPages} onClick={() => setProjectActivityPage((page) => Math.min(activityTotalPages, page + 1))}>
										{workflow.buttons.next ?? 'Next'}
									</button>
								</div>
							) : null}
							{project.recent_activity.length === 0 ? <EmptyState {...workflow.emptyStates.noActivity} /> : null}
						</div>
					</Surface>
				</div>
			</div>
		);
	};

	const renderTaskDetail = () => {
		if (taskLoading) {
			return <EmptyState {...workflow.emptyStates.loadingTask} />;
		}
		if (!task) {
			return <EmptyState {...workflow.emptyStates.missingTask} />;
		}
		const taskPageSize = 5;
		const taskCommentsTotalPages = Math.max(1, Math.ceil(task.comments.length / taskPageSize));
		const taskTimeEntriesTotalPages = Math.max(1, Math.ceil(task.time_entries.length / taskPageSize));
		const taskActivityTotalPages = Math.max(1, Math.ceil(task.recent_activity.length / taskPageSize));
		const pagedTaskComments = task.comments.slice((taskCommentsPage - 1) * taskPageSize, taskCommentsPage * taskPageSize);
		const pagedTaskTimeEntries = task.time_entries.slice((taskTimeEntriesPage - 1) * taskPageSize, taskTimeEntriesPage * taskPageSize);
		const pagedTaskActivity = task.recent_activity.slice((taskActivityPage - 1) * taskPageSize, taskActivityPage * taskPageSize);

		return (
			<div className="space-y-4">
				<Surface {...workflow.sections.taskSnapshot}>
					<div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
						<div className="space-y-4">
							<p className="text-sm leading-7 text-[var(--ink-soft)]">{task.description || workflow.labels.noDescription}</p>
							<div className="flex flex-wrap gap-2">
								<Chip status={task.status}>{labelFor(task.status)}</Chip>
								<Chip>{labelFor(task.priority)}</Chip>
								<Chip>
									<span className="inline-flex items-center gap-2">
										{task.current_assignee ? <AvatarBadge user={task.current_assignee} size={20} /> : null}
										<span>{task.current_assignee ? `${task.current_assignee.first_name} ${task.current_assignee.last_name}` : workflow.labels.unassigned}</span>
									</span>
								</Chip>
								<Chip>{dateFor(task.due_date)}</Chip>
							</div>
						</div>
						<div className="app-card-muted grid gap-3 p-4">
							<div>
								<p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">{workflow.labels.project}</p>
								<p className="mt-1 font-semibold text-[var(--ink)]">{task.project.name}</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">{workflow.labels.estimated}</p>
								<p className="mt-1 font-semibold text-[var(--ink)]">{formatMinutes(task.estimated_minutes)}</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">{workflow.labels.logged}</p>
								<p className="mt-1 font-semibold text-[var(--ink)]">{formatMinutes(task.total_logged_minutes)}</p>
							</div>
						</div>
					</div>
				</Surface>

				<Surface title={workflow.labels.taskToolsTitle ?? "Etiquettes, checklist, fichiers"} description={workflow.labels.taskToolsDescription ?? "Task control"}>
					<div className="grid gap-4 xl:grid-cols-3">
						<div className="app-card-muted space-y-4 p-4">
							<div className="flex items-center gap-2">
								<Tag size={16} className="text-[var(--accent-strong)]" />
								<p className="text-sm font-bold text-[var(--ink)]">{workflow.labels.labelsPanel ?? "Etiquettes"}</p>
							</div>
							<div className="space-y-3">
								<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">Actives</p>
								<div className="flex flex-wrap gap-2">
									{task.labels.map((label) => (
										<span key={label.id} className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-bold shadow-[var(--shadow-sm)]" style={{ borderColor: label.color, color: label.color }}>
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
									{task.labels.length === 0 ? <p className="text-sm text-[var(--ink-soft)]">{workflow.emptyStates.noTags?.description ?? 'No label yet.'}</p> : null}
								</div>
							</div>
							<div className="space-y-3">
								<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">Disponibles</p>
								<div className="flex flex-wrap gap-2">
									{labels
										.filter((label) => !task.labels.some((item) => item.id === label.id))
										.map((label) => (
											<button
												key={label.id}
												type="button"
												disabled={!isManager}
												onClick={() => updateTask({ id: task.id, data: { label_ids: [...task.labels.map((item) => item.id), label.id] } })}
												className="rounded-full border bg-white px-3 py-1.5 text-xs font-bold transition hover:shadow-[var(--shadow-sm)] disabled:opacity-65"
												style={{ borderColor: label.color, color: label.color }}
											>
												{label.name}
											</button>
										))}
								</div>
							</div>
							{isManager ? (
								<div className="space-y-3 rounded-[8px] border border-[color:var(--line)] bg-white p-3">
									<div className="flex items-center gap-2">
										<Palette size={15} className="text-[var(--accent-strong)]" />
										<p className="text-sm font-semibold text-[var(--ink)]">Nouvelle etiquette</p>
									</div>
									<Field value={newLabelName} onChange={setNewLabelName} placeholder={workflow.labels.newLabelPlaceholder ?? "New label"} startIcon={<Tag size={16} />} />
									<div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
										<div className="rounded-[8px] border border-[color:var(--line)] p-3">
											<HexColorPicker color={newLabelColor} onChange={setNewLabelColor} style={{ width: '100%' }} />
										</div>
										<div className="space-y-3">
											<div className="rounded-[8px] border px-3 py-3 text-sm font-semibold" style={{ borderColor: newLabelColor, color: newLabelColor }}>
												<span className="inline-flex items-center gap-2">
													<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: newLabelColor }} />
													{newLabelName.trim() || 'Preview'}
												</span>
											</div>
											<button
												type="button"
												disabled={!newLabelName.trim()}
												onClick={async () => {
													const label = await createLabel({ name: newLabelName.trim(), color: newLabelColor }).unwrap();
													await updateTask({ id: task.id, data: { label_ids: [...task.labels.map((item) => item.id), label.id] } }).unwrap();
													setNewLabelName('');
												}}
												className="app-button w-full"
											>
												<Plus size={16} />
												<span>{t.common.add}</span>
											</button>
										</div>
									</div>
								</div>
							) : null}
						</div>

						<div className="app-card-muted p-4">
							<div className="mb-3 flex items-center justify-between gap-2">
								<p className="text-sm font-bold text-[var(--ink)]">{workflow.labels.checklistPanel ?? "Checklist"}</p>
								<Chip>{task.checklist_items.filter((item) => item.done).length}/{task.checklist_items.length}</Chip>
							</div>
							<div className="space-y-2">
								{task.checklist_items.map((item) => (
									<div key={item.id} className="flex items-center gap-2 rounded-[8px] border border-[color:var(--line)] bg-white px-3 py-2">
										<button type="button" onClick={() => updateChecklistItem({ id: task.id, itemId: item.id, data: { done: !item.done } })} className={cn('grid h-6 w-6 place-items-center rounded-full border', item.done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-[color:var(--line-strong)] text-transparent')}>
											<CheckCircle2 size={15} />
										</button>
										<span className={cn('min-w-0 flex-1 text-sm font-semibold text-[var(--ink)]', item.done && 'text-emerald-700 line-through')}>{item.title}</span>
										<button type="button" onClick={() => deleteChecklistItem({ id: task.id, itemId: item.id })} className="text-[var(--ink-soft)] hover:text-[var(--ink)]">
											<Trash2 size={15} />
										</button>
									</div>
								))}
							</div>
							{taskMutable ? (
								<div className="mt-3 flex gap-2">
									<Field value={newChecklistTitle} onChange={setNewChecklistTitle} placeholder={workflow.labels.addChecklistPlaceholder ?? "Add checklist item"} />
									<button
										type="button"
										disabled={!newChecklistTitle.trim()}
										onClick={async () => {
											await addChecklistItem({ id: task.id, title: newChecklistTitle.trim(), sort_order: task.checklist_items.length }).unwrap();
											setNewChecklistTitle('');
										}}
										className="app-button px-4"
									>
										{addChecklistItemState.isLoading ? workflow.buttons.saving : t.common.add}
									</button>
								</div>
							) : null}
						</div>

						<div className="app-card-muted space-y-4 p-4">
							<div className="flex items-center gap-2">
								<Paperclip size={16} className="text-[var(--accent-strong)]" />
								<p className="text-sm font-bold text-[var(--ink)]">{workflow.labels.attachmentsPanel ?? "Attachments"}</p>
							</div>
							<div className="space-y-3 rounded-[8px] border border-[color:var(--line)] bg-white p-3">
								<div className="flex items-center gap-2">
									<ImagePlus size={15} className="text-[var(--accent-strong)]" />
									<p className="text-sm font-semibold text-[var(--ink)]">Card image</p>
								</div>
								{task.cover_image_url ? (
									<div className="overflow-hidden rounded-[8px] border border-[color:var(--line)]">
										<img src={resolveMediaUrl(task.cover_image_url)} alt={task.title} className="h-40 w-full object-cover" />
									</div>
								) : (
									<div className="rounded-[8px] border border-dashed border-[color:var(--line)] px-3 py-8 text-center text-sm text-[var(--ink-soft)]">
										No card image
									</div>
								)}
								{taskMutable ? (
									<div className="space-y-2">
										<input type="file" accept="image/*" onChange={(event) => setTaskCoverFile(event.target.files?.[0] ?? null)} className="app-input" />
										<div className="flex gap-2">
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
												className="app-button flex-1"
											>
												<ImagePlus size={16} />
												<span>{uploadTaskCoverState.isLoading ? workflow.buttons.saving : 'Set card image'}</span>
											</button>
											{task.cover_image_url ? (
												<button type="button" onClick={() => deleteTaskCover(task.id)} className="app-button app-button-secondary px-4">
													<X size={16} />
												</button>
											) : null}
										</div>
									</div>
								) : null}
							</div>
							<div className="space-y-2">
								{task.attachments.map((attachment) => {
									const attachmentUrl = resolveMediaUrl(attachment.file_url ?? attachment.file);
									const isImage = attachment.mime_type.startsWith('image/');
									return (
										<div key={attachment.id} className="overflow-hidden rounded-[8px] border border-[color:var(--line)] bg-white">
											{isImage ? <img src={attachmentUrl} alt={attachment.name} className="h-32 w-full object-cover" /> : null}
											<div className="flex items-center gap-2 px-3 py-2">
												<Paperclip size={15} className="text-[var(--ink-soft)]" />
												<a href={attachmentUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ink)]">{attachment.name}</a>
												<button type="button" onClick={() => deleteTaskAttachment({ id: task.id, attachmentId: attachment.id })} className="text-[var(--ink-soft)] hover:text-[var(--ink)]">
													<Trash2 size={15} />
												</button>
											</div>
										</div>
									);
								})}
							</div>
							{taskMutable ? (
								<div className="flex flex-col gap-2">
									<input type="file" onChange={(event) => setTaskAttachmentFile(event.target.files?.[0] ?? null)} className="app-input" />
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
										className="app-button"
									>
										<Paperclip size={16} />
										<span>{uploadTaskAttachmentState.isLoading ? workflow.buttons.saving : 'Upload file'}</span>
									</button>
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
					<Surface title={workflow.sections.editTask.title} description={isManager ? workflow.labels.managerControls : workflow.labels.updateMyProgress}>
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
							<div>
								<FieldLabel>{workflow.labels.estimatedMinutes}</FieldLabel>
								<DurationField value={taskEditForm.estimated_minutes} onChange={(value) => setTaskEditForm((current) => ({ ...current, estimated_minutes: value }))} />
							</div>
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
								onClick={() => updateTask({ id: task.id, data: buildTaskPayload(task.project.id, taskEditForm) })}
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
					<Surface {...workflow.sections.permissions}>
						<EmptyState {...workflow.emptyStates.readOnly} />
					</Surface>
				)}

				{isManager ? (
					<Surface {...workflow.sections.reassignTask}>
						<div className="grid gap-4 md:grid-cols-[0.32fr_1fr_auto]">
							<div>
								<FieldLabel htmlFor="new-assignee">{workflow.labels.newAssignee}</FieldLabel>
								<SelectField
									id="new-assignee"
									value={reassignForm.assignee_id}
									onChange={(value) => setReassignForm((current) => ({ ...current, assignee_id: value }))}
									options={users.map((user) => ({ value: user.id, label: `${user.first_name} ${user.last_name}` }))}
									startIcon={<Users size={18} />}
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
									disabled={!reassignForm.assignee_id || !reassignForm.reason.trim()}
									className="app-button"
								>
									<ArrowRight size={16} />
									<span>{reassignTaskState.isLoading ? workflow.buttons.moving : workflow.buttons.reassign}</span>
								</button>
							</div>
						</div>
					</Surface>
				) : null}

				<div className="grid gap-4 xl:grid-cols-2">
					<Surface {...workflow.sections.comments}>
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
											<p className="text-sm font-semibold text-[var(--ink)]">
												{comment.author.first_name} {comment.author.last_name}
											</p>
											<p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">{dateTimeFor(comment.created_at)}</p>
											<p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{comment.body}</p>
										</div>
									</div>
								</div>
							))}
							{task.comments.length === 0 ? <EmptyState {...workflow.emptyStates.noCommentsYet} /> : null}
							<HistoryPager page={taskCommentsPage} totalPages={taskCommentsTotalPages} onChange={setTaskCommentsPage} />
						</div>
					</Surface>

					<Surface {...workflow.sections.timeEntries}>
						<div className="app-card-muted flex items-start gap-3 p-4">
							<div className="mt-0.5 rounded-[8px] border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">
								<Clock3 size={16} />
							</div>
							<div className="min-w-0">
								<p className="text-sm font-semibold text-[var(--ink)]">{workflow.labels.timeEntries}</p>
								<p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">
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
                                            <p className="text-sm font-semibold text-[var(--ink)]">
                                                {entry.user.first_name} {entry.user.last_name} • {formatMinutes(entry.minutes)}
                                            </p>
                                            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">{dateTimeFor(entry.created_at)}</p>
                                            <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{entry.note || workflow.labels.optionalNote}</p>
                                        </div>
                                    </div>
                                </div>
							))}
							{task.time_entries.length === 0 ? <EmptyState {...workflow.emptyStates.noTime} /> : null}
                            <HistoryPager page={taskTimeEntriesPage} totalPages={taskTimeEntriesTotalPages} onChange={setTaskTimeEntriesPage} />
						</div>
					</Surface>
				</div>

				<Surface {...workflow.sections.activity}>
					<div className="space-y-3">
						{pagedTaskActivity.map((activity) => (
                            <div key={activity.id} className="app-card-muted p-4">
                                <div className="flex items-start gap-3">
                                    {activity.actor ? <AvatarBadge user={activity.actor} size={34} /> : <div className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[var(--surface-strong)] text-xs font-bold text-[var(--ink)]">DW</div>}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-[var(--ink)]">
                                            {activity.actor ? `${activity.actor.first_name} ${activity.actor.last_name}` : workflow.labels.system}
                                        </p>
                                        <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{describeWorkflowActivity(activity)}</p>
                                        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">{dateTimeFor(activity.created_at)}</p>
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

	const renderTeam = () => (
		<Surface {...workflow.sections.teamWorkload}>
			<div className="grid gap-4 xl:grid-cols-2">
				{workload.map((row: WorkloadRow) => (
					<div key={row.user.id} className="app-card-muted p-5">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="text-lg font-semibold text-[var(--ink)]">
									{row.user.first_name} {row.user.last_name}
								</p>
								<p className="text-sm text-[var(--ink-soft)]">{labelFor(row.user.role)}</p>
							</div>
							<Users size={18} className="text-[var(--ink-soft)]" />
						</div>
						<div className="mt-4 flex flex-wrap gap-2">
							<Chip>{row.open_tasks} {workflow.labels.openLower}</Chip>
							<Chip>{row.overdue_tasks} {workflow.labels.overdueLower}</Chip>
							<Chip>{workflow.labels.estShort} {formatMinutes(row.estimated_minutes)}</Chip>
							<Chip>{workflow.labels.spentShort} {formatMinutes(row.actual_minutes)}</Chip>
						</div>
					</div>
				))}
				{workload.length === 0 ? <EmptyState {...workflow.emptyStates.noWorkloadData} /> : null}
			</div>
		</Surface>
	);

	const renderReport = () => (
		<div className="space-y-4">
			<Surface {...workflow.sections.reportFilters}>
				<div className="grid gap-4 md:grid-cols-3">
					<div>
						<FieldLabel>{workflow.labels.startDate}</FieldLabel>
						<DateField value={reportFilters.start_date} onChange={(value) => setReportFilters((current) => ({ ...current, start_date: value }))} />
					</div>
					<div>
						<FieldLabel>{workflow.labels.endDate}</FieldLabel>
						<DateField value={reportFilters.end_date} onChange={(value) => setReportFilters((current) => ({ ...current, end_date: value }))} />
					</div>
					<div className="self-end">
						<button type="button" onClick={() => setReportFilters({ start_date: '', end_date: '' })} className="app-button app-button-secondary w-full">
							<RefreshCcw size={16} />
							<span>{workflow.buttons.clearFilters}</span>
						</button>
					</div>
				</div>
			</Surface>

			<Surface {...workflow.sections.projectTotals}>
				<div className="grid gap-4 xl:grid-cols-2">
					{timeReport.map((row: TimeReportRow) => (
						<div key={row.project.id} className="app-card-muted p-5">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-lg font-semibold text-[var(--ink)]">{row.project.name}</p>
									<p className="text-sm text-[var(--ink-soft)]">
										{row.project.manager.first_name} {row.project.manager.last_name}
									</p>
								</div>
								<Chip>{formatMinutes(row.minutes)}</Chip>
							</div>
						</div>
					))}
					{timeReport.length === 0 ? <EmptyState {...workflow.emptyStates.noReportData} /> : null}
				</div>
			</Surface>
		</div>
	);

	const renderNotifications = () => (
		<div className="space-y-4">
			<div className="grid gap-3 md:grid-cols-3">
				<div className="app-card p-5">
					<p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]">Unread</p>
					<p className="mt-2 text-3xl font-bold text-[var(--ink)]">{notifications.filter((item) => !item.is_read).length}</p>
				</div>
				<div className="app-card p-5">
					<p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]">{workflow.labels.taskAlerts}</p>
					<p className="mt-2 text-3xl font-bold text-[var(--ink)]">{notifications.filter((item) => item.task).length}</p>
				</div>
				<div className="app-card p-5">
					<p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]">{workflow.labels.chatAlerts}</p>
					<p className="mt-2 text-3xl font-bold text-[var(--ink)]">{notifications.filter((item) => item.type === 'chat_message').length}</p>
				</div>
			</div>
			<Surface
				{...workflow.sections.notifications}
				action={<ToggleField label={workflow.labels.unreadOnly} checked={notificationsUnreadOnly} onChange={setNotificationsUnreadOnly} />}
			>
				<div className="grid gap-4">
					{notifications.map((notification: NotificationItem) => (
						<div key={notification.id} className="app-card workflow-card-hover overflow-hidden border border-[color:var(--line)] p-5">
							<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
								<div className="flex min-w-0 gap-4">
									<div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border text-[var(--ink)] ${notification.is_read ? 'border-[color:var(--line)] bg-[var(--surface-muted)]' : 'border-red-200 bg-red-50'}`}>
										<Bell size={18} />
									</div>
									<div className="min-w-0">
										<div className="flex flex-wrap gap-2">
											<Chip>{labelFor(notification.type)}</Chip>
											<Chip tone={notification.is_read ? 'neutral' : 'urgent'}>{notification.is_read ? workflow.labels.read : workflow.labels.unread}</Chip>
										</div>
										<p className="mt-3 text-lg font-semibold text-[var(--ink)]">{notificationTitle(notification)}</p>
										<p className="mt-1 text-sm text-[var(--ink-soft)]">{notificationDescription(notification)}</p>
										<div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-[var(--ink-muted)]">
											<span>{dateTimeFor(notification.created_at)}</span>
											{notification.project ? <span>{notification.project.name}</span> : null}
										</div>
									</div>
								</div>
								<div className="flex flex-wrap gap-2 lg:justify-end">
									{notification.task ? (
										<button
											type="button"
											onClick={() => setSelectedTaskId(notification.task!.id)}
											className="app-button app-button-secondary"
										>
											<ArrowRight size={16} />
											<span>{workflow.buttons.openTask}</span>
										</button>
									) : null}
									{notification.type === 'chat_message' ? (
										<Link href={DASHBOARD_CHAT} className="app-button app-button-secondary">
											<MessagesSquare size={16} />
											<span>{workflow.buttons.openChat}</span>
										</Link>
									) : null}
									{!notification.is_read ? (
										<button type="button" onClick={() => void markNotificationRead(notification.id)} className="app-button">
											<CheckCircle2 size={16} />
											<span>{workflow.buttons.markAsRead}</span>
										</button>
									) : null}
								</div>
							</div>
						</div>
					))}
					{notifications.length === 0 ? <EmptyState {...workflow.emptyStates.noNotifications} /> : null}
				</div>
			</Surface>
		</div>
	);

	let content: React.ReactNode = null;
	if (variant === 'overview') content = renderOverview();
	if (variant === 'board' || variant === 'my-work') content = renderBoard();
	if (variant === 'projects') content = renderProjects();
	if (variant === 'project-detail') content = renderProjectDetail();
	if (variant === 'task-detail') content = renderTaskDetail();
	if (variant === 'team') content = renderTeam();
	if (variant === 'report-time') content = renderReport();
	if (variant === 'notifications') content = renderNotifications();

	return (
		<NavigationBar title={pageHeading}>
			<div className="space-y-4">
				{renderHeader()}
				{content}
			</div>
			{selectedTaskId ? (
				<div
					className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 px-3 py-4 backdrop-blur-md sm:px-6"
					role="dialog"
					aria-modal="true"
					onClick={() => setSelectedTaskId(null)}
				>
					<div
						className="flex h-[calc(100vh-32px)] w-[min(1480px,calc(100vw-32px))] flex-col overflow-hidden rounded-[14px] border border-white/70 bg-[var(--app-bg)]/95 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl"
						onClick={(event) => event.stopPropagation()}
						onWheel={(event) => event.stopPropagation()}
					>
						<div className="flex items-center justify-between border-b border-[color:var(--line)] bg-white px-4 py-3">
							<div className="min-w-0">
								<p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">{workflow.labels.taskTitle}</p>
								<p className="truncate text-base font-semibold text-[var(--ink)]">{task?.title ?? workflow.emptyStates.loadingTask.title}</p>
							</div>
							<button
								type="button"
								aria-label={t.common.close}
								onClick={() => setSelectedTaskId(null)}
								className="app-pill workflow-focus-ring flex h-10 w-10 items-center justify-center text-[var(--ink)]"
							>
								<X size={18} />
							</button>
						</div>
						<div className="min-h-0 flex-1 overscroll-contain overflow-y-auto p-4 sm:p-5">{renderTaskDetail()}</div>
					</div>
				</div>
			) : null}
		</NavigationBar>
	);
};

export default DesignWorkflowShell;

