'use client';

import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { useRenameTaskAttachmentMutation } from '@/store/services/designWorkflow';
import { useLanguage, useToast } from '@/utils/hooks';
import type { TaskAttachment } from '@/types/designWorkflowTypes';

export const TaskAttachmentName = ({
	taskId,
	attachment,
	href,
	mutable,
	meta,
	actions,
	actionsClassName = 'workflow-attachment-actions',
}: {
	taskId: number;
	attachment: Pick<TaskAttachment, 'id' | 'name'>;
	href: string;
	mutable: boolean;
	meta?: string;
	actions?: ReactNode;
	actionsClassName?: string;
}) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const [renameAttachment, { isLoading }] = useRenameTaskAttachmentMutation();
	const [draft, setDraft] = useState<string | null>(null);
	const inFlight = useRef(false);
	const renameButton = useRef<HTMLButtonElement>(null);
	const close = () => {
		if (inFlight.current) return;
		setDraft(null);
		requestAnimationFrame(() => renameButton.current?.focus());
	};
	const save = async () => {
		const name = draft?.trim();
		if (!mutable || !name || name.length > 255 || inFlight.current) return;
		if (name === attachment.name) {
			close();
			return;
		}
		inFlight.current = true;
		try {
			await renameAttachment({ id: taskId, attachmentId: attachment.id, name }).unwrap();
			onSuccess(t.workflow.labels.attachmentRenamed);
			inFlight.current = false;
			close();
		} catch {
			onError(t.workflow.labels.attachmentRenameError);
		} finally {
			inFlight.current = false;
		}
	};

	const editor =
		mutable && draft !== null ? (
			<form
				className="workflow-attachment-name-editor"
				onSubmit={(event) => {
					event.preventDefault();
					void save();
				}}
				onKeyDown={(event) => {
					if (event.key === 'Escape') {
						event.preventDefault();
						event.stopPropagation();
						close();
					}
				}}
			>
				<input
					className="app-input"
					aria-label={t.workflow.labels.attachmentName}
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					maxLength={255}
					required
					disabled={isLoading}
					autoFocus
					onFocus={(event) => event.target.select()}
				/>
				<div className="workflow-attachment-name-controls">
					<button
						type="submit"
						className="workflow-attachment-name-save"
						disabled={!draft.trim() || draft.trim().length > 255 || isLoading}
					>
						<Check size={15} />
						{isLoading ? t.workflow.buttons.saving : t.common.save}
					</button>
					<button type="button" onClick={close} disabled={isLoading}>
						<X size={15} />
						{t.common.cancel}
					</button>
				</div>
			</form>
		) : null;
	return (
		<>
			<div className="workflow-attachment-copy">
				{editor ?? (
					<a href={href} target="_blank" rel="noreferrer" title={attachment.name}>
						{attachment.name}
					</a>
				)}
				{meta ? <small>{meta}</small> : null}
			</div>
			{mutable ? (
				<div className={actionsClassName}>
					{!editor ? (
						<button
							ref={renameButton}
							type="button"
							className="workflow-attachment-rename-button"
							onClick={() => setDraft(attachment.name)}
							aria-label={`${t.workflow.labels.renameAttachment}: ${attachment.name}`}
							title={t.workflow.labels.renameAttachment}
						>
							<Pencil size={15} />
						</button>
					) : null}
					{actions}
				</div>
			) : null}
		</>
	);
};
