'use client';
import { Field, FieldLabel, Surface } from '@/components/shared/workflow/workflowFields';
import { WorkflowSelectField as SelectField } from '@/components/shared/workflow/workflowFormControls';
import { ArrowRight, MessagesSquare, Users } from 'lucide-react';
import type { TaskDetailModel } from '@/components/design-workflow/task/model/taskDetailModel';
export const TaskReassignPanel = ({
	model,
}: {
	model: Pick<
		TaskDetailModel,
		| 'workflow'
		| 'reassignForm'
		| 'setReassignForm'
		| 'assignableUsers'
		| 'runPrimaryAction'
		| 'reassignTask'
		| 'task'
		| 'messageFor'
		| 'validReassignAssigneeSelected'
		| 'reassignTaskState'
	>;
}) => {
	const {
		workflow,
		reassignForm,
		setReassignForm,
		assignableUsers,
		runPrimaryAction,
		reassignTask,
		task,
		messageFor,
		validReassignAssigneeSelected,
		reassignTaskState,
	} = model;
	return (
		<Surface className="workflow-task-detail-panel workflow-task-reassign-panel" {...workflow.sections.reassignTask}>
			<div className="grid gap-4 md:grid-cols-[0.32fr_1fr_auto]">
				<div>
					<FieldLabel htmlFor="new-assignee">{workflow.labels.newAssignee}</FieldLabel>
					<SelectField
						id="new-assignee"
						value={reassignForm.assignee_id}
						onChangeAction={(value) => setReassignForm((current) => ({ ...current, assignee_id: value }))}
						options={assignableUsers.map((user) => ({
							value: user.id,
							label: `${user.first_name} ${user.last_name}`,
						}))}
						startIcon={<Users size={18} />}
						placeholder={workflow.labels.assignee}
					/>
				</div>
				<div>
					<FieldLabel htmlFor="reassign-reason">{workflow.labels.reason}</FieldLabel>
					<Field
						ai="reassignment_reason"
						id="reassign-reason"
						value={reassignForm.reason}
						onChangeAction={(value) => setReassignForm((current) => ({ ...current, reason: value }))}
						placeholder={workflow.labels.reassignReasonPlaceholder}
						startIcon={<MessagesSquare size={18} />}
					/>
				</div>
				<div className="self-end">
					<button
						type="button"
						onClick={() =>
							void runPrimaryAction(
								async () => {
									await reassignTask({
										id: task.id,
										assignee_id: Number(reassignForm.assignee_id),
										reason: reassignForm.reason.trim(),
									}).unwrap();
									setReassignForm((current) => ({ ...current, reason: '' }));
								},
								messageFor('Tâche réassignée avec succès.', 'Task reassigned successfully.'),
								messageFor('Impossible de réassigner la tâche.', 'Could not reassign the task.'),
							)
						}
						disabled={!validReassignAssigneeSelected || !reassignForm.reason.trim()}
						className="app-button"
					>
						<ArrowRight size={16} />
						<span>{reassignTaskState.isLoading ? workflow.buttons.moving : workflow.buttons.reassign}</span>
					</button>
				</div>
			</div>
		</Surface>
	);
};
