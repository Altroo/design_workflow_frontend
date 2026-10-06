'use client';
import { isTaskStatus } from '@/utils/workflow/workflowBoardHelpers';
import { Chip, EmptyState, FieldLabel } from '@/components/shared/workflow/workflowFields';
import { STATUS_COLUMNS } from '@/components/shared/workflow/boardAppearance';
import { WorkflowSelectField as SelectField } from '@/components/shared/workflow/workflowFormControls';
import { CheckCircle2, SlidersHorizontal } from 'lucide-react';
import type { WorkflowController } from '@/utils/workflow/hooks/useWorkflowController';
export const WorkflowBoardTable = ({
	model,
}: {
	model: Pick<
		WorkflowController,
		| 'workflow'
		| 'boardFilters'
		| 'updateBoardFiltersManually'
		| 'filteredBoardTasks'
		| 'setSelectedTaskId'
		| 'runPrimaryAction'
		| 'updateTaskStatus'
		| 'messageFor'
		| 'labelFor'
		| 'dateFor'
	>;
}) => {
	const {
		workflow,
		boardFilters,
		updateBoardFiltersManually,
		filteredBoardTasks,
		setSelectedTaskId,
		runPrimaryAction,
		updateTaskStatus,
		messageFor,
		labelFor,
		dateFor,
	} = model;
	return (
		<div className="workflow-board-table-view">
			<div className="workflow-board-table-controls">
				<div className="workflow-board-table-sort">
					<FieldLabel htmlFor="board-table-sort">{workflow.labels.tableSort}</FieldLabel>
					<SelectField
						id="board-table-sort"
						value={boardFilters.sort}
						onChangeAction={(value) => updateBoardFiltersManually((current) => ({ ...current, sort: value }))}
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
			</div>
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
								<tr key={taskItem.id} data-status={taskItem.status}>
									<td>
										<button
											type="button"
											onClick={() => setSelectedTaskId(taskItem.id)}
											className="workflow-board-table-task"
										>
											<b>{taskItem.title}</b>
											<span>
												{taskItem.labels
													.slice(0, 3)
													.map((label) => label.name)
													.join(', ') ||
													taskItem.description ||
													workflow.labels.noDescription}
											</span>
										</button>
									</td>
									<td>{taskItem.project.name}</td>
									<td>
										{taskItem.current_assignee
											? `${taskItem.current_assignee.first_name} ${taskItem.current_assignee.last_name}`
											: workflow.labels.unassigned}
									</td>
									<td>
										<SelectField
											value={taskItem.status}
											onChangeAction={(value) => {
												if (!isTaskStatus(value) || value === taskItem.status) return;
												void runPrimaryAction(
													async () => {
														await updateTaskStatus({ id: taskItem.id, status: value }).unwrap();
													},
													messageFor('Statut mis à jour avec succès.', 'Status updated successfully.'),
													messageFor('Impossible de mettre à jour le statut.', 'Could not update the status.'),
												);
											}}
											options={STATUS_COLUMNS.map((status) => ({ value: status, label: labelFor(status) }))}
											disabled={!taskItem.can_edit}
										/>
									</td>
									<td>
										<Chip
											tone={
												taskItem.review_state === 'approved'
													? 'progress'
													: taskItem.review_state === 'changes_requested'
														? 'urgent'
														: taskItem.review_state === 'needs_review'
															? 'warning'
															: 'neutral'
											}
										>
											{labelFor(taskItem.review_state)}
										</Chip>
									</td>
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
		</div>
	);
};
