import type { UserClass } from '@/models/classes';
import type { TaskAttachment, TaskCard, WorkflowUser } from '@/types/designWorkflowTypes';
import type { UsersListResponse, WorkflowCopy } from '@/types/workflowUiTypes';
import { WORK_DAY_MINUTES } from '@/utils/rawData';

export const getWorkflowLabel = (workflow: WorkflowCopy, value: string) =>
	workflow.statuses[value] ??
	workflow.priorities[value] ??
	workflow.activities[value] ??
	workflow.labels[value] ??
	formatLabel(value);

export const getWorkflowRiskLabel = (workflow: WorkflowCopy, value: string) =>
	workflow.labels[`risk_${value}`] ??
	workflow.labels[value] ??
	workflow.priorities[value] ??
	getWorkflowLabel(workflow, value);

export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export const formatMinutes = (minutes: number) => {
	if (minutes >= WORK_DAY_MINUTES && minutes % WORK_DAY_MINUTES === 0) {
		return `${minutes / WORK_DAY_MINUTES}d`;
	}
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	if (hours === 0) return `${mins}m`;
	if (mins === 0) return `${hours}h`;
	return `${hours}h ${mins}m`;
};

export const formatWorkDays = (minutes: number, dayLabel = 'Days') => {
	const days = Math.max(0, minutes / WORK_DAY_MINUTES);
	const rounded = Number.isInteger(days) ? days : Math.round(days * 10) / 10;
	return `${rounded} ${dayLabel.toLowerCase()}`;
};

export const formatLabel = (value: unknown) =>
	String(value ?? '')
		.split('_')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');

export const formatDate = (value?: string | null, emptyLabel = 'No date', locale?: string) => {
	if (!value) return emptyLabel;
	return new Date(value).toLocaleDateString(locale);
};

export const formatDateTime = (value?: string | null, emptyLabel = 'No date', locale?: string) => {
	if (!value) return emptyLabel;
	return new Date(value).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
};

export const parseLocalCalendarDate = (value?: string | null) => {
	if (!value) return null;
	const [datePart] = value.split('T');
	const [year, month, day] = datePart.split('-').map(Number);
	if (!year || !month || !day) return null;
	const date = new Date(year, month - 1, day);
	return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

export const startOfLocalDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const isBusinessDay = (value: Date) => value.getDay() !== 0;

export const businessDaysBetween = (from: Date, to: Date) => {
	// Compare calendar dates, not local midnight instants: DST can skip midnight.
	const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
	const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
	if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) return 0;
	const direction = start < end ? 1 : -1;
	let cursor = start;
	let count = 0;
	while (cursor !== end) {
		cursor += direction * 86400000;
		if (new Date(cursor).getUTCDay() !== 0) count += direction;
	}
	return count;
};

export const getDueDeliveryInfo = (task: Pick<TaskCard, 'due_date' | 'status'>, labels: WorkflowCopy['labels']) => {
	const due = parseLocalCalendarDate(task.due_date);
	if (!due) return null;
	if (task.status === 'done') {
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

export const resolveMediaUrl = (value?: string | null) => {
	if (!value) return '';
	if (/^https?:\/\//.test(value) || value.startsWith('blob:') || value.startsWith('data:')) return value;
	const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
	return `${apiUrl}${value.startsWith('/') ? value : `/${value}`}`;
};

export const isImageAttachment = (attachment: Pick<TaskAttachment, 'mime_type' | 'name'>) =>
	attachment.mime_type.startsWith('image/') || /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(attachment.name);

export const formatFileSize = (size: number) => {
	if (!size) return '';
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
	return `${Math.round((size / (1024 * 1024)) * 10) / 10} MB`;
};

export const normalizeUsers = (usersResponse?: UsersListResponse): WorkflowUser[] => {
	if (!usersResponse) return [];
	const source = Array.isArray(usersResponse)
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
			is_active: user.is_active !== false,
			avatar:
				typeof user.avatar === 'string'
					? user.avatar
					: typeof user.avatar_cropped === 'string'
						? user.avatar_cropped
						: null,
		}));
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
	const formatDetails = (value: unknown, depth = 0): string => {
		if (typeof value === 'string') return value.trim();
		if (!value || typeof value !== 'object' || depth > 6) return '';
		if (Array.isArray(value))
			return value
				.map((item) => formatDetails(item, depth + 1))
				.filter(Boolean)
				.join(' ');
		return Object.entries(value)
			.map(([field, detail]) => {
				const message = formatDetails(detail, depth + 1);
				return !message
					? ''
					: ['detail', 'non_field_errors'].includes(field)
						? message
						: `${formatLabel(field)}: ${message}`;
			})
			.filter(Boolean)
			.join(' ');
	};
	if (!error || typeof error !== 'object' || !('data' in error)) return fallback;
	const data = error.data;
	if (!data || typeof data !== 'object') return typeof data === 'string' && data.trim() ? data : fallback;
	const details = 'details' in data ? formatDetails(data.details) : '';
	return (
		details || ('message' in data && typeof data.message === 'string' && data.message.trim() ? data.message : fallback)
	);
};
