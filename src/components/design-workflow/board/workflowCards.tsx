'use client';

import { getColumnId, getTaskDragId, isCardInteractiveTarget } from '@/utils/workflow/workflowBoardHelpers';
import { AvatarBadge, Chip } from '@/components/shared/workflow/workflowFields';
import { cn, formatMinutes, getDueDeliveryInfo, resolveMediaUrl } from '@/utils/workflow/workflowFormatting';
import { toneForPriority } from '@/utils/workflow/workflowFormHelpers';
import { BOARD_STATUS_META } from '@/components/shared/workflow/boardAppearance';
import { WorkflowSelectField as SelectField } from '@/components/shared/workflow/workflowFormControls';
import type { ProjectSummary, TaskCard, TaskStatus, WorkflowUser } from '@/types/designWorkflowTypes';
import type { WorkflowCopy } from '@/types/workflowUiTypes';
import { useLanguage } from '@/utils/hooks';
import { DASHBOARD_TASK_VIEW } from '@/utils/routes';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
	Archive,
	ArrowRight,
	CalendarDays,
	CheckCircle2,
	CircleAlert,
	Clock3,
	FolderKanban,
	GripVertical,
	Paperclip,
	Plus,
	ShieldCheck,
	X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';

export const TaskPeople = ({ task }: { task: TaskCard }) => {
	const people = [task.current_assignee, task.project.manager].filter(
		(user, index, list): user is WorkflowUser =>
			Boolean(user) && list.findIndex((item) => item?.id === user?.id) === index,
	);
	if (people.length === 0) {
		return <span className="text-xs font-semibold text-(--ink-muted)">{task.project.name}</span>;
	}
	return (
		<div className="flex items-center">
			{people.map((user, index) => (
				<span key={user.id} className={cn('workflow-avatar-stack', index > 0 && '-ml-2')}>
					<AvatarBadge user={user} size={26} showTooltip />
				</span>
			))}
		</div>
	);
};

export const BoardTaskCover = ({ task }: { task: TaskCard }) => {
	const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
	const statusMeta = BOARD_STATUS_META[task.status];
	const rawCoverUrl = task.cover_image_url ? resolveMediaUrl(task.cover_image_url) : null;
	const coverUrl = rawCoverUrl && failedCoverUrl !== rawCoverUrl ? rawCoverUrl : null;
	if (!coverUrl) return null;
	const coverStyle = {
		'--card-cover-accent': statusMeta.accent,
		'--card-cover-soft': statusMeta.soft,
		'--card-cover-text': statusMeta.text,
	} as CSSProperties;

	return (
		<div className="workflow-trello-card-cover" style={coverStyle}>
			<Image
				src={coverUrl}
				alt={task.title}
				width={420}
				height={160}
				unoptimized
				loading="eager"
				onError={() => setFailedCoverUrl(coverUrl)}
			/>
		</div>
	);
};

