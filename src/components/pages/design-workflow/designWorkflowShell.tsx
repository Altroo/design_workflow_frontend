'use client';

import ActionModals from '@/components/htmlElements/modals/actionModal/actionModals';
import NavigationBar from '@/components/layouts/navigationBar/navigationBar';
import { Area, EmptyState, Field, FieldLabel, WorkDaysField } from '@/components/shared/workflow/workflowFields';
import { STATUS_COLUMNS } from '@/components/shared/workflow/boardAppearance';
import {
	WorkflowDateField as DateField,
	WorkflowSelectField as SelectField,
} from '@/components/shared/workflow/workflowFormControls';
import type { TaskCard, TaskStatus } from '@/types/designWorkflowTypes';
import type { Props } from '@/types/workflowUiTypes';
import { PRIORITY_OPTIONS } from '@/utils/rawData';
import {
	Archive,
	CheckCircle2,
	CircleAlert,
	FileText,
	ListTodo,
	MessagesSquare,
	RefreshCcw,
	Save,
	ShieldCheck,
	Trash2,
	Users,
	X,
} from 'lucide-react';
import Image from 'next/image';
import { type ReactNode, useRef } from 'react';
import { useWorkflowController } from '@/utils/workflow/hooks/useWorkflowController';
import { WorkflowBoard } from '@/components/design-workflow/board/workflowBoard';
import { WorkflowHeader } from '@/components/shared/workflow/workflowHeader';
import { WorkflowNotifications } from '@/components/design-workflow/notifications/workflowNotifications';
import { WorkflowOverview } from '@/components/design-workflow/overview/workflowOverview';
import { WorkflowProjectDetail } from '@/components/design-workflow/projects/workflowProjectDetail';
import { WorkflowProjects } from '@/components/design-workflow/projects/workflowProjects';
import { WorkflowReport } from '@/components/design-workflow/reports/workflowReport';
import { WorkflowTaskDetail } from '@/components/design-workflow/task/workflowTaskDetail';
import { WorkflowTeam } from '@/components/design-workflow/team/workflowTeam';

