'use client';
import { TaskCardItem } from '@/components/design-workflow/board/workflowCards';
import {
	Area,
	AvatarBadge,
	EmptyState,
	Field,
	FieldLabel,
	WorkDaysField,
} from '@/components/shared/workflow/workflowFields';
import { formatMinutes } from '@/utils/workflow/workflowFormatting';
import { buildProjectPayload, buildTaskPayload, emptyTaskForm } from '@/utils/workflow/workflowFormHelpers';
import { STATUS_COLUMNS } from '@/components/shared/workflow/boardAppearance';
import { ProjectCollaborators } from '@/components/shared/workflow/projectCollaborators';
import {
	WorkflowDateField as DateField,
	WorkflowSelectField as SelectField,
} from '@/components/shared/workflow/workflowFormControls';
import { WorkflowPageHero } from '@/components/shared/workflow/workflowPrimitives';
import type { ProjectSummary, TaskCard, TaskStatus } from '@/types/designWorkflowTypes';
import { guardedChanges } from '@/utils/liveDraft';
import { PRIORITY_OPTIONS, PROJECT_STATUS_OPTIONS } from '@/utils/rawData';
import { DASHBOARD_PROJECTS } from '@/utils/routes';
import {
	Archive,
	Bell,
	BriefcaseBusiness,
	CalendarDays,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	CircleAlert,
	Clock3,
	FolderKanban,
	ListTodo,
	MessagesSquare,
	Pencil,
	Plus,
	RefreshCcw,
	ShieldCheck,
	Users,
} from 'lucide-react';
import Link from 'next/link';
import type { WorkflowController } from '@/utils/workflow/hooks/useWorkflowController';
export const WorkflowProjectDetail = ({
	model,
}: {
	model: Pick<
		WorkflowController,
		| 'projectBusy'
		| 'workflow'
		| 'project'
		| 'projectTasksPage'
		| 'projectCommentsPage'
		| 'projectActivityPage'
		| 'isManager'
		| 'profile'
		| 'labelFor'
		| 'messageFor'
		| 'dateFor'
		| 'projectEditForm'
		| 'setProjectEditForm'
		| 'managerUsers'
		| 'userOptionLabel'
		| 'assignableUsers'
		| 'runPrimaryAction'
		| 'updateProject'
		| 'projectEditBaseline'
		| 'updateProjectState'
		| 'setProjectArchiveTarget'
		| 'projectArchiveState'
		| 'setProjectTaskEditId'
		| 'setSelectedTaskId'
		| 'handleArchiveTask'
		| 'setProjectTasksPage'
		| 'taskForm'
		| 'setTaskForm'
		| 'usersLoading'
		| 'mentionableUsers'
		| 'workflowDataReady'
		| 'createTask'
		| 'createTaskState'
		| 'dateTimeFor'
		| 'setProjectCommentsPage'
		| 'describeWorkflowActivity'
		| 'setProjectActivityPage'
	>;
}) => {
	const {
		projectBusy,
		workflow,
		project,
		projectTasksPage,
		projectCommentsPage,
		projectActivityPage,
		isManager,
		profile,
		labelFor,
		messageFor,
		dateFor,
		projectEditForm,
		setProjectEditForm,
		managerUsers,
		userOptionLabel,
		assignableUsers,
		runPrimaryAction,
		updateProject,
		projectEditBaseline,
		updateProjectState,
		setProjectArchiveTarget,
		projectArchiveState,
		setProjectTaskEditId,
		setSelectedTaskId,
		handleArchiveTask,
		setProjectTasksPage,
		taskForm,
		setTaskForm,
		usersLoading,
		mentionableUsers,
		workflowDataReady,
		createTask,
		createTaskState,
		dateTimeFor,
		setProjectCommentsPage,
		describeWorkflowActivity,
		setProjectActivityPage,
	} = model;
	if (projectBusy) {
		return <EmptyState {...workflow.emptyStates.loadingProject} />;
	}

	if (!project) {
		return <EmptyState {...workflow.emptyStates.missingProject} />;
	}

	const pageSize = 6;
	const projectTasksTotalPages = Math.max(1, Math.ceil(project.tasks.length / pageSize));
	const commentsTotalPages = Math.max(1, Math.ceil(project.recent_comments.length / pageSize));
	const activityTotalPages = Math.max(1, Math.ceil(project.recent_activity.length / pageSize));
	const projectTasksCurrentPage = Math.min(projectTasksPage, projectTasksTotalPages);
	const projectCommentsCurrentPage = Math.min(projectCommentsPage, commentsTotalPages);
	const projectActivityCurrentPage = Math.min(projectActivityPage, activityTotalPages);
	const pagedTasks = project.tasks.slice((projectTasksCurrentPage - 1) * pageSize, projectTasksCurrentPage * pageSize);
	const pagedComments = project.recent_comments.slice(
		(projectCommentsCurrentPage - 1) * pageSize,
		projectCommentsCurrentPage * pageSize,
	);
	const pagedActivity = project.recent_activity.slice(
		(projectActivityCurrentPage - 1) * pageSize,
		projectActivityCurrentPage * pageSize,
	);
	const projectStatusOptions = project.archived
		? [...PROJECT_STATUS_OPTIONS, 'archived' as const]
		: PROJECT_STATUS_OPTIONS;
	const canManageProject = project.can_manage ?? (isManager || project.manager.id === profile.id);
	const projectDisplayStatus = project.archived ? 'archived' : project.status;
	const ProjectStatusIcon =
		projectDisplayStatus === 'archived'
			? Archive
			: projectDisplayStatus === 'completed'
				? CheckCircle2
				: projectDisplayStatus === 'active'
					? FolderKanban
					: projectDisplayStatus === 'on_hold'
						? Clock3
						: CalendarDays;

	return (
		<div className="workflow-project-detail-page">
			<WorkflowPageHero
				className="workflow-project-detail-header"
				eyebrow={
					<Link href={DASHBOARD_PROJECTS} className="workflow-project-detail-back-link">
						<ChevronLeft size={15} />
						<span>{workflow.buttons.backToProjects ?? workflow.pageTitles.projects}</span>
					</Link>
				}
				title={project.name}
				actionsClassName="workflow-header-summary"
				actions={
					<>
						<span className="workflow-project-detail-status" data-status={projectDisplayStatus}>
							<ProjectStatusIcon size={14} aria-hidden="true" />
							{labelFor(projectDisplayStatus)}
						</span>
						<span className="workflow-header-stat" data-tone="blue">
							<ListTodo size={15} aria-hidden="true" />
							<strong>{project.open_tasks_count}</strong>
							{project.open_tasks_count === 1
								? messageFor('tâche ouverte', 'open task')
								: messageFor('tâches ouvertes', 'open tasks')}
						</span>
						<span className="workflow-header-stat" data-tone="violet">
							<Clock3 size={15} aria-hidden="true" />
							<strong>{formatMinutes(project.total_logged_minutes)}</strong> {workflow.labels.loggedSuffix}
						</span>
					</>
				}
			/>

			<div className="workflow-project-detail-grid">
				<section className="workflow-project-detail-panel workflow-project-detail-panel-main" data-tone="indigo">
					<div className="workflow-overview-panel-pill">
						<b>{workflow.sections.projectSnapshot.title}</b>
						<em>
							<FolderKanban size={13} />
						</em>
					</div>
					<p className="workflow-project-detail-description">{project.description || workflow.labels.noDescription}</p>
					{Boolean(project.collaborators?.length) && (
						<div className="mb-4">
							<p className="mb-2 text-xs font-bold text-(--ink-muted)">
								{messageFor('Collaborateurs', 'Collaborators')}
							</p>
							<ul className="flex flex-wrap gap-2">
								{project.collaborators?.map((user) => (
									<li key={user.id} className="workflow-project-member">
										<AvatarBadge user={user} size={26} showPresence={false} />
										<span>
											{user.first_name} {user.last_name}
										</span>
									</li>
								))}
							</ul>
						</div>
					)}
					<div className="workflow-project-detail-meta">
						<div className="workflow-project-detail-meta-card">
							<span>{workflow.labels.manager}</span>
							<div className="mt-3 flex items-center gap-3">
								<AvatarBadge user={project.manager} size={34} showPresence={false} />
								<p>
									{project.manager.first_name} {project.manager.last_name}
								</p>
							</div>
						</div>
						<div className="workflow-project-detail-meta-card">
							<span>{workflow.labels.start}</span>
							<p>
								<CalendarDays size={15} />
								{dateFor(project.start_date)}
							</p>
						</div>
						<div className="workflow-project-detail-meta-card">
							<span>{workflow.labels.target}</span>
							<p>
								<Clock3 size={15} />
								{dateFor(project.target_end_date)}
							</p>
						</div>
					</div>
				</section>

				{canManageProject ? (
					<section className="workflow-project-detail-panel workflow-project-detail-edit" data-tone="blue">
						<div className="workflow-overview-panel-pill">
							<b>{workflow.sections.editProject.title}</b>
							<em>
								<Pencil size={13} />
							</em>
						</div>
						<div className="mt-4 grid gap-4 md:grid-cols-2">
							<div>
								<FieldLabel>{workflow.labels.name}</FieldLabel>
								<Field
									ai="project_title"
									maxLength={255}
									value={projectEditForm.name}
									onChangeAction={(value) => setProjectEditForm((current) => ({ ...current, name: value }))}
									startIcon={<BriefcaseBusiness size={18} />}
								/>
							</div>
							<div>
								<FieldLabel>{workflow.labels.manager}</FieldLabel>
								<SelectField
									value={String(projectEditForm.manager_id)}
									onChangeAction={(value) =>
										setProjectEditForm((current) => ({ ...current, manager_id: Number(value) }))
									}
									options={managerUsers.map((user) => ({ value: user.id, label: userOptionLabel(user) }))}
									startIcon={<ShieldCheck size={18} />}
								/>
							</div>
							<ProjectCollaborators
								id="project-edit-collaborators"
								users={assignableUsers}
								ownerId={projectEditForm.manager_id}
								value={projectEditForm.collaborator_ids ?? []}
								onChangeAction={(collaborator_ids) =>
									setProjectEditForm((current) => ({ ...current, collaborator_ids }))
								}
							/>
							<div className="md:col-span-2">
								<FieldLabel>{workflow.labels.description}</FieldLabel>
								<Area
									ai="project_description"
									value={projectEditForm.description}
									onChangeAction={(value) => setProjectEditForm((current) => ({ ...current, description: value }))}
									startIcon={<MessagesSquare size={18} />}
								/>
							</div>
							<div>
								<FieldLabel>{workflow.labels.priority}</FieldLabel>
								<SelectField
									value={projectEditForm.priority ?? 'medium'}
									onChangeAction={(value) =>
										setProjectEditForm((current) => ({ ...current, priority: value as ProjectSummary['priority'] }))
									}
									options={PRIORITY_OPTIONS.map((item) => ({ value: item, label: labelFor(item) }))}
									startIcon={<CircleAlert size={18} />}
								/>
							</div>
							<div>
								<FieldLabel>{workflow.labels.status}</FieldLabel>
								<SelectField
									value={projectEditForm.status ?? 'planned'}
									onChangeAction={(value) =>
										setProjectEditForm((current) => ({ ...current, status: value as ProjectSummary['status'] }))
									}
									options={projectStatusOptions.map((item) => ({ value: item, label: labelFor(item) }))}
									startIcon={<ListTodo size={18} />}
									disabled={project.archived}
								/>
							</div>
							<div>
								<FieldLabel>{workflow.labels.startDate}</FieldLabel>
								<DateField
									value={projectEditForm.start_date ?? ''}
									onChangeAction={(value) => setProjectEditForm((current) => ({ ...current, start_date: value }))}
								/>
							</div>
							<div>
								<FieldLabel>{workflow.labels.targetEnd}</FieldLabel>
								<DateField
									value={projectEditForm.target_end_date ?? ''}
									onChangeAction={(value) => setProjectEditForm((current) => ({ ...current, target_end_date: value }))}
								/>
							</div>
						</div>
						<div className="mt-5 flex flex-wrap items-center gap-3">
							<button
								type="button"
								onClick={() =>
									void runPrimaryAction(
										async () => {
											await updateProject({
												id: project.id,
												data: guardedChanges(
													buildProjectPayload(projectEditForm),
													buildProjectPayload(projectEditBaseline.current ?? projectEditForm),
												),
											}).unwrap();
										},
										messageFor('Projet modifié avec succès.', 'Project saved successfully.'),
										messageFor('Impossible de modifier le projet.', 'Could not save the project.'),
									)
								}
								className="app-button"
							>
								<Pencil size={16} />
								<span>{updateProjectState.isLoading ? workflow.buttons.saving : workflow.buttons.saveProject}</span>
							</button>
							<button
								type="button"
								onClick={() => setProjectArchiveTarget({ id: project.id, archived: project.archived })}
								disabled={projectArchiveState.isLoading}
								className="workflow-project-archive-trigger"
								data-archived={project.archived}
							>
								{project.archived ? <RefreshCcw size={16} /> : <Archive size={16} />}
								<span>{project.archived ? workflow.buttons.unarchiveProject : workflow.buttons.archiveProject}</span>
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
							<TaskCardItem
								key={taskItem.id}
								task={taskItem}
								copy={workflow}
								labelForAction={labelFor}
								dateForAction={dateFor}
								onOpenAction={(openedTaskId) => {
									if (taskItem.can_edit) setProjectTaskEditId(openedTaskId);
									else setSelectedTaskId(openedTaskId);
								}}
								onArchiveAction={taskItem.can_edit ? handleArchiveTask : undefined}
								showTime={isManager}
							/>
						))}
						{project.tasks.length === 0 ? <EmptyState {...workflow.emptyStates.noTasks} /> : null}
					</div>
					{projectTasksTotalPages > 1 ? (
						<div className="workflow-project-detail-pager mt-4">
							<button
								type="button"
								aria-label={workflow.buttons.previous}
								disabled={projectTasksCurrentPage <= 1}
								onClick={() => setProjectTasksPage((page) => Math.max(1, page - 1))}
							>
								<ChevronLeft size={16} />
							</button>
							<span>
								{projectTasksCurrentPage}/{projectTasksTotalPages}
							</span>
							<button
								type="button"
								aria-label={workflow.buttons.next}
								disabled={projectTasksCurrentPage >= projectTasksTotalPages}
								onClick={() => setProjectTasksPage((page) => Math.min(projectTasksTotalPages, page + 1))}
							>
								<ChevronRight size={16} />
							</button>
						</div>
					) : null}
				</section>

				{project.can_work && !project.archived ? (
					<section className="workflow-project-detail-panel workflow-project-detail-create" data-tone="cyan">
						<div className="workflow-overview-panel-pill">
							<b>{workflow.sections.createTask.title}</b>
							<em>+</em>
						</div>
						<div className="mt-4 grid gap-4 md:grid-cols-2">
							<div>
								<FieldLabel htmlFor="task-title">{workflow.labels.taskTitle}</FieldLabel>
								<Field
									ai="task_title"
									maxLength={255}
									id="task-title"
									value={taskForm.title}
									onChangeAction={(value) => setTaskForm((current) => ({ ...current, title: value }))}
									placeholder={workflow.labels.taskTitlePlaceholder}
									startIcon={<ListTodo size={18} />}
								/>
							</div>
							<div>
								<FieldLabel htmlFor="task-assignee">{workflow.labels.assignee}</FieldLabel>
								<SelectField
									id="task-assignee"
									value={taskForm.current_assignee_id}
									onChangeAction={(value) => setTaskForm((current) => ({ ...current, current_assignee_id: value }))}
									options={[
										{ value: '', label: usersLoading ? workflow.labels.loading : workflow.labels.unassigned },
										...assignableUsers.map((user) => ({
											value: user.id,
											label: `${user.first_name} ${user.last_name}`,
										})),
									]}
									startIcon={<Users size={18} />}
								/>
							</div>
							<div className="md:col-span-2">
								<FieldLabel htmlFor="task-description">{workflow.labels.description}</FieldLabel>
								<Area
									ai="task_description"
									id="task-description"
									value={taskForm.description}
									onChangeAction={(value) => setTaskForm((current) => ({ ...current, description: value }))}
									mentionUsers={mentionableUsers}
									startIcon={<MessagesSquare size={18} />}
								/>
							</div>
							<div>
								<FieldLabel htmlFor="task-status">{workflow.labels.status}</FieldLabel>
								<SelectField
									id="task-status"
									value={taskForm.status}
									onChangeAction={(value) => setTaskForm((current) => ({ ...current, status: value as TaskStatus }))}
									options={STATUS_COLUMNS.map((item) => ({ value: item, label: labelFor(item) }))}
									startIcon={<ListTodo size={18} />}
								/>
							</div>
							<div>
								<FieldLabel htmlFor="task-priority">{workflow.labels.priority}</FieldLabel>
								<SelectField
									id="task-priority"
									value={taskForm.priority}
									onChangeAction={(value) =>
										setTaskForm((current) => ({ ...current, priority: value as TaskCard['priority'] }))
									}
									options={PRIORITY_OPTIONS.map((item) => ({ value: item, label: labelFor(item) }))}
									startIcon={<CircleAlert size={18} />}
								/>
							</div>
							<div>
								<FieldLabel htmlFor="task-due-date">{workflow.labels.dueDate}</FieldLabel>
								<DateField
									id="task-due-date"
									value={taskForm.due_date}
									onChangeAction={(value) => setTaskForm((current) => ({ ...current, due_date: value }))}
								/>
							</div>
							{workflowDataReady ? (
								<div>
									<FieldLabel htmlFor="task-estimate">{workflow.labels.estimatedMinutes}</FieldLabel>
									<WorkDaysField
										id="task-estimate"
										value={taskForm.estimated_minutes}
										onChangeAction={(value) => setTaskForm((current) => ({ ...current, estimated_minutes: value }))}
									/>
								</div>
							) : null}
						</div>
						<div className="mt-5">
							<button
								type="button"
								onClick={() =>
									void runPrimaryAction(
										async () => {
											await createTask(buildTaskPayload(project.id, taskForm, { includeTime: true })).unwrap();
											setTaskForm(emptyTaskForm());
										},
										messageFor('Tâche créée avec succès.', 'Task created successfully.'),
										messageFor('Impossible de créer la tâche.', 'Could not create the task.'),
									)
								}
								disabled={!taskForm.title.trim()}
								className="app-button"
							>
								<Plus size={16} />
								<span>{createTaskState.isLoading ? workflow.buttons.creating : workflow.buttons.createTask}</span>
							</button>
						</div>
					</section>
				) : null}

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
									<p>
										{comment.author.first_name} {comment.author.last_name}
									</p>
									<span>{comment.body}</span>
									<small>
										{comment.task_title} - {dateTimeFor(comment.created_at)}
									</small>
								</div>
							</div>
						))}
						{project.recent_comments.length === 0 ? <EmptyState {...workflow.emptyStates.noComments} /> : null}
						<div className="workflow-project-detail-pager">
							<button
								type="button"
								aria-label={workflow.buttons.previous}
								disabled={projectCommentsCurrentPage <= 1}
								onClick={() => setProjectCommentsPage((page) => Math.max(1, page - 1))}
							>
								<ChevronLeft size={16} />
							</button>
							<span>
								{projectCommentsCurrentPage}/{commentsTotalPages}
							</span>
							<button
								type="button"
								aria-label={workflow.buttons.next}
								disabled={projectCommentsCurrentPage >= commentsTotalPages}
								onClick={() => setProjectCommentsPage((page) => Math.min(commentsTotalPages, page + 1))}
							>
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
								<div className="workflow-project-detail-feed-icon">
									<Bell size={15} />
								</div>
								<div className="min-w-0">
									<p>
										{activity.actor
											? `${activity.actor.first_name} ${activity.actor.last_name}`
											: workflow.labels.system}
									</p>
									<span>{describeWorkflowActivity(activity)}</span>
									<small>
										{activity.task_title} - {dateTimeFor(activity.created_at)}
									</small>
								</div>
							</div>
						))}
						{project.recent_activity.length === 0 ? <EmptyState {...workflow.emptyStates.noActivity} /> : null}
						<div className="workflow-project-detail-pager">
							<button
								type="button"
								aria-label={workflow.buttons.previous}
								disabled={projectActivityCurrentPage <= 1}
								onClick={() => setProjectActivityPage((page) => Math.max(1, page - 1))}
							>
								<ChevronLeft size={16} />
							</button>
							<span>
								{projectActivityCurrentPage}/{activityTotalPages}
							</span>
							<button
								type="button"
								aria-label={workflow.buttons.next}
								disabled={projectActivityCurrentPage >= activityTotalPages}
								onClick={() => setProjectActivityPage((page) => Math.min(activityTotalPages, page + 1))}
							>
								<ChevronRight size={16} />
							</button>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
};
