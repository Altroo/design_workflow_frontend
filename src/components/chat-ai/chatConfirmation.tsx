'use client';
import { Archive, Check } from 'lucide-react';
import AiAssistantDialog from '@/components/shared/aiAssistantControl/aiAssistantDialog';
import { useLanguage } from '@/utils/hooks';
import type { ChatConfirmation as Confirmation } from '@/types/chatAiTypes';
import styles from './chatAssistant.module.css';

export const ChatConfirmation = ({
	card,
	busy,
	error,
	onClose,
	onConfirm,
}: {
	card: Confirmation;
	busy: boolean;
	error: string;
	onClose: () => void;
	onConfirm: () => void;
}) => {
	const { t } = useLanguage();
	const copy = t.chatAi;
	const value = (field: string, text: string | null) =>
		field === 'priority' && text
			? (t.workflow.priorities[text as keyof typeof t.workflow.priorities] ?? text)
			: text || '—';
	return (
		<AiAssistantDialog
			title={card.operation === 'archive' ? copy.archiveTitle : copy.confirmTitle}
			titleIcon={card.operation === 'archive' ? <Archive size={20} /> : <Check size={20} />}
			onClose={() => {
				if (!busy) onClose();
			}}
			actions={[
				{ active: false, text: copy.cancel, onClick: onClose, disabled: busy },
				{ active: true, text: copy.confirm, onClick: onConfirm, disabled: busy },
			]}
		>
			<div className={styles.confirmBody}>
				<strong>{card.label}</strong>
				{card.operation === 'archive' && card.resource === 'project' && (
					<>
						<p>{copy.archiveWarning}</p>
						<p>
							{copy.runningTasks} <strong>{card.running_tasks}</strong>
						</p>
					</>
				)}
				{Object.entries(card.changes).map(([field, next]) => (
					<section key={field} className={styles.change}>
						<strong>{copy.fields[field as keyof typeof copy.fields] ?? field}</strong>
						<small>{copy.before}</small>
						<p>{value(field, card.before[field])}</p>
						<small>{copy.after}</small>
						<p>{value(field, next)}</p>
					</section>
				))}
				{error && (
					<p role="alert" className={styles.error}>
						{error}
					</p>
				)}
			</div>
		</AiAssistantDialog>
	);
};
