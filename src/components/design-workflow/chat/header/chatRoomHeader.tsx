'use client';
import { threadTitle, userLabel } from '@/utils/workflow/chatHelpers';
import { WorkflowDateField, WorkflowSelectField } from '@/components/shared/workflow/workflowFormControls';
import { BriefcaseBusiness, Images, Paperclip, Search, SlidersHorizontal, Users } from 'lucide-react';
import type { ChatController } from '@/utils/workflow/hooks/useChatController';
export const ChatRoomHeader = ({
	model,
}: {
	model: Pick<
		ChatController,
		| 'selectedThread'
		| 'profile'
		| 't'
		| 'messageList'
		| 'chatToolsOpen'
		| 'setChatToolsOpen'
		| 'activeChatFilterCount'
		| 'searchTerm'
		| 'setSearchTerm'
		| 'searchFilters'
		| 'setSearchFilters'
		| 'messageMentionUsers'
		| 'setDrawerMode'
		| 'setReferencesOpen'
		| 'linkedReferenceCount'
		| 'mediaAttachments'
	>;
}) => {
	const {
		selectedThread,
		profile,
		t,
		messageList,
		chatToolsOpen,
		setChatToolsOpen,
		activeChatFilterCount,
		searchTerm,
		setSearchTerm,
		searchFilters,
		setSearchFilters,
		messageMentionUsers,
		setDrawerMode,
		setReferencesOpen,
		linkedReferenceCount,
		mediaAttachments,
	} = model;
	return (
		<div className="workflow-chat-room-header">
			<div className="workflow-chat-room-title">
				<div>
					<p>
						{selectedThread
							? threadTitle(
									selectedThread,
									profile.id,
									t.workflow.labels.publicStudio ?? 'Studio public',
									t.workflow.labels.privateChat ?? 'Private chat',
									t.workflow.labels.projectRoom ?? 'Project room',
									t.workflow.labels.taskRoom ?? 'Task room',
								)
							: (t.workflow.labels.chatTitle ?? 'Chat')}
					</p>
				</div>
				<div className="workflow-chat-room-title-actions">
					<em>
						{messageList.length} {t.workflow.labels.messagesLabel ?? 'messages'}
					</em>
					<button
						type="button"
						className={['workflow-chat-tools-toggle', chatToolsOpen ? 'is-open' : ''].join(' ')}
						onClick={() => setChatToolsOpen((current) => !current)}
						aria-expanded={chatToolsOpen}
						aria-label={t.common.filterBy ?? t.workflow.labels.searchMessages ?? 'Filters'}
					>
						<SlidersHorizontal size={16} />
						<span>{t.common.filterBy ?? 'Filtres'}</span>
						{activeChatFilterCount ? <b>{activeChatFilterCount}</b> : null}
					</button>
				</div>
			</div>
			{chatToolsOpen ? (
				<div className="workflow-chat-room-tools">
					<label className="workflow-chat-search">
						<Search size={15} />
						<input
							value={searchTerm}
							onChange={(event) => setSearchTerm(event.target.value)}
							placeholder={t.workflow.labels.searchMessages ?? t.workflow.labels.search}
							className="min-w-0 flex-1 bg-transparent outline-none"
						/>
					</label>
					<div className="workflow-chat-filter-row">
						<WorkflowSelectField
							value={searchFilters.sender_id ? String(searchFilters.sender_id) : ''}
							onChangeAction={(value) =>
								setSearchFilters((current) => ({ ...current, sender_id: value ? Number(value) : undefined }))
							}
							options={[
								{ value: '', label: t.workflow.labels.sender ?? 'Sender' },
								...messageMentionUsers.map((user) => ({
									value: user.id,
									label: `${userLabel(user)} — ${user.email}`,
								})),
							]}
							startIcon={<Users size={16} />}
							ariaLabel={t.workflow.labels.sender ?? 'Sender'}
							className="workflow-chat-filter-select"
						/>
						<WorkflowDateField
							value={searchFilters.date_from ?? ''}
							onChangeAction={(value) => setSearchFilters((current) => ({ ...current, date_from: value || undefined }))}
							placeholder={t.workflow.labels.dateFrom ?? 'From'}
							ariaLabel={t.workflow.labels.dateFrom ?? 'From'}
							clearLabel={t.common.clearSelection}
							wrapperClassName="workflow-chat-filter-date-control"
							triggerClassName="workflow-chat-filter-date-trigger"
						/>
						<button
							type="button"
							className={['workflow-chat-mini-toggle', searchFilters.has_files ? 'is-active' : ''].join(' ')}
							onClick={() =>
								setSearchFilters((current) => ({ ...current, has_files: !current.has_files || undefined }))
							}
							aria-label={t.workflow.labels.attachments ?? 'Attachments'}
						>
							<Paperclip size={15} />
						</button>
						<button
							type="button"
							className={['workflow-chat-mini-toggle', searchFilters.has_images ? 'is-active' : ''].join(' ')}
							onClick={() =>
								setSearchFilters((current) => ({ ...current, has_images: !current.has_images || undefined }))
							}
							aria-label={t.workflow.labels.images ?? 'Images'}
						>
							<Images size={15} />
						</button>
						<button
							type="button"
							className="workflow-chat-ref-toggle has-tooltip"
							onClick={() => {
								setDrawerMode('references');
								setReferencesOpen(true);
							}}
							aria-label={t.workflow.labels.linkedReferences ?? 'Linked references'}
						>
							<BriefcaseBusiness size={16} />
							<span>{linkedReferenceCount}</span>
							<i>{t.workflow.labels.linkedReferences ?? 'Linked references'}</i>
						</button>
						<button
							type="button"
							className="workflow-chat-ref-toggle has-tooltip"
							onClick={() => {
								setDrawerMode('media');
								setReferencesOpen(true);
							}}
							aria-label={t.workflow.labels.mediaFiles ?? 'Media files'}
						>
							<Images size={16} />
							<span>{mediaAttachments.length}</span>
							<i>{t.workflow.labels.mediaFiles ?? 'Media files'}</i>
						</button>
					</div>
				</div>
			) : null}
		</div>
	);
};
