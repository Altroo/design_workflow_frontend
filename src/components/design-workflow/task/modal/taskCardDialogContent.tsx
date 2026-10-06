'use client';
import {
	Area,
	AvatarBadge,
	EmptyState,
	Field,
	FieldLabel,
	WorkDaysField,
} from '@/components/shared/workflow/workflowFields';
import { formatFileSize, isImageAttachment, resolveMediaUrl } from '@/utils/workflow/workflowFormatting';
import { buildTaskEditForm, labelColorStyle } from '@/utils/workflow/workflowFormHelpers';
import { WorkflowDateField as DateField } from '@/components/shared/workflow/workflowFormControls';
import {
	CheckCircle2,
	Clock3,
	ImagePlus,
	ListTodo,
	MessagesSquare,
	Paperclip,
	Plus,
	Tag,
	Trash2,
	X,
} from 'lucide-react';
import Image from 'next/image';
import { TaskActionPopover } from '@/components/design-workflow/task/modal/taskActionPopover';
import { TaskModalActions } from '@/components/design-workflow/task/modal/taskModalActions';
import { TaskModalHeader } from '@/components/design-workflow/task/modal/taskModalHeader';
import type { TaskDetailModel } from '@/components/design-workflow/task/model/taskDetailModel';
export const TaskCardDialogContent = ({ model }: { model: TaskDetailModel }) => {
	const {
		task,
		taskMutable,
		messageFor,
		updateTaskState,
		runPrimaryAction,
		updateTask,
		workflow,
		t,
		renderSourceChatLink,
		taskConflictNotice,
		toggleTaskAddPanel,
		taskAddPanel,
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
		isManager,
		modalHasLabels,
		modalDescriptionEditing,
		taskEditForm,
		setTaskEditForm,
		mentionableUsers,
		taskUpdatePayload,
		setModalDescriptionEditing,
		taskEditBaselineRef,
		chartTextColor,
		modalHasDates,
		dateFor,
		modalHasChecklist,
		checklistGroups,
		newChecklistItemsByChecklist,
		deleteChecklist,
		setNewChecklistItemsByChecklist,
		updateChecklistItem,
		deleteChecklistItem,
		addChecklistItemToGroup,
		addChecklistItemState,
		modalHasAttachments,
		taskMediaMutable,
		setMediaDeleteTarget,
		openAttachmentPreview,
		handleSetAttachmentAsCover,
		setTaskCoverFromAttachmentState,
		commentBody,
		setCommentBody,
		addTaskComment,
		addCommentState,
		pagedTaskComments,
		dateTimeFor,
		pagedTaskActivity,
		describeWorkflowActivity,
		visibleTaskActivity,
	} = model;
	return (
		<div className="workflow-trello-modal-detail">
			<main className="workflow-trello-modal-main">
				<TaskModalHeader model={model} />

				{renderSourceChatLink('modal')}
				{taskConflictNotice}

				<TaskModalActions model={model} />

				{taskMutable && taskAddPanel ? <TaskActionPopover model={model} /> : null}

				{modalHasLabels ? (
					<section className="workflow-trello-modal-section workflow-trello-modal-section-compact">
						<div className="workflow-trello-modal-section-head">
							<Tag size={18} />
							<h3>{workflow.labels.labelsPanel ?? 'Labels'}</h3>
						</div>
						<div className="workflow-trello-modal-labels">
							{task.labels.map((label) => (
								<span
									key={label.id}
									className="workflow-trello-modal-assigned-label"
									style={labelColorStyle(label.color)}
								>
									<span>{label.name}</span>
									{taskMutable ? (
										<button
											type="button"
											aria-label={`${workflow.buttons.removeLabel}: ${label.name}`}
											onClick={() =>
												void updateTask({
													id: task.id,
													data: {
														label_ids: task.labels.filter((item) => item.id !== label.id).map((item) => item.id),
													},
												})
											}
										>
											<X size={14} />
										</button>
									) : null}
								</span>
							))}
							{taskMutable ? (
								<button type="button" onClick={() => toggleTaskAddPanel('labels')} aria-label={t.common.add}>
									<Plus size={17} />
								</button>
							) : null}
						</div>
					</section>
				) : null}

				<section className="workflow-trello-modal-section">
					<div className="workflow-trello-modal-section-head">
						<ListTodo size={20} />
						<h3>{workflow.labels.description}</h3>
					</div>
					{taskMutable ? (
						modalDescriptionEditing ? (
							<div className="workflow-trello-modal-description-edit">
								<Area
									value={taskEditForm.description}
									onChangeAction={(value) => setTaskEditForm((current) => ({ ...current, description: value }))}
									mentionUsers={mentionableUsers}
									rows={4}
									placeholder={workflow.labels.descriptionPlaceholder ?? workflow.labels.noDescription}
								/>
								<div className="workflow-trello-modal-inline-actions">
									<button
										type="button"
										className="workflow-trello-modal-save"
										onClick={() =>
											void runPrimaryAction(
												async () => {
													await updateTask({
														id: task.id,
														data: taskUpdatePayload(isManager),
													}).unwrap();
													setModalDescriptionEditing(false);
												},
												messageFor('Tâche enregistrée avec succès.', 'Task saved successfully.'),
												messageFor('Impossible d’enregistrer la tâche.', 'Could not save the task.'),
											)
										}
									>
										{updateTaskState.isLoading ? workflow.buttons.saving : t.common.save}
									</button>
									<button
										type="button"
										className="workflow-trello-modal-cancel"
										onClick={() => {
											const latest = buildTaskEditForm(task);
											taskEditBaselineRef.current = latest;
											setTaskEditForm(latest);
											setModalDescriptionEditing(false);
										}}
									>
										{t.common.cancel}
									</button>
								</div>
							</div>
						) : (
							<button
								type="button"
								className="workflow-trello-modal-description-button"
								style={{
									width: '100%',
									minHeight: 92,
									border: '1px solid #dbe3ef',
									borderRadius: 10,
									background: 'var(--surface)',
									padding: '14px 16px',
									color: chartTextColor,
									fontSize: 15,
									fontWeight: 700,
									lineHeight: 1.65,
									textAlign: 'left',
									whiteSpace: 'pre-wrap',
									boxShadow: '0 10px 24px -26px rgba(15, 23, 42, 0.5)',
								}}
								onClick={() => setModalDescriptionEditing(true)}
							>
								{task.description || (workflow.labels.descriptionPlaceholder ?? workflow.labels.noDescription)}
							</button>
						)
					) : (
						<p className="workflow-trello-modal-description-text">
							{task.description || workflow.labels.noDescription}
						</p>
					)}
				</section>

				{modalHasDates ? (
					<section className="workflow-trello-modal-section workflow-trello-modal-control-panel">
						<div className="workflow-trello-modal-section-head">
							<Clock3 size={20} />
							<h3>{workflow.labels.dueDate}</h3>
						</div>
						{taskMutable ? (
							<div className="workflow-trello-modal-control-grid" data-single-field={!isManager}>
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
											onChangeAction={(value) =>
												setTaskEditForm((current) => ({ ...current, estimated_minutes: value }))
											}
										/>
									</div>
								) : null}
								<button
									type="button"
									className="workflow-trello-modal-save"
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
								>
									{updateTaskState.isLoading ? workflow.buttons.saving : t.common.save}
								</button>
							</div>
						) : (
							<p className="workflow-trello-modal-description-text">{dateFor(task.due_date)}</p>
						)}
					</section>
				) : null}

				{modalHasChecklist
					? checklistGroups.map((group) => {
							const groupDoneCount = group.items.filter((item) => item.done).length;
							const groupProgress = group.items.length ? (groupDoneCount / group.items.length) * 100 : 0;
							const groupKey = String(group.id);
							const groupNewItem = newChecklistItemsByChecklist[groupKey] ?? '';
							return (
								<section key={group.id || `legacy-${task.id}`} className="workflow-trello-modal-section">
									<div className="workflow-trello-modal-section-head">
										<CheckCircle2 size={20} />
										<div className="min-w-0">
											<h3>{group.title}</h3>
											<span>
												{Math.round(groupProgress)}% - {groupDoneCount}/{group.items.length}
											</span>
										</div>
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
									<div className="workflow-trello-modal-progress">
										<span style={{ width: `${groupProgress}%` }} />
									</div>
									<div className="workflow-trello-modal-checklist">
										{group.items.map((item) => (
											<div
												key={item.id}
												className="workflow-trello-modal-checklist-item"
												data-done={item.done}
												role={taskMutable ? 'checkbox' : undefined}
												aria-checked={item.done}
												tabIndex={taskMutable ? 0 : -1}
												onClick={(event) => {
													if (!taskMutable) return;
													if ((event.target as Element).closest('button')) return;
													void updateChecklistItem({ id: task.id, itemId: item.id, data: { done: !item.done } });
												}}
												onKeyDown={(event) => {
													if (!taskMutable) return;
													if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' '))
														return;
													event.preventDefault();
													void updateChecklistItem({ id: task.id, itemId: item.id, data: { done: !item.done } });
												}}
											>
												<span className="workflow-trello-modal-checklist-toggle" aria-hidden="true">
													<CheckCircle2 size={17} />
												</span>
												<span>{item.title}</span>
												<button
													type="button"
													onClick={(event) => {
														event.stopPropagation();
														void deleteChecklistItem({ id: task.id, itemId: item.id });
													}}
													aria-label={t.common.delete}
												>
													<Trash2 size={15} />
												</button>
											</div>
										))}
									</div>
									{taskMutable ? (
										<form
											className="workflow-trello-modal-checklist-add"
											onSubmit={async (event) => {
												event.preventDefault();
												await addChecklistItemToGroup(group);
											}}
										>
											<Field
												value={groupNewItem}
												onChangeAction={(value) =>
													setNewChecklistItemsByChecklist((current) => ({ ...current, [groupKey]: value }))
												}
												placeholder={workflow.labels.addChecklistPlaceholder ?? 'Add checklist item'}
												startIcon={<Plus size={16} />}
											/>
											<button type="submit" disabled={!groupNewItem.trim()}>
												{addChecklistItemState.isLoading ? workflow.buttons.saving : t.common.add}
											</button>
										</form>
									) : null}
								</section>
							);
						})
					: null}

				{modalHasAttachments ? (
					<section className="workflow-trello-modal-section workflow-trello-modal-media-section">
						<div className="workflow-trello-modal-section-head">
							<Paperclip size={20} />
							<h3>{workflow.labels.attachmentsPanel ?? 'Attachments'}</h3>
						</div>
						<div className="workflow-trello-modal-cover-card">
							<div className="workflow-trello-modal-cover">
								{task.cover_image_url ? (
									<Image
										src={resolveMediaUrl(task.cover_image_url)}
										alt={task.cover_image_label || task.title}
										fill
										sizes="(min-width: 1024px) 760px, 100vw"
										loading="eager"
										className="object-contain"
									/>
								) : (
									<div>
										<ImagePlus size={22} />
										<span>{workflow.labels.noCardImage ?? 'No card image'}</span>
									</div>
								)}
							</div>
							{task.cover_image_label ? <p className="workflow-cover-label">{task.cover_image_label}</p> : null}
							{taskMediaMutable ? (
								<div className="workflow-trello-modal-media-actions">
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
									<label htmlFor={coverInputId} className="workflow-trello-modal-file-button">
										<ImagePlus size={16} />
										{taskCoverFile?.name ?? workflow.labels.cardImage ?? 'Card image'}
									</label>
									<button
										type="button"
										className="workflow-trello-modal-save"
										disabled={!taskCoverFile || !taskCoverLabel.trim() || isPreparingTaskCover}
										onClick={() => void handleUploadTaskCover(task.id)}
									>
										{uploadTaskCoverState.isLoading || isPreparingTaskCover ? workflow.buttons.saving : t.common.add}
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
											className="workflow-trello-modal-media-danger"
											aria-label={t.common.delete}
										>
											<Trash2 size={15} />
										</button>
									) : null}
								</div>
							) : null}
						</div>
						<div className="workflow-trello-modal-attachments">
							{task.attachments.map((attachment) => {
								const attachmentUrl = resolveMediaUrl(attachment.file_url ?? attachment.file);
								const isImage = isImageAttachment(attachment);
								const fileMeta = [attachment.mime_type || workflow.labels.uploadFile, formatFileSize(attachment.size)]
									.filter(Boolean)
									.join(' - ');
								return (
									<div key={attachment.id} className="workflow-trello-modal-attachment-item">
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
													width={92}
													height={68}
													unoptimized
													loading="eager"
													className="h-auto w-auto"
													style={{ width: 'auto', height: 'auto' }}
												/>
											</button>
										) : (
											<span>
												<Paperclip size={17} />
											</span>
										)}
										<div>
											<a href={attachmentUrl} target="_blank" rel="noreferrer">
												{attachment.name}
											</a>
											<small>{fileMeta}</small>
										</div>
										{taskMediaMutable ? (
											<div className="workflow-trello-modal-attachment-actions">
												{isImage ? (
													<button
														type="button"
														className="workflow-trello-modal-attachment-cover-action"
														onClick={() => handleSetAttachmentAsCover(task, attachment)}
														disabled={setTaskCoverFromAttachmentState.isLoading}
													>
														<ImagePlus size={14} />
														<span>{workflow.labels.setAsCover ?? 'Set as cover'}</span>
													</button>
												) : null}
												<button
													type="button"
													className="workflow-trello-modal-media-danger"
													onClick={() =>
														setMediaDeleteTarget({
															kind: 'attachment',
															taskId: task.id,
															attachmentId: attachment.id,
															name: attachment.name,
														})
													}
													aria-label={t.common.delete}
												>
													<Trash2 size={15} />
												</button>
											</div>
										) : null}
									</div>
								);
							})}
						</div>
						{taskMediaMutable ? renderTaskAttachmentPicker(task.id, attachmentInputId) : null}
					</section>
				) : null}
			</main>

			<aside className="workflow-trello-modal-activity">
				<div className="workflow-trello-modal-activity-head">
					<div>
						<MessagesSquare size={19} />
						<h3>{workflow.sections.comments.title}</h3>
					</div>
				</div>
				{taskMutable ? (
					<div className="workflow-trello-modal-comment-box">
						<Area
							value={commentBody}
							onChangeAction={setCommentBody}
							mentionUsers={mentionableUsers}
							rows={3}
							placeholder={workflow.labels.commentPlaceholder}
						/>
						<button
							type="button"
							onClick={() =>
								void runPrimaryAction(
									async () => {
										await addTaskComment({ id: task.id, body: commentBody.trim() }).unwrap();
										setCommentBody('');
									},
									messageFor('Commentaire publié.', 'Comment posted.'),
									messageFor('Impossible de publier le commentaire.', 'Could not post the comment.'),
								)
							}
							disabled={!commentBody.trim()}
						>
							{addCommentState.isLoading ? workflow.buttons.posting : workflow.buttons.postComment}
						</button>
					</div>
				) : null}
				<div className="workflow-trello-modal-feed">
					{pagedTaskComments.map((comment) => (
						<div key={`comment-${comment.id}`} className="workflow-trello-modal-feed-item">
							<AvatarBadge user={comment.author} size={34} />
							<div>
								<p>
									<b>
										{comment.author.first_name} {comment.author.last_name}
									</b>{' '}
									{workflow.activities.commented?.toLowerCase?.() ?? 'commented'}
								</p>
								<span>{comment.body}</span>
								<small>{dateTimeFor(comment.created_at)}</small>
							</div>
						</div>
					))}
					{pagedTaskActivity.map((activity) => (
						<div key={`activity-${activity.id}`} className="workflow-trello-modal-feed-item">
							{activity.actor ? (
								<AvatarBadge user={activity.actor} size={34} />
							) : (
								<div className="workflow-trello-modal-system-avatar">DW</div>
							)}
							<div>
								<p>
									<b>
										{activity.actor
											? `${activity.actor.first_name} ${activity.actor.last_name}`
											: workflow.labels.system}
									</b>
								</p>
								<span>{describeWorkflowActivity(activity)}</span>
								<small>{dateTimeFor(activity.created_at)}</small>
							</div>
						</div>
					))}
					{task.comments.length === 0 && visibleTaskActivity.length === 0 ? (
						<EmptyState {...workflow.emptyStates.noActivity} />
					) : null}
				</div>
			</aside>
		</div>
	);
};
