'use client';
import {
	Area,
	AvatarBadge,
	EmptyState,
	FieldLabel,
	HistoryPager,
	Surface,
} from '@/components/shared/workflow/workflowFields';
import { MessagesSquare } from 'lucide-react';
import type { TaskDetailModel } from '@/components/design-workflow/task/model/taskDetailModel';
export const TaskCommentsPanel = ({
	model,
}: {
	model: Pick<
		TaskDetailModel,
		| 'workflow'
		| 'taskMutable'
		| 'commentBody'
		| 'setCommentBody'
		| 'mentionableUsers'
		| 'runPrimaryAction'
		| 'addTaskComment'
		| 'task'
		| 'messageFor'
		| 'addCommentState'
		| 'pagedTaskComments'
		| 'dateTimeFor'
		| 'taskCommentsPage'
		| 'taskCommentsTotalPages'
		| 'setTaskCommentsPage'
	>;
}) => {
	const {
		workflow,
		taskMutable,
		commentBody,
		setCommentBody,
		mentionableUsers,
		runPrimaryAction,
		addTaskComment,
		task,
		messageFor,
		addCommentState,
		pagedTaskComments,
		dateTimeFor,
		taskCommentsPage,
		taskCommentsTotalPages,
		setTaskCommentsPage,
	} = model;
	return (
		<Surface className="workflow-task-detail-panel workflow-task-comments-panel" {...workflow.sections.comments}>
			{taskMutable ? (
				<div className="space-y-3">
					<FieldLabel htmlFor="add-comment">{workflow.labels.addComment}</FieldLabel>
					<Area
						ai="comment"
						id="add-comment"
						value={commentBody}
						onChangeAction={setCommentBody}
						mentionUsers={mentionableUsers}
						rows={3}
						placeholder={workflow.labels.commentPlaceholder}
						startIcon={<MessagesSquare size={18} />}
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
						className="app-button"
					>
						<MessagesSquare size={16} />
						<span>{addCommentState.isLoading ? workflow.buttons.posting : workflow.buttons.postComment}</span>
					</button>
				</div>
			) : null}
			<div className="mt-4 space-y-3">
				{pagedTaskComments.map((comment) => (
					<div key={comment.id} className="app-card-muted p-4">
						<div className="flex items-start gap-3">
							<AvatarBadge user={comment.author} size={34} />
							<div className="min-w-0 flex-1">
								<p className="text-sm font-semibold text-(--ink)">
									{comment.author.first_name} {comment.author.last_name}
								</p>
								<p className="mt-1 text-xs uppercase tracking-[0.14em] text-(--ink-soft)">
									{dateTimeFor(comment.created_at)}
								</p>
								<p className="mt-2 text-sm leading-6 text-(--ink-soft)">{comment.body}</p>
							</div>
						</div>
					</div>
				))}
				{task.comments.length === 0 ? <EmptyState {...workflow.emptyStates.noCommentsYet} /> : null}
				<HistoryPager
					page={taskCommentsPage}
					totalPages={taskCommentsTotalPages}
					onChangeAction={setTaskCommentsPage}
				/>
			</div>
		</Surface>
	);
};
