import type { AccountGenderCodeValueType } from '@/types/accountTypes';
import type { TranslationDictionary } from '@/types/languageTypes';
import type {
	AttachmentAnnotation,
	NotificationItem,
	ProjectSummary,
	TaskCard,
	TimeReportRow,
	WorkloadRow,
} from '@/types/designWorkflowTypes';
import {AlertTriangle, CircleCheckBig, Eye, ThumbsUp} from 'lucide-react';

export const PRIORITY_OPTIONS: Array<TaskCard['priority']> = ['low', 'medium', 'high', 'urgent'];
export const REVIEW_STATE_OPTIONS: Array<TaskCard['review_state']> = [
	'not_submitted', 'needs_review', 'changes_requested', 'approved',
];
export const BOARD_SORT_OPTIONS = [
	'sort_order', 'due_date', '-due_date', 'priority', '-priority', 'updated_at', '-updated_at', 'title',
] as const;
export const PROJECT_STATUS_OPTIONS: Array<ProjectSummary['status']> = ['planned', 'active', 'on_hold', 'completed'];
export const EMPTY_PROJECTS: ProjectSummary[] = [];
export const EMPTY_TASKS: TaskCard[] = [];
export const EMPTY_WORKLOAD: WorkloadRow[] = [];
export const EMPTY_TIME_REPORT: TimeReportRow[] = [];
export const EMPTY_NOTIFICATIONS: NotificationItem[] = [];
export const EMPTY_ANNOTATIONS: AttachmentAnnotation[] = [];
export const WORK_DAY_MINUTES = 8 * 60;
export const WORKFLOW_CHART_PALETTE = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#7c3aed', '#e11d48'];

export const CHAT_PAGE_SIZE = 40;
export const MESSAGE_SPINNER_SHOW_DELAY_MS = 120;
export const MESSAGE_SPINNER_HIDE_DELAY_MS = 220;
export const REACTION_OPTIONS = [
	{emoji: '\u2705', label: 'Done', Icon: CircleCheckBig},
	{emoji: '\ud83d\udc40', label: 'Seen', Icon: Eye},
	{emoji: '\ud83d\udc4d', label: 'Approved', Icon: ThumbsUp},
	{emoji: '\u26a0\ufe0f', label: 'Attention', Icon: AlertTriangle},
] as const;
export const REMINDER_TIME_OPTIONS = Array.from({length: 48}, (_, index) => {
	const hour = Math.floor(index / 2).toString().padStart(2, '0');
	const minute = index % 2 === 0 ? '00' : '30';
	const value = `${hour}:${minute}`;
	return {value, label: value};
});
export const OTHER_BUBBLE_COLORS = Array(5).fill('border-[color:var(--line)] bg-white') as string[];

export const genderItemsList = (t: TranslationDictionary): Array<AccountGenderCodeValueType> => [
	{ code: 'H', value: t.rawData.genders.male },
	{ code: 'F', value: t.rawData.genders.female },
];
