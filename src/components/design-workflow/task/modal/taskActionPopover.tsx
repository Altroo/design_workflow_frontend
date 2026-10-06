'use client';
import { DeferredHexColorPicker, Field, FieldLabel } from '@/components/shared/workflow/workflowFields';
import { WorkflowSelectField as SelectField } from '@/components/shared/workflow/workflowFormControls';
import { CheckCircle2, ImagePlus, ListTodo, MessagesSquare, Pencil, Plus, Tag, Users, X } from 'lucide-react';
import type { TaskDetailModel } from '@/components/design-workflow/task/model/taskDetailModel';
export const TaskActionPopover = ({
	model,
}: {
	model: Pick<
		TaskDetailModel,
		| 'taskAddPanel'
		| 'addOptions'
		| 'setTaskAddPanel'
		| 'setModalLabelComposerOpen'
		| 'setEditingLabelId'
		| 't'
		| 'labels'
		| 'task'
		| 'updateTask'
		| 'workflowDataReady'
		| 'setEditingLabelName'
		| 'setEditingLabelColor'
		| 'workflow'
		| 'modalLabelComposerOpen'
		| 'newLabelName'
		| 'setNewLabelName'
		| 'newLabelColor'
		| 'setNewLabelColor'
		| 'runPrimaryAction'
		| 'createLabel'
		| 'messageFor'
		| 'editingLabelId'
		| 'editingLabelName'
		| 'editingLabelColor'
		| 'updateLabelState'
		| 'updateLabel'
		| 'newChecklistGroupTitle'
		| 'setNewChecklistGroupTitle'
		| 'checklistTemplates'
		| 'selectedChecklistTemplate'
		| 'selectChecklistTemplate'
		| 'activeChecklistTemplate'
		| 'createChecklistForTask'
		| 'addChecklistState'
		| 'taskCoverLabel'
		| 'setTaskCoverLabel'
		| 'coverInputId'
		| 'setTaskCoverFile'
		| 'taskCoverFile'
		| 'isPreparingTaskCover'
		| 'handleUploadTaskCover'
		| 'uploadTaskCoverState'
		| 'renderTaskAttachmentPicker'
		| 'attachmentInputId'
		| 'reassignForm'
		| 'setReassignForm'
		| 'assignableUsers'
		| 'isManager'
		| 'validReassignAssigneeSelected'
		| 'reassignTask'
		| 'reassignTaskState'
	>;
}) => {
	const {
		taskAddPanel,
		addOptions,
		setTaskAddPanel,
		setModalLabelComposerOpen,
		setEditingLabelId,
		t,
		labels,
		task,
		updateTask,
		workflowDataReady,
		setEditingLabelName,
		setEditingLabelColor,
		workflow,
		modalLabelComposerOpen,
		newLabelName,
		setNewLabelName,
		newLabelColor,
		setNewLabelColor,
		runPrimaryAction,
		createLabel,
		messageFor,
		editingLabelId,
		editingLabelName,
		editingLabelColor,
		updateLabelState,
		updateLabel,
		newChecklistGroupTitle,
		setNewChecklistGroupTitle,
		checklistTemplates,
		selectedChecklistTemplate,
		selectChecklistTemplate,
		activeChecklistTemplate,
		createChecklistForTask,
		addChecklistState,
		taskCoverLabel,
		setTaskCoverLabel,
		coverInputId,
		setTaskCoverFile,
		taskCoverFile,
		isPreparingTaskCover,
		handleUploadTaskCover,
		uploadTaskCoverState,
		renderTaskAttachmentPicker,
		attachmentInputId,
		reassignForm,
		setReassignForm,
		assignableUsers,
		isManager,
		validReassignAssigneeSelected,
		reassignTask,
		reassignTaskState,
	} = model;
	return (
		<div
			className="workflow-trello-modal-floating-panel"
			data-panel={taskAddPanel}
			role="region"
			aria-label={addOptions.find((option) => option.key === taskAddPanel)?.title}
		>
			<div className="workflow-trello-modal-floating-head">
				<p>{addOptions.find((option) => option.key === taskAddPanel)?.title}</p>
				<button
					type="button"
					onClick={() => {
						setTaskAddPanel(null);
						setModalLabelComposerOpen(false);
						setEditingLabelId(null);
					}}
					aria-label={t.common.close}
				>
					<X size={16} />
				</button>
			</div>
			{taskAddPanel === 'labels' ? (
				<div className="workflow-trello-modal-floating-body">
					<div className="workflow-trello-modal-label-picker">
						{labels.map((label) => {
							const active = task.labels.some((item) => item.id === label.id);
							return (
								<div key={label.id} className="workflow-trello-modal-label-row">
									<button
										type="button"
										data-active={active}
										onClick={() => {
											if (!active)
												void updateTask({
													id: task.id,
													data: { label_ids: [...task.labels.map((item) => item.id), label.id] },
												});
										}}
									>
										<span
											style={{
												backgroundColor: /^#[0-9a-f]{6}$/i.test(label.color) ? label.color : '#4f46e5',
											}}
										/>
										{label.name}
										{active ? <CheckCircle2 size={14} /> : null}
									</button>
									{workflowDataReady ? (
										<button
											type="button"
											className="workflow-trello-modal-label-edit-button"
											aria-label={`${t.common.edit}: ${label.name}`}
											onClick={() => {
												setEditingLabelId(label.id);
												setEditingLabelName(label.name);
												setEditingLabelColor(label.color);
												setModalLabelComposerOpen(false);
											}}
										>
											<Pencil size={14} />
										</button>
									) : null}
								</div>
							);
						})}
					</div>
					{labels.length === 0 ? (
						<div className="workflow-trello-modal-empty-line">{workflow.labels.noLabelYet ?? 'No label yet'}</div>
					) : null}
					{!modalLabelComposerOpen ? (
						<button
							type="button"
							className="workflow-trello-modal-secondary-action"
							onClick={() => {
								setEditingLabelId(null);
								setModalLabelComposerOpen(true);
							}}
						>
							<Plus size={16} />
							<span>{workflow.labels.newLabel ?? 'New label'}</span>
						</button>
					) : null}
					{modalLabelComposerOpen ? (
						<div className="workflow-trello-modal-label-create">
							<Field
								value={newLabelName}
								onChangeAction={setNewLabelName}
								placeholder={workflow.labels.newLabelPlaceholder ?? 'New label'}
								startIcon={<Tag size={16} />}
							/>
							<div>
								<DeferredHexColorPicker
									key={`new-label-${newLabelColor}`}
									value={newLabelColor}
									onCommitAction={setNewLabelColor}
								/>
								<button
									type="button"
									className="workflow-trello-modal-label-edit-cancel"
									onClick={() => {
										setNewLabelName('');
										setModalLabelComposerOpen(false);
									}}
								>
									{t.common.cancel}
								</button>
								<button
									type="button"
									disabled={!newLabelName.trim()}
									onClick={() =>
										void runPrimaryAction(
											async () => {
												const label = await createLabel({
													name: newLabelName.trim(),
													color: newLabelColor,
												}).unwrap();
												await updateTask({
													id: task.id,
													data: { label_ids: [...task.labels.map((item) => item.id), label.id] },
												}).unwrap();
												setNewLabelName('');
												setModalLabelComposerOpen(false);
											},
											messageFor('Étiquette ajoutée avec succès.', 'Label added successfully.'),
											messageFor('Impossible d’ajouter l’étiquette.', 'Could not add the label.'),
										)
									}
								>
									{t.common.add}
								</button>
							</div>
						</div>
					) : null}
					{editingLabelId ? (
						<div className="workflow-trello-modal-label-create workflow-trello-modal-label-edit">
							<Field
								value={editingLabelName}
								onChangeAction={setEditingLabelName}
								placeholder={workflow.labels.newLabelPlaceholder ?? 'Label name'}
								startIcon={<Tag size={16} />}
							/>
							<div>
								<DeferredHexColorPicker
									key={`edit-label-${editingLabelId}-${editingLabelColor}`}
									value={editingLabelColor}
									onCommitAction={setEditingLabelColor}
								/>
								<div className="workflow-trello-modal-label-edit-actions">
									<button
										type="button"
										className="workflow-trello-modal-label-edit-cancel"
										onClick={() => setEditingLabelId(null)}
									>
										{t.common.cancel}
									</button>
									<button
										type="button"
										disabled={!editingLabelName.trim() || updateLabelState.isLoading}
										onClick={() =>
											void runPrimaryAction(
												async () => {
													await updateLabel({
														id: editingLabelId,
														data: { name: editingLabelName.trim(), color: editingLabelColor },
													}).unwrap();
													setEditingLabelId(null);
												},
												messageFor('Étiquette modifiée avec succès.', 'Label updated successfully.'),
												messageFor('Impossible de modifier l’étiquette.', 'Could not update the label.'),
											)
										}
									>
										{updateLabelState.isLoading ? workflow.buttons.saving : t.common.save}
									</button>
								</div>
							</div>
						</div>
					) : null}
				</div>
			) : null}
			{taskAddPanel === 'checklist' ? (
				<div className="workflow-trello-modal-floating-body">
					<FieldLabel>{workflow.labels.checklistTitle ?? 'Checklist title'}</FieldLabel>
					<Field
						value={newChecklistGroupTitle}
						onChangeAction={setNewChecklistGroupTitle}
						placeholder={workflow.labels.checklistPanel ?? 'Checklist'}
						startIcon={<ListTodo size={16} />}
					/>
					<div className="workflow-checklist-template-picker">
						<p>{workflow.labels.checklistTemplates ?? 'Templates'}</p>
						<div>
							{checklistTemplates.map((template) => (
								<button
									key={template.key}
									type="button"
									data-active={selectedChecklistTemplate === template.key}
									onClick={() => selectChecklistTemplate(template)}
								>
									<b>{template.title}</b>
									<small>{template.description}</small>
								</button>
							))}
						</div>
						{activeChecklistTemplate ? (
							<ul>
								{activeChecklistTemplate.items.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						) : null}
					</div>
					<button type="button" className="workflow-trello-modal-save" onClick={createChecklistForTask}>
						{addChecklistState.isLoading ? workflow.buttons.saving : t.common.add}
					</button>
				</div>
			) : null}
			{taskAddPanel === 'cover' || taskAddPanel === 'attachments' ? (
				<div className="workflow-trello-modal-floating-body">
					{taskAddPanel === 'cover' ? (
						<div className="workflow-trello-modal-upload-row">
							<div className="workflow-media-label-field">
								<Field
									value={taskCoverLabel}
									onChangeAction={setTaskCoverLabel}
									placeholder={workflow.labels.coverImageLabelPlaceholder ?? 'Décrivez cette image'}
								/>
							</div>
							<input
								id={`${coverInputId}-floating`}
								type="file"
								accept="image/*"
								onChange={(event) => setTaskCoverFile(event.target.files?.[0] ?? null)}
								className="workflow-hidden-file-input"
							/>
							<label htmlFor={`${coverInputId}-floating`}>
								<ImagePlus size={16} />
								{taskCoverFile?.name ?? workflow.labels.cardImage ?? 'Card image'}
							</label>
							<button
								type="button"
								disabled={!taskCoverFile || !taskCoverLabel.trim() || isPreparingTaskCover}
								onClick={() => void handleUploadTaskCover(task.id)}
							>
								{uploadTaskCoverState.isLoading || isPreparingTaskCover ? workflow.buttons.saving : t.common.add}
							</button>
						</div>
					) : null}
					{taskAddPanel === 'attachments' ? renderTaskAttachmentPicker(task.id, `${attachmentInputId}-floating`) : null}
				</div>
			) : null}
			{taskAddPanel === 'members' ? (
				<div className="workflow-trello-modal-floating-body workflow-trello-modal-floating-grid">
					<SelectField
						value={reassignForm.assignee_id}
						onChangeAction={(value) => setReassignForm((current) => ({ ...current, assignee_id: value }))}
						ariaLabel={workflow.labels.assignee}
						options={[
							{ value: '', label: workflow.labels.assignee },
							...assignableUsers.map((user) => ({
								value: user.id,
								label: `${user.first_name} ${user.last_name}`,
							})),
						]}
						startIcon={<Users size={18} />}
						placeholder={workflow.labels.assignee}
					/>
					<Field
						value={reassignForm.reason}
						onChangeAction={(value) => setReassignForm((current) => ({ ...current, reason: value }))}
						placeholder={workflow.labels.reassignReasonPlaceholder}
						startIcon={<MessagesSquare size={18} />}
					/>
					<button
						type="button"
						disabled={!isManager || !validReassignAssigneeSelected || !reassignForm.reason.trim()}
						className="workflow-trello-modal-save"
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
					>
						{reassignTaskState.isLoading ? workflow.buttons.moving : workflow.buttons.reassign}
					</button>
				</div>
			) : null}
		</div>
	);
};
