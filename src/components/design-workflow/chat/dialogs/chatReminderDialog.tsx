'use client';
import { WorkflowDateField, WorkflowSelectField } from '@/components/shared/workflow/workflowFormControls';
import { REMINDER_TIME_OPTIONS } from '@/utils/rawData';
import { AlarmClock, Clock3, ListTodo } from 'lucide-react';
import type { ChatController } from '@/utils/workflow/hooks/useChatController';
export const ChatReminderDialog = ({
	model,
}: {
	model: Pick<
		ChatController,
		| 'setReminderMessage'
		| 'submitReminder'
		| 't'
		| 'actionSourcePreview'
		| 'reminderMessage'
		| 'reminderDraft'
		| 'setReminderDraft'
		| 'tasks'
		| 'pendingActionSources'
	>;
}) => {
	const {
		setReminderMessage,
		submitReminder,
		t,
		actionSourcePreview,
		reminderMessage,
		reminderDraft,
		setReminderDraft,
		tasks,
		pendingActionSources,
	} = model;
	if (!reminderMessage) return null;
	return (
		<div className="workflow-chat-create-modal" onClick={() => setReminderMessage(null)}>
			<form
				className="workflow-chat-create-card"
				onClick={(event) => event.stopPropagation()}
				onSubmit={(event) => {
					event.preventDefault();
					void submitReminder();
				}}
			>
				<div className="workflow-chat-create-head">
					<span>
						<AlarmClock size={18} />
					</span>
					<div>
						<p>{t.workflow.buttons.addReminder ?? 'Add reminder'}</p>
						<small>{actionSourcePreview(reminderMessage)}</small>
					</div>
				</div>
				<label className="workflow-form-field">
					<span>{t.workflow.labels.task ?? 'Task'}</span>
					<WorkflowSelectField
						value={reminderDraft.taskId}
						onChangeAction={(value) => setReminderDraft((current) => ({ ...current, taskId: value }))}
						options={[
							{ value: '', label: t.workflow.labels.noTask ?? 'No task' },
							...tasks.map((task) => ({ value: task.id, label: task.title })),
						]}
						startIcon={<ListTodo size={16} />}
						ariaLabel={t.workflow.labels.task ?? 'Task'}
					/>
				</label>
				<div className="workflow-form-field">
					<span>{t.workflow.labels.remindAt ?? 'Remind at'}</span>
					<div className="workflow-chat-reminder-datetime">
						<div>
							<small>{t.workflow.labels.dateLabel ?? 'Date'}</small>
							<WorkflowDateField
								value={reminderDraft.remindDate}
								onChangeAction={(value) => setReminderDraft((current) => ({ ...current, remindDate: value }))}
								placeholder={t.workflow.labels.dateLabel ?? 'Date'}
								ariaLabel={t.workflow.labels.dateLabel ?? 'Date'}
								clearLabel={t.common.clearSelection}
							/>
						</div>
						<div>
							<small>{t.workflow.labels.timeLabel ?? 'Time'}</small>
							<WorkflowSelectField
								value={reminderDraft.remindTime}
								onChangeAction={(value) => setReminderDraft((current) => ({ ...current, remindTime: value }))}
								options={[{ value: '', label: t.workflow.labels.timeLabel ?? 'Time' }, ...REMINDER_TIME_OPTIONS]}
								startIcon={<Clock3 size={16} />}
								ariaLabel={t.workflow.labels.timeLabel ?? 'Time'}
							/>
						</div>
					</div>
				</div>
				<label className="workflow-form-field">
					<span>{t.workflow.labels.note ?? 'Note'}</span>
					<input
						value={reminderDraft.note}
						onChange={(event) => setReminderDraft((current) => ({ ...current, note: event.target.value }))}
						className="app-input"
					/>
				</label>
				<div className="workflow-chat-create-actions">
					<button type="button" className="app-button app-button-ghost" onClick={() => setReminderMessage(null)}>
						{t.common.cancel}
					</button>
					<button
						type="submit"
						className="app-button"
						disabled={reminderMessage.is_deleted || pendingActionSources.has(reminderMessage.id)}
					>
						<AlarmClock size={16} />
						{t.workflow.buttons.addReminder ?? 'Add reminder'}
					</button>
				</div>
			</form>
		</div>
	);
};
