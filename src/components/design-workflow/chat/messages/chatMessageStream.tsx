'use client';
import AiAssistantControl from '@/components/shared/aiAssistantControl/aiAssistantControl';
import {
	fileIconLabel,
	formatDayLabel,
	formatTime,
	isAudioAttachment,
	isImageAttachment,
	linkedReferencesForBody,
	readableReferenceText,
	resolveMediaUrl,
	scrollToMessage,
	threadTitle,
	userLabel,
} from '@/utils/workflow/chatHelpers';
import { renderLinkedMessageBody } from '@/components/design-workflow/chat/messages/chatMessageBody';
import { VoiceMessagePlayer } from '@/components/design-workflow/chat/messages/voiceMessagePlayer';
import { WorkflowAvatar } from '@/components/shared/workflow/workflowAvatar';
import { OTHER_BUBBLE_COLORS, REACTION_OPTIONS } from '@/utils/rawData';
import {
	AlarmClock,
	ArrowDown,
	BriefcaseBusiness,
	CheckSquare2,
	Edit3,
	Forward,
	ImageIcon,
	ListTodo,
	MessagesSquare,
	Reply,
	SmilePlus,
	Trash2,
} from 'lucide-react';
import Image from 'next/image';
import type { ChatController } from '@/utils/workflow/hooks/useChatController';
export const ChatMessageStream = ({
	model,
}: {
	model: Pick<
		ChatController,
		| 'scrollRef'
		| 'hasOlder'
		| 'loadingOlder'
		| 'loadMoreHistory'
		| 't'
		| 'chatInitialLoading'
		| 'messagesBusy'
		| 'selectedThread'
		| 'messageList'
		| 'profile'
		| 'groupedMessages'
		| 'locale'
		| 'tasks'
		| 'projects'
		| 'replyTarget'
		| 'firstUnreadMessageId'
		| 'startPrivateThread'
		| 'setReplyTarget'
		| 'composerInputRef'
		| 'setReactionPickerMessageId'
		| 'reactionPickerMessageId'
		| 'reactChatMessage'
		| 'openReminder'
		| 'setForwardMessage'
		| 'writableProjects'
		| 'openCreateTaskFromMessage'
		| 'setEditingMessage'
		| 'setEditText'
		| 'setDeleteTargetMessage'
		| 'editingMessage'
		| 'pendingActionSources'
		| 'actionSourcePreview'
		| 'editText'
		| 'submitEdit'
		| 'messageMentionUsers'
		| 'setPreviewTarget'
		| 'setSelectedImage'
	>;
}) => {
	const {
		scrollRef,
		hasOlder,
		loadingOlder,
		loadMoreHistory,
		t,
		chatInitialLoading,
		messagesBusy,
		selectedThread,
		messageList,
		profile,
		groupedMessages,
		locale,
		tasks,
		projects,
		replyTarget,
		firstUnreadMessageId,
		startPrivateThread,
		setReplyTarget,
		composerInputRef,
		setReactionPickerMessageId,
		reactionPickerMessageId,
		reactChatMessage,
		openReminder,
		setForwardMessage,
		writableProjects,
		openCreateTaskFromMessage,
		setEditingMessage,
		setEditText,
		setDeleteTargetMessage,
		editingMessage,
		pendingActionSources,
		actionSourcePreview,
		editText,
		submitEdit,
		messageMentionUsers,
		setPreviewTarget,
		setSelectedImage,
	} = model;
	return (
		<div ref={scrollRef} className="workflow-chat-stream">
			{hasOlder ? (
				<div className="flex justify-center">
					<button
						type="button"
						disabled={loadingOlder}
						onClick={() => {
							void loadMoreHistory();
						}}
						className="workflow-chat-load-older"
					>
						<ArrowDown size={15} />
						<span>
							{loadingOlder ? (t.common.loading ?? 'Chargement...') : (t.workflow.buttons.loadOlder ?? 'Load older')}
						</span>
					</button>
				</div>
			) : null}

			{chatInitialLoading || messagesBusy ? (
				<div className="workflow-chat-loading-state" role="status" aria-live="polite">
					<span aria-hidden="true" />
					<h3>{t.workflow.labels.loading ?? t.common.loading ?? 'Loading...'}</h3>
					<p>
						{t.workflow.labels.loadingConversation ??
							t.workflow.labels.selectConversationHint ??
							'Loading conversations.'}
					</p>
				</div>
			) : null}

			{!chatInitialLoading && !messagesBusy && !selectedThread ? (
				<div className="workflow-chat-empty-state">
					<span>
						<MessagesSquare size={22} />
					</span>
					<h3>{t.workflow.labels.selectConversation ?? 'Select a conversation'}</h3>
					<p>{t.workflow.labels.selectConversationHint ?? 'Choose a project or direct message.'}</p>
				</div>
			) : null}

			{!chatInitialLoading && !messagesBusy && selectedThread && messageList.length === 0 ? (
				<div className="workflow-chat-empty-state">
					<span>
						<MessagesSquare size={22} />
					</span>
					<h3>{t.workflow.labels.emptyConversation ?? t.workflow.labels.noMessageYet ?? 'No message yet'}</h3>
					<p>
						{t.workflow.labels.emptyConversationHint ??
							threadTitle(
								selectedThread,
								profile.id,
								t.workflow.labels.publicStudio ?? 'Public channel',
								t.workflow.labels.privateChat ?? 'Private chat',
								t.workflow.labels.projectRoom ?? 'Project room',
								t.workflow.labels.taskRoom ?? 'Task room',
							)}
					</p>
				</div>
			) : null}

			{messagesBusy
				? null
				: groupedMessages.map((group) => (
						<div key={group.day} className="space-y-3">
							<div className="flex justify-center">
								<span className="workflow-chat-day-chip">
									{formatDayLabel(
										group.items[0].created_at,
										t.workflow.labels.today ?? 'Today',
										t.workflow.labels.yesterday ?? 'Yesterday',
										locale,
									)}
								</span>
							</div>
							{group.items.map((message) => {
								const mine = message.sender.id === profile.id;
								const messageReferences = linkedReferencesForBody(message.body, tasks, projects);
								const senderName =
									selectedThread?.kind === 'public'
										? userLabel(message.sender)
										: mine
											? (t.workflow.labels.you ?? 'You')
											: userLabel(message.sender);
								const bubbleTone = mine
									? 'border-(--accent) bg-(--accent-soft)'
									: OTHER_BUBBLE_COLORS[message.sender.id % OTHER_BUBBLE_COLORS.length];
								return (
									<div
										key={message.id}
										id={`chat-message-${message.id}`}
										data-testid={`workflow-chat-message-${message.id}`}
										data-message-id={message.id}
										className={[
											'workflow-chat-message-row',
											replyTarget?.id === message.id ? 'is-reply-target' : '',
										].join(' ')}
									>
										{firstUnreadMessageId === message.id ? (
											<div className="workflow-chat-unread-separator">
												<span>{t.workflow.labels.unreadMessages ?? 'Unread messages'}</span>
											</div>
										) : null}
										<div className={['flex items-end gap-3', mine ? 'justify-end' : 'justify-start'].join(' ')}>
											{!mine ? (
												<button
													type="button"
													onClick={() => selectedThread?.kind === 'public' && void startPrivateThread(message.sender)}
													className="workflow-chat-avatar-button"
													aria-label={userLabel(message.sender)}
												>
													<WorkflowAvatar user={message.sender} size={34} avatarClassName="workflow-chat-avatar" />
												</button>
											) : null}
											<div
												className={[
													'workflow-chat-bubble max-w-[82%] rounded-2xl border px-4 py-3 shadow-(--shadow-sm)',
													mine ? 'workflow-chat-bubble-mine' : '',
													bubbleTone,
												].join(' ')}
											>
												<div className="workflow-chat-message-head mb-2 flex items-start justify-between gap-3">
													<button
														type="button"
														onClick={() =>
															selectedThread?.kind === 'public' && !mine && void startPrivateThread(message.sender)
														}
														className="workflow-chat-sender-name"
														disabled={selectedThread?.kind !== 'public' || mine}
													>
														{senderName}
													</button>
													<div className="workflow-chat-message-actions flex items-center gap-2 text-(--ink-soft)">
														<button
															type="button"
															onClick={() => {
																setReplyTarget(message);
																requestAnimationFrame(() => composerInputRef.current?.focus());
															}}
															className="hover:text-(--ink)"
															data-action="reply"
															aria-label={t.workflow.buttons.reply ?? 'Reply'}
															title={t.workflow.buttons.reply ?? 'Reply'}
														>
															<Reply size={15} />
														</button>
														{!message.is_deleted ? (
															<span className="workflow-chat-reaction-menu">
																<button
																	type="button"
																	onClick={() =>
																		setReactionPickerMessageId((current) =>
																			current === message.id ? null : message.id,
																		)
																	}
																	className="hover:text-(--ink)"
																	data-action="react"
																	aria-label={t.workflow.buttons.react ?? 'React'}
																	title={t.workflow.buttons.react ?? 'React'}
																>
																	<SmilePlus size={15} />
																</button>
																{reactionPickerMessageId === message.id ? (
																	<span className="workflow-chat-reaction-picker">
																		{REACTION_OPTIONS.map(({ emoji, label, Icon }) => {
																			const active = message.reactions.some(
																				(reaction) => reaction.emoji === emoji && reaction.user.id === profile.id,
																			);
																			return (
																				<button
																					key={emoji}
																					type="button"
																					className={active ? 'is-active' : ''}
																					onClick={() => {
																						reactChatMessage({ id: message.id, emoji });
																						setReactionPickerMessageId(null);
																					}}
																					aria-label={label}
																				>
																					<Icon size={15} />
																				</button>
																			);
																		})}
																	</span>
																) : null}
															</span>
														) : null}
														{!message.is_deleted ? (
															<button
																type="button"
																onClick={() => openReminder(message)}
																className="hover:text-(--ink)"
																data-action="reminder"
																aria-label={t.workflow.buttons.addReminder ?? 'Add reminder'}
																title={t.workflow.buttons.addReminder ?? 'Add reminder'}
															>
																<AlarmClock size={15} />
															</button>
														) : null}
														{!message.is_deleted ? (
															<button
																type="button"
																onClick={() => setForwardMessage(message)}
																className="hover:text-(--ink)"
																data-action="forward"
																aria-label={t.workflow.buttons.forwardMessage ?? 'Forward'}
																title={t.workflow.buttons.forwardMessage ?? 'Forward'}
															>
																<Forward size={15} />
															</button>
														) : null}
														{!message.is_deleted && writableProjects.length > 0 ? (
															<button
																type="button"
																onClick={() => openCreateTaskFromMessage(message)}
																className="workflow-chat-create-task-action hover:text-(--accent-strong)"
																data-action="task"
																aria-label={t.workflow.buttons.createTaskFromMessage ?? 'Create task from message'}
																title={t.workflow.buttons.createTaskFromMessage ?? 'Create task from message'}
															>
																<ListTodo size={15} />
															</button>
														) : null}
														{mine && !message.is_deleted ? (
															<button
																type="button"
																onClick={() => {
																	setEditingMessage(message);
																	setEditText(message.body);
																}}
																className="hover:text-(--ink)"
																data-action="edit"
																aria-label={t.workflow.buttons.editMessage ?? 'Edit'}
																title={t.workflow.buttons.editMessage ?? 'Edit'}
															>
																<Edit3 size={15} />
															</button>
														) : null}
														{mine && !message.is_deleted ? (
															<button
																type="button"
																onClick={() => setDeleteTargetMessage(message)}
																className="hover:text-red-600"
																data-action="delete"
																aria-label={t.workflow.buttons.deleteMessage ?? 'Delete message'}
																title={t.workflow.buttons.deleteMessage ?? 'Delete message'}
															>
																<Trash2 size={15} />
															</button>
														) : null}
													</div>
												</div>
												{message.reply_to ? (
													<button
														type="button"
														onClick={() => scrollToMessage(message.reply_to!.id)}
														className="workflow-chat-reply-reference mb-2 w-full rounded-lg border border-black/8 bg-white/70 px-3 py-2 text-left text-xs text-(--ink-soft)"
													>
														<p className="font-semibold text-(--ink)">{userLabel(message.reply_to.sender)}</p>
														<p className="mt-1 line-clamp-2">
															{readableReferenceText(message.reply_to.body, tasks, projects)}
														</p>
													</button>
												) : null}
												{editingMessage?.id === message.id ? (
													<div className="workflow-chat-edit-box">
														{editingMessage.is_deleted || pendingActionSources.has(editingMessage.id) ? (
															<p role="status">{actionSourcePreview(editingMessage)}</p>
														) : null}
														<textarea
															value={editText}
															onChange={(event) => setEditText(event.target.value)}
															rows={3}
															className="app-input resize-none"
														/>
														<AiAssistantControl
															key={message.id}
															value={editText}
															onApply={setEditText}
															context="chat_message"
														/>
														<div>
															<button
																type="button"
																className="app-button app-button-ghost"
																onClick={() => setEditingMessage(null)}
															>
																{t.common.cancel}
															</button>
															<button
																type="button"
																className="app-button"
																onClick={submitEdit}
																disabled={editingMessage.is_deleted || pendingActionSources.has(editingMessage.id)}
															>
																{t.common.save ?? 'Save'}
															</button>
														</div>
													</div>
												) : message.body || message.is_deleted ? (
													<p className="whitespace-pre-wrap text-sm leading-6 text-(--ink)">
														{message.is_deleted
															? (t.workflow.labels.messageDeleted ?? 'Message deleted')
															: renderLinkedMessageBody(message.body, messageMentionUsers, tasks, projects)}
													</p>
												) : null}
												{message.edited_at && !message.is_deleted ? (
													<p className="workflow-chat-message-meta">
														{t.workflow.labels.edited ?? 'Edited'} - {message.edit_count}
													</p>
												) : null}
												{!message.is_deleted &&
												(messageReferences.tasks.length || messageReferences.projects.length) ? (
													<div className="workflow-chat-rich-previews">
														{messageReferences.tasks.map((task) => (
															<div
																key={`task-preview-${message.id}-${task.id}`}
																className="workflow-chat-rich-card workflow-chat-rich-task"
															>
																<span>
																	<CheckSquare2 size={16} />
																</span>
																<div>
																	<button type="button" onClick={() => setPreviewTarget({ kind: 'task', id: task.id })}>
																		{task.title}
																	</button>
																	<small>
																		{task.project.name} - {t.workflow.statuses[task.status] ?? task.status}
																	</small>
																</div>
															</div>
														))}
														{messageReferences.projects.map((project) => (
															<div
																key={`project-preview-${message.id}-${project.id}`}
																className="workflow-chat-rich-card workflow-chat-rich-project"
															>
																<span>
																	<BriefcaseBusiness size={16} />
																</span>
																<div>
																	<button
																		type="button"
																		onClick={() => setPreviewTarget({ kind: 'project', id: project.id })}
																	>
																		{project.name}
																	</button>
																	<small>{t.workflow.statuses[project.status] ?? project.status}</small>
																</div>
															</div>
														))}
													</div>
												) : null}
												{!message.is_deleted && message.reactions.length ? (
													<div className="workflow-chat-reactions">
														{REACTION_OPTIONS.map(({ emoji, label, Icon }) => {
															const matchingReactions = message.reactions.filter(
																(reaction) => reaction.emoji === emoji,
															);
															const count = matchingReactions.length;
															if (!count) return null;
															const active = matchingReactions.some((reaction) => reaction.user.id === profile.id);
															const participantNames = matchingReactions.map((reaction) =>
																reaction.user.id === profile.id
																	? (t.workflow.labels.you ?? 'You')
																	: userLabel(reaction.user),
															);
															const participantsLabel = participantNames.join(', ');
															return (
																<button
																	key={emoji}
																	type="button"
																	className={active ? 'is-active' : ''}
																	onClick={() => reactChatMessage({ id: message.id, emoji })}
																	aria-label={`${label}: ${participantsLabel}`}
																	title={participantsLabel}
																>
																	<Icon size={13} />
																	<b className="workflow-chat-reaction-participants">{participantsLabel}</b>
																</button>
															);
														})}
													</div>
												) : null}
												{message.attachments.length ? (
													<div className="mt-2 space-y-2">
														{message.attachments.map((attachment) => {
															const attachmentUrl = resolveMediaUrl(attachment.file_url ?? attachment.file);
															if (
																isImageAttachment(
																	attachment.mime_type,
																	attachment.name,
																	attachment.file_url ?? attachment.file,
																)
															) {
																return (
																	<button
																		key={attachment.id}
																		type="button"
																		onClick={() =>
																			setSelectedImage({
																				src: attachmentUrl,
																				name: attachment.name,
																			})
																		}
																		className="workflow-chat-image-attachment"
																	>
																		<Image
																			src={attachmentUrl}
																			alt={attachment.name}
																			width={720}
																			height={288}
																			unoptimized
																			loading="eager"
																			className="w-full object-cover"
																		/>
																		<div className="workflow-chat-attachment-label">
																			<ImageIcon size={15} />
																			<span className="truncate">{attachment.name}</span>
																		</div>
																	</button>
																);
															}
															if (
																isAudioAttachment(
																	attachment.mime_type,
																	attachment.name,
																	attachment.file_url ?? attachment.file,
																)
															) {
																return (
																	<VoiceMessagePlayer
																		key={attachment.id}
																		src={attachmentUrl}
																		seed={`${attachment.id}-${attachment.name}`}
																		label={t.workflow.buttons.voiceNote ?? 'Voice message'}
																	/>
																);
															}
															return (
																<a
																	key={attachment.id}
																	href={attachmentUrl}
																	target="_blank"
																	rel="noreferrer"
																	className="flex items-center gap-3 rounded-lg border border-(--line) bg-white/70 px-3 py-3 text-sm font-semibold text-(--ink)"
																>
																	<span className="grid h-9 w-9 place-items-center rounded-lg bg-(--surface-strong) text-[11px] font-bold text-(--ink)">
																		{fileIconLabel(attachment.name)}
																	</span>
																	<span className="truncate">{attachment.name}</span>
																</a>
															);
														})}
													</div>
												) : null}
												<p className="mt-2 text-right text-[11px] font-semibold text-(--ink-muted)">
													{formatTime(message.created_at, locale)}{' '}
													{mine
														? message.is_read
															? (t.workflow.labels.read ?? 'Read')
															: (t.workflow.labels.sent ?? 'Sent')
														: ''}
												</p>
											</div>
											{mine ? (
												<WorkflowAvatar
													user={{
														...message.sender,
														avatar: typeof profile.avatar === 'string' ? profile.avatar : message.sender.avatar,
													}}
													size={34}
													avatarClassName="workflow-chat-avatar"
												/>
											) : null}
										</div>
									</div>
								);
							})}
						</div>
					))}
		</div>
	);
};
