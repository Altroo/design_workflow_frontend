'use client';
import { BoardColumn, TaskCardItem } from '@/components/design-workflow/board/workflowCards';
import { Chip, EmptyState, ToggleField } from '@/components/shared/workflow/workflowFields';
import { formatWorkDays } from '@/utils/workflow/workflowFormatting';
import { emptyBoardFilters } from '@/utils/workflow/workflowFormHelpers';
import { STATUS_COLUMNS } from '@/components/shared/workflow/boardAppearance';
import { WorkflowSelectField as SelectField } from '@/components/shared/workflow/workflowFormControls';
import { WorkflowPageHero } from '@/components/shared/workflow/workflowPrimitives';
import type { BoardFiltersState } from '@/types/workflowUiTypes';
import { PRIORITY_OPTIONS, REVIEW_STATE_OPTIONS } from '@/utils/rawData';
import { DASHBOARD_PROJECTS } from '@/utils/routes';
import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core';
import {
	Archive,
	Bookmark,
	CalendarDays,
	CircleAlert,
	Eye,
	FolderKanban,
	ListTodo,
	Plus,
	RefreshCcw,
	Save,
	Search,
	ShieldCheck,
	SlidersHorizontal,
	Table2,
	Tag,
	Trash2,
	Users,
} from 'lucide-react';
import Link from 'next/link';
import type { WorkflowController } from '@/utils/workflow/hooks/useWorkflowController';
import { WorkflowBoardCalendar } from '@/components/design-workflow/board/workflowBoardCalendar';
import { WorkflowBoardTable } from '@/components/design-workflow/board/workflowBoardTable';
import { WorkflowWorkspaceSearchResults } from '@/components/design-workflow/search/workflowWorkspaceSearchResults';
export const WorkflowBoard = ({
	model,
}: {
	model: Pick<
		WorkflowController,
		| 'boardDraft'
		| 'filteredBoardTasks'
		| 'projects'
		| 'savedViews'
		| 'boardFilters'
		| 'boardFiltersOpen'
		| 'filteredProject'
		| 'workflow'
		| 'isManager'
		| 'setBoardViewMode'
		| 'boardViewMode'
		| 'setBoardFiltersOpen'
		| 'resetBoardFilters'
		| 'updateBoardFiltersManually'
		| 'writableProjects'
		| 'messageFor'
		| 'labelFor'
		| 'labels'
		| 'usersLoading'
		| 'assignableUsers'
		| 'selectedSavedViewId'
		| 'applySavedView'
		| 'savedViewName'
		| 'setSavedViewName'
		| 'savedViewVisibility'
		| 'setSavedViewVisibility'
		| 'createSavedViewState'
		| 'saveBoardView'
		| 'markCurrentViewDefault'
		| 'deleteCurrentSavedView'
		| 'emptyDefaultSavedViewName'
		| 'tasksBusy'
		| 'sensors'
		| 'handleDragStart'
		| 'handleDragEnd'
		| 'setDraggedTaskId'
		| 'boardDragPointerRef'
		| 'tasksByStatus'
		| 'dateFor'
		| 'setSelectedTaskId'
		| 'handleArchiveTask'
		| 'quickAddColumn'
		| 'quickAddTitle'
		| 'quickAddUnavailableReason'
		| 'availableQuickAddProjects'
		| 'quickAddProject'
		| 'createTaskState'
		| 'variant'
		| 'quickAddContext'
		| 'setQuickAddColumn'
		| 'setQuickAddTitle'
		| 'setQuickAddProjectId'
		| 'handleQuickAddTask'
		| 'draggedTaskId'
		| 'updateStatusState'
		| 'reorderTasksState'
		| 't'
		| 'workspaceSearchResults'
		| 'runPrimaryAction'
		| 'updateTaskStatus'
		| 'boardCalendarMonth'
		| 'setBoardCalendarMonth'
		| 'locale'
		| 'calendarWeekdays'
	>;
}) => {
	const {
		boardDraft,
		filteredBoardTasks,
		projects,
		savedViews,
		boardFilters,
		boardFiltersOpen,
		filteredProject,
		workflow,
		isManager,
		setBoardViewMode,
		boardViewMode,
		setBoardFiltersOpen,
		resetBoardFilters,
		updateBoardFiltersManually,
		writableProjects,
		messageFor,
		labelFor,
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
		tasksBusy,
		sensors,
		handleDragStart,
		handleDragEnd,
		setDraggedTaskId,
		boardDragPointerRef,
		tasksByStatus,
		dateFor,
		setSelectedTaskId,
		handleArchiveTask,
		quickAddColumn,
		quickAddTitle,
		quickAddUnavailableReason,
		availableQuickAddProjects,
		quickAddProject,
		createTaskState,
		variant,
		quickAddContext,
		setQuickAddColumn,
		setQuickAddTitle,
		setQuickAddProjectId,
		handleQuickAddTask,
		draggedTaskId,
		updateStatusState,
		reorderTasksState,
		t,
	} = model;
	const activeBoardCount = boardDraft.filter((item) => !item.archived).length;
	const overdueBoardCount = filteredBoardTasks.filter((item) => item.is_overdue).length;
	const blockedBoardCount = filteredBoardTasks.filter((item) => item.status === 'blocked').length;
	const boardEffort = filteredBoardTasks.reduce((total, item) => total + (item.estimated_minutes || 0), 0);
	const hasBoardSetup = projects.length > 0 || boardDraft.length > 0 || savedViews.length > 0;
	const hasActiveFilters =
		Boolean(boardFilters.search.trim()) ||
		Boolean(boardFilters.project) ||
		Boolean(boardFilters.label) ||
		Boolean(boardFilters.status) ||
		Boolean(boardFilters.priority) ||
		Boolean(boardFilters.assignee) ||
		Boolean(boardFilters.reviewState) ||
		boardFilters.sort !== 'sort_order' ||
		boardFilters.overdueOnly ||
		boardFilters.archivedOnly;
	const showBoardTools = hasBoardSetup || hasActiveFilters || boardFiltersOpen;
	const readOnlyProjectSelected = Boolean(filteredProject && !filteredProject.can_work);

	return (
		<div className="workflow-kanban-page">
			<WorkflowPageHero
				className="workflow-kanban-header"
				title={workflow.pageTitles.board}
				actionsWrapper={false}
				actions={
					<>
						<div className="workflow-kanban-header-metrics">
							<span>
								{workflow.labels.visible} <strong>{filteredBoardTasks.length}</strong>
							</span>
							<span>
								{workflow.labels.overdue} <strong>{overdueBoardCount}</strong>
							</span>
							<span>
								{workflow.labels.blocked} <strong>{blockedBoardCount}</strong>
							</span>
							{isManager ? (
								<span>
									{workflow.labels.estimated} <strong>{formatWorkDays(boardEffort, workflow.labels.daysUnit)}</strong>
								</span>
							) : null}
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
							<button
								type="button"
								onClick={resetBoardFilters}
								className="app-pill workflow-focus-ring grid h-10 w-10 place-items-center text-(--ink)"
								aria-label={workflow.buttons.resetFilters}
							>
								<RefreshCcw size={16} />
							</button>
							<div className="workflow-board-segment">
								<button
									type="button"
									onClick={() => updateBoardFiltersManually((current) => ({ ...current, archivedOnly: false }))}
									className={!boardFilters.archivedOnly ? 'is-active' : ''}
								>
									{workflow.labels.activeCards}
								</button>
								<button
									type="button"
									onClick={() => updateBoardFiltersManually((current) => ({ ...current, archivedOnly: true }))}
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

			{!hasBoardSetup ? (
				<section className="workflow-board-onboarding">
					<EmptyState
						title={workflow.emptyStates.noProjects.title}
						description={workflow.emptyStates.noProjects.description}
						icon={<FolderKanban size={18} />}
						action={
							<Link href={DASHBOARD_PROJECTS} className="app-button">
								<Plus size={15} />
								<span>{workflow.buttons.createProject ?? workflow.sections.createProject.title}</span>
							</Link>
						}
					/>
				</section>
			) : null}
			{projects.length > 0 && writableProjects.length === 0 ? (
				<div className="workflow-board-view-notice" role="status">
					<Eye size={16} />
					<span className="workflow-board-view-notice-copy">
						<b>{messageFor('Vue en lecture seule', 'Read-only workspace')}</b>
						<small>
							{messageFor(
								'Vous pouvez consulter tous les projets et leurs tâches. Créez un projet pour pouvoir y ajouter des cartes.',
								'You can view every project and its tasks. Create a project before adding cards.',
							)}
						</small>
					</span>
				</div>
			) : readOnlyProjectSelected ? (
				<div className="workflow-board-view-notice" role="status">
					<Eye size={16} />
					<span className="workflow-board-view-notice-copy">
						<b>{messageFor('Projet en lecture seule', 'Read-only project')}</b>
						<small>
							{messageFor(
								'Vous pouvez consulter toutes les cartes. Seules les tâches qui vous sont assignées peuvent être modifiées ou déplacées.',
								'You can view every card. Only tasks assigned to you can be edited or moved.',
							)}
						</small>
					</span>
				</div>
			) : null}

			{showBoardTools ? (
				<section className="workflow-kanban-toolbar" data-open={boardFiltersOpen}>
					<div className="workflow-kanban-filter-grid">
						<label className="workflow-kanban-search">
							<Search size={16} />
							<input
								id="board-search"
								value={boardFilters.search}
								onChange={(event) =>
									updateBoardFiltersManually((current) => ({ ...current, search: event.target.value }))
								}
								placeholder={workflow.labels.taskProjectDescription}
							/>
						</label>
						<SelectField
							value={boardFilters.project}
							onChangeAction={(value) => updateBoardFiltersManually((current) => ({ ...current, project: value }))}
							ariaLabel={workflow.labels.project}
							options={[
								{ value: '', label: workflow.labels.allProjects },
								{ value: 'mine', label: messageFor('Mes projets', 'My projects') },
								...projects.map((item) => ({ value: item.id, label: item.name })),
							]}
							startIcon={<FolderKanban size={16} />}
						/>
						<SelectField
							value={boardFilters.status}
							onChangeAction={(value) => updateBoardFiltersManually((current) => ({ ...current, status: value }))}
							ariaLabel={workflow.labels.status}
							options={[
								{ value: '', label: workflow.labels.allStatuses },
								...STATUS_COLUMNS.map((item) => ({ value: item, label: labelFor(item) })),
							]}
							startIcon={<ListTodo size={16} />}
						/>
						<SelectField
							value={boardFilters.priority}
							onChangeAction={(value) => updateBoardFiltersManually((current) => ({ ...current, priority: value }))}
							ariaLabel={workflow.labels.priority}
							options={[
								{ value: '', label: workflow.labels.allPriorities },
								...PRIORITY_OPTIONS.map((item) => ({ value: item, label: labelFor(item) })),
							]}
							startIcon={<CircleAlert size={16} />}
						/>
						<SelectField
							value={boardFilters.label}
							onChangeAction={(value) => updateBoardFiltersManually((current) => ({ ...current, label: value }))}
							ariaLabel={messageFor('Étiquette', 'Label')}
							options={[
								{ value: '', label: messageFor('Toutes mes étiquettes', 'All my labels') },
								...labels.map((item) => ({ value: item.id, label: item.name })),
							]}
							startIcon={<Tag size={16} />}
						/>
						<SelectField
							value={boardFilters.assignee}
							onChangeAction={(value) => updateBoardFiltersManually((current) => ({ ...current, assignee: value }))}
							ariaLabel={workflow.labels.assignee}
							options={[
								{ value: '', label: usersLoading ? workflow.labels.loading : workflow.labels.allAssignees },
								...assignableUsers.map((item) => ({
									value: item.id,
									label: `${item.first_name} ${item.last_name}`,
								})),
							]}
							startIcon={<Users size={16} />}
						/>
						<SelectField
							value={boardFilters.reviewState}
							onChangeAction={(value) =>
								updateBoardFiltersManually((current) => ({
									...current,
									reviewState: value as BoardFiltersState['reviewState'],
								}))
							}
							ariaLabel={workflow.labels.review ?? messageFor('Revue', 'Review')}
							options={[
								{ value: '', label: workflow.labels.allReviews ?? 'All reviews' },
								...REVIEW_STATE_OPTIONS.map((item) => ({ value: item, label: labelFor(item) })),
							]}
							startIcon={<ShieldCheck size={16} />}
						/>
					</div>
					<div className="workflow-kanban-toggles">
						<ToggleField
							label={workflow.labels.overdueOnly}
							checked={boardFilters.overdueOnly}
							onChangeAction={(checked) =>
								updateBoardFiltersManually((current) => ({ ...current, overdueOnly: checked }))
							}
						/>
						<Chip tone="neutral">
							{workflow.labels.active} {activeBoardCount}
						</Chip>
					</div>
					<div className="workflow-saved-view-bar">
						<SelectField
							value={selectedSavedViewId ? String(selectedSavedViewId) : ''}
							onChangeAction={(value) => {
								const view = savedViews.find((item) => String(item.id) === value);
								if (view) applySavedView(view);
								if (!value) updateBoardFiltersManually(emptyBoardFilters());
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
							onChangeAction={(value) => setSavedViewVisibility(value === 'team' && isManager ? 'team' : 'private')}
							options={[
								{ value: 'private', label: workflow.labels.privateView ?? 'Private' },
								...(isManager ? [{ value: 'team', label: workflow.labels.teamView ?? 'Team' }] : []),
							]}
						/>
						<button
							type="button"
							className="app-button"
							disabled={!savedViewName.trim() || createSavedViewState.isLoading}
							onClick={() => void saveBoardView()}
						>
							<Save size={15} />
							<span>{workflow.buttons.save ?? 'Save'}</span>
						</button>
						{selectedSavedViewId ? (
							<>
								<button
									type="button"
									className="app-button app-button-secondary"
									onClick={() => void markCurrentViewDefault()}
								>
									<Bookmark size={15} />
									<span>{workflow.buttons.setDefault ?? 'Default'}</span>
								</button>
								<button
									type="button"
									className="app-button app-button-ghost"
									onClick={() => void deleteCurrentSavedView()}
								>
									<Trash2 size={15} />
									<span>{workflow.buttons.delete ?? 'Delete'}</span>
								</button>
							</>
						) : null}
					</div>
					{<WorkflowWorkspaceSearchResults model={model} />}
				</section>
			) : null}
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
					<WorkflowBoardTable model={model} />
				) : boardViewMode === 'calendar' ? (
					<WorkflowBoardCalendar model={model} />
				) : (
					<div className="workflow-board-layout">
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragStart={handleDragStart}
							onDragEnd={handleDragEnd}
							onDragCancel={() => {
								setDraggedTaskId(null);
								boardDragPointerRef.current.x = null;
								boardDragPointerRef.current.y = null;
							}}
						>
							<div className="workflow-board-lanes flex gap-4 overflow-x-auto pb-2">
								{tasksByStatus.map((column) => (
									<BoardColumn
										key={column.status}
										status={column.status}
										tasks={column.tasks}
										copy={workflow}
										labelForAction={labelFor}
										dateForAction={dateFor}
										onOpenAction={setSelectedTaskId}
										onArchiveAction={handleArchiveTask}
										quickAddOpen={quickAddColumn === column.status}
										quickAddTitle={quickAddColumn === column.status ? quickAddTitle : ''}
										quickAddUnavailableReason={quickAddUnavailableReason}
										quickAddProjects={availableQuickAddProjects}
										quickAddProjectId={quickAddProject ? String(quickAddProject.id) : ''}
										quickAddLoading={createTaskState.isLoading}
										canQuickAdd={variant === 'board' && availableQuickAddProjects.length > 0}
										onQuickAddOpenAction={(nextStatus) => {
											quickAddContext.current += 1;
											setQuickAddColumn(nextStatus);
											setQuickAddTitle('');
											setQuickAddProjectId(
												availableQuickAddProjects.length === 1 ? String(availableQuickAddProjects[0].id) : '',
											);
										}}
										onQuickAddTitleChangeAction={setQuickAddTitle}
										onQuickAddProjectChangeAction={setQuickAddProjectId}
										onQuickAddSubmitAction={handleQuickAddTask}
										onQuickAddCancelAction={() => {
											quickAddContext.current += 1;
											setQuickAddColumn(null);
											setQuickAddTitle('');
											setQuickAddProjectId('');
										}}
										showTime={isManager}
									/>
								))}
							</div>
							<DragOverlay style={{ pointerEvents: 'none' }}>
								{draggedTaskId ? (
									<div className="w-65 rotate-1 shadow-(--shadow-lg)">
										<TaskCardItem
											task={boardDraft.find((item) => item.id === draggedTaskId)!}
											compact
											copy={workflow}
											labelForAction={labelFor}
											dateForAction={dateFor}
											variant="board"
											showTime={isManager}
										/>
									</div>
								) : null}
							</DragOverlay>
						</DndContext>
					</div>
				)}
				{updateStatusState.isError || reorderTasksState.isError ? (
					<div className="mt-4 rounded-lg border border-(--accent) bg-(--accent-soft) px-4 py-3 text-sm font-semibold text-(--accent-strong)">
						{t.errors.unexpectedError}
					</div>
				) : null}
			</section>
		</div>
	);
};
