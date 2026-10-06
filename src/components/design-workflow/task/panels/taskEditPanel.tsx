'use client';
import { Area, Field, FieldLabel, Surface, WorkDaysField } from '@/components/shared/workflow/workflowFields';
import { STATUS_COLUMNS } from '@/components/shared/workflow/boardAppearance';
import {
	WorkflowDateField as DateField,
	WorkflowSelectField as SelectField,
} from '@/components/shared/workflow/workflowFormControls';
import type { TaskCard, TaskStatus } from '@/types/designWorkflowTypes';
import { PRIORITY_OPTIONS } from '@/utils/rawData';
import { ArrowRight, CheckCircle2, CircleAlert, ListTodo, MessagesSquare, Pencil, Users } from 'lucide-react';
import type { TaskDetailModel } from '@/components/design-workflow/task/model/taskDetailModel';
export const TaskEditPanel = ({
	model,
}: {
	model: Pick<
		TaskDetailModel,
		| 'workflow'
		| 'isManager'
		| 'taskEditForm'
		| 'setTaskEditForm'
		| 'assignableUsers'
		| 'mentionableUsers'
		| 'labelFor'
		| 'runPrimaryAction'
		| 'updateTask'
		| 'task'
		| 'taskUpdatePayload'
		| 'messageFor'
		| 'updateTaskState'
		| 'updateTaskStatus'
		| 'updateStatusState'
	>;
}) => {
	const {
		workflow,
		isManager,
		taskEditForm,
		setTaskEditForm,
		assignableUsers,
		mentionableUsers,
		labelFor,
		runPrimaryAction,
		updateTask,
		task,
		taskUpdatePayload,
		messageFor,
		updateTaskState,
		updateTaskStatus,
		updateStatusState,
	} = model;
	return (
		<Surface
			className="workflow-task-detail-panel workflow-task-edit-panel"
			title={workflow.sections.editTask.title}
			description={isManager ? workflow.labels.managerControls : workflow.labels.updateMyProgress}
		>
			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<FieldLabel>{workflow.labels.title}</FieldLabel>
					<Field
						value={taskEditForm.title}
						onChangeAction={(value) => setTaskEditForm((current) => ({ ...current, title: value }))}
						startIcon={<ListTodo size={18} />}
					/>
				</div>
				<div>
					<FieldLabel>{workflow.labels.assignee}</FieldLabel>
					<SelectField
						value={taskEditForm.current_assignee_id}
						onChangeAction={(value) => setTaskEditForm((current) => ({ ...current, current_assignee_id: value }))}
						options={[
							{ value: '', label: workflow.labels.unassigned },
							...assignableUsers.map((user) => ({
								value: user.id,
								label: `${user.first_name} ${user.last_name}`,
							})),
						]}
						startIcon={<Users size={18} />}
					/>
				</div>
				<div className="md:col-span-2">
					<FieldLabel>{workflow.labels.description}</FieldLabel>
					<Area
						value={taskEditForm.description}
						onChangeAction={(value) => setTaskEditForm((current) => ({ ...current, description: value }))}
						mentionUsers={mentionableUsers}
						startIcon={<MessagesSquare size={18} />}
					/>
				</div>
				<div>
					<FieldLabel htmlFor="task-edit-status">{workflow.labels.status}</FieldLabel>
					<SelectField
						id="task-edit-status"
						value={taskEditForm.status}
						onChangeAction={(value) => setTaskEditForm((current) => ({ ...current, status: value as TaskStatus }))}
						options={STATUS_COLUMNS.map((item) => ({ value: item, label: labelFor(item) }))}
						startIcon={<ListTodo size={18} />}
					/>
				</div>
				<div>
					<FieldLabel>{workflow.labels.priority}</FieldLabel>
					<SelectField
						value={taskEditForm.priority}
						onChangeAction={(value) =>
							setTaskEditForm((current) => ({ ...current, priority: value as TaskCard['priority'] }))
						}
						options={PRIORITY_OPTIONS.map((item) => ({ value: item, label: labelFor(item) }))}
						startIcon={<CircleAlert size={18} />}
					/>
				</div>
				<div>
					<FieldLabel>{workflow.labels.dueDate}</FieldLabel>
					<DateField
						value={taskEditForm.due_date}
						onChangeAction={(value) => setTaskEditForm((current) => ({ ...current, due_date: value }))}
					/>
				</div>
				{isManager ? (
					<div>
						<FieldLabel>{workflow.labels.estimatedMinutes}</FieldLabel>
						<WorkDaysField
							value={taskEditForm.estimated_minutes}
							onChangeAction={(value) => setTaskEditForm((current) => ({ ...current, estimated_minutes: value }))}
						/>
					</div>
				) : null}
				<div>
					<FieldLabel>{workflow.labels.sortOrder}</FieldLabel>
					<Field
						type="number"
						min={0}
						value={taskEditForm.sort_order}
						onChangeAction={(value) => setTaskEditForm((current) => ({ ...current, sort_order: value }))}
						startIcon={<ArrowRight size={18} />}
					/>
				</div>
				<div>
					<FieldLabel htmlFor="task-blocked-reason">{workflow.labels.blockedReason}</FieldLabel>
					<Field
						id="task-blocked-reason"
						value={taskEditForm.blocked_reason}
						onChangeAction={(value) => setTaskEditForm((current) => ({ ...current, blocked_reason: value }))}
						placeholder={workflow.labels.blockedReasonPlaceholder}
						startIcon={<CircleAlert size={18} />}
					/>
				</div>
			</div>
			<div className="mt-5 flex flex-wrap gap-3">
				<button
					type="button"
					onClick={() =>
						void runPrimaryAction(
							async () => {
								await updateTask({
									id: task.id,
									data: taskUpdatePayload(isManager),
								}).unwrap();
							},
							messageFor('Tâche enregistrée avec succès.', 'Task saved successfully.'),
							messageFor('Impossible d’enregistrer la tâche.', 'Could not save the task.'),
						)
					}
					className="app-button"
				>
					<Pencil size={16} />
					<span>{updateTaskState.isLoading ? workflow.buttons.saving : workflow.buttons.saveTask}</span>
				</button>
				{!isManager ? (
					<button
						type="button"
						onClick={() =>
							void runPrimaryAction(
								async () => {
									await updateTaskStatus({
										id: task.id,
										status: taskEditForm.status,
										blocked_reason: taskEditForm.blocked_reason,
										sort_order: Number(taskEditForm.sort_order || 0),
									}).unwrap();
								},
								messageFor('Statut mis à jour avec succès.', 'Status updated successfully.'),
								messageFor('Impossible de mettre à jour le statut.', 'Could not update the status.'),
							)
						}
						className="app-button app-button-secondary"
					>
						<CheckCircle2 size={16} />
						<span>{updateStatusState.isLoading ? workflow.buttons.updating : workflow.buttons.updateStatus}</span>
					</button>
				) : null}
			</div>
		</Surface>
	);
};
