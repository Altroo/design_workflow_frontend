'use client';
import { isImageAttachment, resolveMediaUrl, userLabel } from '@/utils/workflow/chatHelpers';
import type { ChatController } from '@/utils/workflow/hooks/useChatController';
import { BriefcaseBusiness, CheckSquare2, FileText, ImageIcon, Images, X } from 'lucide-react';

export const ChatReferencesDrawer = ({
	model,
}: {
	model: Pick<
		ChatController,
		| 'setReferencesOpen'
		| 'drawerMode'
		| 'mediaAttachments'
		| 'linkedReferenceCount'
		| 'linkedReferences'
		| 'setPreviewTarget'
		| 'statusLabelFor'
		| 't'
	>;
}) => {
	const {
		setReferencesOpen,
		drawerMode,
		mediaAttachments,
		linkedReferenceCount,
		linkedReferences,
		setPreviewTarget,
		statusLabelFor,
		t,
	} = model;
	const media = drawerMode === 'media';
	const empty = media ? !mediaAttachments.length : !linkedReferences.tasks.length && !linkedReferences.projects.length;
	return (
		<div className="workflow-chat-ref-overlay" onClick={() => setReferencesOpen(false)}>
			<aside
				className="workflow-chat-refs workflow-chat-refs-drawer"
				aria-label={media ? t.workflow.labels.mediaFiles : t.workflow.labels.linkedReferences}
				onClick={(event) => event.stopPropagation()}
			>
				<div className="workflow-chat-ref-drawer-head">
					<div className="workflow-chat-ref-drawer-title">
						<span>{media ? <Images size={18} /> : <BriefcaseBusiness size={18} />}</span>
						<div>
							<p>{media ? t.workflow.labels.mediaFiles : t.workflow.labels.linkedReferences}</p>
							<small>
								{media ? mediaAttachments.length : linkedReferenceCount} {t.workflow.labels.items}
							</small>
						</div>
					</div>
					<button type="button" onClick={() => setReferencesOpen(false)} aria-label={t.common.close}>
						<X size={16} />
					</button>
				</div>
				<div className="workflow-chat-ref-list">
					{!media ? (
						<>
							{linkedReferences.tasks.map((task) => (
								<button
									key={`task-${task.id}`}
									type="button"
									onClick={() => setPreviewTarget({ kind: 'task', id: task.id })}
									className="workflow-chat-ref-card workflow-chat-ref-task"
								>
									<span>
										<CheckSquare2 size={16} />
									</span>
									<b>{task.title}</b>
									<small>{task.project.name}</small>
								</button>
							))}
							{linkedReferences.projects.map((project) => (
								<button
									key={`project-${project.id}`}
									type="button"
									onClick={() => setPreviewTarget({ kind: 'project', id: project.id })}
									className="workflow-chat-ref-card workflow-chat-ref-project"
								>
									<span>
										<BriefcaseBusiness size={16} />
									</span>
									<b>{project.name}</b>
									<small>{statusLabelFor(project.status)}</small>
								</button>
							))}
						</>
					) : (
						mediaAttachments.map(({ message, attachment }) => (
							<a
								key={`media-${message.id}-${attachment.id}`}
								href={resolveMediaUrl(attachment.file_url ?? attachment.file)}
								target="_blank"
								rel="noreferrer"
								className="workflow-chat-ref-card workflow-chat-ref-media"
							>
								<span>
									{isImageAttachment(attachment.mime_type, attachment.name, attachment.file_url ?? attachment.file) ? (
										<ImageIcon size={16} />
									) : (
										<FileText size={16} />
									)}
								</span>
								<b>{attachment.name}</b>
								<small>{userLabel(message.sender)}</small>
							</a>
						))
					)}
					{empty ? (
						<div className="workflow-chat-ref-empty">
							<span>
								<CheckSquare2 size={18} />
							</span>
							<span>{media ? t.workflow.labels.emptyState : t.workflow.labels.chatReferencesEmpty}</span>
						</div>
					) : null}
				</div>
			</aside>
		</div>
	);
};
