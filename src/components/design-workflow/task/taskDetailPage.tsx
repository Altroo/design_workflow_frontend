'use client';
import { Area, Chip, EmptyState, FieldLabel, Surface } from '@/components/shared/workflow/workflowFields';
import { WorkflowSelectField as SelectField } from '@/components/shared/workflow/workflowFormControls';
import type { TaskArtifactVersion } from '@/types/designWorkflowTypes';
import { CheckCircle2, CircleAlert, MessagesSquare, Paperclip, Plus, ShieldCheck } from 'lucide-react';
import { TaskActivityPanel } from '@/components/design-workflow/task/panels/taskActivityPanel';
import { TaskCommentsPanel } from '@/components/design-workflow/task/panels/taskCommentsPanel';
import { TaskEditPanel } from '@/components/design-workflow/task/panels/taskEditPanel';
import { TaskFilesPanel } from '@/components/design-workflow/task/panels/taskFilesPanel';
import { TaskReassignPanel } from '@/components/design-workflow/task/panels/taskReassignPanel';
import { TaskSnapshot } from '@/components/design-workflow/task/panels/taskSnapshot';
import { TaskToolsPanel } from '@/components/design-workflow/task/panels/taskToolsPanel';
import type { TaskDetailModel } from '@/components/design-workflow/task/model/taskDetailModel';
import { TaskTimeHistory } from '@/components/design-workflow/task/panels/taskTimeHistory';
export const TaskDetailPage = ({ model }: { model: TaskDetailModel }) => {
	const {
		workflow,
		task,
		labelFor,
		isManager,
		detailTabs,
		taskDetailTab,
		setTaskDetailTab,
		reviewTone,
		displayReviewState,
		dateTimeFor,
		canSubmitReview,
		canManagerReview,
		reviewNotes,
		setReviewNotes,
		reviewLocked,
		setReviewConfirmation,
		requestReviewLabel,
		submitReviewUpdate,
		taskMutable,
		versionAttachmentId,
		setVersionAttachmentId,
		versionApprovalState,
		setVersionApprovalState,
		versionNotes,
		setVersionNotes,
		submitArtifactVersion,
		createTaskVersionState,
		handoffTemplate,
		addChecklistState,
		addChecklistItemState,
		createHandoffChecklist,
	} = model;
	return (
		<div className="workflow-task-detail-page">
			<TaskSnapshot model={model} />

			<div className="workflow-task-detail-tabs" role="tablist" aria-label="Task detail sections">
				{detailTabs.map((tab) => (
					<button
						key={tab.key}
						type="button"
						role="tab"
						aria-selected={taskDetailTab === tab.key}
						data-active={taskDetailTab === tab.key}
						onClick={() => setTaskDetailTab(tab.key)}
					>
						{tab.icon}
						<span>{tab.label}</span>
					</button>
				))}
			</div>

			{taskDetailTab === 'review' ? (
				<Surface
					className="workflow-task-detail-panel workflow-review-panel"
					title={workflow.labels.review ?? 'Review'}
					description={workflow.labels.reviewWorkflowHint ?? 'Approval state stays separate from board status.'}
					action={<Chip tone={reviewTone}>{labelFor(displayReviewState)}</Chip>}
				>
					<div className="workflow-review-grid">
						<div className="workflow-review-state-card">
							<div>
								<span className="workflow-review-kicker">{workflow.labels.statusLabel}</span>
								<h3>{labelFor(displayReviewState)}</h3>
								<p>
									{workflow.labels.boardStatus ?? 'Board status'}: {labelFor(task.status)}
								</p>
							</div>
							<div className="workflow-review-meta-grid">
								<div>
									<span>{workflow.labels.reviewRequestedBy ?? 'Requested by'}</span>
									<b>
										{task.review_requested_by
											? `${task.review_requested_by.first_name} ${task.review_requested_by.last_name}`
											: workflow.labels.noDate}
									</b>
									<small>{dateTimeFor(task.review_requested_at)}</small>
								</div>
								<div>
									<span>{workflow.labels.approvedBy ?? 'Approved by'}</span>
									<b>
										{task.review_approved_by
											? `${task.review_approved_by.first_name} ${task.review_approved_by.last_name}`
											: workflow.labels.noDate}
									</b>
									<small>{dateTimeFor(task.review_approved_at)}</small>
								</div>
							</div>
							{canSubmitReview || canManagerReview ? (
								<div className="workflow-review-action-stack">
									<FieldLabel htmlFor="task-review-notes">{workflow.labels.optionalNote}</FieldLabel>
									<Area
										ai="review_note"
										id="task-review-notes"
										value={reviewNotes}
										onChangeAction={setReviewNotes}
										rows={3}
										placeholder={workflow.labels.reviewNotesPlaceholder ?? 'Review notes'}
										startIcon={<MessagesSquare size={17} />}
									/>
									<div className="workflow-review-actions">
										{canSubmitReview ? (
											<button
												type="button"
												className="app-button"
												disabled={reviewLocked}
												onClick={() =>
													setReviewConfirmation({ taskId: task.id, reviewState: 'needs_review', resetNotes: true })
												}
											>
												<ShieldCheck size={16} />
												<span>{requestReviewLabel}</span>
											</button>
										) : null}
										{canManagerReview ? (
											<>
												<button
													type="button"
													className="app-button app-button-secondary"
													disabled={reviewLocked}
													onClick={() => submitReviewUpdate('changes_requested')}
												>
													<CircleAlert size={16} />
													<span>{workflow.buttons.requestChanges ?? 'Request changes'}</span>
												</button>
												<button
													type="button"
													className="app-button app-button-secondary"
													disabled={reviewLocked}
													onClick={() =>
														setReviewConfirmation({ taskId: task.id, reviewState: 'approved', resetNotes: true })
													}
												>
													<CheckCircle2 size={16} />
													<span>{workflow.buttons.approve ?? 'Approve'}</span>
												</button>
											</>
										) : null}
									</div>
								</div>
							) : null}
						</div>

						<div className="workflow-artifact-card">
							<div className="workflow-tool-card-heading">
								<div className="flex items-center gap-2">
									<span className="workflow-tool-icon workflow-tool-icon-cyan">
										<Paperclip size={15} />
									</span>
									<p>{workflow.labels.artifactVersions ?? 'Artifact versions'}</p>
								</div>
								<Chip>{task.artifact_versions.length}</Chip>
							</div>
							{taskMutable ? (
								<div className="workflow-artifact-create">
									<div>
										<FieldLabel htmlFor="artifact-attachment">
											{workflow.labels.attachmentsPanel ?? 'Attachments'}
										</FieldLabel>
										<SelectField
											id="artifact-attachment"
											value={versionAttachmentId}
											onChangeAction={setVersionAttachmentId}
											options={[
												{ value: '', label: workflow.labels.noLinkedFile ?? 'No linked file' },
												...task.attachments.map((attachment) => ({ value: attachment.id, label: attachment.name })),
											]}
											startIcon={<Paperclip size={18} />}
										/>
									</div>
									<div>
										<FieldLabel htmlFor="artifact-approval">{workflow.labels.statusLabel}</FieldLabel>
										<SelectField
											id="artifact-approval"
											value={versionApprovalState}
											onChangeAction={(value) =>
												setVersionApprovalState(value as TaskArtifactVersion['approval_state'])
											}
											options={['pending', 'changes_requested', 'approved'].map((value) => ({
												value,
												label: labelFor(value),
											}))}
											startIcon={<ShieldCheck size={18} />}
										/>
									</div>
									<div className="md:col-span-2">
										<FieldLabel htmlFor="artifact-notes">{workflow.labels.optionalNote}</FieldLabel>
										<Area
											ai="version_note"
											id="artifact-notes"
											value={versionNotes}
											onChangeAction={setVersionNotes}
											rows={3}
											placeholder={workflow.labels.versionNotesPlaceholder ?? 'Version notes'}
											startIcon={<MessagesSquare size={18} />}
										/>
									</div>
									<button type="button" className="app-button" onClick={submitArtifactVersion}>
										<Plus size={16} />
										<span>
											{createTaskVersionState.isLoading
												? workflow.buttons.saving
												: (workflow.buttons.addVersion ?? 'Add version')}
										</span>
									</button>
									{handoffTemplate ? (
										<button
											type="button"
											className="app-button app-button-secondary"
											disabled={addChecklistState.isLoading || addChecklistItemState.isLoading}
											onClick={createHandoffChecklist}
										>
											<CheckCircle2 size={16} />
											<span>{workflow.buttons.addHandoffChecklist ?? 'Add handoff checklist'}</span>
										</button>
									) : null}
								</div>
							) : null}
							<div className="workflow-artifact-list">
								{task.artifact_versions.map((version) => (
									<div key={version.id} className="workflow-artifact-row" data-state={version.approval_state}>
										<div>
											<b>v{version.version_number}</b>
											<span>{labelFor(version.approval_state)}</span>
										</div>
										<p>{version.notes || (workflow.labels.optionalNote ?? 'No note')}</p>
										<small>
											{version.attachment?.name ?? workflow.labels.noLinkedFile ?? 'No linked file'} -{' '}
											{version.uploaded_by.first_name} {version.uploaded_by.last_name} -{' '}
											{dateTimeFor(version.created_at)}
										</small>
									</div>
								))}
								{task.artifact_versions.length === 0 ? (
									<EmptyState
										title={workflow.labels.artifactVersions ?? 'Artifact versions'}
										description={workflow.emptyStates.noActivity.description}
									/>
								) : null}
							</div>
						</div>
					</div>
				</Surface>
			) : null}

			{taskDetailTab === 'files' ? <TaskFilesPanel model={model} /> : null}

			{taskMutable ? <TaskToolsPanel model={model} /> : null}

			{isManager || taskMutable ? (
				<TaskEditPanel model={model} />
			) : (
				<Surface
					className="workflow-task-detail-panel workflow-task-permissions-panel"
					{...workflow.sections.permissions}
				>
					<EmptyState {...workflow.emptyStates.readOnly} />
				</Surface>
			)}

			{isManager ? <TaskReassignPanel model={model} /> : null}

			<div className="workflow-task-history-grid">
				<TaskCommentsPanel model={model} />

				{isManager ? <TaskTimeHistory key={task.id} taskId={task.id} /> : null}
			</div>

			<TaskActivityPanel model={model} />
		</div>
	);
};
