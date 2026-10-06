'use client';

import { Mic, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { ChatComposer } from '@/components/design-workflow/chat/composer/chatComposer';
import { ChatForwardDialog } from '@/components/design-workflow/chat/dialogs/chatForwardDialog';
import { ChatMessageStream } from '@/components/design-workflow/chat/messages/chatMessageStream';
import { ChatReferencesDrawer } from '@/components/design-workflow/chat/references/chatReferencesDrawer';
import { ChatReferencePreview } from '@/components/design-workflow/chat/references/chatReferencePreview';
import { ChatReminderDialog } from '@/components/design-workflow/chat/dialogs/chatReminderDialog';
import { ChatRoomHeader } from '@/components/design-workflow/chat/header/chatRoomHeader';
import { ChatSidebar } from '@/components/design-workflow/chat/sidebar/chatSidebar';
import { ChatTaskDialog } from '@/components/design-workflow/chat/dialogs/chatTaskDialog';
import { useChatController } from '@/utils/workflow/hooks/useChatController';

const DesignWorkflowChat = () => {
	const model = useChatController();
	const {
		t,
		setDeleteTargetMessage,
		pendingActionSources,
		setSelectedImage,
		typingNames,
		recordingNames,
		referencesOpen,
		previewTarget,
		previewTask,
		previewProject,
		forwardMessage,
		reminderMessage,
		taskModalOpen,
		selectedImage,
		deleteTargetMessage,
		confirmDeleteMessage,
	} = model;
	return (
		<div className="workflow-chat-shell">
			<div className="workflow-chat-content">
				<ChatSidebar model={model} />

				<section className="workflow-chat-room">
					<ChatRoomHeader model={model} />
					<ChatMessageStream model={model} />
					{typingNames ? (
						<div className="workflow-chat-typing" role="status" aria-live="polite">
							<span className="workflow-chat-typing-dots" aria-hidden="true">
								<i />
								<i />
								<i />
							</span>
							<span>
								{typingNames} {t.workflow.labels.typing ?? 'is typing'}
							</span>
						</div>
					) : null}
					{recordingNames ? (
						<div className="workflow-chat-typing workflow-chat-recording-presence">
							<Mic size={15} />
							<span>
								{recordingNames} {t.workflow.labels.recordingVoice ?? 'is recording a voice note'}
							</span>
						</div>
					) : null}
					<ChatComposer model={model} />
				</section>
			</div>
			{referencesOpen ? <ChatReferencesDrawer model={model} /> : null}
			{previewTarget && (previewTask || previewProject) ? <ChatReferencePreview model={model} /> : null}
			{forwardMessage ? <ChatForwardDialog model={model} /> : null}
			{reminderMessage ? <ChatReminderDialog model={model} /> : null}
			{taskModalOpen ? <ChatTaskDialog model={model} /> : null}
			{selectedImage ? (
				<div
					className="fixed inset-0 z-260 grid place-items-center bg-indigo-950/55 p-4"
					onClick={() => setSelectedImage(null)}
				>
					<div className="relative max-h-[90vh] max-w-[90vw]" onClick={(event) => event.stopPropagation()}>
						<button
							type="button"
							onClick={() => setSelectedImage(null)}
							className="absolute right-3 top-3 z-10 rounded-full bg-indigo-600/90 p-2 text-white"
						>
							<X size={18} />
						</button>
						<Image
							src={selectedImage.src}
							alt={selectedImage.name}
							width={1200}
							height={900}
							unoptimized
							className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
						/>
					</div>
				</div>
			) : null}
			{deleteTargetMessage ? (
				<div className="workflow-chat-confirm-overlay" onClick={() => setDeleteTargetMessage(null)}>
					<div className="workflow-chat-confirm-modal" onClick={(event) => event.stopPropagation()}>
						<span>
							<Trash2 size={20} />
						</span>
						<div>
							<h3>{t.workflow.labels.deleteMessageTitle ?? 'Delete message?'}</h3>
							<p>
								{t.workflow.labels.deleteMessageBody ??
									'This message will be archived and hidden from the conversation.'}
							</p>
						</div>
						<div className="workflow-chat-confirm-actions">
							<button
								type="button"
								className="app-button app-button-ghost"
								onClick={() => setDeleteTargetMessage(null)}
							>
								{t.common.cancel}
							</button>
							<button
								type="button"
								className="app-button workflow-chat-danger-button"
								onClick={confirmDeleteMessage}
								disabled={pendingActionSources.has(deleteTargetMessage.id)}
							>
								<Trash2 size={16} />
								{t.common.delete}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
};
export default DesignWorkflowChat;
