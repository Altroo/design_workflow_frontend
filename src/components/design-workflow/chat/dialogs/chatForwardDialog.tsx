'use client';
import { threadTitle, userLabel } from '@/utils/workflow/chatHelpers';
import { WorkflowAvatar } from '@/components/shared/workflow/workflowAvatar';
import { BriefcaseBusiness, Forward, MessagesSquare } from 'lucide-react';
import type { ChatController } from '@/utils/workflow/hooks/useChatController';
export const ChatForwardDialog = ({
	model,
}: {
	model: Pick<
		ChatController,
		| 'setForwardMessage'
		| 't'
		| 'actionSourcePreview'
		| 'forwardMessage'
		| 'forwardThreads'
		| 'activeUserById'
		| 'profile'
		| 'onlineUserIds'
		| 'forwardToThread'
		| 'pendingActionSources'
	>;
}) => {
	const {
		setForwardMessage,
		t,
		actionSourcePreview,
		forwardMessage,
		forwardThreads,
		activeUserById,
		profile,
		onlineUserIds,
		forwardToThread,
		pendingActionSources,
	} = model;
	if (!forwardMessage) return null;
	return (
		<div className="workflow-chat-create-modal" onClick={() => setForwardMessage(null)}>
			<div className="workflow-chat-create-card" onClick={(event) => event.stopPropagation()}>
				<div className="workflow-chat-create-head">
					<span>
						<Forward size={18} />
					</span>
					<div>
						<p>{t.workflow.buttons.forwardMessage ?? 'Forward message'}</p>
						<small>{actionSourcePreview(forwardMessage)}</small>
					</div>
				</div>
				<div className="workflow-chat-forward-list">
					{forwardThreads.map((thread) => {
						const privatePeer =
							thread.kind === 'private'
								? thread.participants
										.map((participant) => activeUserById.get(participant.id))
										.find((user) => user && user.id !== profile.id)
								: undefined;
						const peerOnline = privatePeer ? onlineUserIds.includes(privatePeer.id) : false;
						return (
							<button
								key={thread.id}
								type="button"
								onClick={() => forwardToThread(thread)}
								disabled={forwardMessage.is_deleted || pendingActionSources.has(forwardMessage.id)}
							>
								{privatePeer ? (
									<WorkflowAvatar
										user={privatePeer}
										size={34}
										online={peerOnline}
										showPresence
										avatarClassName="workflow-chat-avatar"
										presenceClassName="workflow-chat-presence-wrap"
										presenceDotClassName="workflow-chat-presence-badge"
									/>
								) : thread.kind === 'project' ? (
									<BriefcaseBusiness size={17} />
								) : (
									<MessagesSquare size={17} />
								)}
								<span className="workflow-chat-forward-copy">
									<b>
										{privatePeer
											? userLabel(privatePeer)
											: threadTitle(
													thread,
													profile.id,
													t.workflow.labels.publicStudio ?? 'Studio public',
													t.workflow.labels.privateChat ?? 'Private chat',
													t.workflow.labels.projectRoom ?? 'Project room',
													t.workflow.labels.taskRoom ?? 'Task room',
												)}
									</b>
									{privatePeer ? (
										<small>
											{peerOnline ? (t.workflow.labels.online ?? 'Online') : (t.workflow.labels.offline ?? 'Offline')}
										</small>
									) : null}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};
