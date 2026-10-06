'use client';
import { Area, AvatarBadge, Chip, EmptyState, Field, FieldLabel } from '@/components/shared/workflow/workflowFields';
import { formatMinutes, getApiErrorMessage } from '@/utils/workflow/workflowFormatting';
import { buildProjectPayload, emptyProjectForm } from '@/utils/workflow/workflowFormHelpers';
import { ProjectCollaborators } from '@/components/shared/workflow/projectCollaborators';
import {
	WorkflowDateField as DateField,
	WorkflowSelectField as SelectField,
} from '@/components/shared/workflow/workflowFormControls';
import {
	WorkflowMetricCard as MetricCard,
	WorkflowPageHero,
	WorkflowPanelPill,
} from '@/components/shared/workflow/workflowPrimitives';
import type { ProjectSummary } from '@/types/designWorkflowTypes';
import { PRIORITY_OPTIONS, PROJECT_STATUS_OPTIONS } from '@/utils/rawData';
import { DASHBOARD_PROJECT_VIEW } from '@/utils/routes';
import {
	ArrowRight,
	BriefcaseBusiness,
	CalendarDays,
	CheckCircle2,
	CircleAlert,
	Clock3,
	Eye,
	FolderKanban,
	ListTodo,
	MessagesSquare,
	Plus,
	ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import type { WorkflowController } from '@/utils/workflow/hooks/useWorkflowController';
export const WorkflowProjects = ({
	model,
}: {
	model: Pick<
		WorkflowController,
		| 'projects'
		| 'workflow'
		| 'isManager'
		| 'workflowDataReady'
		| 'projectForm'
		| 'setProjectForm'
		| 'usersLoading'
		| 'managerUsers'
		| 'userOptionLabel'
		| 'assignableUsers'
		| 'labelFor'
		| 'runPrimaryAction'
		| 'createProject'
		| 'profile'
		| 'messageFor'
		| 'createProjectState'
		| 't'
		| 'projectsBusy'
		| 'dateFor'
	>;
}) => {
	const {
		projects,
		workflow,
		isManager,
		workflowDataReady,
		projectForm,
		setProjectForm,
		usersLoading,
		managerUsers,
		userOptionLabel,
		assignableUsers,
		labelFor,
		runPrimaryAction,
		createProject,
		profile,
		messageFor,
		createProjectState,
		t,
		projectsBusy,
		dateFor,
	} = model;
	const activeProjectCount = projects.filter((item) => item.status === 'active').length;
	const totalProjectOpenTasks = projects.reduce((total, item) => total + item.open_tasks_count, 0);
	const totalProjectMinutes = projects.reduce((total, item) => total + item.total_logged_minutes, 0);

	return (
		<div className="workflow-projects-page">
			<WorkflowPageHero
				className="workflow-projects-header"
				title={workflow.pageTitles.projects}
				actionsClassName="workflow-header-summary"
				actions={
					<>
						<span className="workflow-header-stat" data-tone="indigo">
							<FolderKanban size={15} aria-hidden="true" />
							<strong>{projects.length}</strong> {workflow.labels.projects}
						</span>
						<span className="workflow-header-stat" data-tone="green">
							<CheckCircle2 size={15} aria-hidden="true" />
							<strong>{activeProjectCount}</strong> {workflow.labels.active}
						</span>
						<span className="workflow-header-stat" data-tone="amber">
							<ListTodo size={15} aria-hidden="true" />
							<strong>{totalProjectOpenTasks}</strong> {workflow.labels.openTasksLabel}
						</span>
					</>
				}
			/>

			<section className="workflow-projects-metrics">
				<MetricCard
					icon={<FolderKanban size={16} />}
					label={workflow.labels.projects}
					value={projects.length}
					tone="indigo"
				/>
				<MetricCard
					icon={<CheckCircle2 size={16} />}
					label={workflow.labels.active}
					value={activeProjectCount}
					tone="green"
				/>
				<MetricCard
					icon={<ListTodo size={16} />}
					label={workflow.labels.openTasksLabel}
					value={totalProjectOpenTasks}
					tone="amber"
				/>
				<MetricCard
					icon={<Clock3 size={16} />}
					label={workflow.labels.logged}
					value={formatMinutes(totalProjectMinutes)}
					tone="green"
				/>
			</section>

			<div
				className={isManager ? 'workflow-projects-layout' : 'workflow-projects-layout workflow-projects-layout-single'}
			>
				{workflowDataReady ? (
					<section className="workflow-projects-create workflow-overview-panel" data-tone="indigo">
						<WorkflowPanelPill label={workflow.sections.createProject.title} value="+" />
						<p className="workflow-overview-panel-copy">{workflow.sections.createProject.description}</p>
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<FieldLabel htmlFor="project-name">{workflow.labels.projectName}</FieldLabel>
								<Field
									id="project-name"
									value={projectForm.name}
									onChangeAction={(value) => setProjectForm((current) => ({ ...current, name: value }))}
									placeholder={workflow.labels.landingPlaceholder}
									startIcon={<BriefcaseBusiness size={18} />}
								/>
							</div>
							<div>
								<FieldLabel htmlFor="project-manager">{workflow.labels.manager}</FieldLabel>
								<SelectField
									id="project-manager"
									value={String(projectForm.manager_id)}
									onChangeAction={(value) => setProjectForm((current) => ({ ...current, manager_id: Number(value) }))}
									options={[
										{
											value: 0,
											label: usersLoading ? workflow.labels.loadingManagers : workflow.labels.selectManager,
										},
										...managerUsers.map((user) => ({ value: user.id, label: userOptionLabel(user) })),
									]}
									startIcon={<ShieldCheck size={18} />}
								/>
							</div>
							<ProjectCollaborators
								id="project-collaborators"
								users={assignableUsers}
								ownerId={projectForm.manager_id}
								value={projectForm.collaborator_ids ?? []}
								onChangeAction={(collaborator_ids) => setProjectForm((current) => ({ ...current, collaborator_ids }))}
							/>
							<div className="md:col-span-2">
								<FieldLabel htmlFor="project-description">{workflow.labels.description}</FieldLabel>
								<Area
									id="project-description"
									value={projectForm.description}
									onChangeAction={(value) => setProjectForm((current) => ({ ...current, description: value }))}
									placeholder={workflow.labels.shortProjectContext}
									startIcon={<MessagesSquare size={18} />}
								/>
							</div>
							<div>
								<FieldLabel htmlFor="project-start-date">{workflow.labels.startDate}</FieldLabel>
								<DateField
									id="project-start-date"
									value={projectForm.start_date ?? ''}
									onChangeAction={(value) => setProjectForm((current) => ({ ...current, start_date: value }))}
								/>
							</div>
							<div>
								<FieldLabel htmlFor="project-target-date">{workflow.labels.targetEnd}</FieldLabel>
								<DateField
									id="project-target-date"
									value={projectForm.target_end_date ?? ''}
									onChangeAction={(value) => setProjectForm((current) => ({ ...current, target_end_date: value }))}
								/>
							</div>
							<div>
								<FieldLabel htmlFor="project-priority">{workflow.labels.priority}</FieldLabel>
								<SelectField
									id="project-priority"
									value={projectForm.priority ?? 'medium'}
									onChangeAction={(value) =>
										setProjectForm((current) => ({ ...current, priority: value as ProjectSummary['priority'] }))
									}
									options={PRIORITY_OPTIONS.map((item) => ({ value: item, label: labelFor(item) }))}
									startIcon={<CircleAlert size={18} />}
								/>
							</div>
							<div>
								<FieldLabel htmlFor="project-status">{workflow.labels.status}</FieldLabel>
								<SelectField
									id="project-status"
									value={projectForm.status ?? 'planned'}
									onChangeAction={(value) =>
										setProjectForm((current) => ({ ...current, status: value as ProjectSummary['status'] }))
									}
									options={PROJECT_STATUS_OPTIONS.map((item) => ({ value: item, label: labelFor(item) }))}
									startIcon={<ListTodo size={18} />}
								/>
							</div>
						</div>
						<div className="mt-5">
							<button
								type="button"
								onClick={() =>
									void runPrimaryAction(
										async () => {
											await createProject(buildProjectPayload(projectForm)).unwrap();
											setProjectForm(emptyProjectForm(profile.id));
										},
										messageFor('Projet créé avec succès.', 'Project created successfully.'),
										messageFor('Impossible de créer le projet.', 'Could not create the project.'),
									)
								}
								disabled={!projectForm.name.trim() || !projectForm.manager_id}
								className="app-button"
							>
								<Plus size={16} />
								<span>{createProjectState.isLoading ? workflow.buttons.creating : workflow.buttons.createProject}</span>
							</button>
						</div>
						{createProjectState.isError ? (
							<div className="mt-4 rounded-lg border border-(--accent) bg-(--accent-soft) px-4 py-3 text-sm text-(--accent-strong)">
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
								<article
									key={item.id}
									className="workflow-project-card-modern"
									data-status={item.archived ? 'archived' : item.status}
									data-readonly={!item.can_work}
								>
									<div className="workflow-project-card-pill">
										<b>{item.name}</b>
										<em>{labelFor(item.archived ? 'archived' : item.status)}</em>
									</div>
									<div className="workflow-project-card-main">
										<div className="min-w-0">
											<p>{item.description || workflow.labels.noDescription}</p>
											<span>
												{item.manager.first_name} {item.manager.last_name}
											</span>
										</div>
										<AvatarBadge user={item.manager} size={34} showTooltip />
									</div>
									<div className="workflow-project-card-stats">
										<span>
											<b>{workflow.labels.open}</b>
											<strong>
												<FolderKanban size={13} />
												{item.open_tasks_count}
											</strong>
										</span>
										<span>
											<b>{workflow.labels.logged}</b>
											<strong>
												<Clock3 size={13} />
												{formatMinutes(item.total_logged_minutes)}
											</strong>
										</span>
										<span>
											<b>{workflow.labels.target}</b>
											<strong>
												<CalendarDays size={13} />
												{dateFor(item.target_end_date)}
											</strong>
										</span>
									</div>
									<div className="mt-4 flex items-center justify-between gap-3">
										<Chip>{labelFor(item.priority)}</Chip>
										<div className="flex min-w-0 items-center gap-2">
											{!item.can_work ? (
												<span className="workflow-project-card-readonly">
													<Eye size={14} />
													{workflow.emptyStates.readOnly.title}
												</span>
											) : null}
											<Link href={DASHBOARD_PROJECT_VIEW(item.id)} className="workflow-project-card-open">
												<span>{workflow.buttons.open}</span>
												<ArrowRight size={14} />
											</Link>
										</div>
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
