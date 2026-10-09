'use client';
import { Area, EmptyState, Field, FieldLabel, Surface, ToggleField } from '@/components/shared/workflow/workflowFields';
import { formatFileSize, resolveMediaUrl } from '@/utils/workflow/workflowFormatting';
import { WorkflowSelectField as SelectField } from '@/components/shared/workflow/workflowFormControls';
import { CheckCircle2, CircleAlert, MessagesSquare, Paperclip, Plus, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import type { TaskDetailModel } from '@/components/design-workflow/task/model/taskDetailModel';
export const TaskFilesPanel = ({
	model,
}: {
	model: Pick<
		TaskDetailModel,
		| 'workflow'
		| 'task'
		| 'selectedAnnotationAttachment'
		| 'setSelectedAnnotationAttachmentId'
		| 'selectedAnnotationAttachmentUrl'
		| 'selectedAttachmentAnnotations'
		| 'taskMutable'
		| 'annotationVersionId'
		| 'setAnnotationVersionId'
		| 'selectedAnnotationVersionOptions'
		| 'labelFor'
		| 'annotationX'
		| 'setAnnotationX'
		| 'annotationY'
		| 'setAnnotationY'
		| 'annotationBody'
		| 'setAnnotationBody'
		| 'annotationResolved'
		| 'setAnnotationResolved'
		| 'createAnnotationState'
		| 'submitAnnotation'
		| 'dateTimeFor'
	>;
}) => {
	const {
		workflow,
		task,
		selectedAnnotationAttachment,
		setSelectedAnnotationAttachmentId,
		selectedAnnotationAttachmentUrl,
		selectedAttachmentAnnotations,
		taskMutable,
		annotationVersionId,
		setAnnotationVersionId,
		selectedAnnotationVersionOptions,
		labelFor,
		annotationX,
		setAnnotationX,
		annotationY,
		setAnnotationY,
		annotationBody,
		setAnnotationBody,
		annotationResolved,
		setAnnotationResolved,
		createAnnotationState,
		submitAnnotation,
		dateTimeFor,
	} = model;
	return (
		<Surface
			className="workflow-task-detail-panel workflow-files-panel"
			title={workflow.labels.files ?? 'Files'}
			description={
				workflow.labels.annotationWorkflowHint ?? 'Review pins stay linked to the selected file and version.'
			}
		>
			<div className="workflow-files-grid">
				<div className="workflow-files-list">
					{task.attachments.map((attachment) => {
						const attachmentUrl = resolveMediaUrl(attachment.thumbnail_url);
						const isImage = Boolean(attachmentUrl);
						return (
							<button
								key={attachment.id}
								type="button"
								className="workflow-file-review-card"
								data-active={selectedAnnotationAttachment?.id === attachment.id}
								onClick={() => setSelectedAnnotationAttachmentId(attachment.id)}
							>
								{isImage ? (
									<Image
										src={attachmentUrl}
										alt={attachment.name}
										width={128}
										height={88}
										unoptimized
										loading="eager"
										className="h-auto w-auto"
										style={{ width: 'auto', height: 'auto' }}
									/>
								) : (
									<span>
										<Paperclip size={20} />
									</span>
								)}
								<b>{attachment.name}</b>
								<small>
									{formatFileSize(attachment.size)} - {attachment.annotation_count}{' '}
									{workflow.labels.annotations ?? 'annotations'}
								</small>
							</button>
						);
					})}
					{task.attachments.length === 0 ? (
						<EmptyState
							title={workflow.labels.files ?? 'Files'}
							description={workflow.emptyStates.noActivity.description}
						/>
					) : null}
				</div>

				<div className="workflow-annotation-workbench">
					{selectedAnnotationAttachment ? (
						<>
							<div className="workflow-annotation-stage">
								{selectedAnnotationAttachmentUrl ? (
									<Image
										src={selectedAnnotationAttachmentUrl}
										alt={selectedAnnotationAttachment.name}
										width={860}
										height={520}
										unoptimized
										loading="eager"
										className="h-auto w-auto"
										style={{ width: 'auto', height: 'auto' }}
									/>
								) : (
									<div className="workflow-annotation-file-placeholder">
										<Paperclip size={26} />
										<span>{selectedAnnotationAttachment.name}</span>
									</div>
								)}
								{selectedAttachmentAnnotations.map((annotation) => (
									<span
										key={annotation.id}
										className="workflow-annotation-pin"
										data-resolved={annotation.resolved}
										style={{ left: `${annotation.x_percent}%`, top: `${annotation.y_percent}%` }}
										title={annotation.body}
									>
										{annotation.resolved ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
									</span>
								))}
							</div>
							<div className="workflow-annotation-body">
								{taskMutable ? (
									<div className="workflow-annotation-form">
										<div>
											<FieldLabel htmlFor="annotation-version">
												{workflow.labels.artifactVersions ?? 'Artifact versions'}
											</FieldLabel>
											<SelectField
												id="annotation-version"
												value={annotationVersionId}
												onChangeAction={setAnnotationVersionId}
												options={[
													{ value: '', label: workflow.labels.noLinkedVersion ?? 'No linked version' },
													...selectedAnnotationVersionOptions.map((version) => ({
														value: version.id,
														label: `v${version.version_number} - ${labelFor(version.approval_state)}`,
													})),
												]}
												startIcon={<ShieldCheck size={18} />}
											/>
										</div>
										<div className="workflow-annotation-position-grid">
											<div>
												<FieldLabel htmlFor="annotation-x">X %</FieldLabel>
												<Field
													id="annotation-x"
													type="number"
													min={0}
													value={annotationX}
													onChangeAction={setAnnotationX}
												/>
											</div>
											<div>
												<FieldLabel htmlFor="annotation-y">Y %</FieldLabel>
												<Field
													id="annotation-y"
													type="number"
													min={0}
													value={annotationY}
													onChangeAction={setAnnotationY}
												/>
											</div>
										</div>
										<div className="md:col-span-2">
											<FieldLabel htmlFor="annotation-body">{workflow.labels.addComment}</FieldLabel>
											<Area
												ai="annotation"
												id="annotation-body"
												value={annotationBody}
												onChangeAction={setAnnotationBody}
												rows={3}
												placeholder={workflow.labels.annotationPlaceholder ?? 'Annotation'}
												startIcon={<MessagesSquare size={18} />}
											/>
										</div>
										<ToggleField
											label={workflow.labels.resolved ?? 'Resolved'}
											checked={annotationResolved}
											onChangeAction={setAnnotationResolved}
										/>
										<button
											type="button"
											className="app-button"
											disabled={!annotationBody.trim() || createAnnotationState.isLoading}
											onClick={submitAnnotation}
										>
											<Plus size={16} />
											<span>
												{createAnnotationState.isLoading
													? workflow.buttons.saving
													: (workflow.buttons.addAnnotation ?? 'Add annotation')}
											</span>
										</button>
									</div>
								) : null}
								<div className="workflow-annotation-list">
									{selectedAttachmentAnnotations.map((annotation) => (
										<div key={annotation.id} className="workflow-annotation-row" data-resolved={annotation.resolved}>
											<div>
												<b>
													{annotation.author.first_name} {annotation.author.last_name}
												</b>
												<span>
													{annotation.x_percent}%, {annotation.y_percent}%
												</span>
											</div>
											<p>{annotation.body}</p>
											<small>
												{annotation.resolved
													? (workflow.labels.resolved ?? 'Resolved')
													: (workflow.labels.open ?? 'Open')}{' '}
												- {dateTimeFor(annotation.created_at)}
											</small>
										</div>
									))}
									{selectedAttachmentAnnotations.length === 0 ? (
										<EmptyState
											title={workflow.labels.annotations ?? 'Annotations'}
											description={workflow.emptyStates.noCommentsYet.description}
										/>
									) : null}
								</div>
							</div>
						</>
					) : (
						<EmptyState
							title={workflow.labels.files ?? 'Files'}
							description={workflow.emptyStates.noActivity.description}
						/>
					)}
				</div>
			</div>
		</Surface>
	);
};
