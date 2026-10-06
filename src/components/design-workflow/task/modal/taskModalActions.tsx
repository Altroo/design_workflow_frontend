'use client';

import { Archive, CheckCircle2, CircleAlert, ImagePlus, Paperclip, ShieldCheck, Tag, Users } from 'lucide-react';
import type { TaskDetailModel } from '@/components/design-workflow/task/model/taskDetailModel';

export const TaskModalActions = ({
	model,
}: {
	model: Pick<
		TaskDetailModel,
		| 'canSubmitReview'
		| 'reviewLocked'
		| 'setReviewConfirmation'
		| 'task'
		| 'requestReviewLabel'
		| 'canManagerReview'
		| 'submitReviewUpdate'
		| 'workflow'
		| 'taskMutable'
		| 'toggleTaskAddPanel'
		| 'taskAddPanel'
		| 'taskRestoreLocked'
		| 'archiveTask'
	>;
}) => {
	const {
		canSubmitReview,
		reviewLocked,
		setReviewConfirmation,
		task,
		requestReviewLabel,
		canManagerReview,
		submitReviewUpdate,
		workflow,
		taskMutable,
		toggleTaskAddPanel,
		taskAddPanel,
		taskRestoreLocked,
		archiveTask,
	} = model;
	return (
		<div className="workflow-trello-modal-actions">
			{canSubmitReview ? (
				<button
					type="button"
					disabled={reviewLocked}
					onClick={() => setReviewConfirmation({ taskId: task.id, reviewState: 'needs_review', resetNotes: false })}
					className="workflow-trello-modal-action"
					data-tone="blue"
				>
					<ShieldCheck size={17} />
					<span>{requestReviewLabel}</span>
				</button>
			) : null}
			{canManagerReview ? (
				<>
					<button
						type="button"
						disabled={reviewLocked}
						onClick={() => void submitReviewUpdate('changes_requested', { resetNotes: false })}
						className="workflow-trello-modal-action"
						data-tone="amber"
					>
						<CircleAlert size={17} />
						<span>{workflow.buttons.requestChanges ?? 'Request changes'}</span>
					</button>
					<button
						type="button"
						disabled={reviewLocked}
						onClick={() => setReviewConfirmation({ taskId: task.id, reviewState: 'approved', resetNotes: false })}
						className="workflow-trello-modal-action"
						data-tone="green"
					>
						<CheckCircle2 size={17} />
						<span>{workflow.buttons.approve ?? 'Approve'}</span>
					</button>
				</>
			) : null}
			{taskMutable ? (
				<>
					<button
						type="button"
						onClick={() => toggleTaskAddPanel('labels')}
						className="workflow-trello-modal-action"
						data-tone="violet"
						data-active={taskAddPanel === 'labels'}
					>
						<Tag size={17} />
						<span>{workflow.labels.labelsPanel ?? 'Étiquettes'}</span>
					</button>
					<button
						type="button"
						onClick={() => toggleTaskAddPanel('cover')}
						className="workflow-trello-modal-action"
						data-tone="violet"
						data-active={taskAddPanel === 'cover'}
					>
						<ImagePlus size={17} />
						<span>{workflow.labels.cardImage ?? 'Image de carte'}</span>
					</button>
					<button
						type="button"
						onClick={() => toggleTaskAddPanel('attachments')}
						className="workflow-trello-modal-action"
						data-tone="blue"
						data-active={taskAddPanel === 'attachments'}
					>
						<Paperclip size={17} />
						<span>{workflow.labels.attachmentsPanel ?? 'Pièces jointes'}</span>
					</button>
					<button
						type="button"
						onClick={() => toggleTaskAddPanel('checklist')}
						className="workflow-trello-modal-action"
						data-tone="blue"
						data-active={taskAddPanel === 'checklist'}
					>
						<CheckCircle2 size={17} />
						<span>{workflow.labels.checklistPanel ?? 'Checklist'}</span>
					</button>
					<button
						type="button"
						onClick={() => toggleTaskAddPanel('members')}
						className="workflow-trello-modal-action"
						data-tone="blue"
						data-active={taskAddPanel === 'members'}
					>
						<Users size={17} />
						<span>{workflow.labels.membersPanel ?? 'Members'}</span>
					</button>
					<button
						type="button"
						disabled={taskRestoreLocked}
						title={taskRestoreLocked ? workflow.labels.unarchiveProjectFirst : undefined}
						onClick={() => archiveTask({ id: task.id, archived: !task.archived })}
						className="workflow-trello-modal-action"
						data-tone={task.archived ? 'blue' : 'rose'}
					>
						<Archive size={17} />
						<span>
							{taskRestoreLocked
								? workflow.labels.unarchiveProjectFirst
								: task.archived
									? (workflow.buttons.restore ?? 'Restore')
									: (workflow.buttons.archive ?? 'Archive')}
						</span>
					</button>
				</>
			) : null}
		</div>
	);
};
