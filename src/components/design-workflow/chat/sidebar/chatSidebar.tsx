'use client';
import { threadTitle, userLabel } from '@/utils/workflow/chatHelpers';
import { WorkflowAvatar } from '@/components/shared/workflow/workflowAvatar';
import { WorkflowPageHero } from '@/components/shared/workflow/workflowPrimitives';
import { BriefcaseBusiness, ChevronDown, ImageIcon, MessagesSquare, Paperclip } from 'lucide-react';
import type { ChatController } from '@/utils/workflow/hooks/useChatController';
export const ChatSidebar = ({
	model,
}: {
	model: Pick<
		ChatController,
		| 't'
		| 'openSidebarSection'
		| 'setOpenSidebarSection'
		| 'publicThreads'
		| 'unreadBySection'
		| 'threadPreviewFor'
		| 'setSelectedThreadId'
		| 'selectedThread'
		| 'profile'
		| 'projects'
		| 'projectThreadByProjectId'
		| 'startProjectThread'
		| 'users'
		| 'privateThreadByUserId'
		| 'createThread'
		| 'setOptimisticSelectedThread'
		| 'onlineUserIds'
	>;
}) => {
	const {
		t,
		openSidebarSection,
		setOpenSidebarSection,
		publicThreads,
		unreadBySection,
		threadPreviewFor,
		setSelectedThreadId,
		selectedThread,
		profile,
		projects,
		projectThreadByProjectId,
		startProjectThread,
		users,
		privateThreadByUserId,
		createThread,
		setOptimisticSelectedThread,
		onlineUserIds,
	} = model;
	return (
		<aside className="workflow-chat-sidebar">
			<WorkflowPageHero
				element="div"
				className="workflow-chat-sidebar-head"
				title={t.workflow.labels.chatTitle ?? 'Chat'}
				titleElement="h2"
			/>
			<div className="workflow-chat-thread-section" data-open={openSidebarSection === 'studio'}>
				<button
					type="button"
					className="workflow-chat-panel-toggle"
					data-open={openSidebarSection === 'studio'}
					aria-expanded={openSidebarSection === 'studio'}
					aria-controls="workflow-chat-studio-list"
					onClick={() => setOpenSidebarSection('studio')}
				>
					<span className="workflow-chat-panel-pill">
						<span>{t.workflow.labels.chatTitle ?? 'Studio chat'}</span>
						<em>{publicThreads.length}</em>
					</span>
					<span className="workflow-chat-panel-status">
						{unreadBySection.studio ? (
							<span
								className="workflow-chat-section-unread"
								aria-label={`${unreadBySection.studio} ${t.workflow.labels.unreadMessages ?? 'unread messages'}`}
							>
								{unreadBySection.studio}
							</span>
						) : null}
						<ChevronDown size={16} />
					</span>
				</button>
				<div
					id="workflow-chat-studio-list"
					className="workflow-chat-section-body"
					data-open={openSidebarSection === 'studio'}
				>
					<div className="workflow-chat-section-inner">
						{publicThreads.map((thread) => {
							const preview = threadPreviewFor(thread);
							return (
								<button
									key={thread.id}
									type="button"
									onClick={() => {
										setOpenSidebarSection('studio');
										setSelectedThreadId(thread.id);
									}}
									className={[
										'workflow-chat-thread-button',
										selectedThread?.id === thread.id ? 'is-active' : '',
										thread.unread_count ? 'is-unread' : '',
									].join(' ')}
								>
									<span className="workflow-chat-context-icon workflow-chat-context-icon-studio">
										<MessagesSquare size={16} />
									</span>
									<span>
										<b>
											{threadTitle(
												thread,
												profile.id,
												t.workflow.labels.publicStudio ?? 'Studio public',
												t.workflow.labels.privateChat ?? 'Private chat',
												t.workflow.labels.projectRoom ?? 'Project room',
												t.workflow.labels.taskRoom ?? 'Task room',
											)}
										</b>
										<small className="workflow-chat-thread-preview">
											{preview.kind === 'photo' ? <ImageIcon size={13} /> : null}
											{preview.kind === 'attachment' ? <Paperclip size={13} /> : null}
											<span>{preview.text}</span>
										</small>
									</span>
									{thread.unread_count ? <i>{thread.unread_count}</i> : null}
								</button>
							);
						})}
					</div>
				</div>
			</div>
			<div className="workflow-chat-context-section" data-open={openSidebarSection === 'projects'}>
				<button
					type="button"
					className="workflow-chat-panel-toggle"
					data-open={openSidebarSection === 'projects'}
					aria-expanded={openSidebarSection === 'projects'}
					aria-controls="workflow-chat-project-list"
					onClick={() => setOpenSidebarSection('projects')}
				>
					<span className="workflow-chat-panel-pill workflow-chat-panel-pill-amber">
						<span>{t.workflow.labels.projects ?? 'Projects'}</span>
						<em>{projects.length}</em>
					</span>
					<span className="workflow-chat-panel-status">
						{unreadBySection.projects ? (
							<span
								className="workflow-chat-section-unread"
								aria-label={`${unreadBySection.projects} ${t.workflow.labels.unreadMessages ?? 'unread messages'}`}
							>
								{unreadBySection.projects}
							</span>
						) : null}
						<ChevronDown size={16} />
					</span>
				</button>
				<div
					id="workflow-chat-project-list"
					className="workflow-chat-section-body"
					data-open={openSidebarSection === 'projects'}
				>
					<div className="workflow-chat-context-list">
						{projects.map((project) => {
							const thread = projectThreadByProjectId.get(project.id);
							const preview = thread ? threadPreviewFor(thread) : null;
							const hasUnread = Boolean(thread?.unread_count);
							const isActive = selectedThread?.id === thread?.id;
							return (
								<button
									key={project.id}
									type="button"
									onClick={() => {
										setOpenSidebarSection('projects');
										void startProjectThread(project);
									}}
									className={[
										'workflow-chat-context-button',
										hasUnread ? 'is-unread' : '',
										isActive ? 'is-active' : '',
									].join(' ')}
								>
									<span className="workflow-chat-context-icon">
										<BriefcaseBusiness size={15} />
									</span>
									<span className="workflow-chat-direct-copy">
										<b>{project.name}</b>
										<small className="workflow-chat-thread-preview">
											{preview?.kind === 'photo' ? <ImageIcon size={13} /> : null}
											{preview?.kind === 'attachment' ? <Paperclip size={13} /> : null}
											<span>{preview?.text ?? t.workflow.labels.noMessageYet ?? 'No message yet'}</span>
										</small>
									</span>
									{thread?.unread_count ? <i>{thread.unread_count}</i> : null}
								</button>
							);
						})}
					</div>
				</div>
			</div>
			<div className="workflow-chat-direct-section" data-open={openSidebarSection === 'direct'}>
				<button
					type="button"
					className="workflow-chat-panel-toggle"
					data-open={openSidebarSection === 'direct'}
					aria-expanded={openSidebarSection === 'direct'}
					aria-controls="workflow-chat-direct-list"
					onClick={() => setOpenSidebarSection('direct')}
				>
					<span className="workflow-chat-panel-pill workflow-chat-panel-pill-green">
						<span>{t.workflow.labels.privateConversations ?? 'Private'}</span>
						<em>{users.length}</em>
					</span>
					<span className="workflow-chat-panel-status">
						{unreadBySection.direct ? (
							<span
								className="workflow-chat-section-unread"
								aria-label={`${unreadBySection.direct} ${t.workflow.labels.unreadMessages ?? 'unread messages'}`}
							>
								{unreadBySection.direct}
							</span>
						) : null}
						<ChevronDown size={16} />
					</span>
				</button>
				<div
					id="workflow-chat-direct-list"
					className="workflow-chat-section-body"
					data-open={openSidebarSection === 'direct'}
				>
					<div className="workflow-chat-direct-list">
						{users.map((user) => {
							const thread = privateThreadByUserId.get(user.id);
							const preview = thread ? threadPreviewFor(thread) : null;
							const hasUnread = Boolean(thread?.unread_count);
							const isActive = selectedThread?.id === thread?.id;
							return (
								<button
									key={user.id}
									type="button"
									onClick={async () => {
										setOpenSidebarSection('direct');
										const nextThread =
											thread ?? (await createThread({ kind: 'private', recipient_id: user.id }).unwrap());
										if (!thread) setOptimisticSelectedThread(nextThread);
										setSelectedThreadId(nextThread.id);
									}}
									className={[
										'workflow-chat-direct-button',
										hasUnread ? 'is-unread' : '',
										isActive ? 'is-active' : '',
									].join(' ')}
								>
									<WorkflowAvatar
										user={user}
										size={30}
										online={onlineUserIds.includes(user.id)}
										showPresence
										avatarClassName="workflow-chat-avatar"
										presenceClassName="workflow-chat-presence-wrap"
										presenceDotClassName="workflow-chat-presence-badge"
									/>
									<span className="workflow-chat-direct-copy">
										<b>{userLabel(user)}</b>
										<small className="workflow-chat-thread-preview">
											{preview?.kind === 'photo' ? <ImageIcon size={13} /> : null}
											{preview?.kind === 'attachment' ? <Paperclip size={13} /> : null}
											<span>{preview?.text ?? t.workflow.labels.noMessageYet ?? 'No message yet'}</span>
										</small>
									</span>
									{hasUnread ? <i>{thread?.unread_count}</i> : null}
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</aside>
	);
};
