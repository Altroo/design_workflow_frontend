'use client';
import AiAssistantControl from '@/components/shared/aiAssistantControl/aiAssistantControl';
import { formatAudioDuration, isAudioAttachment, userLabel } from '@/utils/workflow/chatHelpers';
import { VoiceMessagePlayer } from '@/components/design-workflow/chat/messages/voiceMessagePlayer';
import { UploadProgress } from '@/components/shared/workflow/uploadProgress';
import { WorkflowAvatar } from '@/components/shared/workflow/workflowAvatar';
import { attachmentsExceedLimit } from '@/utils/attachments';
import { BriefcaseBusiness, CheckSquare2, Mic, Paperclip, Send, Square, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import type { ChatController } from '@/utils/workflow/hooks/useChatController';

export const ChatComposer = ({
	model,
}: {
	model: Pick<
		ChatController,
		| 'replyTarget'
		| 't'
		| 'actionSourcePreview'
		| 'setReplyTarget'
		| 'recording'
		| 'stopVoiceRecording'
		| 'recordingSeconds'
		| 'fileInputRef'
		| 'sendMessageState'
		| 'onError'
		| 'resetFiles'
		| 'setFiles'
		| 'setFilePreviewUrls'
		| 'selectedThread'
		| 'toggleVoiceRecording'
		| 'composerInputRef'
		| 'body'
		| 'setBody'
		| 'emitTyping'
		| 'setSelectedComposerText'
		| 'mentionOptions'
		| 'setMentionActiveIndex'
		| 'mentionMatch'
		| 'insertMention'
		| 'mentionActiveIndex'
		| 'referenceOptions'
		| 'setReferenceActiveIndex'
		| 'referenceMatch'
		| 'insertReference'
		| 'referenceActiveIndex'
		| 'files'
		| 'submit'
		| 'statusLabelFor'
		| 'selectedComposerText'
		| 'writableProjects'
		| 'openCreateTaskFromSelection'
		| 'attachmentUploadProgress'
		| 'filePreviewUrls'
		| 'removeSelectedFile'
	>;
}) => {
	const {
		replyTarget,
		t,
		actionSourcePreview,
		setReplyTarget,
		recording,
		stopVoiceRecording,
		recordingSeconds,
		fileInputRef,
		sendMessageState,
		onError,
		resetFiles,
		setFiles,
		setFilePreviewUrls,
		selectedThread,
		toggleVoiceRecording,
		composerInputRef,
		body,
		setBody,
		emitTyping,
		setSelectedComposerText,
		mentionOptions,
		setMentionActiveIndex,
		mentionMatch,
		insertMention,
		mentionActiveIndex,
		referenceOptions,
		setReferenceActiveIndex,
		referenceMatch,
		insertReference,
		referenceActiveIndex,
		files,
		submit,
		statusLabelFor,
		selectedComposerText,
		writableProjects,
		openCreateTaskFromSelection,
		attachmentUploadProgress,
		filePreviewUrls,
		removeSelectedFile,
	} = model;
	return (
		<div className="workflow-chat-composer">
			{replyTarget ? (
				<div className="workflow-chat-reply-preview mb-3 flex items-start justify-between gap-3 rounded-lg border border-(--line) bg-(--surface-muted) px-3 py-2">
					<div className="min-w-0">
						<p className="text-xs font-bold uppercase tracking-[0.14em] text-(--accent-strong)">
							{t.workflow.labels.replyingTo ?? 'Replying to'}
						</p>
						<p className="truncate text-sm font-semibold text-(--ink)">{userLabel(replyTarget.sender)}</p>
						<p className="truncate text-sm text-(--ink-soft)">
							{actionSourcePreview(replyTarget) || (t.workflow.labels.messageDeleted ?? 'Message deleted')}
						</p>
					</div>
					<button type="button" onClick={() => setReplyTarget(null)} className="text-(--ink-soft) hover:text-(--ink)">
						<X size={16} />
					</button>
				</div>
			) : null}
			{recording ? (
				<div className="workflow-chat-recording-strip">
					<button
						type="button"
						onClick={() => stopVoiceRecording(true)}
						className="workflow-chat-recording-cancel"
						aria-label={t.common.cancel}
					>
						<Trash2 size={16} />
					</button>
					<div className="workflow-chat-recording-pulse">
						<Mic size={16} />
					</div>
					<div className="workflow-chat-recording-wave" aria-hidden="true">
						{Array.from({ length: 28 }, (_, index) => (
							<span key={`recording-${index}`} style={{ animationDelay: `${index * 42}ms` }} />
						))}
					</div>
					<strong>{formatAudioDuration(recordingSeconds)}</strong>
					<button type="button" onClick={() => stopVoiceRecording(false)} className="workflow-chat-recording-stop">
						<Square size={14} />
						<span>{t.workflow.buttons.finishRecording ?? 'Finish'}</span>
					</button>
				</div>
			) : null}
			<div className="flex items-center gap-2">
				<input
					ref={fileInputRef}
					type="file"
					multiple
					disabled={sendMessageState.isLoading}
					accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
					onChange={(event) => {
						const selectedFiles = Array.from(event.target.files ?? []);
						if (attachmentsExceedLimit(selectedFiles)) {
							onError(t.errors.attachmentTooLarge);
							event.target.value = '';
							return;
						}
						resetFiles();
						setFiles(selectedFiles);
						setFilePreviewUrls(selectedFiles.map((file) => URL.createObjectURL(file)));
					}}
					className="hidden"
				/>
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					disabled={!selectedThread?.id}
					className="app-pill grid h-11 w-11 place-items-center text-(--ink)"
					aria-label={t.workflow.buttons.shareFiles ?? 'Share files'}
				>
					<Paperclip size={18} />
				</button>
				<button
					type="button"
					onClick={toggleVoiceRecording}
					disabled={!selectedThread?.id}
					className={['app-pill grid h-11 w-11 place-items-center text-(--ink)', recording ? 'is-recording' : ''].join(
						' ',
					)}
					aria-label={t.workflow.buttons.voiceNote ?? 'Voice note'}
				>
					<Mic size={18} />
				</button>
				<div className="relative flex-1">
					<textarea
						ref={composerInputRef}
						value={body}
						onChange={(event) => {
							setBody(event.target.value);
							emitTyping(Boolean(event.target.value.trim()));
						}}
						onBlur={() => emitTyping(false)}
						onSelect={(event) => {
							const target = event.currentTarget;
							setSelectedComposerText(target.value.slice(target.selectionStart, target.selectionEnd));
						}}
						onKeyDown={(event) => {
							if (mentionOptions.length) {
								if (event.key === 'ArrowDown') {
									event.preventDefault();
									setMentionActiveIndex((current) => (current + 1) % mentionOptions.length);
									return;
								}
								if (event.key === 'ArrowUp') {
									event.preventDefault();
									setMentionActiveIndex((current) => (current - 1 + mentionOptions.length) % mentionOptions.length);
									return;
								}
								if (event.key === 'Enter' && mentionMatch) {
									event.preventDefault();
									insertMention(mentionOptions[mentionActiveIndex] ?? mentionOptions[0]);
									return;
								}
							}
							if (referenceOptions.length) {
								if (event.key === 'ArrowDown') {
									event.preventDefault();
									setReferenceActiveIndex((current) => (current + 1) % referenceOptions.length);
									return;
								}
								if (event.key === 'ArrowUp') {
									event.preventDefault();
									setReferenceActiveIndex(
										(current) => (current - 1 + referenceOptions.length) % referenceOptions.length,
									);
									return;
								}
								if (event.key === 'Enter' && referenceMatch) {
									event.preventDefault();
									insertReference(referenceOptions[referenceActiveIndex] ?? referenceOptions[0]);
									return;
								}
							}
							if (event.key === 'Enter' && !event.shiftKey) {
								event.preventDefault();
								if (selectedThread?.id && !sendMessageState.isLoading && (body.trim() || files.length > 0)) {
									void submit();
								}
							}
						}}
						rows={2}
						placeholder={t.workflow.labels.messagePlaceholder ?? 'Message'}
						disabled={!selectedThread?.id}
						className="app-input min-h-12 w-full resize-none"
					/>
					{mentionOptions.length ? (
						<div className="absolute bottom-[calc(100%+8px)] left-0 z-220 w-full rounded-lg border border-(--line) bg-white p-2 shadow-(--shadow-lg)">
							{mentionOptions.map((user, index) => (
								<button
									key={user.id}
									type="button"
									onClick={() => insertMention(user)}
									className={['workflow-chat-mention-option', index === mentionActiveIndex ? 'is-active' : ''].join(
										' ',
									)}
								>
									<WorkflowAvatar user={user} size={30} avatarClassName="workflow-chat-avatar" />
									<span className="truncate">{userLabel(user)}</span>
								</button>
							))}
						</div>
					) : null}
					{referenceOptions.length ? (
						<div className="absolute bottom-[calc(100%+8px)] left-0 z-220 w-full rounded-lg border border-(--line) bg-white p-2 shadow-(--shadow-lg)">
							{referenceOptions.map((reference, index) => (
								<button
									key={`${reference.kind}-${reference.id}`}
									type="button"
									onClick={() => insertReference(reference)}
									className={['workflow-chat-reference-option', index === referenceActiveIndex ? 'is-active' : ''].join(
										' ',
									)}
								>
									<span>
										{reference.kind === 'task' ? <CheckSquare2 size={15} /> : <BriefcaseBusiness size={15} />}
									</span>
									<span className="min-w-0 flex-1">
										<b>{reference.title}</b>
										<small>
											{reference.kind === 'task' ? (t.workflow.labels.task ?? 'Task') : t.workflow.labels.project}
											{' - '}
											{reference.kind === 'project' ? statusLabelFor(reference.meta) : reference.meta}
										</small>
									</span>
								</button>
							))}
						</div>
					) : null}
				</div>
				{selectedComposerText.trim() && writableProjects.length > 0 ? (
					<button
						type="button"
						onClick={openCreateTaskFromSelection}
						className="app-button h-11 px-3"
						aria-label={t.workflow.buttons.createTaskFromSelection ?? 'Create task from selection'}
					>
						<CheckSquare2 size={16} />
					</button>
				) : null}
				<button
					type="button"
					onClick={submit}
					disabled={!selectedThread?.id || sendMessageState.isLoading || (!body.trim() && files.length === 0)}
					className="app-button h-11 px-4"
					aria-label={t.common.submit}
				>
					<Send size={16} />
				</button>
			</div>
			<UploadProgress progress={attachmentUploadProgress} />
			<AiAssistantControl
				key={selectedThread?.id}
				value={body}
				onApply={(next) => {
					setBody(next);
					emitTyping(Boolean(next.trim()));
					setSelectedComposerText('');
				}}
				context="chat_message"
				disabled={!selectedThread?.id || sendMessageState.isLoading || recording}
			/>
			{files.length ? (
				<div className="workflow-chat-draft-attachments">
					<div className="flex flex-wrap gap-2">
						{files.map((file, index) =>
							isAudioAttachment(file.type, file.name, filePreviewUrls[index]) ? (
								<div key={`${file.name}-${index}`} className="workflow-chat-voice-draft">
									<button
										type="button"
										onClick={() => removeSelectedFile(index)}
										className="workflow-chat-voice-draft-remove"
										aria-label={t.common.delete}
									>
										<Trash2 size={15} />
									</button>
									<VoiceMessagePlayer
										src={filePreviewUrls[index]}
										seed={`${file.name}-${index}`}
										label={t.workflow.buttons.voiceNote ?? 'Voice message'}
										compact
									/>
								</div>
							) : (
								<div
									key={`${file.name}-${index}`}
									className="relative overflow-hidden rounded-lg border border-(--line) bg-white"
								>
									<button
										type="button"
										onClick={() => removeSelectedFile(index)}
										className="absolute right-1 top-1 z-10 rounded-full bg-rose-600/90 p-1 text-white"
										aria-label={t.common.delete}
									>
										<X size={12} />
									</button>
									{file.type.startsWith('image/') ? (
										<Image
											src={filePreviewUrls[index]}
											alt={file.name}
											width={80}
											height={80}
											unoptimized
											className="h-20 w-20 object-cover"
										/>
									) : (
										<div className="flex h-20 min-w-35 items-center gap-2 px-3 text-xs font-semibold text-(--ink)">
											<Paperclip size={13} />
											<span className="line-clamp-2">{file.name}</span>
										</div>
									)}
								</div>
							),
						)}
					</div>
				</div>
			) : null}
		</div>
	);
};
