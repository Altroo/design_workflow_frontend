'use client';
import { Chip, DeferredHexColorPicker, Field, FieldLabel, Surface } from '@/components/shared/workflow/workflowFields';
import { cn, formatFileSize, isImageAttachment, resolveMediaUrl } from '@/utils/workflow/workflowFormatting';
import { WorkflowSelectField as SelectField } from '@/components/shared/workflow/workflowFormControls';
import {
	Archive,
	ArrowRight,
	CheckCircle2,
	ImagePlus,
	ListTodo,
	MessagesSquare,
	Palette,
	Paperclip,
	Plus,
	Tag,
	Trash2,
	Users,
	X,
} from 'lucide-react';
import Image from 'next/image';
import { TaskAttachmentName } from '@/components/design-workflow/task/attachments/taskAttachmentName';
import type { TaskDetailModel } from '@/components/design-workflow/task/model/taskDetailModel';
export const TaskToolsPanel = ({
	model,
}: {
	model: Pick<
		TaskDetailModel,
		| 'workflow'
		| 'toggleTaskAddPanel'
		| 'taskAddPanel'
		| 'showChecklistPanel'
		| 'checklistProgress'
		| 'checklistDoneCount'
		| 'task'
		| 'checklistGroups'
		| 'newChecklistGroupTitle'
		| 'setNewChecklistGroupTitle'
		| 'checklistTemplates'
		| 'selectedChecklistTemplate'
		| 'selectChecklistTemplate'
		| 'activeChecklistTemplate'
		| 'createChecklistForTask'
		| 'addChecklistState'
		| 't'
		| 'newChecklistItemsByChecklist'
		| 'taskMutable'
		| 'runPrimaryAction'
		| 'deleteChecklist'
		| 'setNewChecklistItemsByChecklist'
		| 'messageFor'
		| 'updateChecklistItem'
		| 'deleteChecklistItem'
		| 'addChecklistItemToGroup'
		| 'addChecklistItemState'
		| 'showLabelsPanel'
		| 'workflowDataReady'
		| 'updateTask'
		| 'labels'
		| 'newLabelColor'
		| 'newLabelName'
		| 'setNewLabelName'
		| 'setNewLabelColor'
		| 'createLabel'
		| 'showAttachmentsPanel'
		| 'taskMediaMutable'
		| 'taskCoverLabel'
		| 'setTaskCoverLabel'
		| 'coverInputId'
		| 'setTaskCoverFile'
		| 'taskCoverFile'
		| 'isPreparingTaskCover'
		| 'handleUploadTaskCover'
		| 'uploadTaskCoverState'
		| 'setMediaDeleteTarget'
		| 'openAttachmentPreview'
		| 'handleSetAttachmentAsCover'
		| 'setTaskCoverFromAttachmentState'
		| 'renderTaskAttachmentPicker'
		| 'attachmentInputId'
		| 'isManager'
		| 'reassignForm'
		| 'setReassignForm'
		| 'assignableUsers'
		| 'reassignTask'
		| 'validReassignAssigneeSelected'
		| 'reassignTaskState'
		| 'taskRestoreLocked'
		| 'archiveTask'
	>;
}) => {
	const {
		workflow,
		toggleTaskAddPanel,
		taskAddPanel,
		showChecklistPanel,
		checklistProgress,
		checklistDoneCount,
		task,
		checklistGroups,
		newChecklistGroupTitle,
		setNewChecklistGroupTitle,
		checklistTemplates,
		selectedChecklistTemplate,
		selectChecklistTemplate,
		activeChecklistTemplate,
		createChecklistForTask,
		addChecklistState,
		t,
		newChecklistItemsByChecklist,
		taskMutable,
		runPrimaryAction,
		deleteChecklist,
		setNewChecklistItemsByChecklist,
		messageFor,
		updateChecklistItem,
		deleteChecklistItem,
		addChecklistItemToGroup,
		addChecklistItemState,
		showLabelsPanel,
		workflowDataReady,
		updateTask,
		labels,
		newLabelColor,
		newLabelName,
		setNewLabelName,
		setNewLabelColor,
		createLabel,
		showAttachmentsPanel,
		taskMediaMutable,
		taskCoverLabel,
		setTaskCoverLabel,
		coverInputId,
		setTaskCoverFile,
		taskCoverFile,
		isPreparingTaskCover,
		handleUploadTaskCover,
		uploadTaskCoverState,
		setMediaDeleteTarget,
		openAttachmentPreview,
		handleSetAttachmentAsCover,
		setTaskCoverFromAttachmentState,
		renderTaskAttachmentPicker,
		attachmentInputId,
		isManager,
		reassignForm,
		setReassignForm,
		assignableUsers,
		reassignTask,
		validReassignAssigneeSelected,
		reassignTaskState,
		taskRestoreLocked,
		archiveTask,
	} = model;
	return (
		<Surface
			className="workflow-task-detail-panel workflow-task-tools-panel workflow-trello-tools-panel"
			title={workflow.labels.cardActions ?? 'Card actions'}
		>
			<div className="workflow-trello-action-row">
				<button
					type="button"
					onClick={() => toggleTaskAddPanel('labels')}
					className="workflow-trello-action-button workflow-trello-action-button-primary"
					data-active={taskAddPanel === 'labels'}
				>
					<Tag size={16} />
					<span>{workflow.labels.labelsPanel ?? 'Étiquettes'}</span>
				</button>
				<button
					type="button"
					onClick={() => toggleTaskAddPanel('cover')}
					className="workflow-trello-action-button"
					data-active={taskAddPanel === 'cover'}
				>
					<ImagePlus size={16} />
					<span>{workflow.labels.cardImage ?? 'Image de carte'}</span>
				</button>
				<button
					type="button"
					onClick={() => toggleTaskAddPanel('attachments')}
					className="workflow-trello-action-button"
					data-active={taskAddPanel === 'attachments'}
				>
					<Paperclip size={16} />
					<span>{workflow.labels.attachmentsPanel ?? 'Pièces jointes'}</span>
				</button>
				<button
					type="button"
					onClick={() => toggleTaskAddPanel('checklist')}
					className="workflow-trello-action-button"
					data-active={taskAddPanel === 'checklist'}
				>
					<CheckCircle2 size={16} />
					<span>{workflow.labels.checklistPanel ?? 'Checklist'}</span>
				</button>
				<button
					type="button"
					onClick={() => toggleTaskAddPanel('members')}
					className="workflow-trello-action-button"
					data-active={taskAddPanel === 'members'}
				>
					<Users size={16} />
					<span>{workflow.labels.membersPanel ?? 'Members'}</span>
				</button>
			</div>
			<div className="workflow-task-tools-board">
				{showChecklistPanel ? (
					<div className="app-card-muted workflow-checklist-card workflow-tool-card-primary">
						<div className="workflow-tool-card-heading workflow-tool-card-heading-large">
							<div className="flex min-w-0 items-center gap-3">
								<span className="workflow-tool-icon workflow-tool-icon-green">
									<CheckCircle2 size={17} />
								</span>
								<div className="min-w-0">
									<p>{workflow.labels.checklistPanel ?? 'Checklist'}</p>
									<span>
										{Math.round(checklistProgress)}% · {checklistDoneCount}/{task.checklist_items.length}
									</span>
								</div>
							</div>
							<Chip>{checklistGroups.length}</Chip>
						</div>
						{taskAddPanel === 'checklist' ? (
							<div className="workflow-trello-checklist-create">
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
								<button type="button" className="app-button px-4" onClick={createChecklistForTask}>
									{addChecklistState.isLoading ? workflow.buttons.saving : t.common.add}
								</button>
							</div>
						) : null}
						<div className="workflow-checklist-progress workflow-checklist-progress-large" aria-hidden="true">
							<span style={{ width: `${checklistProgress}%` }} />
						</div>
						<div className="workflow-checklist-list">
							{checklistGroups.map((group) => {
								const groupDoneCount = group.items.filter((item) => item.done).length;
								const groupProgress = group.items.length ? (groupDoneCount / group.items.length) * 100 : 0;
								const groupKey = String(group.id);
								const groupNewItem = newChecklistItemsByChecklist[groupKey] ?? '';
								return (
									<div key={group.id || `legacy-${task.id}`} className="workflow-checklist-group">
										<div className="workflow-checklist-group-head">
											<p>{group.title}</p>
											<div className="workflow-checklist-group-actions">
												<span>
													{Math.round(groupProgress)}% - {groupDoneCount}/{group.items.length}
												</span>
												{taskMutable && group.id > 0 ? (
													<button
														type="button"
														className="workflow-tool-icon-button workflow-tool-icon-button-danger workflow-checklist-delete-button"
														onClick={() =>
															void runPrimaryAction(
																async () => {
																	await deleteChecklist({ id: task.id, checklistId: group.id }).unwrap();
																	setNewChecklistItemsByChecklist((current) => {
																		const next = { ...current };
																		delete next[String(group.id)];
																		return next;
																	});
																},
																messageFor('Liste supprimée avec succès.', 'Checklist deleted successfully.'),
																messageFor('Impossible de supprimer la liste.', 'Could not delete the checklist.'),
															)
														}
														aria-label={t.common.delete}
													>
														<Trash2 size={15} />
													</button>
												) : null}
											</div>
										</div>
										<div className="workflow-checklist-progress" aria-hidden="true">
											<span style={{ width: `${groupProgress}%` }} />
										</div>
										{group.items.map((item) => (
											<div
												key={item.id}
												className={cn('workflow-checklist-row workflow-checklist-row-modern', item.done && 'is-done')}
											>
												<button
													type="button"
													onClick={() =>
														updateChecklistItem({ id: task.id, itemId: item.id, data: { done: !item.done } })
													}
													className="workflow-checklist-toggle"
													aria-label={item.done ? workflow.buttons.updateStatus : workflow.buttons.updateStatus}
												>
													<CheckCircle2 size={16} />
												</button>
												<span>{item.title}</span>
												<button
													type="button"
													onClick={() => deleteChecklistItem({ id: task.id, itemId: item.id })}
													className="workflow-tool-icon-button workflow-tool-icon-button-danger"
													aria-label={t.common.delete}
												>
													<Trash2 size={15} />
												</button>
											</div>
										))}
										{taskMutable ? (
											<div className="workflow-checklist-add workflow-checklist-add-modern">
												<Field
													value={groupNewItem}
													onChangeAction={(value) =>
														setNewChecklistItemsByChecklist((current) => ({ ...current, [groupKey]: value }))
													}
													placeholder={workflow.labels.addChecklistPlaceholder ?? 'Add checklist item'}
													startIcon={<Plus size={16} />}
												/>
												<button
													type="button"
													disabled={!groupNewItem.trim()}
													onClick={() => addChecklistItemToGroup(group)}
													className="app-button px-4"
												>
													{addChecklistItemState.isLoading ? workflow.buttons.saving : t.common.add}
												</button>
											</div>
										) : null}
									</div>
								);
							})}
							{checklistGroups.length === 0 ? (
								<div className="workflow-tool-empty-box">
									{workflow.emptyStates.noChecklist?.description ?? workflow.labels.addChecklistPlaceholder}
								</div>
							) : null}
						</div>
					</div>
				) : null}

				<div className="workflow-task-tools-side">
					{showLabelsPanel ? (
						<div className="app-card-muted workflow-labels-card workflow-tool-card-compact">
							<div className="workflow-tool-card-heading">
								<div className="flex items-center gap-2">
									<span className="workflow-tool-icon">
										<Tag size={15} />
									</span>
									<p>{workflow.labels.labelsPanel ?? 'Etiquettes'}</p>
								</div>
								<Chip>{task.labels.length}</Chip>
							</div>
							<div className="workflow-label-zone workflow-label-zone-modern">
								<p>{workflow.labels.activeLabels ?? 'Actives'}</p>
								<div className="workflow-label-chip-row">
									{task.labels.map((label) => (
										<span
											key={label.id}
											className="workflow-label-chip"
											style={{ borderColor: label.color, color: label.color }}
										>
											<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: label.color }} />
											<span>{label.name}</span>
											{workflowDataReady ? (
												<button
													type="button"
													onClick={() =>
														updateTask({
															id: task.id,
															data: {
																label_ids: task.labels.filter((item) => item.id !== label.id).map((item) => item.id),
															},
														})
													}
													className="text-current opacity-70 transition hover:opacity-100"
													aria-label={`Remove ${label.name}`}
												>
													<X size={12} />
												</button>
											) : null}
										</span>
									))}
									{task.labels.length === 0 ? (
										<p className="workflow-tool-empty-line">{workflow.labels.noLabelYet ?? 'Aucune etiquette'}</p>
									) : null}
								</div>
							</div>
							<div className="workflow-label-zone workflow-label-zone-modern">
								<p>{workflow.labels.availableLabels ?? 'Disponibles'}</p>
								<div className="workflow-label-chip-row">
									{labels
										.filter((label) => !task.labels.some((item) => item.id === label.id))
										.map((label) => (
											<button
												key={label.id}
												type="button"
												onClick={() =>
													updateTask({
														id: task.id,
														data: { label_ids: [...task.labels.map((item) => item.id), label.id] },
													})
												}
												className="workflow-label-chip workflow-label-chip-action"
												style={{ borderColor: label.color, color: label.color }}
											>
												<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: label.color }} />
												{label.name}
											</button>
										))}
									{labels.filter((label) => !task.labels.some((item) => item.id === label.id)).length === 0 ? (
										<p className="workflow-tool-empty-line">{workflow.labels.noLabelYet ?? 'Aucune etiquette'}</p>
									) : null}
								</div>
							</div>
							{workflowDataReady ? (
								<div className="workflow-label-composer workflow-label-composer-modern">
									<div className="workflow-label-composer-head">
										<div className="flex items-center gap-2">
											<Palette size={15} />
											<p>{workflow.labels.newLabel ?? 'Nouvelle etiquette'}</p>
										</div>
										<div
											className="workflow-label-preview"
											style={{ borderColor: newLabelColor, color: newLabelColor }}
										>
											<span className="inline-flex items-center gap-2">
												<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: newLabelColor }} />
												{newLabelName.trim() || (workflow.labels.preview ?? 'Apercu')}
											</span>
										</div>
									</div>
									<Field
										value={newLabelName}
										onChangeAction={setNewLabelName}
										placeholder={workflow.labels.newLabelPlaceholder ?? 'New label'}
										startIcon={<Tag size={16} />}
									/>
									<div className="workflow-label-composer-grid">
										<div className="workflow-label-color-picker">
											<DeferredHexColorPicker
												key={`task-label-${newLabelColor}`}
												value={newLabelColor}
												onCommitAction={setNewLabelColor}
											/>
										</div>
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
													},
													messageFor('Étiquette ajoutée avec succès.', 'Label added successfully.'),
													messageFor('Impossible d’ajouter l’étiquette.', 'Could not add the label.'),
												)
											}
											className="app-button workflow-label-create-button"
										>
											<Plus size={16} />
											<span>{t.common.add}</span>
										</button>
									</div>
								</div>
							) : null}
						</div>
					) : null}

					{showAttachmentsPanel ? (
						<div className="app-card-muted workflow-attachments-card workflow-tool-card-compact">
							<div className="workflow-tool-card-heading">
								<div className="flex items-center gap-2">
									<span className="workflow-tool-icon workflow-tool-icon-cyan">
										<Paperclip size={15} />
									</span>
									<p>{workflow.labels.attachmentsPanel ?? 'Attachments'}</p>
								</div>
								<Chip>{task.attachments.length}</Chip>
							</div>
							<div className="workflow-cover-control">
								<div className="workflow-cover-preview">
									{task.cover_image_url ? (
										<Image
											src={resolveMediaUrl(task.cover_image_url)}
											alt={task.cover_image_label || task.title}
											width={520}
											height={180}
											sizes="(max-width: 640px) 100vw, 520px"
											loading="eager"
											className="h-full w-full object-cover"
										/>
									) : (
										<div>
											<ImagePlus size={20} />
											<span>{workflow.labels.noCardImage ?? 'Aucune image de carte'}</span>
										</div>
									)}
								</div>
								{task.cover_image_label ? <p className="workflow-cover-label">{task.cover_image_label}</p> : null}
								{taskMediaMutable ? (
									<div className="workflow-upload-actions">
										<div className="workflow-media-label-field">
											<Field
												value={taskCoverLabel}
												onChangeAction={setTaskCoverLabel}
												placeholder={workflow.labels.coverImageLabelPlaceholder ?? 'Décrivez cette image'}
											/>
										</div>
										<input
											id={coverInputId}
											type="file"
											accept="image/*"
											onChange={(event) => setTaskCoverFile(event.target.files?.[0] ?? null)}
											className="workflow-hidden-file-input"
										/>
										<label htmlFor={coverInputId} className="workflow-upload-picker">
											<ImagePlus size={15} />
											<span>{taskCoverFile?.name ?? workflow.labels.cardImage ?? 'Image de carte'}</span>
										</label>
										<button
											type="button"
											disabled={!taskCoverFile || !taskCoverLabel.trim() || isPreparingTaskCover}
											onClick={() => void handleUploadTaskCover(task.id)}
											className="app-button workflow-upload-submit"
										>
											<ImagePlus size={16} />
											<span>
												{uploadTaskCoverState.isLoading || isPreparingTaskCover
													? workflow.buttons.saving
													: (workflow.labels.setCardImage ?? "Modifier l'image")}
											</span>
										</button>
										{task.cover_image_url ? (
											<button
												type="button"
												onClick={() =>
													setMediaDeleteTarget({
														kind: 'cover',
														taskId: task.id,
														name: workflow.labels.cardImage ?? 'Card image',
													})
												}
												className="workflow-tool-icon-button workflow-tool-icon-button-danger"
												aria-label={t.common.delete}
											>
												<X size={16} />
											</button>
										) : null}
									</div>
								) : null}
							</div>
							<div className="workflow-attachment-list">
								{task.attachments.map((attachment) => {
									const attachmentUrl = resolveMediaUrl(attachment.file_url ?? attachment.file);
									const isImage = isImageAttachment(attachment);
									const fileMeta = [attachment.mime_type || workflow.labels.uploadFile, formatFileSize(attachment.size)]
										.filter(Boolean)
										.join(' - ');
									return (
										<div key={attachment.id} className="workflow-attachment-item">
											{isImage ? (
												<button
													type="button"
													className="workflow-attachment-preview-trigger"
													onClick={() => openAttachmentPreview(attachment, attachmentUrl, fileMeta)}
													aria-label={`${workflow.labels.preview ?? 'Preview'} ${attachment.name}`}
												>
													<Image
														src={attachmentUrl}
														alt={attachment.name}
														width={72}
														height={52}
														unoptimized
														loading="eager"
														className="workflow-attachment-thumb h-auto w-auto"
														style={{ width: 'auto', height: 'auto' }}
													/>
												</button>
											) : (
												<span className="workflow-attachment-file-icon">
													<Paperclip size={16} />
												</span>
											)}
											<div className="workflow-attachment-copy">
												<TaskAttachmentName
													taskId={task.id}
													attachment={attachment}
													href={attachmentUrl}
													mutable={taskMediaMutable}
												/>
												<small>{fileMeta}</small>
											</div>
											{taskMediaMutable ? (
												<div className="workflow-attachment-actions">
													{isImage ? (
														<button
															type="button"
															className="workflow-attachment-cover-button"
															onClick={() => handleSetAttachmentAsCover(task, attachment)}
															disabled={setTaskCoverFromAttachmentState.isLoading}
														>
															<ImagePlus size={14} />
															<span>{workflow.labels.setAsCover ?? 'Set as cover'}</span>
														</button>
													) : null}
													<button
														type="button"
														onClick={() =>
															setMediaDeleteTarget({
																kind: 'attachment',
																taskId: task.id,
																attachmentId: attachment.id,
																name: attachment.name,
															})
														}
														className="workflow-tool-icon-button workflow-tool-icon-button-danger"
														aria-label={t.common.delete}
													>
														<Trash2 size={15} />
													</button>
												</div>
											) : null}
										</div>
									);
								})}
								{task.attachments.length === 0 ? (
									<div className="workflow-tool-empty-box">{workflow.labels.attachmentsPanel ?? 'Attachments'}</div>
								) : null}
							</div>
							{taskMediaMutable ? renderTaskAttachmentPicker(task.id, attachmentInputId) : null}
						</div>
					) : null}
					{taskAddPanel === 'members' && isManager ? (
						<div className="app-card-muted workflow-trello-member-panel">
							<div className="workflow-tool-card-heading">
								<div className="flex items-center gap-2">
									<span className="workflow-tool-icon">
										<Users size={15} />
									</span>
									<p>{workflow.labels.membersPanel ?? 'Members'}</p>
								</div>
							</div>
							<div className="grid gap-3 md:grid-cols-[minmax(0,0.45fr)_minmax(0,1fr)_auto]">
								<SelectField
									value={reassignForm.assignee_id}
									onChangeAction={(value) => setReassignForm((current) => ({ ...current, assignee_id: value }))}
									ariaLabel={workflow.labels.assignee}
									options={assignableUsers.map((user) => ({
										value: user.id,
										label: `${user.first_name} ${user.last_name}`,
									}))}
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
					) : null}
				</div>
			</div>
			<div className="mt-4">
				<button
					type="button"
					disabled={taskRestoreLocked}
					title={taskRestoreLocked ? workflow.labels.unarchiveProjectFirst : undefined}
					onClick={() => archiveTask({ id: task.id, archived: !task.archived })}
					className="app-button app-button-secondary"
				>
					<Archive size={16} />
					<span>
						{taskRestoreLocked
							? workflow.labels.unarchiveProjectFirst
							: task.archived
								? (workflow.buttons.restore ?? 'Restore')
								: (workflow.buttons.archive ?? 'Archive')}
					</span>
				</button>
			</div>
		</Surface>
	);
};