export const TaskCardItem = ({
	task,
	compact = false,
	copy,
	labelForAction,
	dateForAction,
	onOpenAction,
	onArchiveAction,
	dragHandle,
	variant = 'default',
	showTime = false,
}: {
	task: TaskCard;
	compact?: boolean;
	copy: WorkflowCopy;
	labelForAction: (value: string) => string;
	dateForAction: (value?: string | null) => string;
	onOpenAction?: (taskId: number) => void;
	onArchiveAction?: (task: TaskCard) => void;
	dragHandle?: ReactNode;
	variant?: 'default' | 'board';
	showTime?: boolean;
}) => {
	const dueDelivery = getDueDeliveryInfo(task, copy.labels);
	const taskRestoreLocked = task.archived && task.project.archived;
	const taskArchiveLabel = taskRestoreLocked
		? copy.labels.unarchiveProjectFirst
		: task.archived
			? (copy.buttons.restore ?? 'Restore')
			: (copy.buttons.archive ?? 'Archive');
	if (variant === 'board') {
		const doneItems = task.checklist_items.filter((item) => item.done).length;
		return (
			<div
				data-status={task.status}
				className={cn(
					'workflow-trello-board-card',
					task.status === 'done' && 'is-complete',
					task.is_overdue && 'is-overdue',
				)}
			>
				<BoardTaskCover task={task} />
				<div className="workflow-trello-card-body">
					{task.labels.length ? (
						<div className="workflow-trello-card-labels">
							{task.labels.slice(0, 4).map((label) => (
								<span key={label.id} style={{ backgroundColor: label.color, color: '#ffffff' }}>
									{label.name}
								</span>
							))}
						</div>
					) : null}
					<div className="workflow-trello-card-title-row">
						<p>{task.title}</p>
						{dragHandle || onArchiveAction ? (
							<div className="workflow-trello-card-controls">
								{dragHandle}
								{onArchiveAction ? (
									<button
										type="button"
										data-no-card-open
										aria-label={taskArchiveLabel}
										title={taskArchiveLabel}
										disabled={taskRestoreLocked}
										onClick={(event) => {
											event.stopPropagation();
											if (taskRestoreLocked) return;
											onArchiveAction(task);
										}}
										className="workflow-trello-card-edit"
									>
										<Archive size={13} />
									</button>
								) : null}
							</div>
						) : null}
					</div>
					<span className="workflow-trello-card-project">{task.project.name}</span>
					{task.description ? <p className="workflow-trello-card-description">{task.description}</p> : null}
					<div className="workflow-trello-card-footer">
						<div className="workflow-trello-card-badges">
							{showTime && task.due_date ? (
								<span data-tone={dueDelivery?.tone} title={dateForAction(task.due_date)}>
									<CalendarDays size={12} />
									{dueDelivery?.label ?? dateForAction(task.due_date)}
								</span>
							) : null}
							{task.checklist_items.length ? (
								<span data-complete={doneItems === task.checklist_items.length}>
									<CheckCircle2 size={12} />
									{doneItems}/{task.checklist_items.length}
								</span>
							) : null}
							{task.attachments.length ? (
								<span>
									<Paperclip size={12} />
									{task.attachments.length}
								</span>
							) : null}
							{task.review_state !== 'not_submitted' ? (
								<span
									data-tone={
										task.review_state === 'approved'
											? 'progress'
											: task.review_state === 'changes_requested'
												? 'urgent'
												: 'warning'
									}
								>
									<ShieldCheck size={12} />
									{labelForAction(task.review_state)}
								</span>
							) : null}
							{task.priority === 'high' || task.priority === 'urgent' ? (
								<span data-tone="urgent">
									<CircleAlert size={12} />
									{labelForAction(task.priority)}
								</span>
							) : null}
						</div>
						{task.current_assignee ? <AvatarBadge user={task.current_assignee} size={24} showTooltip /> : null}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			data-status={task.status}
			role={onOpenAction ? 'button' : undefined}
			tabIndex={onOpenAction ? 0 : undefined}
			onClick={onOpenAction ? () => onOpenAction(task.id) : undefined}
			onKeyDown={
				onOpenAction
					? (event) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								onOpenAction(task.id);
							}
						}
					: undefined
			}
			className={cn(
				'workflow-card-hover workflow-task-card overflow-hidden',
				onOpenAction ? 'cursor-pointer' : '',
				task.is_overdue && 'workflow-task-card-overdue',
			)}
		>
			{task.cover_image_url ? (
				<div className="workflow-task-cover">
					<Image
						src={resolveMediaUrl(task.cover_image_url)}
						alt={task.cover_image_label || task.title}
						width={640}
						height={260}
						unoptimized
						loading="eager"
						className="h-full w-full object-cover"
					/>
					<div className="workflow-task-cover-shade" />
				</div>
			) : null}
			<div className={cn('p-4', compact ? 'space-y-3' : 'space-y-4')}>
				<div className="flex items-start justify-between gap-3">
					<div className="flex min-w-0 flex-1 items-start gap-3">
						<div className="min-w-0">
							<p
								className={cn(
									'text-base font-semibold leading-5 text-(--ink)',
									task.status === 'done' && 'text-emerald-700 line-through decoration-2',
								)}
							>
								{task.title}
							</p>
							<p className="mt-1 truncate text-xs font-semibold uppercase text-(--ink-muted)">{task.project.name}</p>
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						{onArchiveAction ? (
							<button
								type="button"
								aria-label={taskArchiveLabel}
								title={taskArchiveLabel}
								disabled={taskRestoreLocked}
								onClick={(event) => {
									event.stopPropagation();
									if (taskRestoreLocked) return;
									onArchiveAction(task);
								}}
								className="workflow-task-card-archive workflow-focus-ring grid h-8 w-8 place-items-center rounded-lg border border-(--line) text-(--ink-soft) hover:bg-(--surface-muted) hover:text-(--ink)"
							>
								<Archive size={15} />
							</button>
						) : null}
					</div>
				</div>
				<p className="line-clamp-3 text-sm leading-6 text-(--ink-soft)">
					{task.description || copy.labels.noDescription}
				</p>
				{task.labels.length ? (
					<div className="flex flex-wrap gap-1.5">
						{task.labels.map((label) => (
							<span
								key={label.id}
								className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold"
								style={{ borderColor: label.color, color: label.color }}
							>
								<span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
								{label.name}
							</span>
						))}
					</div>
				) : null}
				<div className="workflow-card-meta">
					<TaskPeople task={task} />
					<div className="ml-auto flex items-center gap-3 text-[11px] font-bold text-(--ink-muted)">
						{showTime ? (
							<span className="inline-flex items-center gap-1">
								<Clock3 size={13} />
								{formatMinutes(task.actual_minutes || task.estimated_minutes)}
							</span>
						) : null}
						<span className="inline-flex items-center gap-1">
							<CheckCircle2 size={13} />
							{task.checklist_items.filter((item) => item.done).length}/{task.checklist_items.length || 0}
						</span>
						<span className="inline-flex items-center gap-1">
							<Paperclip size={13} />
							{task.attachments.length}
						</span>
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					<Chip tone={toneForPriority(task.priority)}>
						<span className="inline-flex items-center gap-1.5">
							<CircleAlert size={12} />
							<span>{labelForAction(task.priority) || task.priority}</span>
						</span>
					</Chip>
					{task.review_state !== 'not_submitted' ? (
						<Chip
							tone={
								task.review_state === 'approved'
									? 'progress'
									: task.review_state === 'changes_requested'
										? 'urgent'
										: 'warning'
							}
						>
							<span className="inline-flex items-center gap-1.5">
								<ShieldCheck size={12} />
								<span>{labelForAction(task.review_state)}</span>
							</span>
						</Chip>
					) : null}
					{showTime && task.due_date ? (
						<Chip tone={dueDelivery?.tone}>{dueDelivery?.label ?? dateForAction(task.due_date)}</Chip>
					) : null}
					{!task.current_assignee ? <Chip>{copy.labels.unassigned}</Chip> : null}
				</div>
				{!onOpenAction ? (
					<Link
						href={DASHBOARD_TASK_VIEW(task.id)}
						className="workflow-focus-ring inline-flex items-center gap-2 text-sm font-semibold text-(--accent-strong)"
					>
						<span>{copy.buttons.openTask}</span>
						<ArrowRight size={14} />
					</Link>
				) : null}
			</div>
		</div>
	);
};