const DesignWorkflowShell = (props: Props) => {
	const model = useWorkflowController(props);
	const taskBackdropClick = useRef(false);
	const {
		variant,
		reviewStateDraft,
		task,
		workflow,
		reviewConfirmation,
		workflowDataReady,
		isManager,
		pageHeading,
		messageFor,
		projectConflictNotice,
		projectTaskEditId,
		closeProjectTaskEdit,
		t,
		taskBusy,
		taskConflictNotice,
		taskEditForm,
		setTaskEditForm,
		assignableUsers,
		userOptionLabel,
		mentionableUsers,
		labelFor,
		setSelectedTaskId,
		updateTaskState,
		runPrimaryAction,
		updateTask,
		taskUpdatePayload,
		selectedTaskId,
		closeTaskModal,
		setReviewConfirmation,
		updateTaskReviewState,
		submitReviewUpdate,
		mediaDeleteTarget,
		setMediaDeleteTarget,
		handleConfirmMediaDelete,
		projectArchiveTarget,
		project,
		setProjectArchiveTarget,
		projectArchiveState,
		handleSetProjectArchived,
		attachmentPreview,
		setAttachmentPreview,
	} = model;
	let content: ReactNode = null;
	if (variant === 'overview') content = <WorkflowOverview model={model} />;
	if (variant === 'board') content = <WorkflowBoard model={model} />;
	if (variant === 'projects') content = <WorkflowProjects model={model} />;
	if (variant === 'project-detail') content = <WorkflowProjectDetail model={model} />;
	if (variant === 'task-detail') content = <WorkflowTaskDetail model={model} />;
	if (variant === 'team') content = <WorkflowTeam model={model} />;
	if (variant === 'report-time') content = <WorkflowReport model={model} />;
	if (variant === 'notifications') content = <WorkflowNotifications model={model} />;
	const isKanbanView =
		variant === 'board' ||
		variant === 'overview' ||
		variant === 'projects' ||
		variant === 'project-detail' ||
		variant === 'team' ||
		variant === 'report-time' ||
		variant === 'notifications';
	const reviewRequestActionLabel =
		(reviewStateDraft ?? task?.review_state) === 'changes_requested'
			? (workflow.buttons.resubmitReview ?? 'Resubmit for review')
			: (reviewStateDraft ?? task?.review_state) === 'approved'
				? (workflow.buttons.requestNewReview ?? 'Request a new review')
				: (workflow.buttons.requestReview ?? 'Request review');
	const reviewConfirmationIsApproval = reviewConfirmation?.reviewState === 'approved';
	if (workflowDataReady && !isManager && ['team', 'report-time', 'overview'].includes(variant)) {
		return (
			<NavigationBar title={pageHeading}>
				<p className="p-4">
					{messageFor('Vous n’avez plus accès à cette page.', 'You no longer have access to this page.')}
				</p>
			</NavigationBar>
		);
	}
	return (
		<NavigationBar title={pageHeading}>
			{projectConflictNotice}
			<div className={isKanbanView ? '' : 'space-y-4'}>
				{isKanbanView ? null : <WorkflowHeader model={model} />}
				{content}
			</div>
			{projectTaskEditId ? (
				<div
					className="workflow-task-edit-backdrop"
					role="dialog"
					aria-modal="true"
					aria-labelledby="workflow-project-task-edit-title"
					onClick={closeProjectTaskEdit}
				>
					<div className="workflow-task-edit-modal" onClick={(event) => event.stopPropagation()}>
						<header>
							<div>
								<span>{workflow.labels.project}</span>
								<h2 id="workflow-project-task-edit-title">
									{workflow.labels.editTask ?? messageFor('Modifier la tâche', 'Edit task')}
								</h2>
							</div>
							<button type="button" onClick={closeProjectTaskEdit} aria-label={t.common.close}>
								<X size={18} />
							</button>
						</header>
						{taskBusy || !task ? (
							<EmptyState {...workflow.emptyStates.loadingTask} />
						) : (
							<>
								{taskConflictNotice}
								<div className="workflow-task-edit-grid">
									<div>
										<FieldLabel htmlFor="workflow-project-task-title">{workflow.labels.taskTitle}</FieldLabel>
										<Field
											id="workflow-project-task-title"
											value={taskEditForm.title}
											onChangeAction={(value) => setTaskEditForm((current) => ({ ...current, title: value }))}
											startIcon={<ListTodo size={18} />}
										/>
									</div>
									<div>
										<FieldLabel htmlFor="workflow-project-task-assignee">{workflow.labels.assignee}</FieldLabel>
										<SelectField
											id="workflow-project-task-assignee"
											value={taskEditForm.current_assignee_id}
											onChangeAction={(value) =>
												setTaskEditForm((current) => ({ ...current, current_assignee_id: value }))
											}
											options={[
												{ value: '', label: workflow.labels.unassigned },
												...assignableUsers.map((user) => ({ value: user.id, label: userOptionLabel(user) })),
											]}
											startIcon={<Users size={18} />}
										/>
									</div>
									<div className="workflow-task-edit-wide">
										<FieldLabel htmlFor="workflow-project-task-description">{workflow.labels.description}</FieldLabel>
										<Area
											id="workflow-project-task-description"
											value={taskEditForm.description}
											onChangeAction={(value) => setTaskEditForm((current) => ({ ...current, description: value }))}
											mentionUsers={mentionableUsers}
											rows={4}
											startIcon={<MessagesSquare size={18} />}
										/>
									</div>
									<div>
										<FieldLabel htmlFor="workflow-project-task-status">{workflow.labels.status}</FieldLabel>
										<SelectField
											id="workflow-project-task-status"
											value={taskEditForm.status}
											onChangeAction={(value) =>
												setTaskEditForm((current) => ({ ...current, status: value as TaskStatus }))
											}
											options={STATUS_COLUMNS.map((item) => ({ value: item, label: labelFor(item) }))}
											startIcon={<ListTodo size={18} />}
										/>
									</div>
									<div>
										<FieldLabel htmlFor="workflow-project-task-priority">{workflow.labels.priority}</FieldLabel>
										<SelectField
											id="workflow-project-task-priority"
											value={taskEditForm.priority}
											onChangeAction={(value) =>
												setTaskEditForm((current) => ({ ...current, priority: value as TaskCard['priority'] }))
											}
											options={PRIORITY_OPTIONS.map((item) => ({ value: item, label: labelFor(item) }))}
											startIcon={<CircleAlert size={18} />}
										/>
									</div>
									<div>
										<FieldLabel htmlFor="workflow-project-task-due-date">{workflow.labels.dueDate}</FieldLabel>
										<DateField
											id="workflow-project-task-due-date"
											value={taskEditForm.due_date}
											onChangeAction={(value) => setTaskEditForm((current) => ({ ...current, due_date: value }))}
										/>
									</div>
									<div>
										<FieldLabel htmlFor="workflow-project-task-estimate">{workflow.labels.estimatedMinutes}</FieldLabel>
										<WorkDaysField
											id="workflow-project-task-estimate"
											value={taskEditForm.estimated_minutes}
											onChangeAction={(value) =>
												setTaskEditForm((current) => ({ ...current, estimated_minutes: value }))
											}
										/>
									</div>
								</div>
								<footer>
									<button
										type="button"
										className="workflow-task-edit-preview"
										onClick={() => {
											const activeId = task.id;
											closeProjectTaskEdit();
											setSelectedTaskId(activeId);
										}}
									>
										<FileText size={16} />
										<span>{workflow.labels.preview ?? messageFor('Aperçu', 'Preview')}</span>
									</button>
									<div>
										<button type="button" className="workflow-task-edit-cancel" onClick={closeProjectTaskEdit}>
											{t.common.cancel}
										</button>
										<button
											type="button"
											className="workflow-task-edit-save"
											disabled={
												!taskEditForm.title.trim() ||
												!task.can_edit ||
												updateTaskState.isLoading ||
												task.archived ||
												task.project.archived
											}
											onClick={() =>
												void runPrimaryAction(
													async () => {
														await updateTask({
															id: task.id,
															data: taskUpdatePayload(true),
														}).unwrap();
														closeProjectTaskEdit();
													},
													messageFor('Tâche modifiée avec succès.', 'Task updated successfully.'),
													messageFor('Impossible de modifier la tâche.', 'Could not update the task.'),
												)
											}
										>
											<Save size={16} />
											<span>{updateTaskState.isLoading ? workflow.buttons.saving : t.common.save}</span>
										</button>
									</div>
								</footer>
							</>
						)}
					</div>
				</div>
			) : null}
			{selectedTaskId ? (
				<div
					className="workflow-task-modal-backdrop fixed inset-0 z-120 flex items-center justify-center px-3 py-4 sm:px-6"
					role="dialog"
					aria-modal="true"
					aria-labelledby={task ? 'workflow-task-dialog-title' : undefined}
					onPointerDownCapture={(event) => {
						taskBackdropClick.current = event.target === event.currentTarget;
					}}
					onPointerUpCapture={(event) => {
						taskBackdropClick.current &&= event.target === event.currentTarget;
					}}
					onPointerCancelCapture={() => {
						taskBackdropClick.current = false;
					}}
					onClick={(event) => {
						// A selection dragged outside the card also produces a backdrop click.
						const dismiss = taskBackdropClick.current && event.target === event.currentTarget;
						taskBackdropClick.current = false;
						if (dismiss) closeTaskModal();
					}}
				>
					<div
						className="workflow-task-modal relative flex flex-col overflow-hidden"
						onClick={(event) => event.stopPropagation()}
						onWheel={(event) => event.stopPropagation()}
					>
						<button
							type="button"
							aria-label={t.common.close}
							onClick={closeTaskModal}
							className="workflow-trello-modal-close"
						>
							<X size={18} />
						</button>
						<div className="workflow-task-modal-body min-h-0 flex-1 overscroll-contain overflow-y-auto p-4 sm:p-5">
							{<WorkflowTaskDetail model={model} />}
						</div>
					</div>
				</div>
			) : null}
			{reviewConfirmation && task ? (
				<ActionModals
					title={
						reviewConfirmationIsApproval
							? messageFor('Confirmer l’approbation ?', 'Approve this task?')
							: messageFor('Confirmer la demande de revue ?', 'Submit task for review?')
					}
					body={
						reviewConfirmationIsApproval
							? messageFor(
									'Cette action approuvera la revue et déplacera automatiquement la tâche vers Terminé.',
									'This will approve the review and automatically move the task to Done.',
								)
							: messageFor(
									'Après l’envoi, cette demande ne pourra plus être modifiée tant qu’un responsable n’aura pas répondu.',
									'After submitting, this request cannot be changed until a manager responds.',
								)
					}
					titleIcon={reviewConfirmationIsApproval ? <CheckCircle2 size={20} /> : <ShieldCheck size={20} />}
					titleIconColor={reviewConfirmationIsApproval ? '#16a34a' : '#d97706'}
					onClose={() => setReviewConfirmation(null)}
					actions={[
						{
							active: false,
							text: t.common.cancel,
							onClick: () => setReviewConfirmation(null),
						},
						{
							active: true,
							text: reviewConfirmationIsApproval ? (workflow.buttons.approve ?? 'Approve') : reviewRequestActionLabel,
							icon: reviewConfirmationIsApproval ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />,
							color: reviewConfirmationIsApproval ? '#16a34a' : '#d97706',
							disabled: updateTaskReviewState.isLoading,
							onClick: () => {
								const { reviewState, resetNotes } = reviewConfirmation;
								setReviewConfirmation(null);
								void submitReviewUpdate(reviewState, { resetNotes });
							},
						},
					]}
				/>
			) : null}
			{mediaDeleteTarget ? (
				<div
					className="workflow-media-confirm-backdrop"
					role="dialog"
					aria-modal="true"
					onClick={() => setMediaDeleteTarget(null)}
				>
					<div className="workflow-media-confirm" onClick={(event) => event.stopPropagation()}>
						<span>
							<Trash2 size={19} />
						</span>
						<h3>
							{mediaDeleteTarget.kind === 'cover'
								? (workflow.labels.deleteCoverTitle ?? 'Remove card image?')
								: (workflow.labels.deleteAttachmentTitle ?? 'Delete attachment?')}
						</h3>
						<p>
							{mediaDeleteTarget.kind === 'cover'
								? (workflow.labels.deleteCoverBody ?? 'This removes the card image from the task.')
								: (workflow.labels.deleteAttachmentBody ?? 'This file will be removed from the task.')}
						</p>
						<strong>{mediaDeleteTarget.name}</strong>
						<div>
							<button
								type="button"
								className="workflow-media-confirm-cancel"
								onClick={() => setMediaDeleteTarget(null)}
							>
								{t.common.cancel}
							</button>
							<button type="button" className="workflow-media-confirm-danger" onClick={handleConfirmMediaDelete}>
								{t.common.delete}
							</button>
						</div>
					</div>
				</div>
			) : null}
			{projectArchiveTarget && project ? (
				<div
					className="workflow-media-confirm-backdrop"
					role="dialog"
					aria-modal="true"
					aria-labelledby="workflow-project-archive-title"
					onClick={() => setProjectArchiveTarget(null)}
				>
					<div
						className="workflow-media-confirm workflow-project-archive-confirm"
						data-restore={project.archived}
						onClick={(event) => event.stopPropagation()}
					>
						<span>{project.archived ? <RefreshCcw size={19} /> : <Archive size={19} />}</span>
						<h3 id="workflow-project-archive-title">
							{project.archived ? workflow.labels.unarchiveProjectTitle : workflow.labels.archiveProjectTitle}
						</h3>
						<p>
							<b>{project.name}</b> —{' '}
							{project.archived ? workflow.labels.unarchiveProjectBody : workflow.labels.archiveProjectBody}
						</p>
						{!project.archived ? (
							<strong>
								{project.open_tasks_count}{' '}
								{project.open_tasks_count === 1 ? workflow.labels.runningTask : workflow.labels.runningTasks}
							</strong>
						) : null}
						<div>
							<button
								type="button"
								className="workflow-media-confirm-cancel"
								onClick={() => setProjectArchiveTarget(null)}
								disabled={projectArchiveState.isLoading}
							>
								{t.common.cancel}
							</button>
							<button
								type="button"
								className="workflow-media-confirm-archive"
								data-restore={project.archived}
								onClick={() => void handleSetProjectArchived()}
								disabled={projectArchiveState.isLoading}
							>
								{projectArchiveState.isLoading
									? project.archived
										? workflow.buttons.unarchiving
										: workflow.buttons.archiving
									: project.archived
										? workflow.buttons.unarchiveProject
										: workflow.buttons.archiveProject}
							</button>
						</div>
					</div>
				</div>
			) : null}
			{attachmentPreview ? (
				<div
					className="workflow-attachment-preview-backdrop"
					role="dialog"
					aria-modal="true"
					onClick={() => setAttachmentPreview(null)}
				>
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
							<Image
								src={attachmentPreview.url}
								alt={attachmentPreview.name}
								width={1200}
								height={820}
								unoptimized
								loading="eager"
							/>
						</div>
						<footer>
							<a href={attachmentPreview.url} target="_blank" rel="noreferrer">
								{workflow.buttons.open ?? 'Open'}
							</a>
						</footer>
					</div>
				</div>
			) : null}
		</NavigationBar>
	);
};
export default DesignWorkflowShell;
