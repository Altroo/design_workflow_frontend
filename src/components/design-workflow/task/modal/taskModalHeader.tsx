'use client';
import { Chip, FieldLabel } from '@/components/shared/workflow/workflowFields';
import { BOARD_STATUS_META } from '@/components/shared/workflow/boardAppearance';
import { runWithCleanup } from '@/utils/runWithCleanup';
import { ShieldCheck } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { TaskDetailModel } from '@/components/design-workflow/task/model/taskDetailModel';
export const TaskModalHeader = ({
	model,
}: {
	model: Pick<
		TaskDetailModel,
		| 'task'
		| 'labelFor'
		| 'displayReviewState'
		| 'cardTitleHeading'
		| 'taskMutable'
		| 'modalTitleDraft'
		| 'messageFor'
		| 'setModalTitleDraft'
		| 'renameLockRef'
		| 'updateTaskState'
		| 'runPrimaryAction'
		| 'updateTask'
		| 'workflow'
		| 't'
	>;
}) => {
	const {
		task,
		labelFor,
		displayReviewState,
		cardTitleHeading,
		taskMutable,
		modalTitleDraft,
		messageFor,
		setModalTitleDraft,
		renameLockRef,
		updateTaskState,
		runPrimaryAction,
		updateTask,
		workflow,
		t,
	} = model;
	return (
		<div className="workflow-trello-modal-titlebar">
			<div className="min-w-0">
				<div
					className="workflow-trello-modal-status-row"
					style={
						{
							'--task-status-soft': BOARD_STATUS_META[task.status].soft,
							'--task-status-text': BOARD_STATUS_META[task.status].text,
							'--task-status-accent': BOARD_STATUS_META[task.status].accent,
						} as CSSProperties
					}
				>
					<Chip status={task.status}>{labelFor(task.status)}</Chip>
					<Chip
						tone={
							displayReviewState === 'approved'
								? 'progress'
								: displayReviewState === 'changes_requested'
									? 'urgent'
									: displayReviewState === 'needs_review'
										? 'warning'
										: 'neutral'
						}
					>
						<span className="inline-flex items-center gap-1.5">
							<ShieldCheck size={12} />
							<span>{labelFor(displayReviewState)}</span>
						</span>
					</Chip>
					<span className="workflow-trello-modal-project-chip">{task.project.name}</span>
				</div>
				<div className="workflow-trello-modal-heading">
					<h2
						id="workflow-task-dialog-title"
						ref={cardTitleHeading}
						className={taskMutable && modalTitleDraft?.id === task.id ? 'sr-only' : undefined}
						data-editable={taskMutable}
						tabIndex={taskMutable ? (modalTitleDraft?.id === task.id ? -1 : 0) : undefined}
						title={taskMutable ? messageFor('Double-cliquez pour renommer', 'Double-click to rename') : undefined}
						onDoubleClick={() => {
							if (taskMutable) setModalTitleDraft({ id: task.id, title: task.title, original: task.title });
						}}
						onKeyDown={(event) => {
							if (taskMutable && ['Enter', 'F2'].includes(event.key)) {
								event.preventDefault();
								setModalTitleDraft({ id: task.id, title: task.title, original: task.title });
							}
						}}
					>
						{task.title}
					</h2>
					{taskMutable && modalTitleDraft?.id === task.id ? (
						<form
							className="workflow-trello-modal-title-edit"
							aria-label={messageFor('Renommer la carte', 'Rename card')}
							onSubmit={(event) => {
								event.preventDefault();
								const draft = modalTitleDraft;
								const title = draft.title.trim();
								if (
									!title ||
									title === task.title ||
									title.length > 255 ||
									renameLockRef.current ||
									updateTaskState.isLoading
								)
									return;
								renameLockRef.current = true;
								void runWithCleanup(
									() =>
										runPrimaryAction(
											async () => {
												await updateTask({
													id: task.id,
													data: { title, expected_values: { title: draft.original } },
												}).unwrap();
												setModalTitleDraft((current) => (current === draft ? null : current));
											},
											messageFor('Carte renommée avec succès.', 'Card renamed successfully.'),
											messageFor('Impossible de renommer la carte.', 'Could not rename the card.'),
										),
									() => {
										renameLockRef.current = false;
									},
								);
							}}
						>
							<div>
								<FieldLabel htmlFor="workflow-card-title">{messageFor('Titre de la carte', 'Card title')}</FieldLabel>
								<input
									id="workflow-card-title"
									className="app-input"
									value={modalTitleDraft.title}
									onChange={(event) => setModalTitleDraft({ ...modalTitleDraft, title: event.target.value })}
									maxLength={255}
									required
									autoFocus
									disabled={updateTaskState.isLoading}
								/>
							</div>
							<div className="workflow-trello-modal-inline-actions">
								<button
									type="submit"
									className="workflow-trello-modal-save"
									disabled={
										updateTaskState.isLoading ||
										!modalTitleDraft.title.trim() ||
										modalTitleDraft.title.trim() === task.title
									}
								>
									{updateTaskState.isLoading ? workflow.buttons.saving : t.common.save}
								</button>
								<button
									type="button"
									className="workflow-trello-modal-cancel"
									onClick={() => {
										setModalTitleDraft(null);
										cardTitleHeading.current?.focus();
									}}
								>
									{t.common.cancel}
								</button>
							</div>
						</form>
					) : null}
				</div>
			</div>
		</div>
	);
};