export const BoardTaskCard = ({
	task,
	copy,
	labelForAction,
	dateForAction,
	onOpenAction,
	onArchiveAction,
	canDrag,
	showTime = false,
}: {
	task: TaskCard;
	copy: WorkflowCopy;
	labelForAction: (value: string) => string;
	dateForAction: (value?: string | null) => string;
	onOpenAction?: (taskId: number) => void;
	onArchiveAction?: (task: TaskCard) => void;
	canDrag: boolean;
	showTime?: boolean;
}) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: getTaskDragId(task.id),
		disabled: !canDrag,
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
			{...(canDrag ? attributes : {})}
			{...(canDrag ? listeners : {})}
			onPointerDown={(event) => {
				if (!canDrag) return;
				const target = event.target instanceof Element ? event.target : null;
				if (target && isCardInteractiveTarget(target) && !target.closest('.workflow-board-drag-handle')) return;
				listeners?.onPointerDown?.(event);
			}}
			onClick={(event) => {
				if (!onOpenAction || isCardInteractiveTarget(event.target)) return;
				onOpenAction(task.id);
			}}
			onKeyDown={(event) => {
				if (isCardInteractiveTarget(event.target)) return;
				if (event.key === 'Enter' && onOpenAction) {
					event.preventDefault();
					onOpenAction(task.id);
					return;
				}
				if (canDrag) listeners?.onKeyDown?.(event);
			}}
			style={
				{
					transform: CSS.Transform.toString(transform),
					transition,
					opacity: isDragging ? 0.35 : 1,
					pointerEvents: isDragging ? 'none' : undefined,
				} as CSSProperties
			}
		>
			<div>
				<div className="workflow-board-card-shell">
					<TaskCardItem
						task={task}
						compact
						copy={copy}
						labelForAction={labelForAction}
						dateForAction={dateForAction}
						onArchiveAction={task.can_edit ? onArchiveAction : undefined}
						dragHandle={
							canDrag ? (
								<span data-no-card-open aria-hidden="true" className="workflow-board-drag-handle">
									<GripVertical size={15} />
								</span>
							) : undefined
						}
						variant="board"
						showTime={showTime}
					/>
				</div>
			</div>
		</div>
	);
};

