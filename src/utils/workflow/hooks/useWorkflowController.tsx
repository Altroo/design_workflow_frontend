'use client';

import {
	boardChanged,
	getTaskIdFromDragId,
	isColumnDragId,
	isTaskDragId,
	isTaskStatus,
	moveTaskToBoardIndex,
} from '@/utils/workflow/workflowBoardHelpers';
import {
	formatDate,
	formatDateTime,
	formatLabel,
	formatMinutes,
	getApiErrorMessage,
	getWorkflowLabel,
	getWorkflowRiskLabel,
	normalizeUsers,
} from '@/utils/workflow/workflowFormatting';
import {
	buildTaskEditForm,
	buildTaskPayload,
	DEFAULT_NOTIFICATION_PREFERENCES,
	emptyBoardFilters,
	emptyProjectForm,
	emptyTaskForm,
	filtersFromSavedView,
	normalizeTaskDetail,
	savedViewPayloadFromFilters,
} from '@/utils/workflow/workflowFormHelpers';
import { STATUS_COLUMNS } from '@/components/shared/workflow/boardAppearance';
import { UploadProgress } from '@/components/shared/workflow/uploadProgress';
import { useTheme } from '@/providers/themeProvider';
import { getAccessToken, getProfilState, getWSOnlineUserIdsState } from '@/store/selectors';
import { useGetUsersListQuery } from '@/store/services/account';
import {
	useAddChecklistItemMutation,
	useAddChecklistMutation,
	useAddTaskCommentMutation,
	useArchiveTaskMutation,
	useCreateAttachmentAnnotationMutation,
	useCreateLabelMutation,
	useCreateProjectMutation,
	useCreateSavedViewMutation,
	useCreateTaskMutation,
	useCreateTaskVersionMutation,
	useDeleteChecklistItemMutation,
	useDeleteChecklistMutation,
	useDeleteSavedViewMutation,
	useDeleteTaskAttachmentMutation,
	useDeleteTaskCoverMutation,
	useGetAttachmentAnnotationsQuery,
	useGetDashboardSummaryQuery,
	useGetLabelsQuery,
	useGetNotificationPreferencesQuery,
	useGetNotificationsQuery,
	useGetProjectQuery,
	useGetProjectsQuery,
	useGetSavedViewsQuery,
	useGetTaskQuery,
	useGetTasksQuery,
	useGetTimeReportQuery,
	useGetWorkflowReportQuery,
	useGetWorkloadQuery,
	useMarkNotificationReadMutation,
	useReassignTaskMutation,
	useReorderTasksMutation,
	useRunNotificationActionMutation,
	useSearchWorkspaceQuery,
	useSetTaskCoverFromAttachmentMutation,
	useSnoozeNotificationMutation,
	useUpdateChecklistItemMutation,
	useUpdateLabelMutation,
	useUpdateNotificationPreferencesMutation,
	useUpdateProjectMutation,
	useUpdateSavedViewMutation,
	useUpdateTaskMutation,
	useUpdateTaskReviewMutation,
	useUpdateTaskStatusMutation,
	useUploadTaskAttachmentMutation,
	useUploadTaskCoverMutation,
} from '@/store/services/designWorkflow';
import type {
	NotificationItem,
	NotificationPreference,
	ProjectDetail,
	ProjectInput,
	SavedView,
	TaskArtifactVersion,
	TaskAttachment,
	TaskCard,
	TaskDetail,
	TaskStatus,
	WorkflowUser,
} from '@/types/designWorkflowTypes';
import type {
	AttachmentPreviewTarget,
	BoardFiltersState,
	BoardViewMode,
	MediaDeleteTarget,
	Props,
	TaskDetailTab,
	TaskFormState,
	UsersListResponse,
} from '@/types/workflowUiTypes';
import { attachmentsExceedLimit } from '@/utils/attachments';
import { prepareCardCoverImage } from '@/utils/cardImage';
import { extractApiErrorMessage } from '@/utils/helpers';
import { useAppSelector, useLanguage, useToast } from '@/utils/hooks';
import { guardedChanges, mergeDraftBaseline, mergeLiveDraft } from '@/utils/liveDraft';
import {
	EMPTY_ANNOTATIONS,
	EMPTY_NOTIFICATIONS,
	EMPTY_PROJECTS,
	EMPTY_TASKS,
	EMPTY_TIME_REPORT,
	EMPTY_WORKLOAD,
} from '@/utils/rawData';
import { DASHBOARD_BOARD } from '@/utils/routes';
import { runAsyncWithErrorHandler, runWithCleanup } from '@/utils/runWithCleanup';
import { type DragEndEvent, type DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
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
import { Paperclip, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	ArcElement,
	LineElement,
	PointElement,
	Filler,
	Tooltip,
	Legend,
);

export const useWorkflowController = ({ title, variant, projectId, taskId }: Props) => {
	const boardDragPointerRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
	const { theme } = useTheme();
	const chartTextColor = theme === 'dark' ? '#c4cedd' : '#475569';
	const chartSurfaceColor = theme === 'dark' ? '#1b2332' : '#ffffff';
	const router = useRouter();
	const profile = useAppSelector(getProfilState);
	const token = useAppSelector(getAccessToken);
	const onlineUserIds = useAppSelector(getWSOnlineUserIdsState);
	const { t, language } = useLanguage();
	const { onSuccess, onError } = useToast();
	const workflow = t.workflow;
	const locale = language === 'en' ? 'en-US' : 'fr-FR';
	const labelFor = (value: string) => getWorkflowLabel(workflow, value);
	const riskLabelFor = (value: string) => getWorkflowRiskLabel(workflow, value);
	const dateFor = (value?: string | null) => formatDate(value, workflow.labels.noDate, locale);
	const dateTimeFor = (value?: string | null) => formatDateTime(value, workflow.labels.noDate, locale);
	const messageFor = (fr: string, en: string) => (language === 'en' ? en : fr);
	const calendarWeekdays = (() => {
		const baseSunday = new Date(Date.UTC(2026, 0, 4));
		return Array.from({ length: 7 }, (_, index) =>
			new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
				new Date(baseSunday.getTime() + index * 86_400_000),
			),
		);
	})();
	const notificationTitle = (notification: NotificationItem) => {
		if (notification.type === 'chat_message' && notification.payload.kind === 'reminder')
			return messageFor('Rappel de message', 'Message reminder');
		return labelFor(notification.type);
	};
	const notificationDescription = (notification: NotificationItem) => {
		const objectTitle = notification.task?.title ?? notification.project?.name ?? '';
		if (notification.type === 'chat_message' && notification.payload.kind === 'reminder') {
			return typeof notification.payload.note === 'string' && notification.payload.note.trim()
				? notification.payload.note
				: messageFor('Relisez ce message.', 'Revisit this message.');
		}
		if (notification.type === 'task_overdue' && typeof notification.payload.days_overdue === 'number') {
			return [objectTitle, `${notification.payload.days_overdue} ${workflow.labels.daysOverdue}`]
				.filter(Boolean)
				.join(' - ');
		}
		if (notification.type === 'task_status' && typeof notification.payload.status === 'string') {
			return [objectTitle, `${workflow.labels.statusLabel}: ${labelFor(notification.payload.status)}`]
				.filter(Boolean)
				.join(' - ');
		}
		if (
			notification.type === 'task_reassigned' &&
			typeof notification.payload.reason === 'string' &&
			notification.payload.reason.trim()
		) {
			return [objectTitle, notification.payload.reason].filter(Boolean).join(' - ');
		}
		if (
			notification.type === 'chat_message' &&
			typeof notification.payload.title === 'string' &&
			notification.payload.title.trim()
		) {
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
	const describeWorkflowActivity = (
		taskActivity: TaskDetail['recent_activity'][number] | ProjectDetail['recent_activity'][number],
	) => {
		const metaEntries = Object.entries(taskActivity.metadata ?? {}).filter(
			([, value]) => value !== null && value !== '',
		);
		if (metaEntries.length === 0) return labelFor(taskActivity.action_type);
		return `${labelFor(taskActivity.action_type)} • ${metaEntries
			.slice(0, 3)
			.map(([key, value]) => {
				const translatedKey = workflow.labels[`activityMeta_${key}`] ?? workflow.labels[key] ?? labelFor(key);
				const translatedValue =
					typeof value === 'boolean'
						? value
							? t.common.yes
							: t.common.no
						: typeof value === 'string'
							? labelFor(value)
							: String(value);
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
	const [notificationPreferenceDraft, setNotificationPreferenceDraft] = useState<NotificationPreference>(
		DEFAULT_NOTIFICATION_PREFERENCES,
	);
	const [reportFilters, setReportFilters] = useState({ start_date: '', end_date: '', project: '', user: '' });
	const [projectForm, setProjectForm] = useState<ProjectInput>(() => emptyProjectForm(profile.id));
	const [projectEditForm, setProjectEditForm] = useState<ProjectInput>(() => emptyProjectForm(profile.id));
	const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
	const [taskEditForm, setTaskEditForm] = useState<TaskFormState>(emptyTaskForm);
	const taskFormSnapshot = useRef<{ id: number; form: TaskFormState } | null>(null);
	const projectFormSnapshot = useRef<{ id: number; form: ProjectInput } | null>(null);
	const taskEditBaselineRef = useRef<TaskFormState | null>(null);
	const projectEditBaseline = useRef<ProjectInput | null>(null);
	const savedViewSnapshot = useRef<{ id: number; filters: BoardFiltersState } | null>(null);
	const [reassignForm, setReassignForm] = useState({ assignee_id: '', reason: '' });
	const [commentBody, setCommentBody] = useState('');
	const [newChecklistItemsByChecklist, setNewChecklistItemsByChecklist] = useState<Record<string, string>>({});
	const [newChecklistGroupTitle, setNewChecklistGroupTitle] = useState('');
	const [selectedChecklistTemplate, setSelectedChecklistTemplate] = useState('');
	const [taskAddPanel, setTaskAddPanel] = useState<'labels' | 'checklist' | 'cover' | 'attachments' | 'members' | null>(
		null,
	);
	const [modalDescriptionEditing, setModalDescriptionEditing] = useState(false);
	const [modalTitleDraft, setModalTitleDraft] = useState<{ id: number; title: string; original: string } | null>(null);
	const renameLockRef = useRef(false);
	const cardTitleHeading = useRef<HTMLHeadingElement>(null);
	const [modalLabelComposerOpen, setModalLabelComposerOpen] = useState(false);
	const [newLabelName, setNewLabelName] = useState('');
	const [newLabelColor, setNewLabelColor] = useState('#7F56D9');
	const [editingLabelId, setEditingLabelId] = useState<number | null>(null);
	const [editingLabelName, setEditingLabelName] = useState('');
	const [editingLabelColor, setEditingLabelColor] = useState('#7F56D9');
	const [taskAttachments, setTaskAttachments] = useState<
		Array<{ id: number; file: File; label: string; error?: string }>
	>([]);
	const nextAttachmentId = useRef(0);
	const attachmentContext = useRef(0);
	const attachmentUploadLock = useRef(false);
	const [attachmentUploadStatus, setAttachmentUploadStatus] = useState<{ index: number; total: number } | null>(null);
	const [taskCoverFile, setTaskCoverFile] = useState<File | null>(null);
	const [taskCoverLabel, setTaskCoverLabel] = useState('');
	const [isPreparingTaskCover, setIsPreparingTaskCover] = useState(false);
	const [mediaDeleteTarget, setMediaDeleteTarget] = useState<MediaDeleteTarget | null>(null);
	const [projectArchiveTarget, setProjectArchiveTarget] = useState<{ id: number; archived: boolean } | null>(null);
	const [attachmentPreview, setAttachmentPreview] = useState<AttachmentPreviewTarget | null>(null);
	const [boardDraft, setBoardDraft] = useState<TaskCard[]>([]);
	const [boardMovePending, setBoardMovePending] = useState(false);
	const boardMoveLock = useRef(false);
	const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
	const [quickAddColumn, setQuickAddColumn] = useState<TaskStatus | null>(null);
	const [quickAddTitle, setQuickAddTitle] = useState('');
	const [quickAddProjectId, setQuickAddProjectId] = useState('');
	const quickAddContext = useRef(0);
	const quickAddLock = useRef(false);
	useEffect(() => {
		quickAddContext.current += 1;
		setQuickAddColumn(null);
		setQuickAddTitle('');
		setQuickAddProjectId('');
	}, [boardFilters.project, boardFilters.archivedOnly]);
	const pendingReviewMutationRef = useRef<number | null>(null);
	const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
	const [projectTaskEditId, setProjectTaskEditId] = useState<number | null>(null);
	const [reviewStateDraft, setReviewStateDraft] = useState<TaskDetail['review_state'] | null>(null);
	const reviewResponseVersion = useRef<{ id: number; updatedAt: string } | null>(null);
	const reviewContext = useRef(0);
	const [taskDetailTab, setTaskDetailTab] = useState<TaskDetailTab>('overview');
	const [reviewNotes, setReviewNotes] = useState('');
	const [reviewConfirmation, setReviewConfirmation] = useState<{
		taskId: number;
		reviewState: Extract<TaskDetail['review_state'], 'needs_review' | 'approved'>;
		resetNotes: boolean;
	} | null>(null);
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
	const [taskActivityPage, setTaskActivityPage] = useState(1);
	const [boardFiltersOpen, setBoardFiltersOpen] = useState(false);
	const [pendingReviewTaskId, setPendingReviewTaskId] = useState<number | null>(null);
	const activeTaskId = projectTaskEditId ?? selectedTaskId ?? (variant === 'task-detail' ? taskId : null);
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
	);
	const closeTaskModal = () => {
		setSelectedTaskId(null);
		setModalTitleDraft(null);
		setTaskAddPanel(null);
		setModalDescriptionEditing(false);
		setModalLabelComposerOpen(false);
		if (taskId && variant === 'board') {
			router.replace(DASHBOARD_BOARD, { scroll: false });
		}
	};
	const closeProjectTaskEdit = () => setProjectTaskEditId(null);
	const toggleTaskAddPanel = (panel: NonNullable<typeof taskAddPanel>) => {
		setTaskAddPanel((current) => (current === panel ? null : panel));
		setModalLabelComposerOpen(false);
		setEditingLabelId(null);
	};
	useEffect(() => {
		if (variant === 'board' && taskId) {
			setSelectedTaskId(taskId);
		}
	}, [taskId, variant]);
	const { data: summary, isLoading: summaryLoading } = useGetDashboardSummaryQuery(undefined, {
		skip: !workflowDataReady || variant !== 'overview' || !isManager,
		pollingInterval: 60_000,
		skipPollingIfUnfocused: true,
	});
	const summaryBusy = !workflowDataReady || Boolean(summaryLoading);
	const { data: usersResponse, isLoading: usersLoading } = useGetUsersListQuery(
		{ with_pagination: false },
		{ skip: !workflowDataReady },
	);
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
	const assignableUsers = [
		...(currentUserOption ? [currentUserOption] : []),
		...users.filter((user) => user.id !== currentUserOption?.id),
	];
	const mentionableUsers = assignableUsers.filter((user) => user.id !== profile.id);
	const managerUsers = assignableUsers;
	const userOptionLabel = (user: WorkflowUser) =>
		`${user.first_name} ${user.last_name}${user.id === profile.id ? ` (${workflow.labels.you})` : ''}`;
	const validReassignAssigneeSelected = assignableUsers.some((user) => String(user.id) === reassignForm.assignee_id);
	const { data: projectsData, isLoading: projectsLoading } = useGetProjectsQuery(
		{ all: true },
		{
			skip:
				!workflowDataReady ||
				!['projects', 'overview', 'board', 'project-detail', 'task-detail', 'report-time'].includes(variant),
		},
	);
	const projects = projectsData ?? EMPTY_PROJECTS;
	const writableProjects = projects.filter((item) => item.can_work && !item.archived);
	const { data: savedViews = [] } = useGetSavedViewsQuery(undefined, {
		skip: !workflowDataReady || variant !== 'board',
	});
	useEffect(() => {
		if (!selectedSavedViewId) {
			savedViewSnapshot.current = null;
			return;
		}
		const selected = savedViews.find((view) => view.id === selectedSavedViewId);
		if (!selected) {
			if (savedViewSnapshot.current?.id === selectedSavedViewId) {
				setSelectedSavedViewId(null);
				setBoardFilters(emptyBoardFilters());
			}
			return;
		}
		const next = filtersFromSavedView(selected);
		const previous = savedViewSnapshot.current;
		if (previous?.id === selected.id && JSON.stringify(previous.filters) !== JSON.stringify(next)) {
			setBoardFilters((current) => mergeLiveDraft(current, previous.filters, next));
		}
		savedViewSnapshot.current = { id: selected.id, filters: next };
	}, [savedViews, selectedSavedViewId]);
	const { data: workspaceSearchResults = [] } = useSearchWorkspaceQuery(
		{ q: boardFilters.search.trim(), types: 'task,project,user,chat,file' },
		{ skip: !workflowDataReady || variant !== 'board' || boardFilters.search.trim().length < 2 },
	);
	const { data: project, isLoading: projectLoading } = useGetProjectQuery(projectId ?? 0, {
		skip: !workflowDataReady || variant !== 'project-detail' || !projectId,
	});
	const tasksParams =
		variant === 'overview'
			? { overdue: true }
			: {
					project: boardFilters.project && boardFilters.project !== 'mine' ? Number(boardFilters.project) : undefined,
					my_projects: boardFilters.project === 'mine' || undefined,
					status: boardFilters.status || undefined,
					priority: boardFilters.priority || undefined,
					assignee: boardFilters.assignee ? Number(boardFilters.assignee) : undefined,
					label: boardFilters.label ? Number(boardFilters.label) : undefined,
					review_state: boardFilters.reviewState || undefined,
					q: boardFilters.search.trim() || undefined,
					sort: boardViewMode === 'table' ? boardFilters.sort || undefined : 'sort_order',
					overdue: boardFilters.overdueOnly || undefined,
					archived: boardFilters.archivedOnly || undefined,
				};
	const {
		data: tasksData,
		isLoading: tasksLoading,
		isFetching: tasksFetching,
		refetch: refetchTasks,
	} = useGetTasksQuery(tasksParams, {
		skip: !workflowDataReady || !['board', 'overview'].includes(variant),
	});
	const tasks = tasksData ?? EMPTY_TASKS;
	const {
		data: unfilteredBoardTasksData = EMPTY_TASKS,
		isLoading: unfilteredBoardTasksLoading,
		isFetching: unfilteredBoardTasksFetching,
	} = useGetTasksQuery(
		{
			sort: 'sort_order',
			archived: false,
		},
		{ skip: !workflowDataReady || variant !== 'board' || !autoAppliedSavedViewId },
	);
	const {
		data: taskData,
		isLoading: taskLoading,
		error: taskError,
	} = useGetTaskQuery(activeTaskId ?? 0, {
		skip: !workflowDataReady || !activeTaskId,
	});
	const projectsBusy = !workflowDataReady || projectsLoading;
	const projectBusy = !workflowDataReady || projectLoading;
	const tasksBusy = !workflowDataReady || tasksLoading;
	const taskBusy = !workflowDataReady || taskLoading;
	const taskUnavailable = Boolean(
		taskError &&
		typeof taskError === 'object' &&
		'status' in taskError &&
		[403, 404].includes(Number(taskError.status)),
	);
	const task = normalizeTaskDetail(taskData?.id === activeTaskId && !taskUnavailable ? taskData : undefined);
	const { data: workloadData } = useGetWorkloadQuery(undefined, {
		skip: !workflowDataReady || !isManager || !['team', 'overview'].includes(variant),
	});
	const designerWorkload = workloadData ?? EMPTY_WORKLOAD;
	const { data: timeReportData } = useGetTimeReportQuery(
		{
			start_date: reportFilters.start_date || undefined,
			end_date: reportFilters.end_date || undefined,
			project: reportFilters.project ? Number(reportFilters.project) : undefined,
			user: reportFilters.user ? Number(reportFilters.user) : undefined,
		},
		{ skip: !workflowDataReady || variant !== 'report-time' || !isManager },
	);
	const timeReport = timeReportData ?? EMPTY_TIME_REPORT;
	const { data: workflowReport } = useGetWorkflowReportQuery(
		{
			start_date: reportFilters.start_date || undefined,
			end_date: reportFilters.end_date || undefined,
			project: reportFilters.project ? Number(reportFilters.project) : undefined,
			user: reportFilters.user ? Number(reportFilters.user) : undefined,
		},
		{ skip: !workflowDataReady || variant !== 'report-time' || !isManager },
	);
	const notificationQueryArgs = notificationsUnreadOnly ? { unread: true } : undefined;
	const { data: notificationsData } = useGetNotificationsQuery(notificationQueryArgs, {
		skip: !workflowDataReady || variant !== 'notifications',
	});
	const notifications = notificationsData ?? EMPTY_NOTIFICATIONS;
	const { data: notificationPreferences } = useGetNotificationPreferencesQuery(undefined, {
		skip: !workflowDataReady || variant !== 'notifications',
	});
	const resolvedNotificationPreferences = notificationPreferenceDraft;
	const { data: labels = [] } = useGetLabelsQuery(undefined, {
		skip: !workflowDataReady || (!activeTaskId && !['project-detail', 'board'].includes(variant)),
	});
	const { data: selectedAttachmentAnnotations = EMPTY_ANNOTATIONS } = useGetAttachmentAnnotationsQuery(
		selectedAnnotationAttachmentId ?? 0,
		{ skip: !workflowDataReady || !selectedAnnotationAttachmentId },
	);
	const [createProject, createProjectState] = useCreateProjectMutation();
	const [createLabel] = useCreateLabelMutation();
	const [updateLabel, updateLabelState] = useUpdateLabelMutation();
	const [createSavedView, createSavedViewState] = useCreateSavedViewMutation();
	const [updateSavedView] = useUpdateSavedViewMutation();
	const [deleteSavedView] = useDeleteSavedViewMutation();
	const [updateProject, updateProjectState] = useUpdateProjectMutation();
	const [setProjectArchived, projectArchiveState] = useUpdateProjectMutation();
	const [createTask, createTaskState] = useCreateTaskMutation();
	const [updateTask, updateTaskState] = useUpdateTaskMutation();
	const [updateTaskStatus, updateStatusState] = useUpdateTaskStatusMutation();
	const [updateTaskReview, updateTaskReviewState] = useUpdateTaskReviewMutation();
	const [reorderTasks, reorderTasksState] = useReorderTasksMutation();
	const [archiveTask] = useArchiveTaskMutation();
	const [addChecklist, addChecklistState] = useAddChecklistMutation();
	const [deleteChecklist] = useDeleteChecklistMutation();
	const [addChecklistItem, addChecklistItemState] = useAddChecklistItemMutation();
	const [updateChecklistItem] = useUpdateChecklistItemMutation();
	const [deleteChecklistItem] = useDeleteChecklistItemMutation();
	const [uploadTaskAttachment] = useUploadTaskAttachmentMutation();
	const [attachmentUploadProgress, setAttachmentUploadProgress] = useState<number | null>(null);
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
	const snoozeForOneHour = (notification: NotificationItem) => {
		const snoozedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
		void snoozeNotification({ id: notification.id, snoozed_until: snoozedUntil });
	};
	const [runNotificationAction] = useRunNotificationActionMutation();
	const [updateNotificationPreferences] = useUpdateNotificationPreferencesMutation();
	const runPrimaryAction = async (action: () => Promise<unknown>, successMessage: string, errorMessage?: string) => {
		await runAsyncWithErrorHandler(
			async () => {
				await action();
				onSuccess(successMessage);
			},
			(error) => {
				onError(getApiErrorMessage(error, errorMessage ?? t.errors.unexpectedError));
			},
		);
	};
	const submitReviewUpdate = async (
		reviewState: TaskDetail['review_state'],
		options: { notes?: string; resetNotes?: boolean } = {},
	) => {
		if (!task) return;
		const currentReviewState = reviewStateDraft ?? task.review_state;
		if (currentReviewState === reviewState || pendingReviewMutationRef.current === task.id) return;
		const context = reviewContext.current;
		pendingReviewMutationRef.current = task.id;
		reviewResponseVersion.current = null;
		setPendingReviewTaskId(task.id);
		setReviewStateDraft(reviewState);
		await runWithCleanup(
			async () => {
				await runAsyncWithErrorHandler(
					async () => {
						const updatedTask = await updateTaskReview({
							id: task.id,
							review_state: reviewState,
							notes: options.notes ?? (reviewNotes.trim() || undefined),
						}).unwrap();
						if (reviewContext.current === context) {
							reviewResponseVersion.current = { id: task.id, updatedAt: updatedTask.updated_at };
							setReviewStateDraft(updatedTask.review_state);
							if (options.resetNotes ?? true) setReviewNotes('');
						}
						onSuccess(messageFor('Revue mise à jour avec succès.', 'Review updated successfully.'));
					},
					() => {
						if (reviewContext.current === context) setReviewStateDraft(null);
						onError(messageFor('Impossible de mettre à jour la revue.', 'Could not update the review.'));
					},
				);
			},
			() => {
				if (pendingReviewMutationRef.current === task.id) {
					pendingReviewMutationRef.current = null;
					setPendingReviewTaskId(null);
				}
			},
		);
	};
	useEffect(() => {
		const responseVersion = reviewResponseVersion.current;
		// Retain the optimistic state until the query has caught up with this
		// mutation, then accept newer decisions even if they return to the old state.
		if (
			!pendingReviewTaskId &&
			task &&
			responseVersion?.id === task.id &&
			Date.parse(task.updated_at) >= Date.parse(responseVersion.updatedAt)
		) {
			setReviewStateDraft(null);
			reviewResponseVersion.current = null;
		}
	}, [task?.review_state, pendingReviewTaskId, reviewStateDraft, task]);
	useEffect(() => {
		if (notificationPreferences) {
			setNotificationPreferenceDraft(notificationPreferences);
		}
	}, [notificationPreferences]);
	useEffect(() => {
		if (profile.id && !projectForm.manager_id) {
			setProjectForm((current) => ({ ...current, manager_id: profile.id }));
		}
	}, [profile.id, projectForm.manager_id]);
	const syncProjectEditForm = useEffectEvent(() => {
		if (project) {
			const next: ProjectInput = {
				name: project.name,
				description: project.description,
				manager_id: project.manager.id,
				collaborator_ids: project.collaborators?.map((user) => user.id) ?? [],
				start_date: project.start_date ?? '',
				target_end_date: project.target_end_date ?? '',
				priority: project.priority,
				status: project.status,
				archived: project.archived,
			};
			const previous = projectFormSnapshot.current;
			projectEditBaseline.current =
				previous?.id === project.id && projectEditBaseline.current
					? mergeDraftBaseline(projectEditForm, projectEditBaseline.current, next)
					: next;
			setProjectEditForm((current) =>
				previous?.id === project.id ? mergeLiveDraft(current, previous.form, next) : next,
			);
			projectFormSnapshot.current = { id: project.id, form: next };
			setTaskForm((current) => ({
				...current,
				current_assignee_id: current.current_assignee_id || '',
			}));
		}
	});
	useEffect(() => {
		syncProjectEditForm();
	}, [project]);
	useEffect(() => {
		if (!['board', 'overview'].includes(variant) || draggedTaskId !== null || boardMovePending) {
			return;
		}
		setBoardDraft(tasks);
	}, [tasks, variant, draggedTaskId, boardMovePending]);
	useEffect(() => {
		if (variant !== 'board' || defaultSavedViewAppliedRef.current || savedViews.length === 0) {
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
		if (!autoAppliedSavedViewId || variant !== 'board') return;
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
		const handleMove = (event: PointerEvent) => {
			boardDragPointerRef.current.x = event.clientX;
			boardDragPointerRef.current.y = event.clientY;
		};
		window.addEventListener('pointermove', handleMove, true);
		return () => {
			window.removeEventListener('pointermove', handleMove, true);
		};
	}, []);
	useEffect(() => {
		attachmentContext.current += 1;
		setModalTitleDraft(null);
		attachmentUploadLock.current = false;
		setTaskAttachments([]);
		setAttachmentUploadProgress(null);
		setAttachmentUploadStatus(null);
		setTaskAddPanel(null);
		return () => {
			attachmentContext.current += 1;
		};
	}, [activeTaskId]);
	const syncTaskEditForm = useEffectEvent(() => {
		const next = buildTaskEditForm(task);
		const previous = taskFormSnapshot.current;
		if (task && previous?.id === task.id) {
			taskEditBaselineRef.current = mergeDraftBaseline(
				taskEditForm,
				taskEditBaselineRef.current ?? previous.form,
				next,
			);
			setTaskEditForm((current) => mergeLiveDraft(current, previous.form, next));
			taskFormSnapshot.current = { id: task.id, form: next };
			return;
		}
		taskFormSnapshot.current = task ? { id: task.id, form: next } : null;
		taskEditBaselineRef.current = next;
		setTaskEditForm(next);
		if (task?.current_assignee?.id) {
			setReassignForm((current) => ({ ...current, assignee_id: String(task.current_assignee?.id ?? '') }));
		}
		setTaskCommentsPage(1);
		setTaskActivityPage(1);
		setTaskCoverFile(null);
		setTaskCoverLabel('');
		setMediaDeleteTarget(null);
		setAttachmentPreview(null);
		setModalDescriptionEditing(false);
		setModalLabelComposerOpen(false);
		setEditingLabelId(null);
	});
	useEffect(() => {
		syncTaskEditForm();
	}, [taskData, activeTaskId, taskUnavailable]);
	const resetTaskReviewState = useEffectEvent(() => {
		reviewContext.current += 1;
		setTaskDetailTab('overview');
		setReviewStateDraft(null);
		reviewResponseVersion.current = null;
		setReviewNotes('');
		setReviewConfirmation(null);
		setVersionNotes('');
		setVersionAttachmentId(task?.attachments[0]?.id ? String(task.attachments[0].id) : '');
		setVersionApprovalState('pending');
		setSelectedAnnotationAttachmentId(task?.attachments[0]?.id ?? null);
		setAnnotationVersionId('');
		setAnnotationBody('');
		setAnnotationX('50');
		setAnnotationY('50');
		setAnnotationResolved(false);
	});
	useEffect(() => {
		resetTaskReviewState();
	}, [task?.id]);
	useEffect(() => {
		if (projectTaskEditId && task && !task.can_edit) {
			setProjectTaskEditId(null);
			setSelectedTaskId(task.id);
		}
	}, [projectTaskEditId, task]);
	useEffect(() => {
		if (attachmentPreview && task && !task.attachments.some((attachment) => attachment.id === attachmentPreview.id))
			setAttachmentPreview(null);
	}, [task, attachmentPreview]);
	useEffect(() => {
		if (
			mediaDeleteTarget &&
			(!task?.can_edit ||
				task.id !== mediaDeleteTarget.taskId ||
				(mediaDeleteTarget.kind === 'cover'
					? !task.cover_image_url
					: !task.attachments.some((attachment) => attachment.id === mediaDeleteTarget.attachmentId)))
		) {
			setMediaDeleteTarget(null);
		}
		if (reviewConfirmation) {
			const canConfirm =
				task?.id === reviewConfirmation.taskId &&
				!task.archived &&
				!task.project.archived &&
				(reviewConfirmation.reviewState === 'approved'
					? isManager && task.review_state === 'needs_review'
					: !isManager &&
						task.can_edit &&
						['not_submitted', 'changes_requested', 'approved'].includes(task.review_state));
			if (!canConfirm) setReviewConfirmation(null);
		}
	}, [task, isManager, mediaDeleteTarget, reviewConfirmation]);
	useEffect(() => {
		if (
			projectArchiveTarget &&
			(!project ||
				project.id !== projectArchiveTarget.id ||
				project.archived !== projectArchiveTarget.archived ||
				!(project.can_manage ?? (isManager || project.manager.id === profile.id)))
		)
			setProjectArchiveTarget(null);
	}, [project, projectArchiveTarget, isManager, profile.id]);
	const onModalEscape = useEffectEvent(() => {
		if (modalTitleDraft) {
			setModalTitleDraft(null);
			cardTitleHeading.current?.focus();
			return;
		}
		if (projectTaskEditId) {
			closeProjectTaskEdit();
			return;
		}
		if (taskAddPanel) {
			setTaskAddPanel(null);
			return;
		}
		closeTaskModal();
	});
	useEffect(() => {
		if (!selectedTaskId && !projectTaskEditId) return;
		const previousOverflow = document.body.style.overflow;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onModalEscape();
			}
		};
		document.body.style.overflow = 'hidden';
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [selectedTaskId, projectTaskEditId]);
	const handleArchiveTask = async (taskItem: TaskCard) => {
		await archiveTask({ id: taskItem.id, archived: !taskItem.archived }).unwrap();
	};
	const handleSetProjectArchived = async () => {
		if (
			!project ||
			project.id !== projectArchiveTarget?.id ||
			project.archived !== projectArchiveTarget.archived ||
			!(project.can_manage ?? (isManager || project.manager.id === profile.id))
		)
			return;
		const target = projectArchiveTarget;
		const archived = !project.archived;
		await runPrimaryAction(
			async () => {
				await setProjectArchived({ id: project.id, data: { archived } }).unwrap();
				setProjectArchiveTarget((current) => (current === target ? null : current));
			},
			archived
				? messageFor('Projet archivé avec succès.', 'Project archived successfully.')
				: messageFor('Projet réactivé avec succès.', 'Project unarchived successfully.'),
			archived
				? messageFor('Impossible d’archiver le projet.', 'Could not archive the project.')
				: messageFor('Impossible de réactiver le projet.', 'Could not unarchive the project.'),
		);
	};
	const handleConfirmMediaDelete = async () => {
		if (!mediaDeleteTarget || !task?.can_edit || task.id !== mediaDeleteTarget.taskId) return;
		const target = mediaDeleteTarget;
		if (target.kind === 'cover') {
			await deleteTaskCover(target.taskId).unwrap();
		} else {
			await deleteTaskAttachment({
				id: target.taskId,
				attachmentId: target.attachmentId,
			}).unwrap();
		}
		setMediaDeleteTarget((current) => (current === target ? null : current));
	};
	const handleUploadTaskCover = async (taskId: number) => {
		const label = taskCoverLabel.trim();
		if (!taskCoverFile || !label || isPreparingTaskCover) return;
		setIsPreparingTaskCover(true);
		try {
			const preparedFile = await prepareCardCoverImage(taskCoverFile);
			await runPrimaryAction(
				async () => {
					const data = new FormData();
					data.append('cover_image', preparedFile);
					data.append('name', label);
					await uploadTaskCover({ id: taskId, data }).unwrap();
					setTaskCoverFile(null);
					setTaskCoverLabel('');
				},
				messageFor('Image de carte ajoutée.', 'Card image added.'),
				messageFor('Impossible d’ajouter l’image.', 'Could not add the image.'),
			);
		} catch {
			onError(
				messageFor(
					'Impossible de réduire cette image. Choisissez une image valide ou moins volumineuse.',
					'Could not reduce this image. Choose a valid or smaller image.',
				),
			);
		} finally {
			setIsPreparingTaskCover(false);
		}
	};
	const selectTaskAttachments = (files: File[]) => {
		if (attachmentUploadLock.current) return;
		const validFiles = files.filter((file) => !attachmentsExceedLimit([file]));
		if (validFiles.length !== files.length) onError(t.errors.attachmentTooLarge);
		const additions = validFiles.map((file) => ({ id: nextAttachmentId.current++, file, label: file.name }));
		setTaskAttachments((current) => {
			const result = [...current];
			for (const entry of additions) {
				if (
					!result.some(
						({ file }) =>
							file.name === entry.file.name &&
							file.size === entry.file.size &&
							file.lastModified === entry.file.lastModified,
					)
				)
					result.push(entry);
			}
			return result;
		});
	};
	const handleUploadTaskAttachments = async (taskId: number) => {
		if (attachmentUploadLock.current || !taskAttachments.length || taskAttachments.some((entry) => !entry.label.trim()))
			return;
		if (taskAttachments.some((entry) => attachmentsExceedLimit([entry.file]))) {
			onError(t.errors.attachmentTooLarge);
			return;
		}
		attachmentUploadLock.current = true;
		const context = attachmentContext.current;
		let uploaded = 0;
		let failed = 0;
		try {
			// One request per file preserves the 10 GB per-file limit and avoids a huge multipart request.
			for (const [index, entry] of taskAttachments.entries()) {
				if (attachmentContext.current !== context) return;
				setAttachmentUploadStatus({ index: index + 1, total: taskAttachments.length });
				setAttachmentUploadProgress(0);
				const data = new FormData();
				data.append('file', entry.file);
				data.append('name', entry.label.trim());
				try {
					await uploadTaskAttachment({
						id: taskId,
						data,
						onUploadProgress: ({ loaded, total }) => {
							if (attachmentContext.current === context)
								setAttachmentUploadProgress(
									Math.min(100, Math.round((loaded / (total || entry.file.size || 1)) * 100)),
								);
						},
					}).unwrap();
					if (attachmentContext.current !== context) return;
					uploaded += 1;
					setTaskAttachments((current) => current.filter((item) => item.id !== entry.id));
				} catch (error) {
					if (attachmentContext.current !== context) return;
					failed += 1;
					const errorMessage = extractApiErrorMessage(
						error,
						messageFor('Impossible d’ajouter ce fichier. Réessayez.', 'Could not add this file. Try again.'),
					);
					setTaskAttachments((current) =>
						current.map((item) => (item.id === entry.id ? { ...item, error: errorMessage } : item)),
					);
				}
			}
			if (uploaded)
				onSuccess(
					messageFor(
						`${uploaded} fichier${uploaded > 1 ? 's' : ''} ajouté${uploaded > 1 ? 's' : ''}.`,
						`${uploaded} file${uploaded > 1 ? 's' : ''} added.`,
					),
				);
			if (failed)
				onError(
					messageFor(
						'Les fichiers non envoyés restent dans la liste. Vous pouvez réessayer.',
						'Unsent files remain in the list. You can retry them.',
					),
				);
		} finally {
			if (attachmentContext.current === context) {
				attachmentUploadLock.current = false;
				setAttachmentUploadStatus(null);
				setAttachmentUploadProgress(null);
			}
		}
	};
	const renderTaskAttachmentPicker = (taskId: number, inputId: string) => (
		<div className="workflow-attachment-picker" data-testid="task-attachment-picker">
			<input
				id={inputId}
				type="file"
				multiple
				className="workflow-hidden-file-input"
				disabled={attachmentUploadStatus !== null}
				onChange={(event) => {
					selectTaskAttachments(Array.from(event.target.files ?? []));
					event.target.value = '';
				}}
			/>
			<div className="workflow-trello-modal-media-actions">
				<label htmlFor={inputId} className="workflow-trello-modal-file-button">
					<Paperclip size={16} />
					{messageFor('Choisir des fichiers', 'Choose files')}
				</label>
				<small className="workflow-upload-hint">
					{messageFor(
						'Plusieurs fichiers possibles · 10 Go maximum par fichier · Qualité originale',
						'Select multiple files · Up to 10 GB per file · Original quality',
					)}
				</small>
			</div>
			{taskAttachments.length ? (
				<ul className="workflow-attachment-queue">
					{taskAttachments.map((entry) => (
						<li key={entry.id}>
							<div className="workflow-attachment-queue-heading">
								<strong>{entry.file.name}</strong>
								<button
									type="button"
									className="workflow-tool-icon-button workflow-tool-icon-button-danger"
									disabled={attachmentUploadStatus !== null}
									aria-label={`${messageFor('Retirer', 'Remove')} ${entry.file.name}`}
									onClick={() => setTaskAttachments((current) => current.filter((item) => item.id !== entry.id))}
								>
									<X size={16} />
								</button>
							</div>
							<input
								className="app-input"
								value={entry.label}
								maxLength={255}
								disabled={attachmentUploadStatus !== null}
								aria-label={`${messageFor('Description de', 'Description for')} ${entry.file.name}`}
								placeholder={workflow.labels.attachmentLabelPlaceholder ?? 'Décrivez ce fichier'}
								onChange={(event) =>
									setTaskAttachments((current) =>
										current.map((item) =>
											item.id === entry.id ? { ...item, label: event.target.value, error: undefined } : item,
										),
									)
								}
							/>
							{entry.error ? (
								<p className="workflow-attachment-queue-error" role="alert">
									{entry.error}
								</p>
							) : null}
						</li>
					))}
				</ul>
			) : null}
			{attachmentUploadStatus ? (
				<p className="workflow-upload-hint" role="status">
					{messageFor('Fichier', 'File')} {attachmentUploadStatus.index} / {attachmentUploadStatus.total}
				</p>
			) : null}
			<UploadProgress progress={attachmentUploadProgress} />
			{taskAttachments.length || attachmentUploadStatus ? (
				<button
					type="button"
					className="workflow-trello-modal-save"
					disabled={
						attachmentUploadStatus !== null ||
						!taskAttachments.length ||
						taskAttachments.some((entry) => !entry.label.trim())
					}
					onClick={() => void handleUploadTaskAttachments(taskId)}
				>
					{attachmentUploadStatus
						? workflow.buttons.saving
						: messageFor(
								`Ajouter ${taskAttachments.length} fichier${taskAttachments.length > 1 ? 's' : ''}`,
								`Add ${taskAttachments.length} file${taskAttachments.length > 1 ? 's' : ''}`,
							)}
				</button>
			) : null}
		</div>
	);
	const handleSetAttachmentAsCover = async (taskItem: TaskDetail, attachment: TaskAttachment) => {
		await runPrimaryAction(
			async () => {
				await setTaskCoverFromAttachment({ id: taskItem.id, attachmentId: attachment.id }).unwrap();
			},
			messageFor('Image de carte mise à jour.', 'Card image updated.'),
			messageFor('Impossible de modifier l’image de carte.', 'Could not update the card image.'),
		);
	};
	const openAttachmentPreview = (attachment: TaskAttachment, url: string, meta: string) => {
		setAttachmentPreview({ id: attachment.id, name: attachment.name, url, meta });
	};
	const updateBoardFiltersManually = (
		updater: BoardFiltersState | ((current: BoardFiltersState) => BoardFiltersState),
	) => {
		setBoardFilters((current) => (typeof updater === 'function' ? updater(current) : updater));
		setSelectedSavedViewId(null);
		setAutoAppliedSavedViewId(null);
		setEmptyDefaultSavedViewName('');
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
		const haystack =
			`${taskItem.title} ${taskItem.project.name} ${taskItem.description} ${taskItem.labels.map((label) => label.name).join(' ')}`.toLowerCase();
		return haystack.includes(boardFilters.search.trim().toLowerCase());
	});
	const hasSpecificProjectFilter = Boolean(boardFilters.project && boardFilters.project !== 'mine');
	const filteredProject = hasSpecificProjectFilter
		? (projects.find((item) => item.id === Number(boardFilters.project)) ?? null)
		: null;
	const availableQuickAddProjects = boardFilters.archivedOnly
		? []
		: hasSpecificProjectFilter
			? filteredProject?.can_work && !filteredProject.archived
				? [filteredProject]
				: []
			: writableProjects;
	const quickAddProject = availableQuickAddProjects.find((item) => String(item.id) === quickAddProjectId) ?? null;
	const quickAddUnavailableReason = boardFilters.archivedOnly
		? messageFor('Affichez les cartes actives pour ajouter une carte.', 'Show active cards to add a card.')
		: hasSpecificProjectFilter
			? messageFor(
					'Vous ne pouvez pas ajouter de carte dans ce projet. Sélectionnez un projet auquel vous participez.',
					'You cannot add cards to this project. Select a project you work on.',
				)
			: messageFor(
					'Créez un projet ou demandez à y être ajouté comme collaborateur pour ajouter des cartes.',
					'Create a project or ask to join one as a collaborator before adding cards.',
				);
	const handleQuickAddTask = async (status: TaskStatus) => {
		const title = quickAddTitle.trim();
		if (!title || title.length > 255 || !quickAddProject?.can_work || quickAddLock.current || createTaskState.isLoading)
			return;
		const context = quickAddContext.current;
		quickAddLock.current = true;
		const columnTasks = boardDraft.filter((item) => item.status === status);
		await runWithCleanup(
			() =>
				runPrimaryAction(
					async () => {
						await createTask(
							buildTaskPayload(
								quickAddProject.id,
								{
									...emptyTaskForm(),
									title,
									status,
									current_assignee_id: profile.id ? String(profile.id) : '',
									sort_order: String(columnTasks.length),
								},
								{ includeTime: true },
							),
						).unwrap();
						if (quickAddContext.current === context) setQuickAddTitle('');
					},
					messageFor(
						`Carte ajoutée au projet « ${quickAddProject.name} ».`,
						`Card added to project “${quickAddProject.name}”.`,
					),
					messageFor(
						'Impossible d’ajouter la carte. Vous pouvez réessayer.',
						'Could not add the card. You can try again.',
					),
				),
			() => {
				quickAddLock.current = false;
			},
		);
	};
	const tasksByStatus = STATUS_COLUMNS.map((status) => ({
		status,
		tasks: filteredBoardTasks
			.filter((item) => item.status === status)
			.sort((left, right) => left.sort_order - right.sort_order || left.id - right.id),
	}));
	const busiestUsers = [...designerWorkload].sort((left, right) => right.open_tasks - left.open_tasks).slice(0, 4);
	const isUserOnline = (userId: number) => onlineUserIds.includes(userId);
	const taskMutable = Boolean(task?.can_edit);
	const taskMediaMutable = taskMutable;
	const projectConflict =
		project &&
		projectEditBaseline.current &&
		projectFormSnapshot.current &&
		Object.keys(projectEditForm).some((key) => {
			const field = key as keyof ProjectInput;
			const baseline = JSON.stringify(projectEditBaseline.current![field]);
			const latest = JSON.stringify(projectFormSnapshot.current!.form[field]);
			const draft = JSON.stringify(projectEditForm[field]);
			return draft !== baseline && latest !== baseline && draft !== latest;
		});
	const projectConflictNotice = projectConflict ? (
		<div role="alert" className="workflow-realtime-status">
			<span>
				{messageFor(
					'Le projet a été modifié par une autre personne. Vos modifications sont conservées.',
					'Someone else changed this project. Your edits have been kept.',
				)}
			</span>
			<button
				type="button"
				className="app-pill"
				onClick={() => {
					const latest = projectFormSnapshot.current!.form;
					projectEditBaseline.current = latest;
					setProjectEditForm(latest);
				}}
			>
				{messageFor('Charger la dernière version', 'Load latest version')}
			</button>
		</div>
	) : null;
	const taskUpdatePayload = (includeTime: boolean) =>
		guardedChanges(
			buildTaskPayload(task!.project.id, taskEditForm, { includeTime }),
			buildTaskPayload(task!.project.id, taskEditBaselineRef.current ?? buildTaskEditForm(task), { includeTime }),
		);
	const taskConflict =
		task &&
		taskEditBaselineRef.current &&
		Object.keys(taskEditForm).some((key) => {
			const field = key as keyof TaskFormState;
			const baseline = taskEditBaselineRef.current![field];
			const current = buildTaskEditForm(task)[field];
			return taskEditForm[field] !== baseline && current !== baseline && taskEditForm[field] !== current;
		});
	const taskConflictNotice = taskConflict ? (
		<div role="alert" className="workflow-realtime-status">
			<span>
				{messageFor(
					'Cette tâche a été modifiée par une autre personne. Vos modifications sont conservées.',
					'Someone else changed this task. Your edits have been kept.',
				)}
			</span>
			<button
				type="button"
				className="app-pill"
				onClick={() => {
					const latest = buildTaskEditForm(task);
					taskEditBaselineRef.current = latest;
					setTaskEditForm(latest);
				}}
			>
				{messageFor('Charger la dernière version', 'Load latest version')}
			</button>
		</div>
	) : null;
	const pageHeading =
		variant === 'project-detail' && project
			? project.name
			: variant === 'task-detail' && task
				? task.title
				: (workflow.pageTitles[variant] ?? title);
	const pageHighlights = [
		...(variant === 'overview'
			? [
					`${workflow.labels.active} ${summary?.active_projects ?? 0}`,
					`${workflow.labels.blocked} ${summary?.blocked_tasks ?? 0}`,
					`${workflow.labels.overdue} ${summary?.overdue_tasks ?? 0}`,
				]
			: []),
		...(variant === 'board' ? [`${workflow.labels.visible} ${filteredBoardTasks.length}`] : []),
		...(variant === 'projects' ? [`${workflow.labels.projects} ${projects.length}`] : []),
		...(variant === 'project-detail' && project
			? [`${workflow.labels.open} ${project.open_tasks_count}`, `${workflow.labels.status} ${labelFor(project.status)}`]
			: []),
		...(variant === 'task-detail' && task
			? [
					`${workflow.labels.status} ${labelFor(task.status)}`,
					...(isManager ? [`${workflow.labels.spent} ${formatMinutes(task.total_logged_minutes)}`] : []),
				]
			: []),
		...(variant === 'team' ? [`${workflow.labels.contributors} ${designerWorkload.length}`] : []),
		...(variant === 'report-time' ? [`${workflow.labels.projects} ${timeReport.length}`] : []),
		...(variant === 'notifications'
			? [`${workflow.labels.unread} ${notifications.filter((item) => !item.is_read).length}`]
			: []),
	];
	const getDropPlacementFromPoint = (
		movingTaskId: number,
		x: number | null,
		y: number | null,
		fallbackStatus: TaskStatus,
	) => {
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
		const columnFromBounds = Array.from(document.querySelectorAll<HTMLElement>('.workflow-column[data-status]')).find(
			(column) => {
				const rect = column.getBoundingClientRect();
				return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
			},
		);
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
		if (boardMoveLock.current) return false;
		const movingTask = boardDraft.find((item) => item.id === movingTaskId);
		if (!movingTask?.can_edit) return false;
		const nextState = moveTaskToBoardIndex(boardDraft, movingTaskId, placement.status, placement.index);
		if (!nextState) {
			return false;
		}
		if (!boardChanged(boardDraft, nextState.nextBoard)) {
			return false;
		}

		boardMoveLock.current = true;
		setBoardMovePending(true);
		const scrollBeforeMove = typeof window !== 'undefined' ? { x: window.scrollX, y: window.scrollY } : null;
		const restoreBoardScroll = () => {
			if (!scrollBeforeMove || typeof window === 'undefined') return;
			window.requestAnimationFrame(() => {
				window.scrollTo(scrollBeforeMove.x, scrollBeforeMove.y);
			});
		};
		setBoardDraft(nextState.nextBoard);
		restoreBoardScroll();

		try {
			await reorderTasks({
				moved_task_id: movingTaskId,
				tasks: nextState.nextBoard.map((taskItem) => ({
					id: taskItem.id,
					status: taskItem.status,
					sort_order: taskItem.sort_order,
				})),
			}).unwrap();
			restoreBoardScroll();
			return true;
		} catch {
			restoreBoardScroll();
			return false;
		} finally {
			// Refetch authoritative order, including concurrent moves by others.
			try {
				await refetchTasks();
			} finally {
				boardMoveLock.current = false;
				setBoardMovePending(false);
			}
		}
	};
	const getDropPlacement = (event: DragEndEvent, movingTaskId: number) => {
		const activeId = event.active.id;
		const overId = event.over?.id;
		const activeTask = boardDraft.find((item) => item.id === movingTaskId);
		if (!activeTask || typeof activeId !== 'string') return null;
		const activeRect = event.active.rect.current.translated ?? event.active.rect.current.initial;
		const activeCenterX = activeRect ? activeRect.left + activeRect.width / 2 : boardDragPointerRef.current.x;
		const activeCenterY = activeRect ? activeRect.top + activeRect.height / 2 : boardDragPointerRef.current.y;

		let fallbackStatus: TaskStatus = activeTask.status;
		if (typeof overId === 'string' && isColumnDragId(overId)) {
			const statusFromColumn = overId.replace('column-', '');
			if (isTaskStatus(statusFromColumn)) fallbackStatus = statusFromColumn;
		} else if (typeof overId === 'string' && isTaskDragId(overId)) {
			fallbackStatus = boardDraft.find((item) => item.id === getTaskIdFromDragId(overId))?.status ?? fallbackStatus;
		}

		const pointerX = boardDragPointerRef.current.x ?? activeCenterX;
		const pointerY = boardDragPointerRef.current.y ?? activeCenterY;
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
		if (boardMoveLock.current) return;
		if (typeof event.active.id !== 'string' || !isTaskDragId(event.active.id)) return;
		const taskId = getTaskIdFromDragId(event.active.id);
		if (!boardDraft.find((item) => item.id === taskId)?.can_edit) return;
		const initialRect = event.active.rect.current.initial;
		boardDragPointerRef.current.x = initialRect ? initialRect.left + initialRect.width / 2 : null;
		boardDragPointerRef.current.y = initialRect ? initialRect.top + initialRect.height / 2 : null;
		setDraggedTaskId(taskId);
	};
	const handleDragEnd = async (event: DragEndEvent) => {
		setDraggedTaskId(null);
		const activeId = event.active.id;
		if (typeof activeId !== 'string' || !isTaskDragId(activeId)) return;

		const movingTaskId = getTaskIdFromDragId(activeId);
		if (!boardDraft.find((item) => item.id === movingTaskId)?.can_edit) return;
		const placement = getDropPlacement(event, movingTaskId);
		if (placement) {
			await applyBoardMove(movingTaskId, placement);
		}
		boardDragPointerRef.current.x = null;
		boardDragPointerRef.current.y = null;
	};
	const resetBoardFilters = () => {
		defaultSavedViewAppliedRef.current = true;
		setBoardFilters(emptyBoardFilters());
		setSelectedSavedViewId(null);
		setAutoAppliedSavedViewId(null);
		setEmptyDefaultSavedViewName('');
	};
	return {
		workflow,
		pageHeading,
		variant,
		pageHighlights,
		projects,
		summary,
		summaryBusy,
		chartTextColor,
		labelFor,
		chartSurfaceColor,
		tasks,
		tasksBusy,
		dateFor,
		setSelectedTaskId,
		handleArchiveTask,
		isManager,
		busiestUsers,
		messageFor,
		projectsBusy,
		boardFilters,
		workspaceSearchResults,
		updateBoardFiltersManually,
		filteredBoardTasks,
		runPrimaryAction,
		updateTaskStatus,
		boardCalendarMonth,
		setBoardCalendarMonth,
		locale,
		calendarWeekdays,
		boardDraft,
		savedViews,
		boardFiltersOpen,
		filteredProject,
		setBoardViewMode,
		boardViewMode,
		setBoardFiltersOpen,
		resetBoardFilters,
		writableProjects,
		labels,
		usersLoading,
		assignableUsers,
		selectedSavedViewId,
		applySavedView,
		savedViewName,
		setSavedViewName,
		savedViewVisibility,
		setSavedViewVisibility,
		createSavedViewState,
		saveBoardView,
		markCurrentViewDefault,
		deleteCurrentSavedView,
		emptyDefaultSavedViewName,
		sensors,
		handleDragStart,
		handleDragEnd,
		setDraggedTaskId,
		boardDragPointerRef,
		tasksByStatus,
		quickAddColumn,
		quickAddTitle,
		quickAddUnavailableReason,
		availableQuickAddProjects,
		quickAddProject,
		createTaskState,
		quickAddContext,
		setQuickAddColumn,
		setQuickAddTitle,
		setQuickAddProjectId,
		handleQuickAddTask,
		draggedTaskId,
		updateStatusState,
		reorderTasksState,
		t,
		workflowDataReady,
		projectForm,
		setProjectForm,
		managerUsers,
		userOptionLabel,
		createProject,
		profile,
		createProjectState,
		projectBusy,
		project,
		projectTasksPage,
		projectCommentsPage,
		projectActivityPage,
		projectEditForm,
		setProjectEditForm,
		updateProject,
		projectEditBaseline,
		updateProjectState,
		setProjectArchiveTarget,
		projectArchiveState,
		setProjectTaskEditId,
		setProjectTasksPage,
		taskForm,
		setTaskForm,
		mentionableUsers,
		createTask,
		dateTimeFor,
		setProjectCommentsPage,
		describeWorkflowActivity,
		setProjectActivityPage,
		taskBusy,
		task,
		taskCommentsPage,
		taskActivityPage,
		taskAddPanel,
		selectedChecklistTemplate,
		setSelectedChecklistTemplate,
		setNewChecklistGroupTitle,
		newChecklistGroupTitle,
		addChecklist,
		addChecklistItem,
		newChecklistItemsByChecklist,
		setNewChecklistItemsByChecklist,
		selectedAnnotationAttachmentId,
		reviewStateDraft,
		updateTaskReviewState,
		pendingReviewTaskId,
		taskMutable,
		createTaskVersion,
		versionAttachmentId,
		versionNotes,
		versionApprovalState,
		setVersionNotes,
		setVersionApprovalState,
		annotationBody,
		createAttachmentAnnotation,
		annotationVersionId,
		annotationX,
		annotationY,
		annotationResolved,
		setAnnotationBody,
		setAnnotationResolved,
		selectedTaskId,
		cardTitleHeading,
		modalTitleDraft,
		setModalTitleDraft,
		renameLockRef,
		updateTaskState,
		updateTask,
		taskConflictNotice,
		setReviewConfirmation,
		submitReviewUpdate,
		toggleTaskAddPanel,
		archiveTask,
		setTaskAddPanel,
		setModalLabelComposerOpen,
		setEditingLabelId,
		setEditingLabelName,
		setEditingLabelColor,
		modalLabelComposerOpen,
		newLabelName,
		setNewLabelName,
		newLabelColor,
		setNewLabelColor,
		createLabel,
		editingLabelId,
		editingLabelName,
		editingLabelColor,
		updateLabelState,
		updateLabel,
		addChecklistState,
		taskCoverLabel,
		setTaskCoverLabel,
		setTaskCoverFile,
		taskCoverFile,
		isPreparingTaskCover,
		handleUploadTaskCover,
		uploadTaskCoverState,
		renderTaskAttachmentPicker,
		reassignForm,
		setReassignForm,
		validReassignAssigneeSelected,
		reassignTask,
		reassignTaskState,
		modalDescriptionEditing,
		taskEditForm,
		setTaskEditForm,
		taskUpdatePayload,
		setModalDescriptionEditing,
		taskEditBaselineRef,
		deleteChecklist,
		updateChecklistItem,
		deleteChecklistItem,
		addChecklistItemState,
		taskMediaMutable,
		setMediaDeleteTarget,
		openAttachmentPreview,
		handleSetAttachmentAsCover,
		setTaskCoverFromAttachmentState,
		commentBody,
		setCommentBody,
		addTaskComment,
		addCommentState,
		taskDetailTab,
		setTaskDetailTab,
		reviewNotes,
		setReviewNotes,
		setVersionAttachmentId,
		createTaskVersionState,
		setSelectedAnnotationAttachmentId,
		selectedAttachmentAnnotations,
		setAnnotationVersionId,
		setAnnotationX,
		setAnnotationY,
		createAnnotationState,
		setTaskCommentsPage,
		setTaskActivityPage,
		designerWorkload,
		isUserOnline,
		timeReport,
		reportFilters,
		workflowReport,
		riskLabelFor,
		setReportFilters,
		notifications,
		markNotificationRead,
		notificationPreferenceDraft,
		setNotificationPreferenceDraft,
		updateNotificationPreferences,
		onSuccess,
		onError,
		snoozeForOneHour,
		runNotificationAction,
		notificationCommentDrafts,
		setNotificationCommentDrafts,
		notificationsUnreadOnly,
		setNotificationsUnreadOnly,
		resolvedNotificationPreferences,
		notificationTitle,
		notificationDescription,
		reviewConfirmation,
		projectConflictNotice,
		projectTaskEditId,
		closeProjectTaskEdit,
		closeTaskModal,
		mediaDeleteTarget,
		handleConfirmMediaDelete,
		projectArchiveTarget,
		handleSetProjectArchived,
		attachmentPreview,
		setAttachmentPreview,
	};
};
export type WorkflowController = ReturnType<typeof useWorkflowController>;
