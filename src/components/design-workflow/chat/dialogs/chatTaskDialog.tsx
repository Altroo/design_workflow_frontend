'use client';
import AiAssistantControl from '@/components/shared/aiAssistantControl/aiAssistantControl';
import { userLabel } from '@/utils/workflow/chatHelpers';
import { WorkflowSearchSelect } from '@/components/shared/workflow/workflowSearchSelect';
import { BriefcaseBusiness, CheckSquare2 } from 'lucide-react';
import type { ChatController } from '@/utils/workflow/hooks/useChatController';
export const ChatTaskDialog = ({
	model,
}: {
	model: Pick<
		ChatController,
		| 'setTaskModalOpen'
		| 'submitTaskFromMessage'
		| 't'
		| 'taskSourceMessage'
		| 'pendingActionSources'
		| 'actionSourcePreview'
		| 'taskDraft'
		| 'setTaskDraft'
		| 'writableProjects'
		| 'createTaskState'
	>;
}) => {
	const {
		setTaskModalOpen,
		submitTaskFromMessage,
		t,
		taskSourceMessage,
		pendingActionSources,
		actionSourcePreview,
		taskDraft,
		setTaskDraft,
		writableProjects,
		createTaskState,
	} = model;
	return (
		<div className="workflow-chat-create-modal" onClick={() => setTaskModalOpen(false)}>
			<form
				className="workflow-chat-create-card"
				onClick={(event) => event.stopPropagation()}
				onSubmit={(event) => {
					event.preventDefault();
					void submitTaskFromMessage();
				}}
			>
				<div className="workflow-chat-create-head">
					<span>
						<CheckSquare2 size={18} />
					</span>
					<div>
						<p>{t.workflow.buttons.createTaskFromMessage ?? 'Create task from message'}</p>
						<small>
							{taskSourceMessage
								? taskSourceMessage.is_deleted || pendingActionSources.has(taskSourceMessage.id)
									? actionSourcePreview(taskSourceMessage)
									: userLabel(taskSourceMessage.sender)
								: (t.workflow.labels.selectedText ?? 'Selected text')}
						</small>
					</div>
				</div>
				<label className="workflow-form-field">
					<span>{t.workflow.labels.taskTitle}</span>
					<input
						value={taskDraft.title}
						maxLength={255}
						onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
						className="app-input"
					/>
				</label>
				<AiAssistantControl
					value={taskDraft.title}
					onApply={(title) => setTaskDraft((current) => ({ ...current, title }))}
					context="task_title"
					maxLength={255}
					disabled={createTaskState.isLoading}
				/>
				<label className="workflow-form-field">
					<span>{t.workflow.labels.project}</span>
					<WorkflowSearchSelect
						value={taskDraft.projectId}
						onChangeAction={(value) => setTaskDraft((current) => ({ ...current, projectId: value }))}
						options={[
							{ value: '', label: t.workflow.labels.selectProject ?? 'Select a project' },
							...writableProjects.map((project) => ({ value: project.id, label: project.name })),
						]}
						startIcon={<BriefcaseBusiness size={16} />}
						ariaLabel={t.workflow.labels.project}
					/>
				</label>
				<label className="workflow-form-field">
					<span>{t.workflow.labels.description}</span>
					<textarea
						value={taskDraft.description}
						onChange={(event) => setTaskDraft((current) => ({ ...current, description: event.target.value }))}
						rows={5}
						className="app-input resize-none"
					/>
				</label>
				<AiAssistantControl
					value={taskDraft.description}
					onApply={(description) => setTaskDraft((current) => ({ ...current, description }))}
					context="task_description"
					disabled={createTaskState.isLoading}
				/>
				<div className="workflow-chat-create-actions">
					<button type="button" className="app-button app-button-ghost" onClick={() => setTaskModalOpen(false)}>
						{t.common.cancel}
					</button>
					<button
						type="submit"
						className="app-button"
						disabled={
							createTaskState.isLoading ||
							Boolean(
								taskSourceMessage && (taskSourceMessage.is_deleted || pendingActionSources.has(taskSourceMessage.id)),
							) ||
							!taskDraft.title.trim() ||
							!taskDraft.projectId ||
							!writableProjects.some((project) => String(project.id) === taskDraft.projectId)
						}
					>
						<CheckSquare2 size={16} />
						{t.workflow.buttons.createTask ?? 'Create task'}
					</button>
				</div>
			</form>
		</div>
	);
};