export const BoardColumn = ({
	status,
	tasks,
	copy,
	labelForAction,
	dateForAction,
	onOpenAction,
	onArchiveAction,
	quickAddOpen,
	quickAddTitle,
	quickAddUnavailableReason,
	quickAddProjects,
	quickAddProjectId,
	quickAddLoading,
	canQuickAdd,
	onQuickAddOpenAction,
	onQuickAddTitleChangeAction,
	onQuickAddProjectChangeAction,
	onQuickAddSubmitAction,
	onQuickAddCancelAction,
	showTime = false,
}: {
	status: TaskStatus;
	tasks: TaskCard[];
	copy: WorkflowCopy;
	labelForAction: (value: string) => string;
	dateForAction: (value?: string | null) => string;
	onOpenAction?: (taskId: number) => void;
	onArchiveAction?: (task: TaskCard) => void;
	quickAddOpen?: boolean;
	quickAddTitle?: string;
	quickAddUnavailableReason?: string;
	quickAddProjects?: ProjectSummary[];
	quickAddProjectId?: string;
	quickAddLoading?: boolean;
	canQuickAdd?: boolean;
	onQuickAddOpenAction?: (status: TaskStatus) => void;
	onQuickAddTitleChangeAction?: (value: string) => void;
	onQuickAddProjectChangeAction?: (value: string) => void;
	onQuickAddSubmitAction?: (status: TaskStatus) => void;
	onQuickAddCancelAction?: () => void;
	showTime?: boolean;
}) => {
	const { t } = useLanguage();
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
	useEffect(() => {
		if (quickAddOpen && canQuickAdd) {
			document.getElementById(`quick-add-${quickAddProjectId ? 'title' : 'project'}-${status}`)?.focus();
		}
	}, [quickAddOpen, quickAddProjectId, canQuickAdd, status]);

	return (
		<div
			ref={setNodeRef}
			data-status={status}
			className={cn('workflow-column flex h-full min-h-105 min-w-80 flex-col', isOver && 'workflow-column-over')}
		>
			<div
				className="workflow-column-header"
				style={
					{
						'--status-accent': BOARD_STATUS_META[status].accent,
						'--status-soft': BOARD_STATUS_META[status].soft,
						'--status-text': BOARD_STATUS_META[status].text,
					} as CSSProperties
				}
			>
				<div className="flex min-w-0 items-center gap-2">
					<span className="workflow-column-icon">{BOARD_STATUS_META[status].icon}</span>
					<div className="min-w-0">
						<p className="truncate text-sm font-bold">{labelForAction(status)}</p>
						<p className="text-[11px] font-semibold uppercase">
							{tasks.length} {copy.labels.cards}
						</p>
					</div>
				</div>
				<div className="workflow-column-count">{tasks.length}</div>
			</div>
			<div className="workflow-column-stats">
				{showTime ? (
					<span>
						<Clock3 size={12} />
						{formatMinutes(totalEffort)}
					</span>
				) : null}
				<span>
					<CheckCircle2 size={12} />
					{doneItems}/{totalItems}
				</span>
				{overdueCount ? (
					<span className="workflow-column-stat-urgent">
						<CircleAlert size={12} />
						{overdueCount}
					</span>
				) : null}
			</div>
			<SortableContext items={tasks.map((task) => getTaskDragId(task.id))} strategy={verticalListSortingStrategy}>
				<div className="workflow-column-cards flex flex-1 flex-col gap-3 overflow-y-auto p-3">
					{tasks.map((task) => (
						<BoardTaskCard
							key={task.id}
							task={task}
							copy={copy}
							labelForAction={labelForAction}
							dateForAction={dateForAction}
							onOpenAction={onOpenAction}
							onArchiveAction={onArchiveAction}
							canDrag={task.can_edit}
							showTime={showTime}
						/>
					))}
					{tasks.length === 0 ? (
						<div className="workflow-column-empty">
							<span>{BOARD_STATUS_META[status].icon}</span>
							<p>{copy.emptyStates.noCards.title}</p>
							<small>{copy.emptyStates.noCards.description}</small>
						</div>
					) : null}
					{canQuickAdd && quickAddOpen ? (
						<form
							className="workflow-quick-add-card"
							aria-label={copy.labels.addCard}
							data-no-card-open
							onSubmit={(event) => {
								event.preventDefault();
								onQuickAddSubmitAction?.(status);
							}}
						>
							<div className="workflow-quick-add-project-select">
								<label htmlFor={`quick-add-project-${status}`}>{copy.labels.cardProject}</label>
								<SelectField
									id={`quick-add-project-${status}`}
									value={quickAddProjectId ?? ''}
									onChangeAction={(value) => onQuickAddProjectChangeAction?.(value)}
									ariaLabel={copy.labels.cardProject}
									disabled={quickAddLoading}
									options={[
										{ value: '', label: copy.labels.selectProject ?? 'Select a project' },
										...(quickAddProjects ?? []).map((project) => ({ value: project.id, label: project.name })),
									]}
									startIcon={<FolderKanban size={14} />}
								/>
								<p className="workflow-quick-add-hint">
									{quickAddProjectId ? copy.labels.cardProjectHint : copy.labels.chooseCardProjectHint}
								</p>
							</div>
							<div className="workflow-quick-add-title">
								<label htmlFor={`quick-add-title-${status}`}>{copy.labels.taskTitle}</label>
								<textarea
									id={`quick-add-title-${status}`}
									rows={3}
									maxLength={255}
									disabled={quickAddLoading}
									value={quickAddTitle ?? ''}
									onChange={(event) => onQuickAddTitleChangeAction?.(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === 'Enter' && !event.shiftKey) {
											event.preventDefault();
											onQuickAddSubmitAction?.(status);
										}
										if (event.key === 'Escape') {
											event.preventDefault();
											onQuickAddCancelAction?.();
										}
									}}
									placeholder={copy.labels.quickAddPlaceholder ?? 'Enter a title or paste a link'}
								/>
							</div>
							<div className="workflow-quick-add-actions">
								<button
									type="submit"
									className="workflow-quick-add-submit"
									disabled={!quickAddTitle?.trim() || !quickAddProjectId || quickAddLoading}
								>
									{quickAddLoading ? copy.buttons.creating : copy.labels.addCardSubmit}
								</button>
								<button
									type="button"
									className="workflow-quick-add-cancel"
									onClick={onQuickAddCancelAction}
									aria-label={t.common.cancel}
								>
									<X size={19} />
								</button>
							</div>
						</form>
					) : (
						<button
							type="button"
							className="workflow-column-add-card"
							disabled={!canQuickAdd || quickAddLoading}
							title={!canQuickAdd ? quickAddUnavailableReason : undefined}
							aria-label={copy.labels.addCard}
							aria-describedby={canQuickAdd ? `quick-add-hint-${status}` : undefined}
							data-no-card-open
							onClick={() => onQuickAddOpenAction?.(status)}
						>
							<Plus size={18} />
							<span className="workflow-column-add-copy">
								<span>{copy.labels.addCard}</span>
								{canQuickAdd ? (
									<small id={`quick-add-hint-${status}`}>
										{quickAddProjects?.length === 1 ? quickAddProjects[0].name : copy.labels.selectProject}
									</small>
								) : null}
							</span>
						</button>
					)}
				</div>
			</SortableContext>
		</div>
	);
};
